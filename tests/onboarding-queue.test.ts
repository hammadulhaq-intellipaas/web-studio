import { describe, expect, it } from 'vitest';
import { applyAnswer, buildQueue, dedupeKey, ruleQuestions, type LlmQuestion } from '@/lib/onboarding/followups/queue';
import { computeFlags, computeGaps } from '@/lib/onboarding/logic';
import type { Answers, FormFlag, RepeaterRow, ReviewHistoryEntry } from '@/lib/onboarding/types';
import { a, completeAnswers, dk, makeDefinition } from './fixtures/onboarding';

const def = makeDefinition();

function queueFor(answers: Answers, opts: { llm?: LlmQuestion[]; history?: ReviewHistoryEntry[]; budget?: number; flags?: FormFlag[] } = {}) {
  const flags = opts.flags ?? computeFlags(def, answers);
  return buildQueue({
    definition: def,
    answers,
    files: {},
    flags,
    gaps: computeGaps(def, answers, {}),
    history: opts.history ?? [],
    llmQuestions: opts.llm ?? [],
    budget: opts.budget ?? 12,
  });
}

describe('rule questions', () => {
  it('asks nothing for a complete, clean form', () => {
    expect(queueFor(completeAnswers())).toEqual([]);
  });

  it('fires the legal-pages follow-up with quick replies that write back into the field', () => {
    const q = queueFor({ ...completeAnswers(), legal_pages: a('unsure') });
    expect(q).toHaveLength(1);
    expect(q[0]).toMatchObject({
      followup_id: 'fu_legal_pages_unsure',
      target: { field: 'legal_pages' },
      mode: 'set',
    });
    expect(q[0].quick_replies.map((r) => r.value)).toEqual(['reuse', 'none', 'unsure']);
    expect(q[0].question.en).toMatch(/legal pages/);
  });

  it('asks the generic don\'t-know question with the field label filled in', () => {
    const q = queueFor({ ...completeAnswers(), booked_package: dk() });
    const dkQ = q.find((x) => x.followup_id === 'fu_dont_know')!;
    expect(dkQ.target).toEqual({ field: 'booked_package' });
    expect(dkQ.question.de).toContain('Welches Paket haben Sie gebucht?');
    expect(dkQ.question.en).toContain('Which package did you book?');
    // a radio target answers with the field's own options
    expect(dkQ.quick_replies.map((r) => r.value)).toEqual(['silver', 'gold', 'platinum']);
  });

  it('asks per repeater row when a sub-field is thin', () => {
    const answers = {
      ...completeAnswers(),
      references: a([
        { _id: 'r1', url: 'https://a.de', likes: 'gut', dislikes: '' },
        { _id: 'r2', url: 'https://b.de', likes: 'Sehr klare Struktur und ruhige Farben', dislikes: '' },
        { _id: 'r3', url: 'https://c.de', likes: 'ok', dislikes: '' },
      ]),
    };
    const q = queueFor(answers).filter((x) => x.followup_id === 'fu_reference_likes');
    expect(q.map((x) => x.target)).toEqual([
      { field: 'references', row_id: 'r1', sub: 'likes' },
      { field: 'references', row_id: 'r3', sub: 'likes' },
    ]);
  });

  it('acknowledges a scope flag and asks about a date conflict, both after targeted questions', () => {
    const answers = {
      ...completeAnswers(),
      legal_pages: a('unsure'),
      page_count: a(11),
      page_list: a(Array.from({ length: 11 }, (_, i) => `Seite ${i + 1}`).join('\n')),
      launch_date: a('2026-11-01'),
      content_ready_date: a('2026-10-25'),
    };
    const q = queueFor(answers);
    expect(q.map((x) => x.followup_id)).toEqual(['fu_legal_pages_unsure', 'fu_scope_flag', 'fu_date_conflict']);
    expect(q[1]).toMatchObject({ mode: 'acknowledge', target: null });
  });

  it('puts the thin page list answer into page_relationships (append)', () => {
    const q = queueFor({ ...completeAnswers(), page_list: a('Startseite\nKontakt') });
    const thin = q.find((x) => x.followup_id === 'fu_page_list_thin')!;
    expect(thin.target).toEqual({ field: 'page_relationships' });
    expect(thin.mode).toBe('append');
  });
});

