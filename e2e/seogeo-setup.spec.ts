import { expect, test } from '@playwright/test';
import { walkToConfigurator } from './helpers/funnel';
import { GASTRO } from './fixtures';

// Gastro's recommended Gold configuration is €4.460 before any SEO/GEO setup is added.
const BASE = 4460;
const eur = (n: number) => `€${n.toLocaleString('de-DE')}`;

/** Toggle via the card title: a click at the card's centre can land on a nested control. */
const toggle = (page: import('@playwright/test').Page, id: string) =>
  page.getByTestId(`addon-${id}`).locator('span').first().click();

test.describe('SEO & GEO setup', () => {
  test('the setup category sits above the bundles and prices as configured', async ({ page }) => {
    await walkToConfigurator(page, GASTRO.persona);
    await expect(page.getByTestId('sum-once')).toHaveText(GASTRO.sumOnceDe);

    // Both headings render, Setup first.
    const setup = page.getByText('SEO & GEO Setup', { exact: true });
    const bundles = page.getByText('SEO & GEO Marketing-Bundles', { exact: true });
    await expect(setup).toBeVisible();
    await expect(bundles).toBeVisible();
    const setupY = (await setup.boundingBox())!.y;
    const bundlesY = (await bundles.boundingBox())!.y;
    expect(setupY).toBeLessThan(bundlesY);

    // Each setup is charged at its configured one-time price.
    await page.getByTestId('addon-seosetup').click();
    await expect(page.getByTestId('sum-once')).toHaveText(eur(BASE + 420));
    await page.getByTestId('addon-geosetup').click();
    await expect(page.getByTestId('sum-once')).toHaveText(eur(BASE + 840));
  });

  test('the combo undercuts the two setups bought separately', async ({ page }) => {
    await walkToConfigurator(page, GASTRO.persona);

    await page.getByTestId('addon-seosetup').click();
    await page.getByTestId('addon-geosetup').click();
    await expect(page.getByTestId('sum-once')).toHaveText(eur(BASE + 840));

    // Selecting the combo absorbs both singles — 800, not 800 + 420 + 420.
    await page.getByTestId('addon-seogeosetup').click();
    await expect(page.getByTestId('sum-once')).toHaveText(eur(BASE + 800));
    await expect(page.getByTestId('addon-seosetup')).toContainText('enthalten');
    await expect(page.getByTestId('addon-geosetup')).toContainText('enthalten');
  });

  test('a monthly bundle waives the setup for the service it monitors', async ({ page }) => {
    await walkToConfigurator(page, GASTRO.persona);

    await page.getByTestId('addon-seosetup').click();
    await page.getByTestId('addon-geosetup').click();
    await expect(page.getByTestId('sum-once')).toHaveText(eur(BASE + 840));

    // SEO Starter covers the SEO setup only — the GEO setup is still charged.
    await page.getByTestId('addon-seostarter').click();
    await expect(page.getByTestId('sum-once')).toHaveText(eur(BASE + 420));
    await expect(page.getByTestId('addon-seosetup')).toContainText('enthalten');
    await expect(page.getByTestId('addon-geosetup')).not.toContainText('enthalten');

    // GEO monitoring covers the other half, taking the one-time total back to base.
    await page.getByTestId('addon-geomon').click();
    await expect(page.getByTestId('sum-once')).toHaveText(eur(BASE));
    await expect(page.getByTestId('addon-geosetup')).toContainText('enthalten');
  });

  test('the SEO + GEO combo bundle waives all three setups at once', async ({ page }) => {
    await walkToConfigurator(page, GASTRO.persona);

    await page.getByTestId('addon-seogeosetup').click();
    await expect(page.getByTestId('sum-once')).toHaveText(eur(BASE + 800));

    await page.getByTestId('addon-seogeokombi').click();
    await expect(page.getByTestId('sum-once')).toHaveText(eur(BASE));
    for (const id of ['seosetup', 'geosetup', 'seogeosetup']) {
      await expect(page.getByTestId(`addon-${id}`)).toContainText('enthalten');
    }
  });
});
