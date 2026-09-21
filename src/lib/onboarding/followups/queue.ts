import type { Locale } from '@/lib/types';
import { MAX_FOLLOWUP_CHARS } from '../limits';
import {
  fieldLabel,
  isEmpty,
  linesOf,
  optionLabel,
  rowsOf,
  textOf,
  visibility,
  type FileCounts,
} from '../logic';
import type {
  Answer,
  Answers,
  FormFlag,
  Gap,
  LlmQuestion,
  LocalizedCaption,
  OnbField,
  OnbFollowup,
  OnboardingDefinition,
  QuestionTarget,
  QuickReply,
  RepeaterRow,
  ReviewHistoryEntry,
  ReviewQuestion,
} from '../types';
import { cap } from '../types';

export type { LlmQuestion };

export interface QueueInput {
  definition: Pick<OnboardingDefinition, 'fields' | 'screens' | 'followups'>;
  answers: Answers;
  files: FileCounts;
  flags: FormFlag[];
  gaps: Gap[];
  history: ReviewHistoryEntry[];
  llmQuestions: LlmQuestion[];
  /** How many questions may still be asked. */
  budget: number;
}

/* ------------------------------------------------------------------ keys */

/** What makes two questions "the same": the cell they write to, or the rule that asked. */
export function dedupeKey(q: { target: QuestionTarget | null; followup_id: string | null; id: string }): string {
  if (q.target) return `t:${q.target.field}|${q.target.row_id ?? ''}|${q.target.sub ?? ''}`;
  return q.followup_id ? `fu:${q.followup_id}` : `q:${q.id}`;
}

function historyKeys(history: ReviewHistoryEntry[]): Set<string> {
  return new Set(history.map((h) => dedupeKey({ target: h.target, followup_id: h.followup_id, id: h.question_id })));
}

/* ------------------------------------------------------------------ rule questions */

function fill(template: string, label: string): string {
  return template.replace(/\{label\}/g, label);
}

function questionText(fu: OnbFollowup, field: OnbField | undefined, sub: string | null): LocalizedCaption {
  const labelFor = (locale: Locale) => {
    if (!field) return '';
    if (sub) {
      const s = (field.config.fields ?? []).find((x) => x.key === sub);
      if (s) return locale === 'de' ? s.label_de : s.label_en;
    }
    return fieldLabel(field, locale);
  };
  return { de: fill(fu.question_de, labelFor('de')), en: fill(fu.question_en, labelFor('en')) };
}

/** Radio/select targets answer with one of the field's options when the rule brings none. */
function quickRepliesFor(fu: OnbFollowup | null, field: OnbField | undefined, sub: string | null): QuickReply[] {
  if (fu && fu.quick_replies.length) return fu.quick_replies;
  if (!field) return [];
  if (sub) {
    const s = (field.config.fields ?? []).find((x) => x.key === sub);
    return s?.type === 'select' ? (s.options ?? []).map((o) => ({ value: o.value, label_de: o.label_de, label_en: o.label_en })) : [];
  }
  if (field.type === 'radio' || field.type === 'select') {
    return field.options.map((o) => ({ value: o.value, label_de: o.label_de, label_en: o.label_en }));
  }
  return [];
}

/**
 * `labelField` fills `{label}` (the field that triggered the question); `targetField` is
 * the one the answer is written to and supplies the quick replies for choice fields.
 */
function make(
  fu: OnbFollowup,
  labelField: OnbField | undefined,
  targetField: OnbField | undefined,
  target: QuestionTarget | null,
  idSuffix = '',
): ReviewQuestion {
  return {
    id: `fu:${fu.id}${idSuffix}`,
    source: 'rule',
    followup_id: fu.id,
    target,
    mode: fu.mode,
    question: questionText(fu, labelField, target?.sub ?? null),
    quick_replies: quickRepliesFor(fu, targetField, target?.sub ?? null),
    raises: fu.raises,
  };
}

