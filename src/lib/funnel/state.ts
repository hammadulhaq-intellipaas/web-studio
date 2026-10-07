import type { Answers, Catalog, Voucher } from '@/lib/types';
import { recommend } from '@/lib/pricing/recommend';
import { qtyOf, subAddonsOf } from '@/lib/pricing/engine';

/**
 * The funnel's data shapes, kept free of React/zustand so server code (the quotes
 * pipeline, pricing a stored session, minting a session for a lead) can share them with
 * the client store in `src/stores/funnel.ts`.
 */

export type FunnelStep = 'intro' | 'persona' | 'questions' | 'config' | 'lead' | 'done';

export interface LeadForm {
  vorname: string;
  nachname: string;
  firma: string;
  email: string;
  tel: string;
  ziel: string;
  consent: boolean;
}

export interface UploadedFile {
  name: string;
}

/** Files uploaded before a lead exists; keyed to the funnel session. */
export type FileKind = 'logo' | 'foto' | 'site';

export const INITIAL_LEAD_FORM: LeadForm = {
  vorname: '',
  nachname: '',
  firma: '',
  email: '',
  tel: '',
  ziel: '',
  consent: false,
};

/**
 * The slice of funnel state mirrored to `funnel_sessions` so a shared `?c=<id>` link
 * reopens the questionnaire exactly as it was left — answers, configuration, voucher
 * and contact details included.
 */
export interface SessionState {
  step: FunnelStep;
  url: string;
  siteNotes: string;
  siteFiles: UploadedFile[];
  persona: string | null;
  answers: Answers;
  bundle: string | null;
  sel: Record<string, boolean>;
  recSel: Record<string, boolean>;
  qty: Record<string, number>;
  selectedSubAddons: Record<string, string[]>;
  care: string | null;
  support: string;
  cf: string;
  backupUp: boolean;
  aiBundle: boolean;
  payYearly: boolean;
  promoInput: string;
  voucher: Voucher | null;
  lead: LeadForm;
  s2: Record<string, string>;
  goal: string | null;
  drive: string;
  logoFiles: UploadedFile[];
  fotoFiles: UploadedFile[];
}

/**
 * Everything on a quote that someone could save, as one comparable string. Where you are in
 * the funnel and a half-typed promo code are not part of the quote, so they never make it
 * read as changed.
 */
export function quoteContent(s: SessionState): string {
  const { step, promoInput, ...content } = toSessionState(s);
  void step;
  void promoInput;
  return JSON.stringify(content);
}

/** JSON with every object's keys sorted, so the order things were clicked in never counts. */
function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v);
}

/**
 * A quote reduced to what it means rather than how it got there: an add-on switched off
 * reads the same as one never picked, a quantity or sub-option left at its default the same
 * as one never touched, and the order things were picked in does not matter. Without the
 * catalog only the first and last apply.
 */
function canonicalQuote(content: string, catalog?: Catalog): string {
  const c = JSON.parse(content) as Partial<SessionState>;
  const truthy = (m?: Record<string, boolean>) =>
    Object.fromEntries(Object.entries(m ?? {}).filter(([, on]) => on));
  const addon = (id: string) => catalog?.addons.find((a) => a.id === id);
  const qty = Object.fromEntries(
    Object.entries(c.qty ?? {}).filter(([id, n]) => {
      const a = addon(id);
      return !a || n !== qtyOf(a, {});
    }),
  );
  const subs = Object.fromEntries(
    Object.entries(c.selectedSubAddons ?? {}).flatMap(([id, picked]) => {
      const a = addon(id);
      if (!a) return [[id, [...picked].sort()]];
      const resolved = subAddonsOf(a, { [id]: picked });
      const dflt = subAddonsOf(a, {});
      return resolved.join() === dflt.join() ? [] : [[id, resolved]];
    }),
  );
  return stableStringify({ ...c, sel: truthy(c.sel), recSel: truthy(c.recSel), qty, selectedSubAddons: subs });
}

/**
 * Does the quote on screen differ, in a way anyone would notice, from the one last saved?
 * Picking an add-on and then unpicking it again is not a change.
 */
export function hasUnsavedChanges(s: SessionState, savedSnapshot: string | null, catalog?: Catalog): boolean {
  if (!savedSnapshot) return false;
  return canonicalQuote(quoteContent(s), catalog) !== canonicalQuote(savedSnapshot, catalog);
}

export function toSessionState(s: SessionState): SessionState {
  return {
    // A shared link never drops the recipient into the finished screen.
    step: s.step === 'done' ? 'lead' : s.step,
    url: s.url,
    siteNotes: s.siteNotes,
    siteFiles: s.siteFiles,
    persona: s.persona,
    answers: s.answers,
    bundle: s.bundle,
    sel: s.sel,
    recSel: s.recSel,
    qty: s.qty,
    selectedSubAddons: s.selectedSubAddons,
    care: s.care,
    support: s.support,
    cf: s.cf,
    backupUp: s.backupUp,
    aiBundle: s.aiBundle,
    payYearly: s.payYearly,
    promoInput: s.promoInput,
    voucher: s.voucher,
    lead: s.lead,
    s2: s.s2,
    goal: s.goal,
    drive: s.drive,
    logoFiles: s.logoFiles,
    fotoFiles: s.fotoFiles,
  };
}

/** Resolve the effective bundle: explicit choice, else recommendation, else the CMS default. */
export function currentBundle(
  state: { bundle: string | null; answers: Answers; persona: string | null; url: string },
  catalog: Catalog,
): string {
  if (state.bundle) return state.bundle;
  if (state.persona) return recommend(catalog, state.answers, state.url).bundle;
  return catalog.defaultBundle;
}

/**
 * What the customer sees about their own quote when a session is bound to a lead.
 * Returned by `GET /api/sessions/[id]`; never carries owner, notes or the team's data.
 */
export interface QuoteMeta {
  leadId: string;
  status: string;
  /** `accepted` / `won` / `lost`: the customer's changes are no longer saved. */
  locked: boolean;
  /** Team-created draft (the customer has not submitted anything yet). */
  draft: boolean;
  submittedAt: string | null;
  /** Whether the customer already gave GDPR consent (hides the checkbox on resubmit). */
  hasConsent: boolean;
  oneTime: number;
  monthly: number;
  /**
   * Fingerprint of the configuration they last submitted. The browser compares its own
   * against this to know whether there is anything to send.
   */
  submitted: string | null;
  locale: 'de' | 'en';
}
