import { expect, test } from '@playwright/test';
import { GASTRO } from './fixtures';

// Suite E — localization. DE at `/`, EN at `/en`, header toggle, legal pages.

test.describe('public funnel (en)', () => {
  test('EN funnel renders, number formatting, and toggle back to DE', async ({ page }) => {
    await page.goto('/en');
    await expect(
      page.getByRole('heading', { name: 'Your new website — configured in just a few minutes.' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Start now' }).click();
    await expect(page.getByRole('heading', { name: 'Who are you?' })).toBeVisible();
    await page.getByTestId(`persona-${GASTRO.persona}`).click();
    await page.getByTestId('to-config').click();

    // en-IE grouping: comma thousands, dot decimals.
    await expect(page.getByTestId('sum-once')).toHaveText(GASTRO.sumOnceEn);
    await expect(page.getByTestId('sum-monthly')).toHaveText(GASTRO.sumMonthlyEn);

    // Header toggle switches back to German formatting.
    await page.getByTestId('language-toggle').getByRole('button', { name: 'Deutsch' }).click();
    await expect(page.getByTestId('sum-once')).toHaveText(GASTRO.sumOnceDe);
  });

  test('legal pages load in both locales', async ({ page }) => {
    await page.goto('/impressum');
    await expect(page).toHaveURL(/\/impressum$/);
    await page.goto('/datenschutz');
    await expect(page).toHaveURL(/\/datenschutz$/);
    await page.goto('/en/impressum');
    await expect(page).toHaveURL(/\/en\/impressum$/);
  });
});