/** Evaluate every CMS follow-up trigger against the current record. */
export function ruleQuestions(input: Omit<QueueInput, 'llmQuestions' | 'budget' | 'history'>): ReviewQuestion[] {
  const { definition, answers, files, flags, gaps } = input;
  const byId = new Map(definition.fields.map((f) => [f.id, f]));
  const { hidden } = visibility(definition.fields, answers);
  const out: ReviewQuestion[] = [];

  for (const fu of definition.followups) {
    const t = fu.trigger;
    const writeField = fu.writes_to ? byId.get(fu.writes_to) : undefined;
    // Where the answer goes: the writes_to field, or nowhere (acknowledgements, history-only).
    const target: QuestionTarget | null = writeField && fu.mode !== 'acknowledge' ? { field: writeField.id } : null;

    if (t.when === 'flag') {
      if (flags.some((f) => f.code === t.flag)) out.push(make(fu, undefined, writeField, target));
      continue;
    }

    if (t.when === 'dont_know') {
      // "Don't know" questions always write back into the field that was unsure.
      const candidates = gaps.filter((g) => g.kind === 'dont_know' && (!t.field || g.field === t.field));
      for (const gap of candidates) {
        const field = byId.get(gap.field);
        if (!field || hidden.has(field.id)) continue;
        out.push(make(fu, field, field, { field: field.id }, `:${field.id}`));
      }
      continue;
    }

    if (!t.field) continue;
    const field = byId.get(t.field);
    if (!field || hidden.has(field.id)) continue;
    const answer = answers[field.id];

    if (t.sub && field.type === 'repeater') {
      // Per-row questions write into the thin cell itself.
      const threshold = Number(t.value ?? 0);
      for (const row of rowsOf(answer)) {
        const cell = row[t.sub] == null ? '' : String(row[t.sub]).trim();
        const rowHasContent = Object.entries(row).some(([k, v]) => k !== '_id' && v != null && String(v).trim() !== '');
        if (!rowHasContent) continue;
        const hit = t.when === 'empty' ? cell === '' : t.when === 'lt_chars' ? cell.length < threshold : false;
        if (hit) out.push(make(fu, field, field, { field: field.id, row_id: row._id, sub: t.sub }, `:${row._id}`));
      }
      continue;
    }

    let hit = false;
    switch (t.when) {
      case 'empty':
        hit = field.type !== 'upload' && !answer?.dk && isEmpty(answer);
        break;
      case 'no_files':
        hit = field.type === 'upload' && !(files[field.id] > 0);
        break;
      case 'equals':
        hit = !answer?.dk && conditionValue(answer) === String(t.value);
        break;
      case 'lt_lines':
        hit = !isEmpty(answer) && linesOf(textOf(answer)).length < Number(t.value ?? 0);
        break;
      case 'lt_chars':
        hit = !isEmpty(answer) && textOf(answer).trim().length < Number(t.value ?? 0);
        break;
    }
    if (hit) out.push(make(fu, field, writeField, target, t.when === 'equals' ? '' : `:${field.id}`));
  }
  return out;
}

function conditionValue(answer: Answer | undefined): string | null {
  const v = answer?.v;
  if (v == null) return null;
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  return null;
}

/* ------------------------------------------------------------------ merge */

function llmToQuestion(q: LlmQuestion, byId: Map<string, OnbField>, answers: Answers): ReviewQuestion | null {
  const field = byId.get(q.field);
  if (!field || field.type === 'notice' || field.type === 'upload') return null;
  let target: QuestionTarget = { field: field.id };
  if (q.row_id || q.sub) {
    if (field.type !== 'repeater' || !q.row_id || !q.sub) return null;
    const row = rowsOf(answers[field.id]).find((r) => r._id === q.row_id);
    const sub = (field.config.fields ?? []).find((s) => s.key === q.sub);
    if (!row || !sub) return null;
    target = { field: field.id, row_id: q.row_id, sub: q.sub };
  }
  const answer = answers[field.id];
  const mode = target.sub || isEmpty(answer) || answer?.dk ? 'set' : 'append';
  const isChoice = field.type === 'radio' || field.type === 'select';
  const quick: QuickReply[] = isChoice
    ? quickRepliesFor(null, field, null)
    : q.quick_replies.slice(0, 3).map((label) => ({ value: label, label_de: label, label_en: label }));
  return {
    id: `llm:${field.id}:${q.row_id ?? ''}:${q.sub ?? ''}`,
    source: 'llm',
    followup_id: null,
    target,
    mode,
    question: { de: q.question_de, en: q.question_en },
    quick_replies: quick,
    raises: null,
  };
}

/**
 * Rules first, model second: deterministic questions win on a shared target, nothing in
 * the history is asked twice, targeted questions run in form order, acknowledgements
 * last, and the whole list is cut to the remaining budget.
 */
export function buildQueue(input: QueueInput): ReviewQuestion[] {
  const byId = new Map(input.definition.fields.map((f) => [f.id, f]));
  const asked = historyKeys(input.history);
  const seen = new Set<string>();
  const merged: ReviewQuestion[] = [];

  const push = (q: ReviewQuestion) => {
    const key = dedupeKey(q);
    if (asked.has(key) || seen.has(key)) return;
    seen.add(key);
    merged.push(q);
  };

  for (const q of ruleQuestions(input)) push(q);
  for (const raw of input.llmQuestions) {
    const q = llmToQuestion(raw, byId, input.answers);
    if (q) push(q);
  }

  const screenSort = new Map(input.definition.screens.map((s) => [s.id, s.sort]));
  const order = (q: ReviewQuestion): [number, number, number] => {
    if (!q.target) return [Number.MAX_SAFE_INTEGER, 0, 0];
    const field = byId.get(q.target.field);
    const rowIndex = q.target.row_id ? rowsOf(input.answers[q.target.field]).findIndex((r) => r._id === q.target!.row_id) : 0;
    return [screenSort.get(field?.screen_id ?? '') ?? 0, field?.sort ?? 0, Math.max(rowIndex, 0)];
  };
  merged.sort((a, b) => {
    const [a1, a2, a3] = order(a);
    const [b1, b2, b3] = order(b);
    return a1 - b1 || a2 - b2 || a3 - b3;
  });

  return merged.slice(0, Math.max(0, input.budget));
}

