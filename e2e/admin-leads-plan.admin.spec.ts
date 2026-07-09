import { expect, test } from '@playwright/test';
import { createLeadViaApi } from './helpers/api';
import { LEAD, SEEDED_VOUCHER, testEmail } from './fixtures';

// Suite H — admin leads & the (real) OpenAI plan generator. Uses the stored admin
// session. Seeds its own lead via the API so it never depends on funnel specs.

test.describe.serial('admin — leads & plan', () => {
  const email = testEmail('adminlead');
  const fullName = `${LEAD.vorname} ${LEAD.nachname}`;
  let leadId: string;

  test('seed a lead and view its detail', async ({ page, request }) => {
    leadId = await createLeadViaApi(request, email, { voucherCode: SEEDED_VOUCHER.code });
    await page.goto(`/admin/leads/${leadId}`);
    await expect(page.getByTestId('lead-title')).toContainText(fullName);
    await expect(page.getByTestId('lead-totals')).toContainText('€');
    await expect(page.getByText(SEEDED_VOUCHER.code)).toBeVisible();
    await expect(page.getByTestId('generate-plan')).toBeVisible();
  });

  test('search finds the lead and status can be changed', async ({ page }) => {
    await page.goto(`/admin/leads?q=${encodeURIComponent(email)}`);
    await expect(
      page.getByTestId('leads-table').getByRole('link', { name: fullName }).first(),
    ).toBeVisible();

    await page.goto(`/admin/leads/${leadId}`);
    await page.getByTestId('lead-status').selectOption('contacted');
    // The change is an async server action + revalidate; wait for it to settle,
    // then reload to prove it persisted in the DB (not just optimistic UI).
    await expect(page.getByTestId('lead-status')).toHaveValue('contacted');
    await page.reload();
    await expect(page.getByTestId('lead-status')).toHaveValue('contacted');
  });

  test('@integration generates a real suggested plan', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`/admin/leads/${leadId}`);
    await page.getByTestId('generate-plan').click();
    // Real OpenAI call — content is nondeterministic, so assert structure, not text.
    await expect(page.locator('[data-testid^="phase-"]').first()).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText(/Run in Claude (Design|Code)/).first()).toBeVisible();
  });
});
