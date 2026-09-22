import { z } from 'zod';
import type { Answers, Catalog, Lead, LeadConfig, Selection, Stage2Data, Voucher } from '@/lib/types';
import { EMPTY_ANSWERS } from '@/lib/questions';
import { recSet } from '@/lib/pricing/recommend';
import { INITIAL_LEAD_FORM, currentBundle, type LeadForm, type SessionState } from '@/lib/funnel/state';

/**
 * Server-side twins of the client hooks: turn a stored funnel session into the pricing
 * engine's `Selection`, and build a session from a lead (legacy leads without a link,
 * team-created drafts, a submit whose session row went missing).
 */

const str = (fallback = '') => z.string().max(20_000).catch(fallback);
const nullableStr = z.string().max(2000).nullable().catch(null);
const files = z.array(z.object({ name: z.string().max(300) })).catch([]);

const answersSchema = z
  .object({
    hasSite: nullableStr,
    selfbuilt: nullableStr,
    aiHas: z.array(z.string().max(100)).catch([]),
    aiMissing: z.array(z.string().max(100)).catch([]),
    byowScope: nullableStr,
    pages: nullableStr,
    langs: nullableStr,
    contact: nullableStr,
    fees: nullableStr,
    shop: nullableStr,
    blog: nullableStr,
    assets: nullableStr,
  })
  .catch({ ...EMPTY_ANSWERS, byowScope: null });

const voucherSchema = z
  .object({
    code: z.string().max(64),
    percent: z.number(),
    scope: z.enum(['one_time', 'recurring', 'both']),
  })
  .nullable()
  .catch(null);

const leadFormSchema = z
  .object({
    vorname: str(),
    nachname: str(),
    firma: str(),
    email: str(),
    tel: str(),
    ziel: str(),
    consent: z.boolean().catch(false),
  })
  .catch({ ...INITIAL_LEAD_FORM });

/**
 * Lenient parser for the anonymous `funnel_sessions.state` blob: every field falls back
 * to the blank funnel's default instead of rejecting the whole row.
 */
export const sessionStateSchema = z.object({
  step: z.enum(['intro', 'persona', 'questions', 'config', 'lead', 'done']).catch('config'),
  url: str(),
  siteNotes: str(),
  siteFiles: files,
  persona: nullableStr,
  answers: answersSchema,
  bundle: nullableStr,
  sel: z.record(z.string(), z.boolean()).catch({}),
  recSel: z.record(z.string(), z.boolean()).catch({}),
  qty: z.record(z.string(), z.number().int().min(0).max(100)).catch({}),
  selectedSubAddons: z.record(z.string(), z.array(z.string().max(64)).max(20)).catch({}),
  care: nullableStr,
  support: str('none'),
  cf: str('none'),
  backupUp: z.boolean().catch(false),
  aiBundle: z.boolean().catch(false),
  payYearly: z.boolean().catch(true),
  promoInput: str(),
  voucher: voucherSchema,
  lead: leadFormSchema,
  s2: z.record(z.string(), z.string().max(5000)).catch({}),
  goal: nullableStr,
  drive: str(),
  logoFiles: files,
  fotoFiles: files,
});

export function normalizeSessionState(raw: unknown): SessionState {
  const input = raw && typeof raw === 'object' ? raw : {};
  return sessionStateSchema.parse(input) as SessionState;
}

/** Mirror of `useSelection()` (src/components/funnel/hooks.ts) for a stored session. */
export function selectionFromState(state: SessionState, catalog: Catalog): Selection {
  const answers: Answers = { ...EMPTY_ANSWERS, ...state.answers };
  let bundle = currentBundle(
    { bundle: state.bundle, answers, persona: state.persona, url: state.url },
    catalog,
  );
  // A bundle deactivated in the CMS after the session was saved must not crash pricing.
  if (!catalog.bundles.some((b) => b.id === bundle)) bundle = catalog.defaultBundle;
  return {
    answers,
    personaId: state.persona,
    sourceUrl: state.url,
    bundle,
    selectedAddons: state.sel,
    qty: state.qty,
    selectedSubAddons: state.selectedSubAddons,
    care: state.care || catalog.defaultCarePlan,
    support: state.support,
    cf: state.cf,
    backupUp: state.backupUp,
    aiBundle: state.aiBundle,
    payYearly: state.payYearly,
    voucher: state.voucher,
  };
}

