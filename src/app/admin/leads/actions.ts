'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCatalog } from '@/lib/catalog';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { generateSessionId } from '@/lib/session-id';
import { EMPTY_ANSWERS } from '@/lib/questions';
import { LEAD_STATUSES, type Lead, type LeadVersion, type Locale, type Selection } from '@/lib/types';
import { logActivity } from '@/lib/quotes/activity';
import { sendQuoteToCustomerEmail } from '@/lib/quotes/emails';
import { customerLink } from '@/lib/quotes/links';
import { hashSelection, priceSelection } from '@/lib/quotes/price';
import { quotesSchemaReady } from '@/lib/quotes/schema';
import { normalizeSessionState, selectionFromLeadConfig, selectionFromState, stateFromLead } from '@/lib/quotes/selection';
import { insertVersion } from '@/lib/quotes/versions';
import { getOnboardingDefinition } from '@/lib/onboarding/definition';
import { applyPatch, createForm, loadForm, saveWithRev } from '@/lib/onboarding/records';
import type { Answers as OnboardingAnswers } from '@/lib/onboarding/types';

export type ActionResult = { ok: true; message?: string; url?: string } | { ok: false; error: string };

/** The signed-in admin (the actions run outside the proxy's redirect, so they check themselves). */
async function requireAdmin(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return user.email ?? user.id;
}

async function requireReady() {
  if (!(await quotesSchemaReady())) throw new Error('The quotes migration has not been applied yet.');
}

async function loadLead(id: string): Promise<Lead> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from('leads').select('*').eq('id', id).maybeSingle();
  if (error || !data) throw new Error('Lead not found');
  return data as Lead;
}

function revalidateLead(id?: string) {
  revalidatePath('/admin/leads');
  revalidatePath('/admin');
  if (id) revalidatePath(`/admin/leads/${id}`);
}

const fail = (e: unknown): ActionResult => ({ ok: false, error: e instanceof Error ? e.message : 'Something went wrong' });

/* ------------------------------------------------------------------ status / owner / notes */

