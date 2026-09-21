import 'server-only';
import { runCompleteness } from './ai/completeness';
import { modelConfigured, reserveAiCall } from './ai/client';
import { getOnboardingSecrets } from './definition';
import type { FileSummary } from './export';
import { applyAnswer, buildQueue } from './followups/queue';
import { computeGaps, hashAnswers, validateAll } from './logic';
import { applyPatch, fileCounts, saveWithRev, type SaveOutcome } from './records';
import type {
  FormFlag,
  LlmQuestion,
  OnboardingDefinition,
  OnboardingFormRecord,
  ReviewQuestion,
  ReviewState,
} from './types';

export type ReviewOutcome = SaveOutcome | { ok: false; status: 422; error: 'incomplete'; fields: string[] };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Pending questions after `cursor`, rebuilt from scratch so chained triggers appear and stale ones vanish. */
function rebuildTail(
  definition: OnboardingDefinition,
  record: OnboardingFormRecord,
  files: FileSummary[],
  review: ReviewState,
  llmQuestions: LlmQuestion[],
): ReviewQuestion[] {
  const asked = review.queue.slice(0, review.cursor);
  const budget = definition.settings.maxFollowups - review.history.length;
  const pending = buildQueue({
    definition,
    answers: record.answers,
    files: fileCounts(files),
    flags: record.flags,
    gaps: computeGaps(definition, record.answers, fileCounts(files)),
    history: review.history,
    llmQuestions,
    budget,
  });
  return [...asked, ...pending];
}

/**
 * Runs one gap-check round: deterministic gaps, then (budget and cap permitting, and only
 * when the answers changed since the last pass) one model pass. Returns the new review
 * state and any model flags to merge.
 */
async function runRound(
  definition: OnboardingDefinition,
  record: OnboardingFormRecord,
  files: FileSummary[],
  previous: ReviewState | null,
): Promise<{ review: ReviewState; llmFlags: FormFlag[] }> {
  const counts = fileCounts(files);
  const gaps = computeGaps(definition, record.answers, counts);
  const history = previous?.history ?? [];
  const round = (previous?.round ?? 0) + 1;
  const hash = hashAnswers(record.answers);
  const budget = definition.settings.maxFollowups - history.length;

  let llmQuestions = previous?.llm_questions ?? [];
  let llmFlags: FormFlag[] = [];
  const answersChanged = previous?.answers_hash !== hash;
  if (answersChanged && budget > 0 && modelConfigured()) {
    const allowed = await reserveAiCall(record.id, record.ai_calls, definition.settings);
    if (allowed) {
      const secrets = await getOnboardingSecrets();
      const result = await runCompleteness({ definition, secrets, record, files, gaps, maxQuestions: Math.min(budget, 6) });
      if (result.ran) {
        llmQuestions = result.questions;
        llmFlags = result.flags;
      }
    }
  }

  const base: ReviewState = {
    round,
    budget_left: budget,
    answers_hash: hash,
    queue: previous?.queue.slice(0, previous.cursor) ?? [],
    cursor: previous?.cursor ?? 0,
    history,
    gaps,
    llm_questions: llmQuestions,
  };
  const queue = rebuildTail(definition, record, files, base, llmQuestions);
  return { review: { ...base, queue, budget_left: Math.max(0, budget - (queue.length - base.cursor)) }, llmFlags };
}

function mergeLlmFlags(flags: FormFlag[], llmFlags: FormFlag[]): FormFlag[] {
  const keys = new Set(flags.map((f) => `${f.code}|${f.detail ?? ''}`));
  return [...flags, ...llmFlags.filter((f) => !keys.has(`${f.code}|${f.detail ?? ''}`))];
}

/**
 * POST /review — from the form (first round) or when the queue drained (next round).
 * Refuses while required fields are missing; never asks more than the round/question caps.
 */
export async function startOrContinueReview(
  definition: OnboardingDefinition,
  record: OnboardingFormRecord,
  files: FileSummary[],
): Promise<ReviewOutcome> {
  if (record.status !== 'in_progress' && record.status !== 'review') {
    return { ok: false, status: 409, error: 'status', record };
  }
  const errors = validateAll(definition, record.answers, fileCounts(files), todayIso(), record.locale);
  if (errors.length) {
    return { ok: false, status: 422, error: 'incomplete', fields: Array.from(new Set(errors.map((e) => e.field))) };
  }

  const previous = record.review;
  const drained = !!previous && previous.cursor >= previous.queue.length;
  if (previous && !drained) {
    // Questions are still pending — nothing to start; just make sure the status is right.
    if (record.status === 'review') return { ok: true, record };
    return saveWithRev(record.id, record.rev, { status: 'review' }, 'in_progress');
  }
  if (previous && previous.round >= definition.settings.maxRounds) {
    return { ok: true, record };
  }

  const { review, llmFlags } = await runRound(definition, record, files, previous);
  return saveWithRev(
    record.id,
    record.rev,
    { status: 'review', review, flags: mergeLlmFlags(record.flags, llmFlags), current_step: 'review' },
    ['in_progress', 'review'],
  );
}

/**
 * POST /followups — one answer (or skip) for the current question. Writes back into the
 * structured field through the same applyPatch path as the form, records the history,
 * rebuilds the pending tail, and starts the next round automatically when this one drains.
 */
export async function answerFollowup(
  definition: OnboardingDefinition,
  record: OnboardingFormRecord,
  files: FileSummary[],
  questionId: string,
  answer: string | null,
): Promise<SaveOutcome | { ok: false; status: 400; error: 'no_question' | 'wrong_question' }> {
  const review = record.review;
  if (record.status !== 'review' || !review) return { ok: false, status: 409, error: 'status', record };
  const question = review.queue[review.cursor];
  if (!question) return { ok: false, status: 400, error: 'no_question' };
  if (question.id !== questionId) return { ok: false, status: 400, error: 'wrong_question' };

  const applied = applyAnswer(definition, record.answers, record.flags, question, answer, record.locale);
  // Route the written field through applyPatch so redaction, clearing and flags stay one path.
  const changedKey = question.target?.field;
  const patch = applyPatch(
    definition,
    { ...record, flags: applied.flags },
    changedKey && applied.answers[changedKey] !== record.answers[changedKey] ? { changes: { [changedKey]: applied.answers[changedKey] } } : {},
  );
  if (!patch.ok) return { ok: false, status: 409, error: 'stale', record };

  const nextRecord: OnboardingFormRecord = { ...record, ...patch.update, flags: patch.update.flags ?? applied.flags };
  let nextReview: ReviewState = {
    ...review,
    cursor: review.cursor + 1,
    history: [...review.history, applied.entry],
  };
  nextReview = { ...nextReview, queue: rebuildTail(definition, nextRecord, files, nextReview, review.llm_questions) };

  let llmFlags: FormFlag[] = [];
  if (nextReview.cursor >= nextReview.queue.length && nextReview.round < definition.settings.maxRounds) {
    const next = await runRound(definition, nextRecord, files, nextReview);
    nextReview = next.review;
    llmFlags = next.llmFlags;
  }
  nextReview.budget_left = Math.max(0, definition.settings.maxFollowups - nextReview.history.length - (nextReview.queue.length - nextReview.cursor));

  return saveWithRev(
    record.id,
    record.rev,
    { ...patch.update, flags: mergeLlmFlags(nextRecord.flags, llmFlags), review: nextReview },
    'review',
  );
}

/** True when the client has nothing left to answer. */
export function reviewDrained(review: ReviewState | null): boolean {
  return !!review && review.cursor >= review.queue.length;
}
