import type { Locale, RuleCondition } from '@/lib/types';
import {
  DEFAULT_MAX_CHARS,
  DEFAULT_SUB_MAX_CHARS,
  DONT_KNOW_VALUE,
  HARD_MAX_ROWS,
} from './limits';
import type {
  Answer,
  Answers,
  FieldOption,
  FormFlag,
  Gap,
  OnbField,
  OnboardingDefinition,
  RepeaterRow,
  RepeaterSubField,
} from './types';
import { cap, loc } from './types';

/* ------------------------------------------------------------------ values */

const TEXT_TYPES = new Set(['text', 'textarea', 'url', 'email', 'tel']);

export function isTextType(type: string): boolean {
  return TEXT_TYPES.has(type);
}

/** Non-empty, trimmed lines of a text. */
export function linesOf(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export function textOf(answer: Answer | undefined): string {
  return typeof answer?.v === 'string' ? answer.v : '';
}

export function rowsOf(answer: Answer | undefined): RepeaterRow[] {
  return Array.isArray(answer?.v) && answer.v.every((r) => typeof r === 'object' && r !== null)
    ? (answer.v as RepeaterRow[])
    : [];
}

function rowIsBlank(row: RepeaterRow): boolean {
  return Object.entries(row).every(([k, v]) => k === '_id' || v == null || String(v).trim() === '');
}

/** True when the answer carries no usable value ("don't know" counts as answered). */
export function isEmpty(answer: Answer | undefined): boolean {
  if (!answer) return true;
  if (answer.dk) return false;
  // "Nothing comes to mind" is an answer, not a blank.
  if (answer.none) return false;
  const v = answer.v;
  if (v == null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (typeof v === 'number') return !Number.isFinite(v);
  if (Array.isArray(v)) {
    if (!v.length) return true;
    if (typeof v[0] === 'object') return (v as RepeaterRow[]).every(rowIsBlank);
    return false;
  }
  return Object.keys(v).length === 0;
}

/** Files a form has uploaded, counted per upload field. */
export type FileCounts = Record<string, number>;

/** Whether a field "has a value" for required_unless / follow-up purposes. */
export function hasValue(field: OnbField | undefined, answers: Answers, files: FileCounts): boolean {
  if (!field) return false;
  if (field.type === 'upload') return (files[field.id] ?? 0) > 0;
  return !isEmpty(answers[field.id]);
}

/* ------------------------------------------------------------------ conditions */

/**
 * The values a condition clause compares against. A "don't know" answer resolves to the
 * DONT_KNOW pseudo-value so rules can target it; multi-selects resolve to their list.
 */
function conditionValues(answer: Answer | undefined): string[] | null {
  if (!answer) return null;
  if (answer.dk) return [DONT_KNOW_VALUE];
  const v = answer.v;
  if (v == null) return null;
  if (typeof v === 'string') return v === '' ? null : [v];
  if (typeof v === 'number') return [String(v)];
  if (Array.isArray(v)) return v.length && typeof v[0] === 'string' ? (v as string[]) : null;
  return null;
}

/** Condition value that matches any answer, as `url: '__set'` does in the catalog rules. */
export const ANY_VALUE = '__set';

/**
 * Same shape as the catalog rules (`src/lib/pricing/rules.ts`) with two form-specific
 * twists: a clause on a HIDDEN field is false even when negated (a reveal can never be
 * resurrected by a field the client can't see), and a clause on an UNANSWERED field is
 * false even when negated (`languages ≠ single` must not show the translation fields
 * before languages was answered).
 */
export function matches(conditions: RuleCondition[], answers: Answers, hidden: ReadonlySet<string> = new Set()): boolean {
  return conditions.every((clause) => {
    if (hidden.has(clause.key)) return false;
    const actual = conditionValues(answers[clause.key]);
    if (actual === null) return false;
    // `__set` matches any answer at all, for reveals that only need "they filled this in".
    const hit = clause.values.includes(ANY_VALUE) || actual.some((v) => clause.values.includes(v));
    return clause.negate ? !hit : hit;
  });
}

/* ------------------------------------------------------------------ visibility */

export interface Visibility {
  visible: OnbField[];
  hidden: Set<string>;
}

/**
 * One ordered pass over the definition. The CMS lint guarantees a field's dependencies
 * come earlier, so a single pass settles every reveal.
 */
export function visibility(fields: OnbField[], answers: Answers): Visibility {
  const hidden = new Set<string>();
  const visible: OnbField[] = [];
  for (const field of fields) {
    if (matches(field.show_when, answers, hidden)) visible.push(field);
    else hidden.add(field.id);
  }
  return { visible, hidden };
}

export function isVisible(field: OnbField, fields: OnbField[], answers: Answers): boolean {
  return !visibility(fields, answers).hidden.has(field.id);
}

/**
 * Drop the answers of hidden fields (spec §03: hiding a field must clear its value).
 * Runs in definition order on the progressively cleared map, so clearing one field can
 * hide — and clear — a field that depended on it. `removed` lets the client stash the
 * values and restore them if the client toggles back within the session.
 */
export function clearHidden(fields: OnbField[], answers: Answers): { answers: Answers; removed: Answers } {
  const next: Answers = { ...answers };
  const removed: Answers = {};
  const hidden = new Set<string>();
  for (const field of fields) {
    if (matches(field.show_when, next, hidden)) continue;
    hidden.add(field.id);
    if (field.id in next) {
      removed[field.id] = next[field.id];
      delete next[field.id];
    }
  }
  // Answers for keys that no longer exist in the definition are dropped as well.
  const known = new Set(fields.map((f) => f.id));
  for (const key of Object.keys(next)) {
    if (!known.has(key)) {
      removed[key] = next[key];
      delete next[key];
    }
  }
  return { answers: next, removed };
}

/* ------------------------------------------------------------------ validation */

export type ErrorCode =
  | 'required'
  | 'invalid_email'
  | 'invalid_url'
  | 'invalid_tel'
  | 'invalid_number'
  | 'invalid_date'
  | 'invalid_option'
  | 'min'
  | 'max'
  | 'max_chars'
  | 'date_min'
  | 'checkboxes_min'
  | 'checkboxes_max'
  | 'checkboxes_exclusive'
  | 'ranking_exact'
  | 'ranking_min'
  | 'ranking_max'
  | 'rows_min'
  | 'rows_max';

export interface FieldError {
  field: string;
  code: ErrorCode;
  row_id?: string;
  sub?: string;
  /** Interpolation values for the message (limits, bucket labels). */
  params?: Record<string, string | number>;
}

export interface ValidationContext {
  answers: Answers;
  files: FileCounts;
  /** ISO date (YYYY-MM-DD) used for `min_date: 'today'`. */
  today: string;
  fields: OnbField[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const URL_RE = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isRequiredNow(field: OnbField, ctx: Pick<ValidationContext, 'answers' | 'files' | 'fields'>): boolean {
  if (!field.required) return false;
  const unless = field.config.required_unless;
  if (!unless) return true;
  const other = ctx.fields.find((f) => f.id === unless);
  return !hasValue(other, ctx.answers, ctx.files);
}

function checkText(
  type: string,
  value: string,
  maxChars: number | undefined,
): { code: ErrorCode; params?: Record<string, string | number> } | null {
  const text = value.trim();
  if (!text) return null;
  const limit = maxChars ?? DEFAULT_MAX_CHARS[type as keyof typeof DEFAULT_MAX_CHARS] ?? DEFAULT_MAX_CHARS.textarea!;
  if (text.length > limit) return { code: 'max_chars', params: { max: limit } };
  if (type === 'email' && !EMAIL_RE.test(text)) return { code: 'invalid_email' };
  if (type === 'url' && !URL_RE.test(text)) return { code: 'invalid_url' };
  if (type === 'tel' && text.replace(/\D/g, '').length < 6) return { code: 'invalid_tel' };
  return null;
}

function validateRepeater(field: OnbField, answer: Answer | undefined, required: boolean): FieldError[] {
  const errors: FieldError[] = [];
  const subs = field.config.fields ?? [];
  const rows = rowsOf(answer).filter((r) => !rowIsBlank(r));
  const minRows = required ? Math.max(1, field.config.min_rows ?? 1) : 0;
  const maxRows = Math.min(field.config.max_rows ?? HARD_MAX_ROWS, HARD_MAX_ROWS);
  if (rows.length < minRows) {
    errors.push(rows.length === 0 ? { field: field.id, code: 'required' } : { field: field.id, code: 'rows_min', params: { min: minRows } });
    if (rows.length === 0) return errors;
  }
  if (rows.length > maxRows) errors.push({ field: field.id, code: 'rows_max', params: { max: maxRows } });
  for (const row of rows) {
    for (const sub of subs) {
      const raw = row[sub.key];
      const text = raw == null ? '' : String(raw).trim();
      if (!text) {
        if (sub.required) errors.push({ field: field.id, code: 'required', row_id: row._id, sub: sub.key });
        continue;
      }
      if (sub.type === 'select') {
        if (!(sub.options ?? []).some((o) => o.value === text))
          errors.push({ field: field.id, code: 'invalid_option', row_id: row._id, sub: sub.key });
      } else if (sub.type === 'number') {
        if (!Number.isFinite(Number(text))) errors.push({ field: field.id, code: 'invalid_number', row_id: row._id, sub: sub.key });
      } else {
        const problem = checkText(sub.type, text, sub.max_chars ?? DEFAULT_SUB_MAX_CHARS);
        if (problem) errors.push({ field: field.id, code: problem.code, row_id: row._id, sub: sub.key, params: problem.params });
      }
    }
  }
  return errors;
}

export function rankingCounts(field: OnbField, value: Record<string, string>): Record<string, number> {
  const buckets = field.config.buckets ?? [];
  const fallback = buckets.find((b) => b.default)?.value;
  const counts: Record<string, number> = Object.fromEntries(buckets.map((b) => [b.value, 0]));
  for (const option of field.options) {
    const bucket = value[option.value] ?? fallback;
    if (bucket && bucket in counts) counts[bucket] += 1;
  }
  return counts;
}

function validateRanking(field: OnbField, answer: Answer | undefined, required: boolean, locale: Locale): FieldError[] {
  const value = (answer?.v && typeof answer.v === 'object' && !Array.isArray(answer.v) ? answer.v : {}) as Record<string, string>;
  if (!Object.keys(value).length) return required ? [{ field: field.id, code: 'required' }] : [];
  const errors: FieldError[] = [];
  const counts = rankingCounts(field, value);
  for (const bucket of field.config.buckets ?? []) {
    const n = counts[bucket.value] ?? 0;
    const label = loc(bucket as unknown as Record<string, unknown>, 'label', locale);
    if (bucket.min != null && bucket.max != null && bucket.min === bucket.max && n !== bucket.min) {
      errors.push({ field: field.id, code: 'ranking_exact', params: { bucket: label, n: bucket.min } });
    } else if (bucket.min != null && n < bucket.min) {
      errors.push({ field: field.id, code: 'ranking_min', params: { bucket: label, n: bucket.min } });
    } else if (bucket.max != null && n > bucket.max) {
      errors.push({ field: field.id, code: 'ranking_max', params: { bucket: label, n: bucket.max } });
    }
  }
  return errors;
}

/** A field offers the "we don't have one" tick when the CMS gave it a label for it. */
export function hasNoneOption(field: OnbField): boolean {
  return !!(field.config.none_label_de || field.config.none_label_en);
}

/**
 * Deterministic per-field validation. Returns error codes (translated by the UI), never
 * text. `locale` only matters for bucket labels carried in ranking error params.
 */
export function validateField(field: OnbField, ctx: ValidationContext, locale: Locale = 'de'): FieldError[] {
  const answer = ctx.answers[field.id];
  const required = isRequiredNow(field, ctx);
  if (field.type === 'notice') return [];
  if (answer?.dk) return field.allow_dont_know ? [] : [{ field: field.id, code: 'invalid_option' }];
  // "We don't have one" is a complete answer and carries no value of its own, so it has to
  // short-circuit the type checks below — otherwise a required field can never be satisfied.
  if (answer?.none) return hasNoneOption(field) ? [] : [{ field: field.id, code: 'invalid_option' }];

  if (field.type === 'upload') {
    return required && !(ctx.files[field.id] > 0) ? [{ field: field.id, code: 'required' }] : [];
  }
  if (field.type === 'repeater') return validateRepeater(field, answer, required);
  if (field.type === 'ranking') return validateRanking(field, answer, required, locale);

  if (isEmpty(answer)) return required ? [{ field: field.id, code: 'required' }] : [];
  const v = answer!.v;
  const cfg = field.config;

  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'url':
    case 'email':
    case 'tel': {
      if (typeof v !== 'string') return [{ field: field.id, code: 'invalid_option' }];
      const problem = checkText(field.type, v, cfg.max_chars);
      return problem ? [{ field: field.id, code: problem.code, params: problem.params }] : [];
    }
    case 'number': {
      const n = typeof v === 'number' ? v : Number(v);
      if (!Number.isFinite(n)) return [{ field: field.id, code: 'invalid_number' }];
      if (cfg.min != null && n < cfg.min) return [{ field: field.id, code: 'min', params: { min: cfg.min } }];
      if (cfg.max != null && n > cfg.max) return [{ field: field.id, code: 'max', params: { max: cfg.max } }];
      return [];
    }
    case 'date': {
      if (typeof v !== 'string' || !DATE_RE.test(v) || Number.isNaN(Date.parse(v))) return [{ field: field.id, code: 'invalid_date' }];
      const min = cfg.min_date === 'today' ? ctx.today : cfg.min_date;
      if (min && v < min) return [{ field: field.id, code: 'date_min', params: { min } }];
      return [];
    }
    case 'radio':
    case 'select': {
      return typeof v === 'string' && field.options.some((o) => o.value === v) ? [] : [{ field: field.id, code: 'invalid_option' }];
    }
    case 'checkboxes': {
      if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) return [{ field: field.id, code: 'invalid_option' }];
      const picked = v as string[];
      const allowed = new Set(field.options.map((o) => o.value));
      if (picked.some((x) => !allowed.has(x))) return [{ field: field.id, code: 'invalid_option' }];
      const errors: FieldError[] = [];
      const exclusive = (cfg.exclusive ?? []).filter((x) => picked.includes(x));
      if (exclusive.length && picked.length > 1) errors.push({ field: field.id, code: 'checkboxes_exclusive' });
      if (cfg.min_checked != null && picked.length < cfg.min_checked) errors.push({ field: field.id, code: 'checkboxes_min', params: { min: cfg.min_checked } });
      if (cfg.max_checked != null && picked.length > cfg.max_checked) errors.push({ field: field.id, code: 'checkboxes_max', params: { max: cfg.max_checked } });
      return errors;
    }
    case 'slider': {
      const n = typeof v === 'number' ? v : Number(v);
      const min = cfg.min ?? 1;
      const max = cfg.max ?? 5;
      return Number.isInteger(n) && n >= min && n <= max ? [] : [{ field: field.id, code: 'invalid_option' }];
    }
    default:
      return [];
  }
}

/** Validate the visible fields of one screen. */
export function validateScreen(
  definition: Pick<OnboardingDefinition, 'fields'>,
  screenId: string,
  answers: Answers,
  files: FileCounts,
  today: string,
  locale: Locale = 'de',
): FieldError[] {
  const { visible } = visibility(definition.fields, answers);
  const ctx: ValidationContext = { answers, files, today, fields: definition.fields };
  return visible.filter((f) => f.screen_id === screenId).flatMap((f) => validateField(f, ctx, locale));
}

/** Validate every visible field of every question screen. */
export function validateAll(
  definition: Pick<OnboardingDefinition, 'fields'>,
  answers: Answers,
  files: FileCounts,
  today: string,
  locale: Locale = 'de',
): FieldError[] {
  const { visible } = visibility(definition.fields, answers);
  const ctx: ValidationContext = { answers, files, today, fields: definition.fields };
  return visible.flatMap((f) => validateField(f, ctx, locale));
}

/* ------------------------------------------------------------------ gaps */

/**
 * What the review step works from: every visible field that is empty, answered with
 * "don't know", thinner than its minimum, or an upload without files. Rules decide WHAT
 * is missing; the model only decides how to ask (spec §06, Job 1).
 */
export function computeGaps(definition: Pick<OnboardingDefinition, 'fields'>, answers: Answers, files: FileCounts): Gap[] {
  const gaps: Gap[] = [];
  const { visible } = visibility(definition.fields, answers);
  const ctx = { answers, files, fields: definition.fields };
  for (const field of visible) {
    if (field.type === 'notice') continue;
    const answer = answers[field.id];
    const required = isRequiredNow(field, ctx);

    if (answer?.dk) {
      gaps.push({ field: field.id, kind: 'dont_know' });
      continue;
    }
    // An explicit "nothing comes to mind" needs no follow-up.
    if (answer?.none) continue;
    if (field.type === 'upload') {
      if (required && !(files[field.id] > 0)) gaps.push({ field: field.id, kind: 'no_files' });
      continue;
    }
    if (isEmpty(answer)) {
      if (required) gaps.push({ field: field.id, kind: 'empty' });
      continue;
    }
    if (isTextType(field.type)) {
      const text = textOf(answer);
      const thinLines = field.config.min_lines != null && linesOf(text).length < field.config.min_lines;
      const thinChars = field.config.min_chars != null && text.trim().length < field.config.min_chars;
      if (thinLines || thinChars) gaps.push({ field: field.id, kind: 'thin' });
    }
    if (field.type === 'repeater') {
      for (const row of rowsOf(answer)) {
        if (rowIsBlank(row)) continue;
        for (const sub of field.config.fields ?? []) {
          const text = row[sub.key] == null ? '' : String(row[sub.key]).trim();
          if (sub.min_chars != null && text.length < sub.min_chars) {
            gaps.push({ field: field.id, kind: 'thin', row_id: row._id, sub: sub.key });
          }
        }
      }
    }
  }
  return gaps;
}

/* ------------------------------------------------------------------ flags */

export interface FlagContext {
  /** Number of credential-looking strings the redaction removed so far. */
  redactions?: number;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Top-level page count implied by `page_list` (sub-pages count too — they are pages). */
export function listedPages(answers: Answers): number {
  return linesOf(textOf(answers.page_list)).length;
}

/**
 * Rule flags (CMS) plus the three computed ones: scope_flag (listed pages vs the booked
 * band), date_conflict (content date leaves less than the minimum build time before the
 * launch date) and credentials_redacted. Deduplicated by code + detail.
 */
export function computeFlags(
  definition: Pick<OnboardingDefinition, 'fields' | 'flagRules' | 'settings'>,
  answers: Answers,
  ctx: FlagContext = {},
): FormFlag[] {
  const { hidden } = visibility(definition.fields, answers);
  const flags: FormFlag[] = [];

  for (const rule of definition.flagRules) {
    if (matches(rule.conditions, answers, hidden)) {
      flags.push({ code: rule.code, detail: rule.detail, severity: rule.severity, source: 'rule' });
    }
  }

  // scope_flag — the seam between the quoted page band and what the client actually lists.
  const bandField = definition.fields.find((f) => f.id === 'booked_page_band');
  const band = bandField?.options.find((o) => o.value === answers.booked_page_band?.v);
  if (band && !hidden.has('booked_page_band')) {
    const count = typeof answers.page_count?.v === 'number' ? answers.page_count.v : Number(answers.page_count?.v ?? 0);
    const listed = Math.max(listedPages(answers), Number.isFinite(count) ? count : 0);
    if (listed > 0) {
      const tooMany = band.max != null && listed > band.max;
      const tooFew = band.min != null && listed < band.min;
      if (tooMany || tooFew) {
        flags.push({
          code: 'scope_flag',
          detail: tooMany ? 'over' : 'under',
          severity: tooMany ? 'sales' : 'info',
          source: 'system',
          data: { quoted: band.value, quoted_min: band.min ?? null, quoted_max: band.max ?? null, listed },
        });
      }
    }
  }

  // date_conflict — content arrives too late for the minimum build time before launch.
  const launch = textOf(answers.launch_date);
  const content = textOf(answers.content_ready_date);
  if (DATE_RE.test(launch) && DATE_RE.test(content)) {
    const earliestLaunch = addDays(content, definition.settings.buildWeeksMin * 7);
    if (launch < earliestLaunch) {
      flags.push({
        code: 'date_conflict',
        detail: null,
        severity: 'warn',
        source: 'system',
        data: { launch_date: launch, content_ready_date: content, build_weeks_min: definition.settings.buildWeeksMin },
      });
    }
  }

  if ((ctx.redactions ?? 0) > 0) {
    flags.push({ code: 'credentials_redacted', detail: null, severity: 'warn', source: 'system', data: { count: ctx.redactions } });
  }

  const seen = new Set<string>();
  return flags.filter((f) => {
    const key = `${f.code}|${f.detail ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Keep flags raised by follow-ups/LLM (not recomputable) and replace the rest. */
export function mergeFlags(previous: FormFlag[], recomputed: FormFlag[]): FormFlag[] {
  const kept = previous.filter((f) => f.source === 'followup' || f.source === 'llm');
  const keys = new Set(kept.map((f) => `${f.code}|${f.detail ?? ''}`));
  return [...kept, ...recomputed.filter((f) => !keys.has(`${f.code}|${f.detail ?? ''}`))];
}

/* ------------------------------------------------------------------ merge & size */

/** Apply a field-level patch; `null` deletes the key. */
export function mergePatch(current: Answers, changes: Record<string, Answer | null>): Answers {
  const next: Answers = { ...current };
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) delete next[key];
    else next[key] = value;
  }
  return next;
}

export function answersBytes(answers: Answers): number {
  return new TextEncoder().encode(JSON.stringify(answers)).length;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** Cheap, stable fingerprint of the answers — lets the review skip the model when nothing changed. */
export function hashAnswers(answers: Answers): string {
  const text = stableStringify(answers);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/* ------------------------------------------------------------------ labels */

export function optionLabel(field: OnbField, value: string, locale: Locale): string {
  const option = field.options.find((o) => o.value === value);
  return option ? loc(option as unknown as Record<string, unknown>, 'label', locale) : value;
}

export function sliderLabel(field: OnbField, value: number, locale: Locale): string {
  const min = field.config.min ?? 1;
  return cap(field.config.captions?.[value - min], locale);
}

export function bucketLabel(field: OnbField, bucket: string, locale: Locale): string {
  const found = (field.config.buckets ?? []).find((b) => b.value === bucket);
  return found ? loc(found as unknown as Record<string, unknown>, 'label', locale) : bucket;
}

export function subFieldOf(field: OnbField, key: string): RepeaterSubField | undefined {
  return (field.config.fields ?? []).find((s) => s.key === key);
}

export function fieldLabel(field: OnbField, locale: Locale): string {
  return loc(field as unknown as Record<string, unknown>, 'label', locale);
}

export function optionOf(field: OnbField, value: string): FieldOption | undefined {
  return field.options.find((o) => o.value === value);
}
