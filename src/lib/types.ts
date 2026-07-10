export type Locale = 'de' | 'en';

export type LocalizedText = { de: string; en: string };

export interface AddonCategory {
  id: string;
  name_de: string;
  name_en: string;
  note_de: string | null;
  note_en: string | null;
  sort: number;
}

export interface Bundle {
  id: string;
  name: string;
  tag_de: string;
  tag_en: string;
  price: number;
  chips: LocalizedText[];
  backup_upgrade_price: number | null;
  backup_upgrade_label_de: string | null;
  backup_upgrade_label_en: string | null;
  backup_base_label_de: string | null;
  backup_base_label_en: string | null;
  sort: number;
  active: boolean;
}

export interface AddonQty {
  min: number;
  max: number;
  unit_de: string;
  unit_en: string;
}

export interface AddonTier {
  n: number;
  price: number;
}

export interface Addon {
  id: string;
  category_id: string;
  name_de: string;
  name_en: string;
  note_de: string | null;
  note_en: string | null;
  billing: 'once' | 'monthly' | 'yearly';
  price_now: number;
  price_later: number | null;
  qty: AddonQty | null;
  tiers: AddonTier[] | null;
  included_in: string[];
  /** Addons covered by this one: selecting it includes them at no extra cost. */
  bundle_members: string[];
  byow_only: boolean;
  not_byow: boolean;
  ai_bundle_member: boolean;
  sort: number;
  active: boolean;
}

/**
 * One clause of a CMS rule. Every clause of a rule must match (AND).
 * `key` is an `Answers` field or a derived key: `byow` ('true'|'false'), `url` ('__set').
 */
export interface RuleCondition {
  key: string;
  values: string[];
  negate?: boolean;
}

export interface BundleRule {
  id: string;
  rule_kind: 'base' | 'upgrade';
  conditions: RuleCondition[];
  result_bundle: string;
  reason_key: string | null;
  priority: number;
  active: boolean;
}

export interface AddonRule {
  id: string;
  conditions: RuleCondition[];
  add_addon_ids: string[];
  remove_addon_ids: string[];
  note: string | null;
  active: boolean;
  sort: number;
}

export interface LegalPage {
  page_key: string;
  locale: Locale;
  title: string;
  content_markdown: string;
}

export interface CarePlan {
  id: string;
  name: string;
  price_monthly: number;
  desc_de: string;
  desc_en: string;
  short_de: string;
  short_en: string;
  recommended: boolean;
  sort: number;
}

export interface CloudflarePlan {
  id: string;
  name_de: string;
  name_en: string;
  setup_price: number | null;
  monthly_price: number | null;
  desc_de: string;
  desc_en: string;
  recommended: boolean;
  included_when: { care?: string; bundle?: string } | null;
  sort: number;
}

export interface SupportPlan {
  id: string;
  name_de: string;
  name_en: string;
  price_monthly: number | null;
  desc_de: string;
  desc_en: string;
  sort: number;
}

export interface Persona {
  id: string;
  label_de: string;
  label_en: string;
  icon_path: string;
  default_answers: Answers;
  preselect_addons: string[];
  sort: number;
}

export interface AiBundleConfig {
  setup_now: number;
  setup_later: number;
  monthly: number;
}

export interface Voucher {
  code: string;
  percent: number;
  scope: 'one_time' | 'recurring' | 'both';
}

/** Everything the public configurator needs, loaded once server-side. */
export interface Catalog {
  bundles: Bundle[];
  addonCategories: AddonCategory[];
  addons: Addon[];
  carePlans: CarePlan[];
  cloudflarePlans: CloudflarePlan[];
  supportPlans: SupportPlan[];
  personas: Persona[];
  bundleRules: BundleRule[];
  addonRules: AddonRule[];
  legalPages: LegalPage[];
  yearlyDiscountPct: number;
  aiBundle: AiBundleConfig;
  aiBundleBullets: LocalizedText[];
  trustItems: LocalizedText[];
  nextSteps: LocalizedText[];
  calendlyEventUrl: string;
  /** Fallback bundle when no base rule matches. */
  defaultBundle: string;
  defaultCarePlan: string;
  defaultCloudflarePlan: string;
  /** Addon category that hosts the AI Agentic Bundle CTA. */
  aiBundleCategory: string;
}

