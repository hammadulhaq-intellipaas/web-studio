import type { Locale, RuleCondition } from '@/lib/types';

/* ------------------------------------------------------------------ definition (CMS) */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'url'
  | 'email'
  | 'tel'
  | 'number'
  | 'date'
  | 'radio'
  | 'checkboxes'
  | 'select'
  | 'slider'
  | 'ranking'
  | 'repeater'
  | 'upload'
  | 'notice';

export type ScreenKind = 'questions' | 'review';

export interface OnbScreen {
  id: string;
  sort: number;
  kind: ScreenKind;
  title_de: string;
  title_en: string;
  /** Short label for the stepper dot; falls back to the title. */
  short_de: string | null;
  short_en: string | null;
  intro_de: string | null;
  intro_en: string | null;
  active: boolean;
}

export interface LocalizedCaption {
  de: string;
  en: string;
}

export interface FieldOption {
  value: string;
  label_de: string;
  label_en: string;
  hint_de?: string | null;
  hint_en?: string | null;
  /** Numeric range an option stands for (page bands). */
  min?: number | null;
  max?: number | null;
}

export type RepeaterSubType = 'text' | 'textarea' | 'url' | 'email' | 'tel' | 'number' | 'select';

export interface RepeaterSubField {
  key: string;
  type: RepeaterSubType;
  label_de: string;
  label_en: string;
  placeholder_de?: string | null;
  placeholder_en?: string | null;
  required?: boolean;
  min_chars?: number | null;
  max_chars?: number | null;
  options?: FieldOption[];
}

export interface RankingBucket {
  value: string;
  label_de: string;
  label_en: string;
  /** Exact-count constraints; `min: 1, max: 1` = "exactly one". */
  min?: number | null;
  max?: number | null;
  /** Bucket an unplaced item falls into. */
  default?: boolean;
}

/**
 * Per-type knobs stored in `onb_fields.config` (jsonb). Only the keys relevant to the
 * field's `type` are read; `validateField` in logic.ts is the source of truth for which.
 */
export interface FieldConfig {
  // text / textarea / url / email / tel
  min_chars?: number;
  max_chars?: number;
  /** Fewer non-empty lines than this counts as a thin answer (flagged, not blocked). */
  min_lines?: number;
  rows?: number;
  // number
  min?: number;
  max?: number;
  // date: 'today' or an ISO date
  min_date?: string;
  // slider
  captions?: LocalizedCaption[];
  examples?: LocalizedCaption[];
  // ranking
  buckets?: RankingBucket[];
  // repeater
  fields?: RepeaterSubField[];
  min_rows?: number;
  max_rows?: number;
  initial_rows?: number;
  add_label_de?: string;
  add_label_en?: string;
  // checkboxes
  min_checked?: number;
  max_checked?: number;
  /** Option values that clear every other tick when chosen ("none of these"). */
  exclusive?: string[];
  // upload
  accept?: string[];
  max_files?: number;
  max_mb?: number;
  // notice: which onb_texts key to render
  text_key?: string;
  tone?: 'info' | 'warn';
  /** A field that makes this one optional when it has a value/files ("one or the other"). */
  required_unless?: string;
  /** Show a link below the label whose href is the named app setting (when set). */
  link_setting?: string;
  link_label_de?: string;
  link_label_en?: string;
}

export interface OnbField {
  /** The field key; also the key in `answers` and the target of follow-ups/brief sources. */
  id: string;
  screen_id: string;
  sort: number;
  type: FieldType;
  label_de: string;
  label_en: string;
  help_de: string | null;
  help_en: string | null;
  placeholder_de: string | null;
  placeholder_en: string | null;
  required: boolean;
  /** Offers "I don't know / not sure" as a real answer (counts as answered, becomes a gap). */
  allow_dont_know: boolean;
  /** Free-text answers the LLM completeness pass may question for specificity. */
  ai_check: boolean;
  options: FieldOption[];
  config: FieldConfig;
  /** Every clause must match for the field to show. Hidden fields have their value cleared. */
  show_when: RuleCondition[];
  active: boolean;
}

export type FollowupWhen =
  | 'empty'
  | 'dont_know'
  | 'equals'
  | 'lt_chars'
  | 'lt_lines'
  | 'no_files'
  | 'flag';

export interface FollowupTrigger {
  /** Field the trigger inspects. Omitted for `dont_know` (any field) and `flag`. */
  field?: string;
  when: FollowupWhen;
  /** Compared value for `equals`, threshold for `lt_*`. */
  value?: string | number;
  /** Repeater sub-field for `lt_chars`/`empty` inside rows. */
  sub?: string;
  /** Flag code for `flag`. */
  flag?: string;
}

export interface QuickReply {
  value: string;
  label_de: string;
  label_en: string;
}

export type FollowupMode = 'set' | 'append' | 'acknowledge';

export interface FlagRef {
  code: string;
  detail: string | null;
}

export interface OnbFollowup {
  id: string;
  sort: number;
  trigger: FollowupTrigger;
  /** `{label}` is replaced with the triggering field's label. */
  question_de: string;
  question_en: string;
  quick_replies: QuickReply[];
  /** Field the answer is written to; null = recorded in the history only. */
  writes_to: string | null;
  mode: FollowupMode;
  /** Quick-reply value → flag raised when chosen. */
  raises: Record<string, FlagRef> | null;
  active: boolean;
}

export type FlagSeverity = 'info' | 'sales' | 'warn';

export interface OnbFlagRule {
  id: string;
  code: string;
  detail: string | null;
  severity: FlagSeverity;
  conditions: RuleCondition[];
  note_de: string | null;
  note_en: string | null;
  sort: number;
  active: boolean;
}

