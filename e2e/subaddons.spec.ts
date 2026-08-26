import { expect, test } from '@playwright/test';
import { walkToConfigurator } from './helpers/funnel';
import { GASTRO } from './fixtures';

// Widgets is priced per ticked option: base €190 × the number of boxes ticked.
// Gastro's recommended Gold configuration is €4.460 before Widgets is switched on.
const BASE = 4460;
const WIDGET = 190;
const once = (n: number) => `€${(BASE + WIDGET * n).toLocaleString('de-DE')}`;

test.describe('add-on sub-options (Widgets)', () => {
  // The options live in the CMS (addons.sub_addons). Until migration
  // 20260729000007 has been applied to the project this spec runs against, the row has
  // none and Widgets is still a plain toggle — skip rather than report a false failure.
  //
  // Toggling goes through the title, never a bare card.click(): Playwright clicks an
  // element's centre, and once the picker is open the centre lands inside it — where
  // clicks are deliberately swallowed so a mis-aimed tick can't discard the selection.
  async function skipUnlessMigrated(page: import('@playwright/test').Page) {
    const card = page.getByTestId('addon-widgets');
    const title = card.getByText('Widgets', { exact: true });
    await title.click();
    const present = await page.getByTestId('subaddon-widgets-whatsapp').count();
    await title.click(); // leave the configuration exactly as we found it
    if (!present) {
      test.skip(true, 'addons.sub_addons not populated yet — run migration 20260729000007');
    }
    return card;
  }

  test('ticking options scales the price and the receipt line', async ({ page }) => {
    await walkToConfigurator(page, GASTRO.persona);
    await expect(page.getByTestId('sum-once')).toHaveText(GASTRO.sumOnceDe);
    await skipUnlessMigrated(page);

    const card = page.getByTestId('addon-widgets');
    const whatsapp = page.getByTestId('subaddon-widgets-whatsapp');
    const reviews = page.getByTestId('subaddon-widgets-reviews');
    const call = page.getByTestId('subaddon-widgets-clicktocall');

    // Collapsed: the options only exist once the add-on itself is on.
    await expect(whatsapp).toBeHidden();

    // Switching the add-on on selects the first option and charges one unit.
    await card.click();
    await expect(whatsapp).toBeVisible();
    await expect(whatsapp).toHaveAttribute('aria-checked', 'true');
    await expect(reviews).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByTestId('sum-once')).toHaveText(once(1));

    // Each further tick adds another unit.
    await reviews.click();
    await expect(page.getByTestId('sum-once')).toHaveText(once(2));
    await call.click();
    await expect(page.getByTestId('sum-once')).toHaveText(once(3));

    // Unticking removes a unit again.
    await reviews.click();
    await expect(reviews).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByTestId('sum-once')).toHaveText(once(2));

    // The last remaining tick is clamped — the card's own toggle is how you remove it.
    await call.click();
    await expect(page.getByTestId('sum-once')).toHaveText(once(1));
    await expect(whatsapp).toBeDisabled();
    await whatsapp.click({ force: true });
    await expect(whatsapp).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('sum-once')).toHaveText(once(1));

    // Ticking an option must never toggle the add-on off (the card wraps an onClick).
    await expect(card.getByText('Widgets')).toBeVisible();
    await reviews.click();
    await expect(page.getByTestId('sum-once')).toHaveText(once(2));

    // Nor may clicking the picker's own label or the dead space around the pills —
    // those bubble to the same card onClick and would silently discard the ticks.
    await card.getByText(/Optionen wählen/).click();
    await expect(page.getByTestId('sum-once')).toHaveText(once(2));
    await expect(reviews).toBeVisible();

    // The sidebar receipt names exactly the ticked options.
    await expect(page.getByText('Widgets (WhatsApp, Bewertungen)')).toBeVisible();

    // Switching the add-on off drops the whole line. The picker now covers the middle of
    // the card, so "off" is the toggle or the title row — not a click anywhere on the card.
    await card.getByText('Widgets', { exact: true }).click();
    await expect(page.getByTestId('sum-once')).toHaveText(GASTRO.sumOnceDe);
    await expect(page.getByText('Widgets (WhatsApp, Bewertungen)')).toBeHidden();
    await expect(whatsapp).toBeHidden();
  });

  test('the ticked options survive the step-4 summary', async ({ page }) => {
    await walkToConfigurator(page, GASTRO.persona);
    await skipUnlessMigrated(page);
    await page.getByTestId('addon-widgets').getByText('Widgets', { exact: true }).click();
    await page.getByTestId('subaddon-widgets-clicktocall').click();
    await expect(page.getByTestId('sum-once')).toHaveText(once(2));

    await page.getByTestId('to-lead').click();
    await expect(page.getByText('Widgets (WhatsApp, Click-to-Call)')).toBeVisible();
  });
});
