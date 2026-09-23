import type { Locale } from '@/lib/types';
import type { FileSummary } from './export';
import { computeGaps, fieldLabel, hashAnswers } from './logic';
import type {
  CompletenessReport,
  Gap,
  LlmQuestion,
  OnboardingDefinition,
  OnboardingFormRecord,
  ReportItem,
} from './types';

/**
 * What the client is told is still open, assembled from both layers of the check:
 *
 *  - layer 1, `computeGaps`, is code. Whether a field is filled in is not a question worth
 *    asking a model: the rules see every field, every reveal and every upload, and they
 *    never miss one or invent one.
 *  - layer 2, the completeness model, only judges whether free text is specific enough to
 *    build from. Its questions arrive here as `vague` items.
 *
 * Nothing here blocks the client. Required fields are already enforced screen by screen,
 * so whatever is left is optional, an "I don't know" they have told us about, or a
 * judgement call we would rather raise now than after the first design.
 */

/** Follow-ups the client chose to skip stay open, so they belong in the report. */
function skippedItems(record: OnboardingFormRecord, known: Set<string>): ReportItem[] {
  const items: ReportItem[] = [];
  for (const entry of record.review?.history ?? []) {
    if (!entry.skipped) continue;
    const field = entry.target?.field;
    if (!field || !known.has(field)) continue;
    items.push({
      field,
      kind: 'skipped',
      detail: entry.question[record.locale as Locale] ?? entry.question.de ?? null,
    });
  }
  return items;
}

function gapItems(gaps: Gap[], answers: OnboardingFormRecord['answers']): ReportItem[] {
  return gaps.map((gap) => ({
    field: gap.field,
    kind: gap.kind,
    // "I don't know" is only half a gap once they have told us when they will know.
    detail: gap.kind === 'dont_know' ? (answers[gap.field]?.dk_date ?? null) : null,
  }));
}

function vagueItems(questions: LlmQuestion[], locale: Locale, known: Set<string>): ReportItem[] {
  return questions
    .filter((q) => known.has(q.field))
    .map((q) => ({
      field: q.field,
      kind: 'vague' as const,
      detail: locale === 'de' ? q.question_de : q.question_en,
    }));
}

/**
 * One item per field, strongest kind first, so a field that is empty is not also listed as
 * vague. Order follows the form, which is the order the client will walk to fix them.
 */
export function buildReport(
  definition: OnboardingDefinition,
  record: OnboardingFormRecord,
  files: FileSummary[],
  llmQuestions: LlmQuestion[],
  modelChecked: boolean,
): CompletenessReport {
  const byId = new Map(definition.fields.map((f) => [f.id, f]));
  const known = new Set(byId.keys());
  const counts: Record<string, number> = {};
  for (const file of files) if (file.field_key) counts[file.field_key] = (counts[file.field_key] ?? 0) + 1;

  const gaps = computeGaps(definition, record.answers, counts);
  const candidates = [
    ...gapItems(gaps, record.answers),
    ...skippedItems(record, known),
    ...vagueItems(llmQuestions, record.locale as Locale, known),
  ];

  // "You did not know yet, expecting to by March" is more use to the client than "you
  // skipped our follow-up", which describes our mechanism rather than their situation.
  const rank: Record<ReportItem['kind'], number> = { empty: 0, no_files: 1, thin: 2, vague: 3, dont_know: 4, skipped: 5 };
  const best = new Map<string, ReportItem>();
  for (const item of candidates) {
    const current = best.get(item.field);
    if (!current || rank[item.kind] < rank[current.kind]) best.set(item.field, item);
  }

  const order = definition.fields.map((f) => f.id);
  const items = [...best.values()]
    .filter((item) => known.has(item.field))
    .map((item) => ({
      ...item,
      screen: byId.get(item.field)!.screen_id,
      label: { de: fieldLabel(byId.get(item.field)!, 'de'), en: fieldLabel(byId.get(item.field)!, 'en') },
    }))
    .sort((a, b) => order.indexOf(a.field) - order.indexOf(b.field));

  return {
    items,
    answers_hash: reportHash(definition, record.answers),
    model_checked: modelChecked,
    at: new Date().toISOString(),
  };
}

/**
 * The hash the report is keyed on: the answers to the *questions* only. The closing screen
 * stores answers too (the read-back verdict and any correction), and those must not make
 * the report stale — otherwise picking "mostly" would spend another model call.
 */
export function reportHash(definition: OnboardingDefinition, answers: OnboardingFormRecord['answers']): string {
  const asked = new Set(
    definition.fields.filter((f) => definition.screens.find((s) => s.id === f.screen_id)?.kind === 'questions').map((f) => f.id),
  );
  return hashAnswers(Object.fromEntries(Object.entries(answers).filter(([key]) => asked.has(key))));
}

/** True when the stored report was built from the answers the record holds now. */
export function reportIsCurrent(definition: OnboardingDefinition, record: OnboardingFormRecord): boolean {
  const report = record.review?.report;
  return !!report && report.answers_hash === reportHash(definition, record.answers);
}