export interface OnbBriefSection {
  id: string;
  sort: number;
  title_de: string;
  title_en: string;
  /** Section-specific instructions for the brief writer (English, internal). */
  instructions: string | null;
  source_fields: string[];
  /** `system` sections are composed by code (the "what we still need" list). */
  generated_by: 'llm' | 'system';
  active: boolean;
}

export interface OnbText {
  id: string;
  key: string;
  locale: Locale;
  title: string;
  content_markdown: string;
}

export type PromptId = 'system' | 'completeness' | 'brief' | 'rewrite';

export interface OnbPrompt {
  id: PromptId;
  content: string;
  note: string | null;
}

export interface OnbExample {
  id: string;
  title: string;
  answers: Record<string, unknown>;
  brief: Record<string, unknown>;
  sort: number;
  active: boolean;
}

export interface OnboardingSettings {
  model: string;
  maxFollowups: number;
  maxRounds: number;
  maxRewrites: number;
  maxAiCalls: number;
  buildWeeksMin: number;
  buildWeeksMax: number;
  estimatedMinutes: number;
  termsVersion: string;
  examplesUrl: string;
  folderHelpUrl: string;
  teamEmail: string;
}

/** Everything the public form needs, loaded once per request. */
export interface OnboardingDefinition {
  screens: OnbScreen[];
  fields: OnbField[];
  followups: OnbFollowup[];
  flagRules: OnbFlagRule[];
  briefSections: OnbBriefSection[];
  texts: OnbText[];
  settings: OnboardingSettings;
}

/** Server-only: prompts and worked examples for the AI layer. */
export interface OnboardingSecrets {
  prompts: OnbPrompt[];
  examples: OnbExample[];
}

/* ------------------------------------------------------------------ runtime */

export interface RepeaterRow {
  _id: string;
  [key: string]: string | number | null | undefined;
}

export type AnswerValue = string | number | string[] | Record<string, string> | RepeaterRow[];

/**
 * One answer. `v` holds the typed value (see FieldType → value mapping in logic.ts);
 * `dk` marks "I don't know" (then `v` is null); `src` records where a value came from.
 */
export interface Answer {
  v: AnswerValue | null;
  dk?: true;
  src?: 'followup' | 'edit';
  /** Free text for a checkboxes "other" tick. */
  other?: string;
}

export type Answers = Record<string, Answer>;

export type FormStatus = 'in_progress' | 'review' | 'brief' | 'confirmed';

export type FlagSource = 'rule' | 'system' | 'llm' | 'followup';

export interface FormFlag {
  code: string;
  detail: string | null;
  severity: FlagSeverity;
  source: FlagSource;
  /** Extra data, e.g. `{ quoted: "5-8", listed: 11 }` for scope_flag. */
  data?: Record<string, unknown>;
}

export interface QuestionTarget {
  field: string;
  row_id?: string | null;
  sub?: string | null;
}

export interface ReviewQuestion {
  id: string;
  source: 'rule' | 'llm';
  followup_id: string | null;
  target: QuestionTarget | null;
  mode: FollowupMode;
  question: LocalizedCaption;
  quick_replies: QuickReply[];
  raises: Record<string, FlagRef> | null;
}

export interface ReviewHistoryEntry {
  question_id: string;
  followup_id: string | null;
  target: QuestionTarget | null;
  question: LocalizedCaption;
  answer: string | null;
  skipped: boolean;
  at: string;
}

export interface ReviewState {
  round: number;
  budget_left: number;
  /** Hash of the answers when the LLM pass last ran; unchanged answers skip the model. */
  answers_hash: string | null;
  queue: ReviewQuestion[];
  cursor: number;
  history: ReviewHistoryEntry[];
  /** Field keys the deterministic gap check found empty/thin/unsure at the last run. */
  gaps: Gap[];
}

export type GapKind = 'empty' | 'thin' | 'dont_know' | 'no_files' | 'skipped';

export interface Gap {
  field: string;
  kind: GapKind;
  row_id?: string | null;
  sub?: string | null;
}

export interface ConfirmedInfo {
  name: string;
  at: string;
  terms_version: string;
}

export interface DeliveryState {
  pdf_path: string | null;
  pdf_error: string | null;
  client_email_sent_at: string | null;
  team_email_sent_at: string | null;
  email_error: string | null;
}

export interface OnboardingFormRecord {
  id: string;
  locale: Locale;
  status: FormStatus;
  rev: number;
  current_step: string | null;
  name: string | null;
  company: string | null;
  email: string | null;
  answers: Answers;
  flags: FormFlag[];
  review: ReviewState | null;
  brief_version: number | null;
  confirmed: ConfirmedInfo | null;
  delivery: DeliveryState | null;
  ai_calls: number;
  save_link_sent_at: string | null;
  lead_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BriefSectionContent {
  content_markdown: string;
  still_needed: string[];
  sources: string[];
  edited?: boolean;
}

export type BriefSource = 'llm' | 'fallback' | 'rewrite' | 'client_edit';

export interface OnboardingBrief {
  id: string;
  form_id: string;
  version: number;
  source: BriefSource;
  model: string | null;
  sections: Record<string, BriefSectionContent>;
  created_at: string;
}

/* ------------------------------------------------------------------ helpers */

/** Resolve a `_de`/`_en` pair on any CMS row for the given locale, falling back to DE. */
export function loc<T extends Record<string, unknown>>(row: T, field: string, locale: Locale): string {
  const val = row[`${field}_${locale}`] ?? row[`${field}_de`];
  return (val ?? '') as string;
}

export function cap(item: LocalizedCaption | undefined, locale: Locale): string {
  if (!item) return '';
  return item[locale] ?? item.de;
}
