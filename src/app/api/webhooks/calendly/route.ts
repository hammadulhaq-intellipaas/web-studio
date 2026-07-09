import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Calendly webhook (invitee.created / invitee.canceled).
 * Signature header format: "t=<timestamp>,v1=<hmac>", HMAC-SHA256 over `${t}.${rawBody}`.
 */
function verifySignature(rawBody: string, header: string | null, signingKey: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(',').map((p) => p.split('=', 2) as [string, string]),
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
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
    tracking?: { utm_content?: string | null };
    cancellation?: { reason?: string | null };
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  if (signingKey) {
    const ok = verifySignature(rawBody, request.headers.get('calendly-webhook-signature'), signingKey);
    if (!ok) return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  } else {
    console.warn('[calendly] CALENDLY_WEBHOOK_SIGNING_KEY not set — accepting webhook unverified');
  }

  let body: CalendlyPayload;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (body.event !== 'invitee.created' && body.event !== 'invitee.canceled') {
    return NextResponse.json({ ok: true, ignored: body.event });
  }

  const invitee = body.payload;
  const event = invitee.scheduled_event;
  if (!event?.uri) return NextResponse.json({ error: 'missing_event' }, { status: 400 });

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
