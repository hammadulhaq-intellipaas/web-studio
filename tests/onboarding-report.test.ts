import { describe, expect, it } from 'vitest';
import { buildReport, reportHash, reportIsCurrent } from '@/lib/onboarding/report';
import type { LlmQuestion, ReviewState } from '@/lib/onboarding/types';
import { a, completeAnswers, dk, makeDefinition, makeRecord } from './fixtures/onboarding';

const def = makeDefinition();

const review = (over: Partial<ReviewState> = {}): ReviewState => ({
  round: 1,
  budget_left: 6,
  answers_hash: null,
  queue: [],
  cursor: 0,
  history: [],
  gaps: [],
  llm_questions: [],
  ...over,
});

const vague = (field: string, question: string): LlmQuestion => ({
  field,
  row_id: null,
  sub: null,
  question_de: question,
  question_en: question,
  quick_replies: [],
});

describe('buildReport', () => {
  it('has nothing to report for a complete form', () => {
    const report = buildReport(def, makeRecord(), [], [], true);
    expect(report.items).toEqual([]);
    expect(report.model_checked).toBe(true);
  });

  it("carries the date they gave alongside an “I don't know”", () => {
    const record = makeRecord({ answers: { ...completeAnswers(), booked_package: { v: null, dk: true, dk_date: '2027-01-10' } } });
    const item = buildReport(def, record, [], [], true).items.find((i) => i.field === 'booked_package');
    expect(item).toMatchObject({ kind: 'dont_know', detail: '2027-01-10', screen: 'project' });
    expect(item?.label?.de).toBeTruthy();
  });

  it("keeps the model's own question as the reason a field is vague", () => {
    const record = makeRecord();
    const report = buildReport(def, record, [], [vague('usps', 'Was genau heißt schnell?')], true);
    expect(report.items).toContainEqual(expect.objectContaining({ field: 'usps', kind: 'vague', detail: 'Was genau heißt schnell?' }));
  });

  it('reports a field once, by its most serious problem', () => {
    // Empty outranks vague: telling them it is "not specific enough" when it is blank is noise.
    const answers = { ...completeAnswers() };
    delete answers.usps;
    const record = makeRecord({ answers });
    const items = buildReport(def, record, [], [vague('usps', 'Bitte konkreter')], true).items.filter((i) => i.field === 'usps');
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('empty');
  });

  it('lists a skipped follow-up with the question that went unanswered', () => {
    const record = makeRecord({
      review: review({
        history: [
          {
            question_id: 'q1',
            followup_id: 'fu_reference_likes',
            target: { field: 'references', row_id: null, sub: 'likes' },
            question: { de: 'Was gefällt Ihnen an der Seite?', en: 'What do you like about it?' },
            answer: null,
            skipped: true,
            at: '2026-09-21T10:00:00.000Z',
          },
        ],
      }),
    });
    expect(buildReport(def, record, [], [], true).items).toContainEqual(
      expect.objectContaining({ field: 'references', kind: 'skipped', detail: 'Was gefällt Ihnen an der Seite?' }),
    );
  });

  it('follows the order of the form so the client can walk them top to bottom', () => {
    const answers = { ...completeAnswers() };
    delete answers.usps;
    delete answers.legal_name;
    const items = buildReport(def, makeRecord({ answers }), [], [], true).items.map((i) => i.field);
    const order = def.fields.map((f) => f.id);
    expect(items).toEqual([...items].sort((x, y) => order.indexOf(x) - order.indexOf(y)));
  });
});

describe('reportHash', () => {
  it('ignores the closing screen, so the read-back verdict never restages a model call', () => {
    const base = completeAnswers();
    const before = reportHash(def, base);
    const after = reportHash(def, { ...base, understood_ok: a('mostly'), understood_corrections: a('Wir sind nicht förmlich.') });
    expect(after).toBe(before);
  });

  it('changes when an actual answer changes', () => {
    const base = completeAnswers();
    expect(reportHash(def, { ...base, usps: a('Etwas ganz anderes.') })).not.toBe(reportHash(def, base));
  });

  it('treats a stored report as stale once an answer moves', () => {
    const record = makeRecord({ review: review({ report: buildReport(def, makeRecord(), [], [], true) }) });
    expect(reportIsCurrent(def, record)).toBe(true);

    const edited = makeRecord({
      answers: { ...completeAnswers(), usps: a('Neu formuliert.') },
      review: record.review,
    });
    expect(reportIsCurrent(def, edited)).toBe(false);

    // ...but not when only the closing screen moved.
    const verdict = makeRecord({
      answers: { ...completeAnswers(), understood_ok: a('yes') },
      review: record.review,
    });
    expect(reportIsCurrent(def, verdict)).toBe(true);
  });
});

describe('the two layers', () => {
  it('reports a gap even when the model never ran, and says so', () => {
    const record = makeRecord({ answers: { ...completeAnswers(), booked_package: dk() } });
    const report = buildReport(def, record, [], [], false);
    expect(report.model_checked).toBe(false);
    expect(report.items.map((i) => i.field)).toContain('booked_package');
  });
});
