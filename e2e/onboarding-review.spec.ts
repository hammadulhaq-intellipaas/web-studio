import { expect, test } from '@playwright/test';
import { completeAnswers } from './helpers/onboarding';
import { testEmail } from './fixtures';

// The final review guides the client end to end: every problem is named with where it is
// and what is wrong, one click opens that exact question, and the screen offers the way
// straight back. Runs with ONBOARDING_AI_FIXTURE=1; stops before confirming.

function weekdayInDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

test.describe('onboarding final review', () => {
  test('names each problem, opens it, and brings the client back', async ({ page, request }) => {
    test.setTimeout(300_000);
    const res = await request.get('/en/onboardingform/new', { maxRedirects: 0 });
    const id = (res.headers()['location'] ?? '').split('/').pop()!;
    const answers = completeAnswers(testEmail('onb-review')) as Record<string, unknown>;
    delete answers.content_responsible; // German-only: never missing on an English form
    delete answers.ideal_customer;
    answers.launch_date = { v: '2026-09-20' }; // has gone by
    const saved = await request.patch(`/api/onboarding/${id}`, { data: { base_rev: 0, changes: answers, current_step: 'review' } });
    expect(saved.status()).toBe(200);

    await page.goto(`/en/onboardingform/${id}`);
    const issues = page.locator('[data-testid=onb-issues]');
    await expect(issues).toBeVisible({ timeout: 60_000 });
    await expect(issues).toHaveAttribute('data-count', '2');
    await expect(page.locator('[data-testid=onb-issue-content_responsible]')).toHaveCount(0);
    await expect(page.locator('[data-testid=onb-issue-launch_date]')).toContainText('This date has now passed');

    // The button is never dead: it points at the list.
    await page.click('[data-testid=onb-start-review]');
    await expect(page.locator('[data-testid=onb-issues-blocked]')).toBeVisible();

    // Straight to the question, error showing, cursor in it, the way back on top.
    await page.click('[data-testid=onb-issue-ideal_customer]');
    await expect(page.locator('[data-screen=onb-design]')).toBeVisible();
    await expect(page.locator('[data-testid=onb-return-bar]')).toBeVisible();
    await expect(page.locator('[data-testid=err-ideal_customer]')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.activeElement?.closest('[data-field]')?.getAttribute('data-field'))).toBe('ideal_customer');
    await page.fill('[data-testid=f-ideal_customer]', 'Office workers with back pain who book a full course of treatment.');
    await page.click('[data-testid=onb-back-to-review]');
    await expect(page.locator('[data-screen=onb-review-ready]')).toBeVisible();
    await expect(issues).toHaveAttribute('data-count', '1');

    // A step that still has a problem says so, and still lets them go back.
    await page.click('[data-testid=onb-issue-launch_date]');
    await expect(page.locator('[data-screen=onb-timing]')).toBeVisible();
    await page.click('[data-testid=onb-back-to-review]');
    await expect(page.locator('[data-testid=onb-return-still-open]')).toBeVisible();
    await page.click('[data-testid=onb-back-to-review-anyway]');
    await expect(page.locator('[data-screen=onb-review-ready]')).toBeVisible();

    // Put the date right (past the page's own autosave) and run the review.
    await page.waitForTimeout(2500);
    let status = 0;
    for (let i = 0; i < 4 && status !== 200; i++) {
      const rec = (await (await request.get(`/api/onboarding/${id}`)).json()) as { record: { rev: number } };
      status = (await request.patch(`/api/onboarding/${id}`, { data: { base_rev: rec.record.rev, changes: { launch_date: { v: weekdayInDays(40) } } } })).status();
    }
    expect(status).toBe(200);
    await page.reload();
    await expect(issues).toHaveCount(0, { timeout: 60_000 });
    await page.click('[data-testid=onb-start-review]');

    // Skip every follow-up, one question at a time, until the hand-over to the brief.
    const toBrief = page.locator('[data-testid=onb-to-brief]');
    const card = page.locator('[data-testid=onb-followup]');
    for (let i = 0; i < 12; i++) {
      await page.locator('[data-testid=onb-followup], [data-testid=onb-to-brief]').first().waitFor({ timeout: 90_000 });
      if (await toBrief.count()) break;
      const qid = await card.getAttribute('data-question-id');
      await page.click('[data-testid=onb-followup-skip]');
      await expect
        .poll(async () => ((await toBrief.count()) ? 'done' : await card.getAttribute('data-question-id').catch(() => null)), { timeout: 60_000 })
        .not.toBe(qid);
    }
    await expect(page.locator('[data-testid=onb-followups-summary]')).toContainText('skipped');
    await toBrief.click();

    // Final review: every row has its own link; Change opens that question and returns.
    await expect(page.locator('[data-screen=onb-understood]')).toBeVisible({ timeout: 120_000 });
    await expect(page.locator('[data-testid=onb-row-vat_id]')).toContainText('Not provided');
    await page.click('[data-testid=onb-change-approver]');
    await expect(page.locator('[data-screen=onb-inboxes]')).toBeVisible();
    await page.click('[data-testid=onb-back-to-review]');
    await expect(page.locator('[data-screen=onb-understood]')).toBeVisible({ timeout: 60_000 });

    const pdf = await request.get(`/api/onboarding/${id}/answers-pdf`);
    expect(pdf.status()).toBe(200);
    expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');

    // No verdict yet: pointed at it. Then confirm: unticked boxes are marked.
    await page.click('[data-testid=onb-to-confirm]');
    await expect(page.locator('[data-testid=onb-understood-error]')).toBeVisible();
    await page.click('[data-testid=onb-understood-yes]');
    await page.click('[data-testid=onb-to-confirm]');
    await expect(page.locator('[data-screen=onb-confirm]')).toBeVisible({ timeout: 30_000 });
    await page.click('[data-testid=onb-confirm-submit]');
    await expect(page.locator('[data-testid=onb-confirm-error]')).toContainText('5 confirmations are still open');

    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/[–—]/);
  });
});
