import 'server-only';
import { z } from 'zod';
import type { FileSummary } from '../export';
import type { LlmQuestion } from '../followups/queue';
import { SYSTEM_FLAGS } from '../limits';
import { textOf } from '../logic';
import type { FormFlag, Gap, OnboardingDefinition, OnboardingFormRecord, OnboardingSecrets } from '../types';
import { callModel, promptText } from './client';
import { clientHeader, completenessCandidates, localeName, renderAnswers } from './context';

export interface CompletenessResult {
  questions: LlmQuestion[];
  flags: FormFlag[];
  /** False when the model was skipped (nothing to ask about, cap reached, call failed). */
  ran: boolean;
}

/**
 * Job 1, model part (spec §06): "one model pass over the free-text answers only, asking:
 * is this specific enough for someone to build from?" Rules already decided what is
 * missing; the model may only add questions about the listed candidate fields — the
 * zod enum makes any other target impossible.
 */
export async function runCompleteness(input: {
  definition: OnboardingDefinition;
  secrets: OnboardingSecrets;
  record: OnboardingFormRecord;
  files: FileSummary[];
  gaps: Gap[];
  maxQuestions: number;
}): Promise<CompletenessResult> {
  const { definition, secrets, record, files, gaps, maxQuestions } = input;
  const candidates = completenessCandidates(definition, record.answers, gaps);
  if (!candidates.length || maxQuestions <= 0) return { questions: [], flags: [], ran: false };

  const candidateIds = candidates.map((f) => f.id) as [string, ...string[]];
  const flagCodes = Array.from(
    new Set<string>([...definition.flagRules.map((r) => r.code), ...SYSTEM_FLAGS]),
  ) as [string, ...string[]];

  const schema = z.object({
    questions: z
      .array(
        z.object({
          target: z.object({
            field: z.enum(candidateIds),
            row_id: z.string().nullable(),
            sub: z.string().nullable(),
          }),
          question_de: z.string().min(1).max(400),
          question_en: z.string().min(1).max(400),
          quick_replies: z.array(z.string().max(60)).max(3),
        }),
      )
      .max(Math.max(1, maxQuestions)),
    flags: z.array(z.enum(flagCodes)),
  });

  const system = promptText(secrets.prompts, 'system');
  const task = promptText(secrets.prompts, 'completeness').replace(/\{max_questions\}/g, String(maxQuestions));
  const prompt = [
    task,
    '',
    `Client language: ${localeName(record.locale)}.`,
    clientHeader(record),
    '',
    'Fields you may ask about (field key · label: answer):',
    renderAnswers(definition, record.answers, files, record.locale, { onlyFields: new Set(candidateIds), markGaps: gaps }),
    '',
    'Allowed flag codes: ' + flagCodes.join(', '),
    'For repeater fields, set row_id/sub only when the question is about one specific row; otherwise null.',
  ].join('\n');

  const result = await callModel({
    formId: record.id,
    job: 'completeness',
    attempt: 1,
    settings: definition.settings,
    system,
    prompt,
    schema,
    fixture: () => fixtureQuestions(record, candidateIds, maxQuestions),
  });

  if (!result.ok) return { questions: [], flags: [], ran: false };

  const questions: LlmQuestion[] = result.object.questions.map((q) => ({
    field: q.target.field,
    row_id: q.target.row_id,
    sub: q.target.sub,
    question_de: q.question_de,
    question_en: q.question_en,
    quick_replies: q.quick_replies,
  }));
  const ruleCodes = new Map(definition.flagRules.map((r) => [r.code, r.severity]));
  const flags: FormFlag[] = result.object.flags.map((code) => ({
    code,
    detail: null,
    severity: ruleCodes.get(code) ?? 'info',
    source: 'llm',
  }));
  return { questions, flags, ran: true };
}

/**
 * Deterministic stand-in for e2e: a USP answer shorter than 40 characters earns one
 * follow-up; anything else earns none. Enough to exercise the exchange end to end.
 */
function fixtureQuestions(record: OnboardingFormRecord, candidates: string[], max: number) {
  const usps = textOf(record.answers.usps).trim();
  const questions =
    candidates.includes('usps') && usps && usps.length < 40 && max > 0
      ? [
          {
            target: { field: 'usps', row_id: null, sub: null },
            question_de: 'Was genau macht Sie besser als andere Anbieter – nennen Sie zwei oder drei konkrete Punkte?',
            question_en: 'What exactly makes you better than other providers — name two or three concrete points?',
            quick_replies: [],
          },
        ]
      : [];
  return { questions, flags: [] as string[] };
}
