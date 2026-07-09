import { expect, test } from '@playwright/test';
import { snapshotField, setField, getSetting } from './helpers/db';

// Suite J — catalog CMS. Every mutation is snapshotted and restored in `finally`
// so a failure can never leave prod pricing/settings changed.

test.describe('admin — catalog', () => {
  test('editing the Gold bundle price is reflected on the public funnel', async ({ page }) => {
    const original = await snapshotField('bundles', 'gold', 'price');
    try {
      await page.goto('/admin/catalog/bundles');
      await page.getByTestId('entity-row-gold').click();
      const priceInput = page.locator('label:has-text("Price €") + input');
      await priceInput.fill('3100');
      await page.getByTestId('entity-save-gold').click();
      await expect(page.getByText('Saved ✓')).toBeVisible();

      // Fresh public context → recomputed one-time: 3100+350+190+290+490+150 = 4570
      await page.goto('/');
      await page.getByRole('button', { name: 'Jetzt starten' }).click();
      await page.getByTestId('persona-gastro').click();
      await page.getByTestId('to-config').click();
      await expect(page.getByTestId('sum-once')).toHaveText('€4.570');
    } finally {
      await setField('bundles', 'gold', 'price', original);
    }
  });

  test('editing the team_email setting persists', async ({ page }) => {
    const original = await getSetting('team_email');
    const restoreValue = typeof original === 'string' ? original : '';
    try {
      await page.goto('/admin/catalog/settings');
      const input = page.getByTestId('setting-team_email');
      await input.fill('e2e-team@example.com');
      await page.getByTestId('setting-save-team_email').click();
      await expect(page.getByText('Saved ✓')).toBeVisible();

      await page.reload();
      await expect(page.getByTestId('setting-team_email')).toHaveValue('e2e-team@example.com');
    } finally {
      await page.goto('/admin/catalog/settings');
      const input = page.getByTestId('setting-team_email');
      await input.fill(restoreValue);
      await page.getByTestId('setting-save-team_email').click();
      await expect(page.getByText('Saved ✓')).toBeVisible();
    }
  });
});
