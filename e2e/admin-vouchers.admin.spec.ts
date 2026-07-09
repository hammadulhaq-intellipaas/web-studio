import { expect, test } from '@playwright/test';
import { walkToConfigurator } from './helpers/funnel';
import { deleteVoucherByCode, insertVoucher } from './helpers/db';
import { testVoucherCode } from './fixtures';

// Suite K — voucher CRUD + funnel validation. All codes are E2E-prefixed so global
// teardown cleans them; each test also deletes its own code in `finally`.

test.describe('admin — vouchers', () => {
  test('create a voucher in admin and apply it in the funnel', async ({ page }) => {
    const code = testVoucherCode('A');
    try {
      await page.goto('/admin/vouchers');
      // Top "New voucher" form (unique testids while no existing row is expanded).
      await page.getByTestId('voucher-code').fill(code);
      await page.getByTestId('voucher-percent').fill('30');
      await page.getByTestId('voucher-save').click();
      await expect(page.getByText('Saved ✓')).toBeVisible();
      await expect(page.getByTestId(`voucher-row-${code}`)).toBeVisible();

      // Apply it in the public funnel.
      await walkToConfigurator(page, 'gastro');
      await page.getByTestId('promo-input').fill(code);
      await page.getByTestId('promo-apply').click();
      await expect(page.getByTestId('promo-active')).toBeVisible();
    } finally {
      await deleteVoucherByCode(code);
    }
  });

  test('an expired voucher is rejected by the funnel', async ({ page }) => {
    const code = testVoucherCode('EXP');
    await insertVoucher({ code, percent: 15, valid_until: '2000-01-01T00:00:00.000Z' });
    try {
      await walkToConfigurator(page, 'gastro');
      await page.getByTestId('promo-input').fill(code);
      await page.getByTestId('promo-apply').click();
      await expect(page.getByTestId('promo-error')).toBeVisible();
      await expect(page.getByTestId('promo-active')).toHaveCount(0);
    } finally {
      await deleteVoucherByCode(code);
    }
  });
});
