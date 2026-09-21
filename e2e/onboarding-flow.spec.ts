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

  test('the brief has the nine sections, edits inline, rewrites one section only', async ({ page, request }) => {
    const id = await createFilledForm(request, EMAIL, { booked_package: { v: null, dk: true } });
    await page.goto(`/onboardingform/${id}`);
    await page.click('[data-testid=onb-start-review]');
    await page.click('[data-testid=onb-reply-gold]'); // the one follow-up
    await page.click('[data-testid=onb-to-brief]');

    await expect(page.locator('[data-screen=onb-brief]')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-testid^=onb-brief-section-]')).toHaveCount(9);
    await expect(page.locator('[data-testid=onb-brief-content-who]')).toContainText('Physio Nordend');
    await expect(page.locator('[data-testid=onb-brief-content-look]')).toContainText('Freundlich, aber professionell');
    // section 9 is composed by code: nothing is missing after the follow-up was answered
    await expect(page.locator('[data-testid=onb-brief-content-still_needed]')).toContainText('Nichts');
    // the system section has no edit / rewrite controls
    await expect(page.locator('[data-testid=onb-brief-edit-btn-still_needed]')).toHaveCount(0);

    // inline edit of one section
    const before = await page.locator('[data-testid=onb-brief-content-dates]').innerText();
    await page.click('[data-testid=onb-brief-edit-btn-who]');
    await page.fill('[data-testid=onb-brief-edit-who]', 'Physio Nordend ist eine Praxis in Frankfurt. **Eigene Fassung.**');
    await page.click('[data-testid=onb-brief-save-who]');
    await expect(page.locator('[data-testid=onb-brief-content-who]')).toContainText('Eigene Fassung');
    await expect(page.locator('[data-testid=onb-brief-section-who]')).toContainText('bearbeitet');
    await expect(page.locator('[data-testid=onb-brief-content-dates]')).toHaveText(before);

    // rewrite one section — only that section changes
    await page.click('[data-testid=onb-brief-rewrite-btn-dates]');
    await page.fill('[data-testid=onb-brief-instruction-dates]', 'Bitte den Starttermin zuerst nennen.');
    await page.click('[data-testid=onb-brief-rewrite-send-dates]');
    await expect(page.locator('[data-testid=onb-brief-content-dates]')).toContainText('Ergänzt nach Ihrer Anmerkung', { timeout: 30_000 });
    await expect(page.locator('[data-testid=onb-brief-content-who]')).toContainText('Eigene Fassung');

    const { record } = await getRecord(request, id);
    expect(record.status).toBe('brief');
    expect(record.brief_version).toBe(3); // llm → client_edit → rewrite
    await expect(page.locator('[data-testid=onb-to-confirm]')).toBeVisible();
  });

  test('the review refuses an incomplete form', async ({ request }) => {
    const id = await createFilledForm(request, EMAIL, { legal_name: null });
    const res = await request.post(`/api/onboarding/${id}/review`);
    expect(res.status()).toBe(422);
    expect((await res.json()).fields).toContain('legal_name');
  });
});
