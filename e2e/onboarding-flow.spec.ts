import { expect, test } from '@playwright/test';
import { testEmail } from './fixtures';
import { createFilledForm, getRecord } from './helpers/onboarding';

// Review → follow-ups → brief → confirm → done, with the AI layer in fixture mode
// (ONBOARDING_AI_FIXTURE=1 on the server): deterministic, no key, no cost.

const EMAIL = testEmail('onb-flow');

test.describe('onboarding review flow', () => {
  test('gaps become follow-ups; answers write back, chains fire, skips are recorded, the scope flag is acknowledged', async ({ page, request }) => {
    const id = await createFilledForm(request, EMAIL, {
      booked_package: { v: null, dk: true }, // → generic "don't know" question (Screen 1)
      opening_hours: { v: null, dk: true }, // → "don't know" question we will skip (Screen 2)
      usps: { v: 'Schnell' }, // → the fixture model asks for specifics (Screen 5)
      legal_pages: { v: 'unsure' }, // → rule follow-up, chained into the offer (Screen 8)
      page_count: { v: 11 }, // 11 pages vs the 5–8 band → scope_flag, acknowledge only
      page_list: { v: Array.from({ length: 11 }, (_, i) => `Seite ${i + 1}`).join('\n') },
    });

    await page.goto(`/onboardingform/${id}`);
    await expect(page.locator('[data-screen=onb-review-ready]')).toBeVisible();
    await page.click('[data-testid=onb-start-review]');

    // Form order: Screen 1 (package) → Screen 2 (opening hours) → Screen 5 (usps) → Screen 8 (legal) → flag
    const q = page.locator('[data-testid=onb-followup-question]');
    await expect(q).toContainText('Welches Paket haben Sie gebucht?');
    await expect(page.locator('[data-testid=onb-followup-progress]')).toContainText('Frage 1 von 5');
    await page.click('[data-testid=onb-reply-gold]');

    await expect(q).toContainText('Öffnungszeiten');
    await page.click('[data-testid=onb-followup-skip]');

    await expect(q).toContainText('Was genau macht Sie besser');
    await page.fill('[data-testid=onb-followup-answer]', 'Termine innerhalb einer Woche, alle Kassen, barrierefrei');
    await page.click('[data-testid=onb-followup-send]');

    await expect(q).toContainText('Rechtsseiten');
    await page.click('[data-testid=onb-reply-none]');
    // chained: "we can take care of them — shall we send you a price?"
    await expect(q).toContainText('Angebot');
    await page.click('[data-testid=onb-reply-yes]');

    await expect(q).toContainText('mehr Seiten aufgeführt');
    await expect(page.locator('[data-testid=onb-followup-answer]')).toHaveCount(0); // acknowledge only
    await page.click('[data-testid=onb-reply-ok]');

    await expect(page.locator('[data-screen=onb-review-done]')).toBeVisible();
    await expect(page.locator('[data-testid=onb-to-brief]')).toBeVisible();

    // Everything landed in the structured record — no chat log.
    const { record } = await getRecord(request, id);
    expect(record.status).toBe('review');
    expect(record.answers.booked_package).toMatchObject({ v: 'gold', src: 'followup' });
    expect(record.answers.opening_hours).toMatchObject({ dk: true });
    expect(record.answers.usps.v).toBe('Schnell\nTermine innerhalb einer Woche, alle Kassen, barrierefrei');
    expect(record.answers.legal_pages.v).toBe('none');
    expect(record.flags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'scope_flag', detail: 'over' }),
        expect.objectContaining({ code: 'needs_quote', detail: 'legal_pages' }),
        expect.objectContaining({ code: 'interest', detail: 'legal_pages' }),
      ]),
    );
    expect(record.review?.history.filter((h) => h.skipped)).toHaveLength(1);
    expect(record.review?.history).toHaveLength(6);
  });

  test('a clean form has no follow-ups and goes straight to the brief hand-off', async ({ page, request }) => {
    const id = await createFilledForm(request, EMAIL);
    await page.goto(`/onboardingform/${id}`);
    await page.click('[data-testid=onb-start-review]');
    await expect(page.locator('[data-screen=onb-review-done]')).toBeVisible();
    await expect(page.locator('[data-testid=onb-to-brief]')).toBeVisible();
  });

  test('the review refuses an incomplete form', async ({ request }) => {
    const id = await createFilledForm(request, EMAIL, { legal_name: null });
    const res = await request.post(`/api/onboarding/${id}/review`);
    expect(res.status()).toBe(422);
    expect((await res.json()).fields).toContain('legal_name');
  });
});