export interface SubmissionParts {
  selection: Selection;
  lead: LeadForm;
  siteNotes?: string;
  stage2?: Stage2Data | null;
}

/** The session a submit would have produced — used when the customer's row is missing. */
export function stateFromSubmission(parts: SubmissionParts, catalog: Catalog): SessionState {
  const { selection, lead } = parts;
  const recommended = recSet(catalog, selection.answers, selection.personaId, selection.bundle, selection.sourceUrl);
  return {
    step: 'config',
    url: selection.sourceUrl,
    siteNotes: parts.siteNotes ?? '',
    siteFiles: [],
    persona: selection.personaId,
    answers: { ...EMPTY_ANSWERS, ...selection.answers },
    bundle: selection.bundle,
    sel: { ...selection.selectedAddons },
    recSel: recommended,
    qty: { ...selection.qty },
    selectedSubAddons: { ...selection.selectedSubAddons },
    care: selection.care,
    support: selection.support,
    cf: selection.cf,
    backupUp: selection.backupUp,
    aiBundle: selection.aiBundle,
    payYearly: selection.payYearly,
    promoInput: selection.voucher?.code ?? '',
    voucher: selection.voucher,
    lead: { ...lead },
    s2: { ...(parts.stage2?.fields ?? {}) },
    goal: parts.stage2?.goal ?? null,
    drive: parts.stage2?.driveLink ?? '',
    logoFiles: [],
    fotoFiles: [],
  };
}

type LeadLike = Pick<
  Lead,
  'locale' | 'vorname' | 'nachname' | 'firma' | 'email' | 'telefon' | 'ziel' | 'consent_at' | 'persona_id' | 'source_url' | 'config' | 'stage2'
>;

/** The `Selection` a stored lead snapshot describes (add-ons from `config.addons`). */
export function selectionFromLeadConfig(config: LeadConfig, lead: Pick<LeadLike, 'persona_id' | 'source_url'>, catalog: Catalog): Selection {
  const selectedAddons: Record<string, boolean> = {};
  const qty: Record<string, number> = {};
  const selectedSubAddons: Record<string, string[]> = {};
  for (const a of config.addons ?? []) {
    selectedAddons[a.id] = true;
    if (a.qty != null) qty[a.id] = a.qty;
    if (a.subAddons?.length) selectedSubAddons[a.id] = a.subAddons;
  }
  let bundle = config.bundle;
  if (!catalog.bundles.some((b) => b.id === bundle)) bundle = catalog.defaultBundle;
  const voucher: Voucher | null = config.voucher
    ? { code: config.voucher.code, percent: config.voucher.percent, scope: config.voucher.scope }
    : null;
  return {
    answers: { ...EMPTY_ANSWERS, ...(config.answers ?? {}) },
    personaId: lead.persona_id,
    sourceUrl: lead.source_url ?? '',
    bundle,
    selectedAddons,
    qty,
    selectedSubAddons,
    care: config.care || catalog.defaultCarePlan,
    support: config.support || 'none',
    cf: config.cf || 'none',
    backupUp: !!config.backupUp,
    aiBundle: !!config.aiBundle,
    payYearly: config.payYearly !== false,
    voucher,
  };
}

/** A live funnel session for an existing lead (legacy leads, team drafts). */
export function stateFromLead(lead: LeadLike, catalog: Catalog): SessionState {
  const selection = selectionFromLeadConfig(lead.config, lead, catalog);
  return stateFromSubmission(
    {
      selection,
      lead: {
        vorname: lead.vorname ?? '',
        nachname: lead.nachname ?? '',
        firma: lead.firma ?? '',
        email: lead.email ?? '',
        tel: lead.telefon ?? '',
        ziel: lead.ziel ?? '',
        consent: !!lead.consent_at,
      },
      siteNotes: lead.config?.siteNotes ?? '',
      stage2: lead.stage2,
    },
    catalog,
  );
}
