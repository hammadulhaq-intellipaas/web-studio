import type { Answers, Catalog, Voucher } from '@/lib/types';
import { recommend } from '@/lib/pricing/recommend';

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
  /** `won` / `lost`: the customer's changes are no longer saved. */
  locked: boolean;
  /** Team-created draft (the customer has not submitted anything yet). */
  draft: boolean;
  submittedAt: string | null;
  /** Whether the customer already gave GDPR consent (hides the checkbox on resubmit). */
  hasConsent: boolean;
  oneTime: number;
  monthly: number;
  locale: 'de' | 'en';
}