/* ------------------------------------------------------------------ write-back */

export interface AppliedAnswer {
  answers: Answers;
  flags: FormFlag[];
  entry: ReviewHistoryEntry;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Write a follow-up answer straight back into its structured field (spec §05: follow-up
 * answers go into the same record, not a chat log). `null` = skipped: recorded in the
 * history only, so it surfaces under "what we still need".
 */
export function applyAnswer(
  definition: Pick<OnboardingDefinition, 'fields'>,
  answers: Answers,
  flags: FormFlag[],
  question: ReviewQuestion,
  rawAnswer: string | null,
  locale: Locale = 'de',
  now: string = new Date().toISOString(),
): AppliedAnswer {
  const answer = rawAnswer == null ? null : rawAnswer.trim().slice(0, MAX_FOLLOWUP_CHARS);
  const entry: ReviewHistoryEntry = {
    question_id: question.id,
    followup_id: question.followup_id,
    target: question.target,
    question: question.question,
    answer,
    skipped: answer == null || answer === '',
    at: now,
  };
  let nextAnswers = answers;
  let nextFlags = flags;

  if (!entry.skipped && answer && question.raises?.[answer]) {
    const ref = question.raises[answer];
    if (!flags.some((f) => f.code === ref.code && (f.detail ?? null) === (ref.detail ?? null))) {
      nextFlags = [...flags, { code: ref.code, detail: ref.detail ?? null, severity: 'sales', source: 'followup' }];
    }
  }

  if (entry.skipped || question.mode === 'acknowledge' || !question.target || !answer) {
    return { answers: nextAnswers, flags: nextFlags, entry };
  }

  const field = definition.fields.find((f) => f.id === question.target!.field);
  if (!field) return { answers: nextAnswers, flags: nextFlags, entry };
  const current = answers[field.id];
  const written = writeValue(field, current, question, answer, locale);
  if (written) nextAnswers = { ...answers, [field.id]: written };
  return { answers: nextAnswers, flags: nextFlags, entry };
}

/** "question → answer", stacked under any earlier notes of the same field. */
export function appendNote(existing: string | undefined, question: string, answer: string): string {
  const line = `${question.trim()}\n→ ${answer.trim()}`;
  return existing?.trim() ? `${existing.trim()}\n\n${line}` : line;
}

function writeValue(field: OnbField, current: Answer | undefined, question: ReviewQuestion, answer: string, locale: Locale): Answer | null {
  const target = question.target!;
  const base: Answer = { ...(current ?? { v: null }), v: current?.v ?? null, src: 'followup' };
  delete base.dk;

  // Append mode never touches the value: the answer is context for a field that already
  // has content (exact-spelling lists must stay exactly what the client typed).
  if (question.mode === 'append' && !target.sub) {
    return { ...base, note: appendNote(current?.note, cap(question.question, locale), answer) };
  }

  if (target.row_id && target.sub) {
    const sub = (field.config.fields ?? []).find((s) => s.key === target.sub);
    if (!sub) return null;
    const rows = rowsOf(current).map((row): RepeaterRow => {
      if (row._id !== target.row_id) return row;
      const value = sub.type === 'number' ? (Number.isFinite(Number(answer)) ? Number(answer) : row[sub.key]) : answer;
      return { ...row, [sub.key]: value };
    });
    return { ...base, v: rows };
  }

  switch (field.type) {
    case 'radio':
    case 'select':
      return field.options.some((o) => o.value === answer) ? { ...base, v: answer } : null;
    case 'checkboxes': {
      if (!field.options.some((o) => o.value === answer)) return null;
      const list = Array.isArray(current?.v) && typeof current.v[0] !== 'object' ? (current.v as string[]) : [];
      return { ...base, v: list.includes(answer) ? list : [...list, answer] };
    }
    case 'number':
    case 'slider': {
      const n = Number(answer.replace(',', '.'));
      return Number.isFinite(n) ? { ...base, v: n } : null;
    }
    case 'date':
      return DATE_RE.test(answer) ? { ...base, v: answer } : null;
    case 'text':
    case 'textarea':
    case 'url':
    case 'email':
    case 'tel': {
      const existing = textOf(current).trim();
      const v = question.mode === 'append' && existing ? `${existing}\n${answer}` : answer;
      return { ...base, v };
    }
    default:
      return null;
  }
}

/** The question the client sees next, or null when the queue is drained. */
export function currentQuestion(review: { queue: ReviewQuestion[]; cursor: number } | null): ReviewQuestion | null {
  if (!review) return null;
  return review.queue[review.cursor] ?? null;
}

/** Human-readable label of an option chosen through a quick reply (for history display). */
export function replyLabel(question: ReviewQuestion, value: string, locale: Locale, field?: OnbField): string {
  const reply = question.quick_replies.find((q) => q.value === value);
  if (reply) return locale === 'de' ? reply.label_de : reply.label_en;
  if (field && (field.type === 'radio' || field.type === 'select')) return optionLabel(field, value, locale);
  return value;
}
