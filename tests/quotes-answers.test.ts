import { describe, expect, it } from 'vitest';
import type { Answers } from '@/lib/types';
import { buildQuestions, EMPTY_ANSWERS } from '@/lib/questions';
import { readableAnswers, readableStage2 } from '@/lib/quotes/answers';

/** Every reachable question with every option, in both locales, must resolve to a label. */
function allQuestions() {
  const variants: Answers[] = [
    { ...EMPTY_ANSWERS, hasSite: 'website', selfbuilt: 'nein', contact: 'booking' },
    { ...EMPTY_ANSWERS, hasSite: 'website', selfbuilt: 'ja', contact: 'booking' }, // BYOW branch
    { ...EMPTY_ANSWERS, hasSite: 'none', contact: 'form' },
  ];
  const seen = new Map<string, Set<string>>();
  for (const a of variants) {
    for (const q of buildQuestions(a)) {
      const set = seen.get(q.id) ?? new Set<string>();
      q.opts.forEach((o) => set.add(o));
      seen.set(q.id, set);
    }
  }
  return seen;
}

describe('readableAnswers', () => {
  it('resolves every question and option of the questionnaire in DE and EN', () => {
    for (const [id, opts] of allQuestions()) {
      for (const opt of opts) {
        for (const locale of ['de', 'en'] as const) {
          const [row] = readableAnswers({ [id]: id === 'aiHas' || id === 'aiMissing' ? [opt] : opt } as Partial<Answers>, locale);
          expect(row, `${locale} ${id}=${opt}`).toBeDefined();
          expect(row.question, `${locale} ${id} title`).not.toBe(id);
          expect(row.answer, `${locale} ${id}=${opt} label`).not.toBe(opt);
        }
      }
    }
  });

  it('keeps the customer order, joins multi-selects and falls back to raw values', () => {
    const rows = readableAnswers(
      { hasSite: 'website', selfbuilt: 'ja', aiHas: ['home', 'form'], langs: '2', mystery: 'x' } as unknown as Partial<Answers>,
      'en',
    );
    expect(rows.map((r) => r.id)).toEqual(['hasSite', 'selfbuilt', 'aiHas', 'langs', 'mystery']);
    expect(rows.find((r) => r.id === 'aiHas')!.answer).toBe('Homepage, Contact form');
    // BYOW path uses the alternative wording for the languages question.
    expect(rows.find((r) => r.id === 'langs')!.question).toBe('In how many languages should the site be available?');
    expect(rows.find((r) => r.id === 'mystery')).toEqual({ id: 'mystery', question: 'mystery', answer: 'x' });
  });

  it('skips empty answers and tolerates missing input', () => {
    expect(readableAnswers({}, 'de')).toEqual([]);
    expect(readableAnswers(null, 'de')).toEqual([]);
    expect(readableAnswers({ hasSite: null, aiHas: [] }, 'de')).toEqual([]);
  });
});

describe('readableStage2', () => {
  it('labels fields, the goal and the material link', () => {
    const rows = readableStage2({ fields: { firmenname: 'Müller GmbH', usps: '  ', ustid: 'DE123' }, goal: 'termine', driveLink: 'https://drive.example' }, 'en');
    expect(rows).toEqual([
      { key: 'firmenname', label: 'Company name', value: 'Müller GmbH' },
      { key: 'ustid', label: 'VAT ID', value: 'DE123' },
      { key: 'goal', label: 'Main goal of your website', value: 'Appointment bookings' },
      { key: 'driveLink', label: 'Material link', value: 'https://drive.example' },
    ]);
    expect(readableStage2(null, 'de')).toEqual([]);
  });
});
