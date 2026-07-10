import { expect, test } from '@playwright/test';
import { walkToConfigurator } from './helpers/funnel';
import { GASTRO } from './fixtures';

// Suite G — the shareable questionnaire link. Every funnel run gets a `?c=<id>` handle
// whose full state (answers, selection, voucher, contact details) is mirrored server-side,
// so opening the link in a fresh browser context resumes exactly where it left off.

test.describe('public funnel — shareable session link', () => {
  test('the URL carries a session id from the start', async ({ page }) => {
    await walkToConfigurator(page, GASTRO.persona);
    await expect(page).toHaveURL(/[?&]c=[A-Za-z0-9]{21}/);
  });

  test('share button reveals the link, and it restores the configuration elsewhere', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await walkToConfigurator(page, GASTRO.persona);

    // Diverge from the recommended configuration so the restore is unambiguous.
    await page.getByTestId('addon-newsletter').click();
    await expect(page.getByTestId('sum-once')).toHaveText('€4.850');

    await page.getByTestId('share-config').click();
    const link = await page.getByTestId('share-link').inputValue();
    expect(link).toMatch(/[?&]c=[A-Za-z0-9]{21}/);

    // The debounced write must land before the link is opened elsewhere.
    await page.waitForTimeout(2500);

    // A fresh context shares no localStorage: state can only come from the server.
    const other = await page.context().browser()!.newContext();
    const restored = await other.newPage();
    await restored.goto(link);

    await expect(restored.getByTestId('rec-name')).toBeVisible();
    await expect(restored.getByTestId('sum-once')).toHaveText('€4.850');
    await other.close();
  });
});
