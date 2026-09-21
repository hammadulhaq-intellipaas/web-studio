import { expect, test } from '@playwright/test';
import { testEmail } from './fixtures';
import { createFilledForm } from './helpers/onboarding';

// Real model run (OpenAI). Excluded by `npm run test:e2e:fast`; needs a server WITHOUT
// ONBOARDING_AI_FIXTURE and with OPENAI_API_KEY. Skips itself when it meets fixture output.

const EMAIL = testEmail('onb-ai');

test.describe('onboarding AI', () => {
  test('@integration the model asks about thin answers and writes a grounded brief', async ({ request }) => {
    test.setTimeout(240_000);
    const id = await createFilledForm(request, EMAIL, {
      usps: { v: 'gut und günstig' }, // thin — the completeness pass should want specifics
      factual_claims: { v: 'viele zufriedene Kunden' },
    });

    const review = await request.post(`/api/onboarding/${id}/review`);
    expect(review.ok()).toBeTruthy();
    let record = (await review.json()).record as { review: { queue: { id: string; quick_replies: { value: string }[]; mode: string }[]; cursor: number } };

    // Answer or skip whatever came up (at most the cap), never more than 12 rounds.
    for (let i = 0; i < 12; i++) {
      const q = record.review.queue[record.review.cursor];
      if (!q) break;
      const answer = q.mode === 'acknowledge' ? (q.quick_replies[0]?.value ?? 'ok') : q.quick_replies[0]?.value ?? 'Termine innerhalb einer Woche, alle Kassen, barrierefreier Zugang';
      const res = await request.post(`/api/onboarding/${id}/followups`, { data: { question_id: q.id, answer } });
      expect(res.ok()).toBeTruthy();
      record = (await res.json()).record;
    }

    const briefRes = await request.post(`/api/onboarding/${id}/brief`);
    expect(briefRes.ok()).toBeTruthy();
    const { brief } = (await briefRes.json()) as { brief: { model: string | null; source: string; sections: Record<string, { content_markdown: string; still_needed: string[] }> } };
    test.skip(brief.model === 'fixture', 'server is in ONBOARDING_AI_FIXTURE mode');

    console.log(`[integration] brief source=${brief.source} model=${brief.model}`);
    expect(Object.keys(brief.sections)).toHaveLength(9);
    const all = Object.values(brief.sections).map((s) => s.content_markdown).join('\n');
    expect(all).toContain('Physio Nordend');
    // the hard rules, enforced by code whatever the model did
    expect(all).not.toMatch(/\d[\d.,]*\s?(€|EUR)/);
    expect(all).not.toMatch(/\b\d+\s?(Wochen|weeks)\b/);
    expect(brief.sections.still_needed).toBeDefined();
  });
});
