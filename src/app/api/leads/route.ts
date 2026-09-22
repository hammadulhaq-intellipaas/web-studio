import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCatalog } from '@/lib/catalog';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { validateVoucherCode } from '@/lib/vouchers';
import { generateSessionId, isValidSessionId } from '@/lib/session-id';
import { LOCKED_LEAD_STATUSES, type Lead, type LeadConfig, type Locale, type Selection } from '@/lib/types';
import { currentActor, isTeam } from '@/lib/quotes/actor';
import { logActivity } from '@/lib/quotes/activity';
import { sendResubmitEmails, sendSubmitEmails } from '@/lib/quotes/emails';
import { customerLink } from '@/lib/quotes/links';
import { hashSelection, priceSelection } from '@/lib/quotes/price';
import { quotesSchemaReady } from '@/lib/quotes/schema';
import { stateFromSubmission } from '@/lib/quotes/selection';
import { insertVersion } from '@/lib/quotes/versions';

const answersSchema = z.object({
  hasSite: z.string().nullable(),
  selfbuilt: z.string().nullable(),
  aiHas: z.array(z.string()),
  aiMissing: z.array(z.string()),
  byowScope: z.string().nullable().optional(),
  pages: z.string().nullable(),
  langs: z.string().nullable(),
  contact: z.string().nullable(),
  fees: z.string().nullable(),
  shop: z.string().nullable(),
  blog: z.string().nullable(),
  assets: z.string().nullable(),
});

const selectionSchema = z.object({
  answers: answersSchema,
  personaId: z.string().nullable(),
  sourceUrl: z.string().max(2000),
  bundle: z.string(),
  selectedAddons: z.record(z.string(), z.boolean()),
  qty: z.record(z.string(), z.number().int().min(0).max(100)),
  // Bounded on the way in as well as deduplicated in subAddonsOf: a hand-crafted body
  // must not be able to talk the quote into an arbitrary multiple of the base price.
  selectedSubAddons: z
    .record(z.string(), z.array(z.string().max(64)).max(20))
    .optional(),
  care: z.string(),
  support: z.string(),
  cf: z.string(),
  backupUp: z.boolean(),
  aiBundle: z.boolean(),
  payYearly: z.boolean(),
  voucher: z
    .object({ code: z.string(), percent: z.number(), scope: z.string() })
    .nullable(),
});

/** Optional intake, collected in the collapsed sections of the inquiry form. */
const stage2Schema = z.object({
  fields: z.record(z.string(), z.string().max(5000)),
  goal: z.string().max(100).nullable(),
  driveLink: z.string().max(2000),
});

const bodySchema = z.object({
  locale: z.enum(['de', 'en']),
  lead: z.object({
    vorname: z.string().max(200),
    nachname: z.string().max(200),
    firma: z.string().max(300),
    email: z.string().email().max(320),
    // Required for customers (checked below), optional when the team saves a quote.
    tel: z.string().max(50),
    ziel: z.string().max(2000),
    consent: z.boolean(),
  }),
  selection: selectionSchema,
  sessionId: z.string().nullable().optional(),
  /** Free-text notes about the customer's existing website / draft concept. */
  siteNotes: z.string().max(5000).optional(),
  stage2: stage2Schema.optional(),
  /** A signed-in team member saving a customer's quote (verified server-side). */
  team: z.boolean().optional(),
});

type ExistingLead = Pick<
  Lead,
  'id' | 'status' | 'archived_at' | 'consent_at' | 'submitted_at' | 'config' | 'voucher_id' | 'locale' | 'persona_id' | 'session_id'
>;

const EXISTING_COLUMNS = 'id, status, archived_at, consent_at, submitted_at, config, voucher_id, locale, persona_id, session_id';

