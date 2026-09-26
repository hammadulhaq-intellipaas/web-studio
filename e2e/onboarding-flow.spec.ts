import { expect, test } from '@playwright/test';
import { testEmail } from './fixtures';
import { createFilledForm, getRecord } from './helpers/onboarding';

// Review → follow-ups → read-back → confirm → done, with the AI layer in fixture mode
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
    // the model's follow-up on an answered field is kept as a note, the value stays as typed
    expect(record.answers.usps.v).toBe('Schnell');
    expect((record.answers.usps as { note?: string }).note).toContain('Termine innerhalb einer Woche, alle Kassen, barrierefrei');
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

  test('a clean form has no follow-ups and goes straight to the read-back', async ({ page, request }) => {
    const id = await createFilledForm(request, EMAIL);
    await page.goto(`/onboardingform/${id}`);
    await page.click('[data-testid=onb-start-review]');
    await expect(page.locator('[data-screen=onb-review-done]')).toBeVisible();
    await expect(page.locator('[data-testid=onb-to-brief]')).toBeVisible();
  });

  test('the read-back shows their answers and our understanding, and takes a correction', async ({ page, request }) => {
    const id = await createFilledForm(request, EMAIL, { booked_package: { v: null, dk: true } });
    await page.goto(`/onboardingform/${id}`);
    await page.click('[data-testid=onb-start-review]');
    await page.click('[data-testid=onb-reply-gold]'); // the one follow-up
    await page.click('[data-testid=onb-to-brief]');

    // Block 0: the completeness report. This form left booked_package as "I don't know"
    // and answered the follow-up with gold, so the gap is closed and nothing is listed.
    const report = page.locator('[data-testid=onb-report]');
    await expect(report).toBeVisible({ timeout: 30_000 });
    await expect(report).toHaveAttribute('data-state', 'clear', { timeout: 30_000 });

    // Block 1: every answer, grouped by section, with a way back to the screen it came from
    await expect(page.locator('[data-testid=onb-answer-check]')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-testid=onb-answer-check]')).toContainText('Physio Nordend');
    await expect(page.locator('[data-testid=onb-edit-business]')).toBeVisible();

    // Block 2: the read-back, assembled from their own words
    const understood = page.locator('[data-testid=onb-understood]');
    await expect(understood).toContainText('Rückenschmerzen');
    await expect(understood).toContainText('Termin');
    await expect(understood).toContainText('Freundlich, aber professionell');
    await expect(understood).not.toContainText('…');

    // A correction is required as soon as they say it is not right
    await page.click('[data-testid=onb-to-confirm]');
    await expect(page.locator('[data-testid=onb-understood-error]')).toBeVisible();
    await page.click('[data-testid=onb-understood-mostly]');
    await page.click('[data-testid=onb-to-confirm]');
    await expect(page.locator('[data-testid=onb-understood-error]')).toBeVisible();
    await page.fill('[data-testid=onb-corrections]', 'Wir sind überhaupt nicht förmlich, unsere Patienten duzen uns.');
    await page.click('[data-testid=onb-to-confirm]');
    await expect(page.locator('[data-screen=onb-confirm]')).toBeVisible();

    // The written brief still exists for the team, with its nine sections
    const { record } = await getRecord(request, id);
    expect(record.status).toBe('brief');
    expect(record.brief_version).toBe(1);
    expect(record.answers.understood_ok?.v).toBe('mostly');
    expect(record.answers.understood_corrections?.v).toContain('förmlich');
  });

  test('the report lists what is still open, links back to it, and never blocks confirming', async ({ page, request }) => {
    // Skipping the follow-up leaves the gap open, so the report has something to say.
    const id = await createFilledForm(request, EMAIL, { booked_package: { v: null, dk: true, dk_date: '2027-01-10' } });
    await page.goto(`/onboardingform/${id}`);
    await page.click('[data-testid=onb-start-review]');
    await page.click('[data-testid=onb-followup-skip]');
    await page.click('[data-testid=onb-to-brief]');

    const report = page.locator('[data-testid=onb-report]');
    await expect(report).toBeVisible({ timeout: 30_000 });
    await expect(report).toHaveAttribute('data-state', 'open', { timeout: 30_000 });
    const item = page.locator('[data-testid=onb-report-item-booked_package]');
    await expect(item).toBeVisible();
    // The date they gave is carried through, not just "don't know".
    await expect(item).toContainText('2027-01-10');

    // "Add it" goes back to the screen the field lives on.
    await page.click('[data-testid=onb-report-fix-booked_package]');
    await expect(page.locator('[data-screen=onb-project]')).toBeVisible();
    await expect(page.locator('[data-field=booked_package]')).toBeVisible();

    // Advisory only: back to the review and straight on to confirming, gap still open.
    await page.click('[data-testid=step-review]');
    await expect(page.locator('[data-testid=onb-understood]')).toBeVisible({ timeout: 30_000 });
    await page.click('[data-testid=onb-understood-yes]');
    await page.click('[data-testid=onb-to-confirm]');
    await expect(page.locator('[data-screen=onb-confirm]')).toBeVisible();
  });

  test('confirming needs every check and a name, then delivers the PDF and locks the form', async ({ page, request }) => {
    const id = await createFilledForm(request, EMAIL);
    await page.goto(`/onboardingform/${id}`);
    await page.click('[data-testid=onb-start-review]');
    await page.click('[data-testid=onb-to-brief]');
    await expect(page.locator('[data-testid=onb-answer-check]')).toBeVisible({ timeout: 30_000 });
    await page.click('[data-testid=onb-understood-yes]');
    await page.click('[data-testid=onb-to-confirm]');

    await expect(page.locator('[data-screen=onb-confirm]')).toBeVisible();
    // the timeline the 23 Sep 2026 spec sets out, folded into sections under the declaration
    const confirm = page.locator('[data-screen=onb-confirm]');
    await expect(page.locator('[data-testid=onb-terms]')).toContainText('Mit dem Absenden');
    await expect(confirm).toContainText('10 Tagen');
    await expect(confirm).toContainText('3 Wochen');
    await expect(confirm).toContainText('5 Tagen');

    await page.click('[data-testid=onb-confirm-submit]');
    await expect(page.locator('[data-testid=onb-confirm-error]')).toBeVisible(); // checks missing
    const checks = page.locator('[data-testid^=onb-check-]');
    const n = await checks.count();
    expect(n).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < n; i++) await checks.nth(i).check();
    await page.fill('[data-testid=onb-confirm-name]', 'Lena Hartmann');
    await page.click('[data-testid=onb-confirm-submit]');

    await expect(page.locator('[data-screen=onb-done]')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-testid=onb-confirmed-by]')).toContainText('Lena Hartmann');
    await expect(page.locator('[data-testid=onb-delivery]')).toHaveAttribute('data-delivered', 'true', { timeout: 60_000 });

    // the PDF is real
    const pdf = await request.get(`/api/onboarding/${id}/pdf`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()['content-type']).toContain('application/pdf');
    const body = await pdf.body();
    expect(body.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    if (process.env.ONB_PDF_OUT) (await import('node:fs')).writeFileSync(process.env.ONB_PDF_OUT, body);

    // the record is locked: no more answers, status confirmed, delivery recorded
    const { record } = await getRecord(request, id);
    expect(record.status).toBe('confirmed');
    // In the form's own folder of the onboarding bucket.
    expect(record.delivery?.pdf_path).toBe(`${id}/brief-v1.pdf`);
    const patch = await request.patch(`/api/onboarding/${id}`, { data: { base_rev: record.rev, changes: { domain: { v: 'x.de' } } } });
    expect(patch.status()).toBe(409);
    await page.reload();
    await expect(page.locator('[data-screen=onb-done]')).toBeVisible();
    await expect(page.locator('[data-testid=onb-to-confirm]')).toHaveCount(0); // locked after confirming
  });

  test('the review refuses an incomplete form', async ({ request }) => {
    const id = await createFilledForm(request, EMAIL, { legal_name: null });
    const res = await request.post(`/api/onboarding/${id}/review`);
    expect(res.status()).toBe(422);
    expect((await res.json()).fields).toContain('legal_name');
  });
});
