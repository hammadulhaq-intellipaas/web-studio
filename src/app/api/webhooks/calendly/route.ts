import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { sendBookingEmail } from '@/lib/emails';

/** Calendly's guidance for how much clock skew / delivery lag to accept. */
const SIGNATURE_TOLERANCE_SECONDS = 300;

/**
 * Calendly webhook (invitee.created / invitee.canceled).
 * Signature header format: "t=<timestamp>,v1=<hmac>", HMAC-SHA256 over `${t}.${rawBody}`.
 */
function verifySignature(rawBody: string, header: string | null, signingKey: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const [k, ...rest] = p.split('=');
      return [k.trim(), rest.join('=').trim()] as [string, string];
    }),
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;

  // The timestamp is inside the HMAC, so it can't be re-dated — but without a window a
  // captured request stays replayable forever. Reject anything outside the tolerance.
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(t));
  if (!Number.isFinite(ageSeconds) || ageSeconds > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = crypto.createHmac('sha256', signingKey).update(`${t}.${rawBody}`).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}

interface CalendlyPayload {
  event: string;
  payload: {
    uri: string;
    name?: string;
    email?: string;
    scheduled_event?: {
      uri: string;
      name?: string;
      start_time?: string;
      end_time?: string;
    };
    tracking?: { utm_source?: string | null; utm_content?: string | null };
    cancellation?: { reason?: string | null };
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  // Fail closed: an unverified webhook can inject appointments and trigger team email,
  // so a missing key is a deployment fault, not a reason to trust the caller.
  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  if (!signingKey) {
    console.error('[calendly] CALENDLY_WEBHOOK_SIGNING_KEY not set — refusing webhook');
    return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  }
  const ok = verifySignature(rawBody, request.headers.get('calendly-webhook-signature'), signingKey);
  if (!ok) return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });

  let body: CalendlyPayload;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (body.event !== 'invitee.created' && body.event !== 'invitee.canceled') {
    return NextResponse.json({ ok: true, ignored: body.event });
  }

  // One Calendly event type is shared across projects and webhook subscriptions are
  // org-scoped, so every project sees every booking; utm_source marks the ones that are
  // ours. Must gate every side effect below — matching the invitee by email would
  // otherwise attach another project's booking to a lead that happens to exist here.
  // Fail closed for the same reason: without the slug we cannot tell our bookings from
  // another project's, and accepting all of them corrupts this project's calendar.
  const origin = process.env.NEXT_PUBLIC_CALENDLY_ORIGIN;
  if (!origin) {
    console.error('[calendly] NEXT_PUBLIC_CALENDLY_ORIGIN not set — refusing webhook');
    return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  }
  if (body.payload?.tracking?.utm_source !== origin) {
    return NextResponse.json({ ok: true, ignored: 'foreign origin' });
  }

  const invitee = body.payload;
  const event = invitee.scheduled_event;
  if (!event?.uri || !event.start_time) {
    return NextResponse.json({ error: 'missing_event' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  // Link to the lead: utm_content carries the lead id; fall back to newest lead with that email.
  let leadId: string | null = null;
  const utmLead = invitee.tracking?.utm_content;
  if (utmLead) {
    const { data } = await supabase.from('leads').select('id').eq('id', utmLead).maybeSingle();
    if (data) leadId = data.id;
  }
  if (!leadId && invitee.email) {
    const { data } = await supabase
      .from('leads')
      .select('id')
      .eq('email', invitee.email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) leadId = data.id;
  }

  if (body.event === 'invitee.created') {
    // Calendly retries webhooks; only a first-time booking should notify the team.
    const { data: existing } = await supabase
      .from('appointments')
      .select('id')
      .eq('calendly_event_uri', event.uri)
      .maybeSingle();

    const { error } = await supabase.from('appointments').upsert(
      {
        lead_id: leadId,
        calendly_event_uri: event.uri,
        calendly_invitee_uri: invitee.uri,
        invitee_name: invitee.name ?? null,
        invitee_email: invitee.email ?? null,
        start_time: event.start_time,
        end_time: event.end_time ?? null,
        status: 'scheduled',
        raw_payload: body as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'calendly_event_uri' },
    );
    if (error) {
      console.error('[calendly] upsert failed:', error);
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }

    if (!existing) {
      // Notifications must never fail the webhook (Calendly would retry the whole thing).
      try {
        const [{ data: lead }, { data: teamSetting }] = await Promise.all([
          leadId
            ? supabase
                .from('leads')
                .select('id, vorname, nachname, firma, email')
                .eq('id', leadId)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          supabase.from('app_settings').select('value').eq('key', 'team_email').maybeSingle(),
        ]);
        await sendBookingEmail(
          {
            lead: lead ?? null,
            inviteeName: invitee.name ?? null,
            inviteeEmail: invitee.email ?? null,
            startTime: event.start_time,
          },
          typeof teamSetting?.value === 'string' ? teamSetting.value : '',
        );
      } catch (e) {
        console.error('[calendly] booking notification failed:', e);
      }
    }
  } else {
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'canceled',
        cancel_reason: invitee.cancellation?.reason ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('calendly_event_uri', event.uri);
    if (error) {
      console.error('[calendly] cancel update failed:', error);
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