describe('merging with model questions', () => {
  const llm: LlmQuestion[] = [
    { field: 'usps', row_id: null, sub: null, question_de: 'Was genau?', question_en: 'What exactly?', quick_replies: [] },
    { field: 'legal_pages', row_id: null, sub: null, question_de: 'Rechtsseiten?', question_en: 'Legal?', quick_replies: [] },
    { field: 'ghost_field', row_id: null, sub: null, question_de: 'x', question_en: 'x', quick_replies: [] },
    { field: 'references', row_id: 'nope', sub: 'likes', question_de: 'x', question_en: 'x', quick_replies: [] },
    { field: 'references', row_id: 'ref1', sub: 'likes', question_de: 'Mehr dazu?', question_en: 'More?', quick_replies: ['Layout', 'Colours'] },
  ];

  it('lets a rule win on a shared target, drops unknown targets and keeps valid model questions', () => {
    const q = queueFor({ ...completeAnswers(), legal_pages: a('unsure'), usps: a('Schnell und nett') }, { llm });
    const legal = q.filter((x) => x.target?.field === 'legal_pages');
    expect(legal).toHaveLength(1);
    expect(legal[0].source).toBe('rule');
    expect(q.some((x) => x.target?.field === 'ghost_field')).toBe(false);
    expect(q.filter((x) => x.target?.field === 'references')).toHaveLength(1);
    // an answered free-text field gets the model's answer appended; an empty one is set
    expect(q.find((x) => x.target?.field === 'usps')).toMatchObject({ source: 'llm', mode: 'append' });
    const empty = queueFor(completeAnswers(), { llm: [llm[0]] });
    expect(empty[0]).toMatchObject({ target: { field: 'usps' }, mode: 'set' });
  });

  it('orders questions by screen and field, cuts to the budget', () => {
    const q = queueFor({ ...completeAnswers(), legal_pages: a('unsure') }, { llm, budget: 2 });
    expect(q).toHaveLength(2);
    // design (references) → pages (usps) → access_legal (legal_pages)
    expect(q.map((x) => x.target?.field)).toEqual(['references', 'usps']);
  });

  it('never asks a target that is already in the history', () => {
    const history: ReviewHistoryEntry[] = [
      {
        question_id: 'fu:fu_legal_pages_unsure',
        followup_id: 'fu_legal_pages_unsure',
        target: { field: 'legal_pages' },
        question: { de: '', en: '' },
        answer: 'unsure',
        skipped: false,
        at: '2026-09-21T10:00:00Z',
      },
    ];
    const q = queueFor({ ...completeAnswers(), legal_pages: a('unsure') }, { history });
    expect(q).toEqual([]);
  });

  it('keys questions by target cell or by rule', () => {
    expect(dedupeKey({ target: { field: 'x', row_id: 'r1', sub: 's' }, followup_id: 'fu', id: 'i' })).toBe('t:x|r1|s');
    expect(dedupeKey({ target: null, followup_id: 'fu_scope_flag', id: 'i' })).toBe('fu:fu_scope_flag');
  });
});

describe('applyAnswer', () => {
  it('sets a radio field, clears "don\'t know" and marks the provenance', () => {
    const answers = { ...completeAnswers(), booked_package: dk() };
    const [q] = queueFor(answers);
    const { answers: next, entry } = applyAnswer(def, answers, [], q, 'gold');
    expect(next.booked_package).toEqual({ v: 'gold', src: 'followup' });
    expect(entry).toMatchObject({ answer: 'gold', skipped: false, target: { field: 'booked_package' } });
  });

  it('keeps append-mode answers as a note (the value stays exactly what the client typed) and writes into a repeater cell', () => {
    const answers = {
      ...completeAnswers(),
      page_list: a('Startseite\nKontakt'),
      page_relationships: a('Kontakt im Footer'),
      references: a([{ _id: 'ref1', url: 'https://a.de', likes: 'gut', dislikes: '' }]),
    };
    const q = queueFor(answers);
    const thin = q.find((x) => x.followup_id === 'fu_page_list_thin')!;
    const step1 = applyAnswer(def, answers, [], thin, 'yes');
    expect(step1.answers.page_relationships.v).toBe('Kontakt im Footer');
    expect(step1.answers.page_relationships.note).toBe(`${thin.question.de}\n→ yes`);
    expect(step1.answers.page_relationships.src).toBe('followup');
    // a second note stacks under the first
    const again = applyAnswer(def, step1.answers, [], { ...thin, id: 'x2' }, 'no');
    expect(again.answers.page_relationships.note).toBe(`${thin.question.de}\n→ yes\n\n${thin.question.de}\n→ no`);
    const likes = q.find((x) => x.followup_id === 'fu_reference_likes')!;
    const step2 = applyAnswer(def, step1.answers, [], likes, 'Die großen Fotos und die ruhige Schrift');
    expect((step2.answers.references.v as RepeaterRow[])[0].likes).toBe('Die großen Fotos und die ruhige Schrift');
    expect(step2.answers.references.src).toBe('followup');
  });

  it('records a skip in the history only and leaves answers untouched', () => {
    const answers = { ...completeAnswers(), legal_pages: a('unsure') };
    const [q] = queueFor(answers);
    const { answers: next, entry } = applyAnswer(def, answers, [], q, null);
    expect(next).toBe(answers);
    expect(entry.skipped).toBe(true);
  });

  it('chains: "don\'t have any" triggers the offer, and "yes" raises the interest flag', () => {
    let answers: Answers = { ...completeAnswers(), legal_pages: a('unsure') };
    let flags: FormFlag[] = [];
    const history: ReviewHistoryEntry[] = [];
    const [first] = queueFor(answers);
    const step1 = applyAnswer(def, answers, flags, first, 'none');
    answers = step1.answers;
    flags = step1.flags;
    history.push(step1.entry);
    expect(answers.legal_pages.v).toBe('none');

    const rebuilt = queueFor(answers, { history, flags: computeFlags(def, answers) });
    expect(rebuilt.map((q) => q.followup_id)).toEqual(['fu_legal_pages_offer']);
    const step2 = applyAnswer(def, answers, flags, rebuilt[0], 'yes');
    expect(step2.flags).toContainEqual(expect.objectContaining({ code: 'interest', detail: 'legal_pages', source: 'followup' }));
    history.push(step2.entry);
    // and nothing is asked twice
    expect(queueFor(answers, { history })).toEqual([]);
  });

  it('ignores an answer that is not one of a choice field\'s options', () => {
    const answers = { ...completeAnswers(), legal_pages: a('unsure') };
    const [q] = queueFor(answers);
    const { answers: next } = applyAnswer(def, answers, [], q, 'something else');
    expect(next.legal_pages.v).toBe('unsure');
  });

  it('exposes the rule-only view for the review route', () => {
    const answers = { ...completeAnswers(), legal_pages: a('unsure') };
    const rules = ruleQuestions({ definition: def, answers, files: {}, flags: [], gaps: computeGaps(def, answers, {}) });
    expect(rules.map((r) => r.followup_id)).toEqual(['fu_legal_pages_unsure']);
  });
});
