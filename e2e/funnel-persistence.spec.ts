import { expect, test } from '@playwright/test';
import { walkToConfigurator } from './helpers/funnel';
import { GASTRO } from './fixtures';

// Suite F — persistence. The funnel state lives in localStorage (ipaas-konfigurator-v3).
// Note: the "Done screen never restores into itself" rule is enforced at write-time via the
// store's partialize (step done→intro), and the restart→intro reset is covered in
// funnel-happy; both require reaching Done (creating a lead), so they aren't duplicated here.

test.describe('public funnel — persistence', () => {
  test('configurator step and selections survive a reload', async ({ page }) => {
    await walkToConfigurator(page, GASTRO.persona);
    await expect(page.getByTestId('sum-once')).toHaveText(GASTRO.sumOnceDe);

    // Change a selection, then reload — step and selection both persist.
    await page.getByTestId('addon-newsletter').click();
    await expect(page.getByTestId('sum-once')).toHaveText('€4.850');

    await page.reload();

    await expect(page.getByTestId('rec-name')).toBeVisible();
    await expect(page.getByTestId('sum-once')).toHaveText('€4.850');
  });
});