export async function updateLeadStatus(leadId: string, status: string): Promise<void> {
  const email = await requireAdmin();
  if (!(LEAD_STATUSES as string[]).includes(status)) throw new Error('Invalid status');
  const admin = createSupabaseAdminClient();
  const ready = await quotesSchemaReady();
  const { data: before } = await admin.from('leads').select('status').eq('id', leadId).maybeSingle();

  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (ready && status === 'agreed') {
    // Agreed without picking a version: the latest one counts.
    const { data: lead } = await admin.from('leads').select('agreed_version_id, total_one_time, total_monthly').eq('id', leadId).maybeSingle();
    if (lead && !lead.agreed_version_id) {
      const { data: latest } = await admin
        .from('lead_versions')
        .select('id, totals')
        .eq('lead_id', leadId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      const totals = (latest?.totals ?? {}) as { oneTimeEffective?: number; monthlyEffective?: number };
      Object.assign(update, {
        agreed_version_id: latest?.id ?? null,
        agreed_one_time: totals.oneTimeEffective ?? lead.total_one_time,
        agreed_monthly: totals.monthlyEffective ?? lead.total_monthly,
        agreed_at: new Date().toISOString(),
        agreed_by: email,
      });
    }
  }
  const { error } = await admin.from('leads').update(update).eq('id', leadId);
  if (error) throw new Error(error.message);
  if (ready) await logActivity(leadId, 'status', `team:${email}`, `Status: ${before?.status ?? '?'} → ${status}`, { from: before?.status, to: status });
  revalidateLead(leadId);
}

export async function setOwner(leadId: string, ownerEmail: string | null): Promise<ActionResult> {
  try {
    const email = await requireAdmin();
    await requireReady();
    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from('leads')
      .update({ owner_email: ownerEmail || null, updated_at: new Date().toISOString() })
      .eq('id', leadId);
    if (error) throw new Error(error.message);
    await logActivity(leadId, 'owner', `team:${email}`, ownerEmail ? `Owner: ${ownerEmail}` : 'Owner removed', { owner: ownerEmail });
    revalidateLead(leadId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function addNote(leadId: string, body: string): Promise<ActionResult> {
  try {
    const email = await requireAdmin();
    await requireReady();
    const text = body.trim().slice(0, 5000);
    if (!text) return { ok: false, error: 'Empty note' };
    await logActivity(leadId, 'note', `team:${email}`, text);
    revalidateLead(leadId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------------ archive */

export async function archiveLeads(ids: string[], archived: boolean): Promise<ActionResult> {
  try {
    const email = await requireAdmin();
    await requireReady();
    const clean = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
    if (!clean.length) return { ok: false, error: 'Nothing selected' };
    const admin = createSupabaseAdminClient();
    const now = new Date().toISOString();
    const { error } = await admin
      .from('leads')
      .update({ archived_at: archived ? now : null, archived_by: archived ? email : null, updated_at: now })
      .in('id', clean);
    if (error) throw new Error(error.message);
    await Promise.all(clean.map((id) => logActivity(id, 'archive', `team:${email}`, archived ? 'Removed from the list (archived)' : 'Restored', { archived })));
    revalidateLead();
    clean.forEach((id) => revalidatePath(`/admin/leads/${id}`));
    return { ok: true, message: archived ? `${clean.length} removed` : `${clean.length} restored` };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------------ versions */

export async function markAgreed(leadId: string, versionId: string, override?: { oneTime?: number | null; monthly?: number | null }): Promise<ActionResult> {
  try {
    const email = await requireAdmin();
    await requireReady();
    const admin = createSupabaseAdminClient();
    const { data: version } = await admin.from('lead_versions').select('*').eq('id', versionId).eq('lead_id', leadId).maybeSingle();
    if (!version) return { ok: false, error: 'Version not found' };
    const v = version as LeadVersion;
    const oneTime = override?.oneTime ?? Number(v.totals.oneTimeEffective);
    const monthly = override?.monthly ?? Number(v.totals.monthlyEffective);
    const now = new Date().toISOString();
    const { error } = await admin
      .from('leads')
      .update({
        status: 'agreed',
        agreed_version_id: v.id,
        agreed_one_time: oneTime,
        agreed_monthly: monthly,
        agreed_at: now,
        agreed_by: email,
        updated_at: now,
      })
      .eq('id', leadId);
    if (error) throw new Error(error.message);
    await logActivity(leadId, 'agreed', `team:${email}`, `Agreed on v${v.version}: €${oneTime} one-time, €${monthly}/mo.`, {
      version: v.version,
      versionId: v.id,
      oneTime,
      monthly,
    });
    revalidateLead(leadId);
    return { ok: true, message: `v${v.version} marked as agreed` };
  } catch (e) {
    return fail(e);
  }
}

export async function saveVersionNow(leadId: string): Promise<ActionResult> {
  try {
    const email = await requireAdmin();
    await requireReady();
    const lead = await loadLead(leadId);
    if (!lead.session_id) return { ok: false, error: 'This lead has no customer link yet' };
    const admin = createSupabaseAdminClient();
    const { data: session } = await admin.from('funnel_sessions').select('state').eq('id', lead.session_id).maybeSingle();
    if (!session) return { ok: false, error: 'Session not found' };
    const catalog = await getCatalog();
    const state = normalizeSessionState(session.state);
    const selection = selectionFromState(state, catalog);
    if (selection.voucher && lead.config.voucher && selection.voucher.code.toUpperCase() === lead.config.voucher.code.toUpperCase()) {
      selection.voucher = lead.config.voucher;
    } else selection.voucher = null;
    const priced = priceSelection(catalog, selection, lead.locale, { siteNotes: state.siteNotes });
    const result = await insertVersion({
      leadId,
      locale: lead.locale,
      state,
      priced,
      hash: hashSelection(selection),
      actor: `team:${email}`,
      reason: 'manual',
      eurToUsdRate: catalog.eurToUsdRate,
    });
    revalidateLead(leadId);
    if (!result) return { ok: false, error: 'Could not save a version' };
    return { ok: true, message: result.inserted ? `Saved as v${result.version}` : `Unchanged since v${result.version}` };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------------ links */

/** Legacy leads (submitted before links were kept) get a live link minted from their snapshot. */
export async function createCustomerLink(leadId: string): Promise<ActionResult> {
  try {
    const email = await requireAdmin();
    await requireReady();
    const lead = await loadLead(leadId);
    if (lead.session_id) return { ok: true, message: 'Link exists', url: customerLink(lead.session_id, lead.locale) };
    const catalog = await getCatalog();
    const admin = createSupabaseAdminClient();
    const sessionId = generateSessionId();
    const state = stateFromLead(lead, catalog);
    const now = new Date().toISOString();
    const { error: sessionError } = await admin
      .from('funnel_sessions')
      .insert({ id: sessionId, state, updated_at: now, last_actor: `team:${email}` });
    if (sessionError) throw new Error(sessionError.message);
    const { error } = await admin.from('leads').update({ session_id: sessionId, updated_at: now }).eq('id', leadId);
    if (error) throw new Error(error.message);

    const selection = selectionFromLeadConfig(lead.config, lead, catalog);
    await insertVersion({
      leadId,
      locale: lead.locale,
      state,
      priced: priceSelection(catalog, selection, lead.locale, { siteNotes: lead.config.siteNotes }),
      hash: hashSelection(selection),
      actor: `team:${email}`,
      reason: 'restore',
      eurToUsdRate: catalog.eurToUsdRate,
    });
    const url = customerLink(sessionId, lead.locale);
    await logActivity(leadId, 'link', `team:${email}`, 'Customer link created', { url });
    revalidateLead(leadId);
    return { ok: true, message: 'Customer link created', url };
  } catch (e) {
    return fail(e);
  }
}

export async function sendQuoteToCustomer(leadId: string): Promise<ActionResult> {
  try {
    const email = await requireAdmin();
    await requireReady();
    const lead = await loadLead(leadId);
    if (!lead.session_id) return { ok: false, error: 'Create the customer link first' };
    const catalog = await getCatalog();
    const selection = selectionFromLeadConfig(lead.config, lead, catalog);
    const priced = priceSelection(catalog, selection, lead.locale, { siteNotes: lead.config.siteNotes });
    const sent = await sendQuoteToCustomerEmail(lead, priced, catalog, lead.session_id);
    if (!sent) return { ok: false, error: 'Email not sent (Resend not configured or rejected the address)' };
    const admin = createSupabaseAdminClient();
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (lead.status === 'draft') update.status = 'contacted';
    await admin.from('leads').update(update).eq('id', leadId);
    await logActivity(leadId, 'email', `team:${email}`, `Quote sent to ${lead.email}`, { type: 'quote_sent' });
    if (update.status) await logActivity(leadId, 'status', `team:${email}`, 'Status: draft → contacted', { from: 'draft', to: 'contacted' });
    revalidateLead(leadId);
    return { ok: true, message: `Sent to ${lead.email}` };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------------ drafts */

export interface DraftQuoteInput {
  vorname: string;
  nachname: string;
  firma: string;
  email: string;
  telefon: string;
  locale: Locale;
}

/**
 * A quote the team starts for a customer: a `draft` lead with the default bundle, bound
 * to a fresh funnel session the team then configures on the public site (team mode).
 */
export async function createDraftQuote(input: DraftQuoteInput): Promise<ActionResult> {
  let leadId: string | null = null;
  try {
    const email = await requireAdmin();
    await requireReady();
    const contactEmail = input.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail)) return { ok: false, error: 'A valid email is required' };
    const name = `${input.vorname} ${input.nachname}`.trim();
    if (!name && !input.firma.trim()) return { ok: false, error: 'A name or company is required' };

    const catalog = await getCatalog();
    const locale: Locale = input.locale === 'en' ? 'en' : 'de';
    const selection: Selection = {
      answers: { ...EMPTY_ANSWERS },
      personaId: null,
      sourceUrl: '',
      bundle: catalog.defaultBundle,
      selectedAddons: {},
      qty: {},
      selectedSubAddons: {},
      care: catalog.defaultCarePlan,
      support: 'none',
      cf: catalog.defaultCloudflarePlan,
      backupUp: false,
      aiBundle: false,
      payYearly: true,
      voucher: null,
    };
    const priced = priceSelection(catalog, selection, locale);
    const admin = createSupabaseAdminClient();
    const now = new Date().toISOString();

    const sessionId = generateSessionId();
    const leadRow = {
      locale,
      vorname: input.vorname.trim(),
      nachname: input.nachname.trim(),
      firma: input.firma.trim(),
      email: contactEmail,
      telefon: input.telefon.trim() || null,
      consent_at: null,
      config: priced.config,
      total_one_time: priced.totals.oneTimeEffective,
      total_monthly: priced.totals.monthlyEffective,
      total_yearly: priced.totals.yearlyEffective,
      status: 'draft',
      source: 'team',
      owner_email: email,
    };
    const state = stateFromLead({ ...leadRow, ziel: null, persona_id: null, source_url: null, stage2: null }, catalog);
    const { error: sessionError } = await admin
      .from('funnel_sessions')
      .insert({ id: sessionId, state, updated_at: now, last_actor: `team:${email}` });
    if (sessionError) throw new Error(sessionError.message);

    const { data: inserted, error } = await admin
      .from('leads')
      .insert({ ...leadRow, session_id: sessionId })
      .select('id')
      .single();
    if (error || !inserted) throw new Error(error?.message ?? 'Insert failed');
    leadId = inserted.id;

    await insertVersion({
      leadId: inserted.id,
      locale,
      state,
      priced,
      hash: hashSelection(selection),
      actor: `team:${email}`,
      reason: 'submit',
      eurToUsdRate: catalog.eurToUsdRate,
    });
    await logActivity(inserted.id, 'system', `team:${email}`, 'Draft quote created by the team', { sessionId });
    revalidateLead(inserted.id);
  } catch (e) {
    return fail(e);
  }
  redirect(`/admin/leads/${leadId}`);
}

/* ------------------------------------------------------------------ onboarding hand-off */

const PACKAGE_IDS = new Set(['silver', 'gold', 'platinum']);

/**
 * Starts the client onboarding form for a won lead with what the quote already knows:
 * contact, booked package and page band, project type, existing URL, legal name. Runs
 * through `applyPatch` so redaction, hidden-field clearing and flags apply as usual.
 */
export async function createOnboardingFormFromLead(leadId: string): Promise<ActionResult> {
  let formId: string | null = null;
  try {
    const email = await requireAdmin();
    const lead = await loadLead(leadId);
    const ready = await quotesSchemaReady();

    formId = await createForm(lead.locale);
    const [record, definition] = await Promise.all([loadForm(formId), getOnboardingDefinition()]);
    if (!record) throw new Error('Form not found after creation');

    const a = (v: string | number | null | undefined) => (v == null || v === '' ? null : { v, src: 'lead' as const });
    const answers = lead.config?.answers ?? {};
    const hasSite = answers.hasSite;
    const changes: Record<string, { v: string | number; src: 'lead' } | null> = {
      contact_name: a(`${lead.vorname} ${lead.nachname}`.trim()),
      contact_company: a(lead.firma),
      contact_email: a(lead.email),
      booked_package: PACKAGE_IDS.has(lead.config?.bundle) ? a(lead.config.bundle) : null,
      booked_page_band: a(answers.pages ?? null),
      project_type: a(hasSite ? (hasSite === 'website' ? 'changes' : 'new') : null),
      existing_url: hasSite === 'website' ? a(lead.source_url) : null,
      legal_name: a(lead.stage2?.fields?.firmenname ?? null),
    };
    const clean = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== null)) as Record<string, { v: string | number; src: 'lead' }>;
    const patch = applyPatch(definition, record, { changes: clean as unknown as Record<string, OnboardingAnswers[string]> });
    if (!patch.ok) throw new Error(patch.error);
    const saved = await saveWithRev(formId, record.rev, { ...patch.update, lead_id: leadId });
    if (!saved.ok) throw new Error('Could not prefill the form');

    if (ready) await logActivity(leadId, 'onboarding', `team:${email}`, 'Onboarding form created', { formId });
    revalidateLead(leadId);
  } catch (e) {
    return fail(e);
  }
  redirect(`/admin/onboarding/${formId}`);
}
