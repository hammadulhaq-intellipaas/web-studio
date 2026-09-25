import { describe, expect, it } from 'vitest';
import { stripDashes, stripDashesDeep } from '@/lib/onboarding/guardrails';
import { sliderPhrase, validateAll } from '@/lib/onboarding/logic';
import { renderAnswersPdf } from '@/lib/onboarding/pdf/render';
import { understoodText } from '@/lib/onboarding/understood';
import type { OnbField } from '@/lib/onboarding/types';
import { a, completeAnswers, makeDefinition, makeRecord, TODAY } from './fixtures/onboarding';

const def = makeDefinition();
const field = (id: string): OnbField => def.fields.find((f) => f.id === id)!;

describe('review completeness respects the form language', () => {
  it('does not flag a German-only question on an English form', () => {
    const answers = { ...completeAnswers() };
    delete answers.content_responsible;
    const en = validateAll(def, answers, {}, TODAY, 'en');
    const de = validateAll(def, answers, {}, TODAY, 'de');
    expect(en.map((e) => e.field)).not.toContain('content_responsible');
    expect(de.map((e) => e.field)).toContain('content_responsible');
  });
});

describe('stripDashes', () => {
  it('turns punctuation dashes into commas and ranges into hyphens', () => {
    expect(stripDashes('No problem — we will add it.')).toBe('No problem, we will add it.');
    expect(stripDashes('Kein Problem – wir setzen Platzhalter ein.')).toBe('Kein Problem, wir setzen Platzhalter ein.');
    expect(stripDashes('Pages 10–12, open 9—17')).toBe('Pages 10-12, open 9-17');
    expect(stripDashes('Nothing —')).toBe('Nothing');
    expect(stripDashes('— leading')).toBe('leading');
    expect(stripDashes('well-known e-mail')).toBe('well-known e-mail');
  });

  it('reaches every string in a model object', () => {
    expect(stripDashesDeep({ q: [{ question_en: 'Your USP — in one line?' }], n: 3 })).toEqual({ q: [{ question_en: 'Your USP, in one line?' }], n: 3 });
  });
});

describe('sliderPhrase', () => {
  it('reads a stop as its caption and anything between as both', () => {
    expect(sliderPhrase(field('personality_scale'), 1, 'en')).toBe('Clean and minimal');
    expect(sliderPhrase(field('personality_scale'), 2.4, 'en')).toBe('Between "Understated" and "Balanced"');
    expect(sliderPhrase(field('tone_scale'), 3.6, 'de')).toBe('Zwischen „Freundlich, aber professionell“ und „Professionell und zurückhaltend“');
  });
});

describe('understoodText', () => {
  it('reads back labelled bullets in the client’s words, capitalised, without dashes', () => {
    const answers = { ...completeAnswers(), usps: a('schnelle Termine — alle Kassen'), ideal_customer: a('büroangestellte mit Rückenschmerzen') };
    const text = understoodText(def, answers, 'de');
    expect(text).toContain('- **Ihr idealer Kunde:** Büroangestellte mit Rückenschmerzen');
    expect(text).toContain('- **Warum Kunden Sie wählen:** Schnelle Termine, alle Kassen');
    expect(text).not.toMatch(/[–—]/);
    expect(text).not.toContain('…');
  });

  it('leaves out a line it has no answer for instead of showing a gap', () => {
    const answers = { ...completeAnswers() };
    delete answers.excluded_audience;
    delete answers.tone_note;
    delete answers.personality_note;
    const text = understoodText(def, answers, 'en');
    expect(text).not.toContain('Who it should not attract');
    expect(text).not.toContain('In your words');
    expect(text).toContain('**Who the site is for:**');
  });
});

describe('answers PDF', () => {
  it('renders the client’s answers as a PDF before and after confirming', async () => {
    const draft = await renderAnswersPdf(def, makeRecord({ locale: 'en' }), []);
    expect(draft.subarray(0, 5).toString()).toBe('%PDF-');
    const confirmed = await renderAnswersPdf(
      def,
      makeRecord({ locale: 'de', status: 'confirmed', confirmed: { name: 'Lena Hartmann', at: '2026-09-26T10:00:00Z', terms_version: 'v2' } }),
      [],
    );
    expect(confirmed.length).toBeGreaterThan(1500);
  }, 30_000);
});
