import { expect, test } from '@playwright/test';
import { createLeadViaApi } from './helpers/api';
import { testEmail } from './fixtures';

// Developers page: one card per quote, each opening the Design, Build and Handover tabs.
// Seeds its own lead; a fresh quote shows under "All quotes" (the default), not "Committed".

test.describe.serial('admin — developers', () => {
  const email = testEmail('developer');
  let leadId: string;

  test('nav link opens the Developers page', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('link', { name: 'Developers' }).click();
    await expect(page).toHaveURL(/\/admin\/developer$/);
    await expect(page.getByRole('heading', { name: 'Developers' })).toBeVisible();
  });

  test('a new quote shows as a card under All quotes', async ({ page, request }) => {
    leadId = await createLeadViaApi(request, email);
    await page.goto(`/admin/developer?q=${encodeURIComponent(email)}`);
    const card = page.getByTestId(`dev-card-${leadId}`);
    await expect(card).toBeVisible();
    await expect(card).toContainText(email);

    // Not committed and no form under way: not under Committed.
    await page.goto(`/admin/developer?view=committed&q=${encodeURIComponent(email)}`);
    await expect(page.getByTestId(`dev-card-${leadId}`)).toHaveCount(0);
  });

  test('the client page has the three tabs', async ({ page }) => {
    await page.goto(`/admin/developer/${leadId}`);
    await expect(page.getByTestId('dev-title')).toBeVisible();
    await expect(page.getByTestId('dev-panel-design')).toBeVisible();

    await page.getByTestId('dev-tab-build').click();
    await expect(page.getByTestId('dev-panel-build')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate the prompt for Claude Code to build' })).toBeDisabled();

    await page.getByTestId('dev-tab-handover').click();
    await expect(page.getByTestId('dev-panel-handover')).toBeVisible();
  });
});