/**
 * Lead submission. Prices the selection server-side, stores the snapshot and — once the
 * quotes migration is applied — binds the lead to its funnel session so the customer's
 * `?c=` link stays alive: the same link later *updates* this lead (new version) instead of
 * creating a duplicate. A signed-in team member may save a bound quote without the
 * customer's phone/consent and without customer emails (`team: true`).
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', details: parsed.error.flatten() }, { status: 400 });
  }
  const { locale, lead, selection: rawSelection, siteNotes, stage2 } = parsed.data;
  const sessionId = parsed.data.sessionId && isValidSessionId(parsed.data.sessionId) ? parsed.data.sessionId : null;

  const catalog = await getCatalog();
  if (!catalog.bundles.some((b) => b.id === rawSelection.bundle)) {
    return NextResponse.json({ error: 'unknown_bundle' }, { status: 400 });
  }

  const ready = await quotesSchemaReady();
  const actor = await currentActor();
  const team = parsed.data.team === true;
  if (team && !isTeam(actor)) {
    // Never degrade a team save into a customer submission (emails, consent, status).
    return NextResponse.json({ error: 'team_required' }, { status: 401 });
  }
  if (!team) {
    const digits = lead.tel.replace(/\D/g, '').length;
    if (digits < 6) return NextResponse.json({ error: 'invalid_body', details: { tel: 'required' } }, { status: 400 });
  }

  // Never trust the client's voucher — revalidate and use the DB values.
  let voucher: Selection['voucher'] = null;
  let voucherId: string | null = null;
  if (rawSelection.voucher?.code) {
    const check = await validateVoucherCode(rawSelection.voucher.code);
    if (check.valid) {
      voucher = {
        code: rawSelection.voucher.code.trim().toUpperCase(),
        percent: check.percent!,
        scope: check.scope!,
      };
      voucherId = check.id!;
    }
  }

  const selection: Selection = {
    ...rawSelection,
    answers: { ...rawSelection.answers, byowScope: rawSelection.answers.byowScope ?? null },
    selectedSubAddons: rawSelection.selectedSubAddons ?? {},
    voucher,
  };
  const priced = priceSelection(catalog, selection, locale as Locale, { siteNotes });
  const { config, totals } = priced;
  const supabase = createSupabaseAdminClient();

  // ------------------------------------------------------------ bound session → update
  let existing: ExistingLead | null = null;
  if (ready && sessionId) {
    const { data } = await supabase.from('leads').select(EXISTING_COLUMNS).eq('session_id', sessionId).maybeSingle();
    existing = (data as ExistingLead | null) ?? null;
  }
  if (!existing && team) {
    // A team save only makes sense on a quote that exists (created from the admin).
    return NextResponse.json({ error: 'quote_not_found' }, { status: 404 });
  }

  const now = new Date().toISOString();
  const contactUpdate = {
    vorname: lead.vorname,
    nachname: lead.nachname,
    firma: lead.firma,
    email: lead.email,
    telefon: lead.tel || null,
    ziel: lead.ziel || null,
  };

  if (existing) {
    if (!team && LOCKED_LEAD_STATUSES.includes(existing.status)) {
      return NextResponse.json({ error: 'locked' }, { status: 403 });
    }
    if (!team && !lead.consent && !existing.consent_at) {
      return NextResponse.json({ error: 'invalid_body', details: { consent: 'required' } }, { status: 400 });
    }

    const previousConfig = existing.config as LeadConfig;
    const voucherChanged = (voucher?.code ?? null) !== (previousConfig?.voucher?.code ?? null);
    const update: Record<string, unknown> = {
      ...contactUpdate,
      persona_id: selection.personaId,
      source_url: selection.sourceUrl || null,
      config,
      total_one_time: totals.oneTimeEffective,
      total_monthly: totals.monthlyEffective,
      total_yearly: totals.yearlyEffective,
      voucher_id: voucherId,
      stage2: stage2 ?? null,
      goal: stage2?.goal ?? null,
      drive_link: stage2?.driveLink || null,
      updated_at: now,
    };
    if (!team) {
      update.submitted_at = now;
      if (!existing.consent_at && lead.consent) update.consent_at = now;
      if (existing.status === 'draft') update.status = 'new';
    }
    const { error } = await supabase.from('leads').update(update).eq('id', existing.id);
    if (error) {
      console.error('[leads] update failed:', error);
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }

    // Files uploaded since the last submit still hang off the session.
    await supabase.from('lead_files').update({ lead_id: existing.id }).eq('session_id', sessionId!).is('lead_id', null);
    if (voucherId && voucherChanged) await bumpRedemption(voucherId);

    const state = stateFromSubmission({ selection, lead, siteNotes, stage2 }, catalog);
    const version = await insertVersion({
      leadId: existing.id,
      locale: locale as Locale,
      state,
      priced,
      hash: hashSelection(selection),
      actor,
      reason: 'submit',
      eurToUsdRate: catalog.eurToUsdRate,
    });
    const versionNo = version?.version ?? 0;
    if (!team) {
      const afterAgreed = ['agreed', 'won', 'lost'].includes(existing.status);
      await logActivity(existing.id, 'system', actor, afterAgreed ? `Customer resubmitted after "${existing.status}"` : 'Customer resubmitted', {
        version: versionNo,
        status: existing.status,
      });
      await sendResubmitEmails(
        { id: existing.id, locale: locale as Locale, ...contactUpdate, persona_id: selection.personaId },
        previousConfig,
        priced,
        catalog,
        sessionId,
        versionNo,
        actor,
      );
    }
    const status = (update.status as string | undefined) ?? existing.status;
    return NextResponse.json({
      id: existing.id,
      link: sessionId ? customerLink(sessionId, locale as Locale) : null,
      version: versionNo,
      updated: true,
      quote: {
        leadId: existing.id,
        status,
        locked: LOCKED_LEAD_STATUSES.includes(status as Lead['status']),
        draft: status === 'draft',
        submittedAt: team ? existing.submitted_at : now,
        hasConsent: !!(existing.consent_at || update.consent_at),
        oneTime: totals.oneTimeEffective,
        monthly: totals.monthlyEffective,
        locale,
      },
    });
  }

  // ------------------------------------------------------------ new lead
  if (!lead.consent) {
    return NextResponse.json({ error: 'invalid_body', details: { consent: 'required' } }, { status: 400 });
  }

  // Every lead gets a permanent link: reuse the customer's session row, or mint one from
  // the submission when the row is missing (failed save, purged, API-seeded lead).
  let boundSessionId: string | null = null;
  if (ready) {
    boundSessionId = await ensureSessionRow(sessionId, { selection, lead, siteNotes, stage2 }, catalog, actor);
  }

  const insertRow = {
    locale,
    ...contactUpdate,
    consent_at: now,
    persona_id: selection.personaId,
    source_url: selection.sourceUrl || null,
    config,
    total_one_time: totals.oneTimeEffective,
    total_monthly: totals.monthlyEffective,
    total_yearly: totals.yearlyEffective,
    voucher_id: voucherId,
    stage2: stage2 ?? null,
    goal: stage2?.goal ?? null,
    drive_link: stage2?.driveLink || null,
    ...(ready ? { session_id: boundSessionId, submitted_at: now, source: 'customer' } : {}),
  };

  let inserted: { id: string } | null = null;
  {
    const { data, error } = await supabase.from('leads').insert(insertRow).select('id').single();
    if (error?.code === '23505' && boundSessionId) {
      // Two submits landed at once (double click): the first one owns the session — treat
      // this one as its resubmission.
      const { data: winner } = await supabase.from('leads').select('id').eq('session_id', boundSessionId).maybeSingle();
      if (winner) return NextResponse.json({ id: winner.id, link: customerLink(boundSessionId, locale as Locale), updated: true });
    }
    if (error || !data) {
      console.error('[leads] insert failed:', error);
      return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
    }
    inserted = data;
  }

  // Files were uploaded against the funnel session before the lead existed: adopt them.
  // The session itself stays — it is the customer's permanent link.
  if (sessionId) {
    const { error: adoptError } = await supabase.from('lead_files').update({ lead_id: inserted.id }).eq('session_id', sessionId);
    if (adoptError) console.error('[leads] file adoption failed:', adoptError);
  }

  if (voucherId) await bumpRedemption(voucherId);

  if (ready) {
    await insertVersion({
      leadId: inserted.id,
      locale: locale as Locale,
      state: stateFromSubmission({ selection, lead, siteNotes, stage2 }, catalog),
      priced,
      hash: hashSelection(selection),
      actor,
      reason: 'submit',
      eurToUsdRate: catalog.eurToUsdRate,
    });
  }

  await sendSubmitEmails(
    { id: inserted.id, locale: locale as Locale, ...contactUpdate, persona_id: selection.personaId },
    priced,
    catalog,
    boundSessionId,
  );

  return NextResponse.json({
    id: inserted.id,
    link: boundSessionId ? customerLink(boundSessionId, locale as Locale) : null,
    version: ready ? 1 : null,
    quote: boundSessionId
      ? {
          leadId: inserted.id,
          status: 'new',
          locked: false,
          draft: false,
          submittedAt: now,
          hasConsent: true,
          oneTime: totals.oneTimeEffective,
          monthly: totals.monthlyEffective,
          locale,
        }
      : null,
  });
}

async function bumpRedemption(voucherId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: v } = await supabase.from('vouchers').select('redemption_count').eq('id', voucherId).single();
  if (v) await supabase.from('vouchers').update({ redemption_count: v.redemption_count + 1 }).eq('id', voucherId);
}

/**
 * Makes sure a session row exists for the lead's link. The customer's own row is kept as
 * is; a missing row is written from the submission. Returns null only if even that failed
 * (the lead is then stored without a link, and the admin can mint one later).
 */
async function ensureSessionRow(
  sessionId: string | null,
  parts: Parameters<typeof stateFromSubmission>[0],
  catalog: Parameters<typeof stateFromSubmission>[1],
  actor: string,
): Promise<string | null> {
  const supabase = createSupabaseAdminClient();
  const id = sessionId ?? generateSessionId();
  try {
    const { data } = await supabase.from('funnel_sessions').select('id').eq('id', id).maybeSingle();
    if (data) return id;
    const { error } = await supabase.from('funnel_sessions').upsert(
      { id, state: stateFromSubmission(parts, catalog), updated_at: new Date().toISOString(), last_actor: actor },
      { onConflict: 'id', ignoreDuplicates: true },
    );
    if (error) {
      console.error('[leads] session mint failed:', error.message);
      return null;
    }
    return id;
  } catch (e) {
    console.error('[leads] session mint failed:', e);
    return null;
  }
}
