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

  // Until migration 20261028000022 has run, each tab says so instead of showing its panel.
  test('the client page has the three tabs', async ({ page }) => {
    await page.goto(`/admin/developer/${leadId}`);
    await expect(page.getByTestId('dev-title')).toBeVisible();
    await expect(page.getByTestId('dev-panel-design')).toBeVisible();
    const versions = page.getByTestId('dev-versions-card');
    await expect(versions).toBeVisible();
    if (!(await page.getByTestId('dev-designs-migration-notice').count())) {
      // No confirmed form yet: nothing can be uploaded.
      await expect(page.getByTestId('dev-upload-submit')).toBeDisabled();
    }

    await page.getByTestId('dev-tab-build').click();
    await expect(page.getByTestId('dev-panel-build')).toBeVisible();
    if (!(await page.getByTestId('dev-build-migration-notice').count())) {
      await expect(page.getByTestId('dev-build-locked')).toBeVisible();
      await expect(page.getByTestId('dev-generate-build')).toBeDisabled();
      await expect(page.getByTestId('dev-setup')).toContainText('gh repo create');
    }

    await page.getByTestId('dev-tab-handover').click();
    await expect(page.getByTestId('dev-panel-handover')).toBeVisible();
    if (!(await page.getByTestId('dev-handover-migration-notice').count())) {
      await expect(page.getByTestId('dev-generate-handover')).toBeDisabled();
      // No design uploaded, so there are no draft links to take offline.
      await expect(page.getByTestId('dev-drafts-toggle')).toHaveCount(0);
    }
  });
});

test('an unknown draft link is a sandboxed, unindexed 404', async ({ request }) => {
  for (const path of ['/drafts/no-such-client/v1-a', '/drafts/no-such-client/v1-a/index.html', '/drafts/no-such-client/not-a-version']) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status(), path).toBe(404);
    expect(res.headers()['x-robots-tag']).toContain('noindex');
    expect(res.headers()['content-security-policy']).toMatch(/^sandbox /);
  }
});
