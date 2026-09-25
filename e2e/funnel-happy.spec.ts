import { expect, test } from '@playwright/test';
import { walkToConfigurator, fillLeadAndSubmit, passCalendlyPanel } from './helpers/funnel';
import { GASTRO, SEEDED_VOUCHER, testEmail } from './fixtures';

// Suites A + B — public funnel happy path and configurator logic.

test.describe('public funnel (de) — happy path', () => {
  test('persona → questions → configurator math → promo → lead → stage 2 → done', async ({ page }) => {
    await walkToConfigurator(page, GASTRO.persona);

    // Gastro defaults recommend Gold with a known pre-selection.
    await expect(page.getByTestId('rec-name')).toHaveText(GASTRO.recBundleName);
    await expect(page.getByTestId('sum-once')).toHaveText(GASTRO.sumOnceDe);
    await expect(page.getByTestId('sum-monthly')).toHaveText(GASTRO.sumMonthlyDe);

    // Monthly cycle removes the 18% yearly discount.
    await page.getByTestId('pay-monthly').click();
    await expect(page.getByTestId('sum-monthly')).toHaveText(GASTRO.sumMonthlyMonthlyDe);
    await page.getByTestId('pay-yearly').click();

    // Addon toggle updates the one-time total (newsletter +390) and reverts.
    await page.getByTestId('addon-newsletter').click();
    await expect(page.getByTestId('sum-once')).toHaveText('€4.850');
    await page.getByTestId('addon-newsletter').click();
    await expect(page.getByTestId('sum-once')).toHaveText(GASTRO.sumOnceDe);

    // Promo: empty → error, bogus → invalid error, TKFF20 → −20% on both totals.
    await page.getByTestId('promo-apply').click();
    await expect(page.getByTestId('promo-error')).toBeVisible();
    await page.getByTestId('promo-input').fill('WRONGCODE');
    await page.getByTestId('promo-apply').click();
    await expect(page.getByTestId('promo-error')).toHaveText('Dieser Code ist leider ungültig.');
    await page.getByTestId('promo-input').fill(SEEDED_VOUCHER.code);
    await page.getByTestId('promo-apply').click();
    await expect(page.getByTestId('promo-active')).toBeVisible();
    await expect(page.getByTestId('sum-once')).toHaveText(GASTRO.sumOnceDiscountedDe);
    await expect(page.getByTestId('sum-monthly')).toHaveText(GASTRO.sumMonthlyDiscountedDe);

    // Lead: validation errors first, then a real submit.
    await page.getByTestId('to-lead').click();
    await page.getByTestId('lead-submit').click();
    await expect(page.getByTestId('lead-err-email')).toBeVisible();
    await expect(page.getByTestId('lead-err-firma')).toBeVisible();
    await expect(page.getByTestId('lead-err-consent')).toBeVisible();
    // The phone number is optional now, so an empty one is not an error.
    await expect(page.getByTestId('lead-err-tel')).toHaveCount(0);

    // The enquiry form asks for contact details only; everything the build needs is
    // collected properly by the onboarding form once the quote is agreed.
    await expect(page.getByText('More about your project')).toHaveCount(0);
    await expect(page.locator('[data-testid^=s2-]')).toHaveCount(0);

    await fillLeadAndSubmit(page, testEmail('happy'));
    await passCalendlyPanel(page);

    // Confirmation keeps the discounted recap.
    await expect(page.getByText('Vielen Dank! Ihre Anfrage ist bei uns.')).toBeVisible();
    await expect(page.getByText(GASTRO.sumOnceDiscountedDe)).toBeVisible();

    await page.getByTestId('restart').click();
    await expect(page.getByRole('button', { name: 'Jetzt starten' })).toBeVisible();
  });

  test('configurator adjustments — bundle / care / AI bundle change totals', async ({ page }) => {
    await walkToConfigurator(page, GASTRO.persona);
    await expect(page.getByTestId('sum-once')).toHaveText(GASTRO.sumOnceDe);

    // Switching to a pricier bundle changes the one-time total; back to Gold restores it.
    await page.getByTestId('bundle-platinum').click();
    await expect(page.getByTestId('sum-once')).not.toHaveText(GASTRO.sumOnceDe);
    await page.getByTestId('bundle-gold').click();
    await expect(page.getByTestId('sum-once')).toHaveText(GASTRO.sumOnceDe);

    // Higher care tier changes the monthly total.
    const monthlyBefore = await page.getByTestId('sum-monthly').textContent();
    await page.getByTestId('care-pro').click();
    await expect(page.getByTestId('sum-monthly')).not.toHaveText(monthlyBefore ?? '');
    await page.getByTestId('care-plus').click();

    // AI bundle adds a one-time cost.
    const onceBefore = await page.getByTestId('sum-once').textContent();
    await page.getByTestId('ai-bundle-toggle').click();
    await expect(page.getByTestId('sum-once')).not.toHaveText(onceBefore ?? '');
  });

  test('BYOW branch recommends Bring Your Own Website', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Jetzt starten' }).click();
    await page.getByTestId('persona-handwerk').click();
    await page.getByTestId('opt-hasSite-website').click();
    await page.getByTestId('opt-selfbuilt-ja').click();
    await expect(page.getByTestId('question-aiMissing')).toBeVisible();
    await page.getByTestId('opt-byowScope-live').click();
    await page.getByTestId('to-config').click();
    await expect(page.getByTestId('rec-name')).toHaveText('Bring Your Own Website');
    await expect(page.getByTestId('bundle-byow')).toBeVisible();
  });
});

test.describe('public funnel — mobile viewport', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  // The landing/intro is the mobile entry point and must not overflow. (The
  // pricing configurator is a desktop-oriented layout that does overflow at
  // 375px — a known, intentional characteristic, so it isn't asserted here.)
  test('landing has no horizontal overflow on mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Jetzt starten' })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