/** Answers collected in the question step (ported 1:1 from the prototype). */
export interface Answers {
  hasSite: string | null;
  selfbuilt: string | null;
  aiHas: string[];
  aiMissing: string[];
  byowScope?: string | null;
  pages: string | null;
  langs: string | null;
  contact: string | null;
  fees: string | null;
  shop: string | null;
  blog: string | null;
  assets: string | null;
}

/** The user's full configurator selection. */
export interface Selection {
  answers: Answers;
  personaId: string | null;
  sourceUrl: string;
  bundle: string; // resolved current bundle id
  selectedAddons: Record<string, boolean>;
  qty: Record<string, number>;
  care: string;
  support: string;
  cf: string;
  backupUp: boolean;
  aiBundle: boolean;
  payYearly: boolean;
  voucher: Voucher | null;
}

export interface Totals {
  oneTime: number;
  monthly: number; // before yearly discount / voucher
  yearly: number;
  monthlyDiscounted: number; // after yearly-pay discount
  oneTimeEffective: number; // after voucher
  monthlyEffective: number; // after yearly-pay discount + voucher
  yearlyEffective: number;
  voucherSavedOneTime: number;
  voucherSavedMonthly: number;
}

export interface SummaryLine {
  name: string;
  price: string;
  desc?: string;
  bold?: boolean;
}

export interface Summary {
  oneOff: SummaryLine[];
  monthly: SummaryLine[];
  yearly: SummaryLine[];
}

export interface Stage2Data {
  fields: Record<string, string>;
  goal: string | null;
  driveLink: string;
}

export interface SuggestedPlanPhase {
  key: string;
  title: string;
  tool: 'claude_design' | 'claude_code';
  prompt_markdown: string;
  inputs: string[];
}

export interface Lead {
  id: string;
  locale: Locale;
  vorname: string;
  nachname: string;
  firma: string;
  email: string;
  telefon: string;
  ziel: string | null;
  consent_at: string;
  persona_id: string | null;
  source_url: string | null;
  config: LeadConfig;
  total_one_time: number;
  total_monthly: number;
  total_yearly: number;
  voucher_id: string | null;
  stage2: Stage2Data | null;
  drive_link: string | null;
  goal: string | null;
  status: 'new' | 'contacted' | 'won' | 'lost';
  created_at: string;
  updated_at: string;
}

export interface LeadConfig {
  answers: Answers;
  /** Free-text notes about the customer's existing website / draft concept. */
  siteNotes?: string;
  bundle: string;
  bundleName: string;
  addons: { id: string; name: string; qty: number | null; billing: string; price: number }[];
  care: string;
  support: string;
  cf: string;
  backupUp: boolean;
  aiBundle: boolean;
  payYearly: boolean;
  voucher: Voucher | null;
  lines: {
    oneOff: { name: string; price: number }[];
    monthly: { name: string; price: number }[];
    yearly: { name: string; price: number }[];
  };
}

export interface Appointment {
  id: string;
  lead_id: string | null;
  calendly_event_uri: string;
  calendly_invitee_uri: string | null;
  invitee_name: string | null;
  invitee_email: string | null;
  start_time: string;
  end_time: string | null;
  status: 'scheduled' | 'canceled';
  cancel_reason: string | null;
  created_at: string;
}

export function pickLocale<T extends Record<string, unknown>>(
  row: T,
  field: string,
  locale: Locale,
): string {
  const val = row[`${field}_${locale}`] ?? row[`${field}_de`];
  return (val ?? '') as string;
}

export function lt(item: LocalizedText, locale: Locale): string {
  return item[locale] ?? item.de;
}
