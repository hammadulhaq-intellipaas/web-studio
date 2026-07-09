import { expect, test, type Page } from '@playwright/test';

const uniq = Date.now();
const TEST_EMAIL = `e2e-${uniq}@example.com`;

async function walkToConfigurator(page: Page, persona = 'gastro') {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jetzt starten' }).click();
  await page.getByTestId(`persona-${persona}`).click();
  await expect(page.getByTestId('question-hasSite')).toBeVisible();
  await page.getByTestId('to-config').click();
  await expect(page.getByTestId('rec-name')).toBeVisible();
}

test.describe('public funnel (de)', () => {
  test('full walkthrough: persona → questions → configurator math → promo → lead → stage 2 → done', async ({
    page,
  }) => {
    await walkToConfigurator(page, 'gastro');

    // Gastro defaults recommend Gold; pre-selection: cookie + maps + foto + bookembed, CF Shield.
    await expect(page.getByTestId('rec-name')).toHaveText('Gold');
    // 2990 + 350 (cookie) + 190 (maps) + 290 (foto) + 490 (booking) + 150 (CF Shield setup)
    await expect(page.getByTestId('sum-once')).toHaveText('€4.460');
    // (89 care Plus + 39 CF Shield) × 0.82 yearly discount
    await expect(page.getByTestId('sum-monthly')).toHaveText('€104,96/Mon.');

    // Monthly payment cycle removes the 18% discount.
    await page.getByTestId('pay-monthly').click();
    await expect(page.getByTestId('sum-monthly')).toHaveText('€128,00/Mon.');
    await page.getByTestId('pay-yearly').click();

    // Toggling an addon updates the total (newsletter +390).
    await page.getByTestId('addon-newsletter').click();
    await expect(page.getByTestId('sum-once')).toHaveText('€4.850');
    await page.getByTestId('addon-newsletter').click();
    await expect(page.getByTestId('sum-once')).toHaveText('€4.460');

    // Invalid promo shows the error; TKFF20 applies −20% on both totals.
    await page.getByTestId('promo-input').fill('WRONGCODE');
    await page.getByTestId('promo-apply').click();
    await expect(page.getByTestId('promo-error')).toHaveText('Dieser Code ist leider ungültig.');
    await page.getByTestId('promo-input').fill('TKFF20');
    await page.getByTestId('promo-apply').click();
    await expect(page.getByTestId('promo-active')).toBeVisible();
    await expect(page.getByTestId('sum-once')).toHaveText('€3.568');
    await expect(page.getByTestId('sum-monthly')).toHaveText('€83,97/Mon.');

    // Lead step: validation errors first, then a successful submit.
    await page.getByTestId('to-lead').click();
    await page.getByTestId('lead-submit').click();
    await expect(page.getByTestId('lead-err-email')).toBeVisible();
    await expect(page.getByTestId('lead-err-tel')).toBeVisible();
    await expect(page.getByTestId('lead-err-consent')).toBeVisible();

    await page.getByTestId('lead-vorname').fill('Erika');
    await page.getByTestId('lead-nachname').fill('Musterfrau');
    await page.getByTestId('lead-firma').fill('E2E Gasthaus GmbH');
    await page.getByTestId('lead-email').fill(TEST_EMAIL);
    await page.getByTestId('lead-tel').fill('+49 170 1234567');
    await page.getByTestId('lead-ziel').fill('Mehr Tischreservierungen über Google.');
    await page.getByTestId('lead-consent').check();
    await page.getByTestId('lead-submit').click();

    // No Calendly URL configured → straight to stage 2.
    await expect(page.getByTestId('readiness')).toBeVisible();
    await expect(page.getByTestId('readiness')).toHaveText('25%');

    // Filling stage-2 fields raises the readiness meter.
    await page.getByTestId('s2-firmenname').fill('E2E Gasthaus GmbH');
    await expect(page.getByTestId('readiness')).not.toHaveText('25%');
    await page.getByTestId('s2-finish').click();

    // Confirmation keeps the discounted recap.
    await expect(page.getByText('Vielen Dank! Ihre Anfrage ist bei uns.')).toBeVisible();
    await expect(page.getByText('Summe einmalig')).toBeVisible();
    await expect(page.getByText('€3.568')).toBeVisible();

    // Restart clears the funnel.
    await page.getByTestId('restart').click();
    await expect(page.getByRole('button', { name: 'Jetzt starten' })).toBeVisible();
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

test.describe('public funnel (en)', () => {
  test('language toggle switches locale and number formatting', async ({ page }) => {
    await page.goto('/en');
    await expect(
      page.getByRole('heading', { name: 'Your new website — configured in just a few minutes.' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Start now' }).click();
    await expect(page.getByRole('heading', { name: 'Who are you?' })).toBeVisible();
    await page.getByTestId('persona-gastro').click();
    await page.getByTestId('to-config').click();
    // en-IE grouping: comma thousands separator
    await expect(page.getByTestId('sum-once')).toHaveText('€4,460');
    await expect(page.getByTestId('sum-monthly')).toHaveText('€104.96/mo.');

    // Toggle back to German in the header.
    await page.getByTestId('language-toggle').getByRole('button', { name: 'Deutsch' }).click();
    await expect(page.getByTestId('sum-once')).toHaveText('€4.460');
  });
});

test.describe('admin portal', () => {
  test('unauthenticated /admin redirects to login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('login, see the e2e lead, open detail', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByTestId('admin-email').fill(process.env.ADMIN_EMAIL!);
    await page.getByTestId('admin-password').fill(process.env.ADMIN_PASSWORD!);
    await page.getByTestId('admin-login-submit').click();
    await expect(page.getByTestId('stat-total-leads')).toBeVisible();

    await page.goto(`/admin/leads?q=${encodeURIComponent(TEST_EMAIL)}`);
    const row = page.getByTestId('leads-table').getByRole('link', { name: 'Erika Musterfrau' });
    await expect(row).toBeVisible();
    await row.click();

    await expect(page.getByTestId('lead-title')).toContainText('Erika Musterfrau');
    await expect(page.getByText('TKFF20 (−20%)')).toBeVisible();
    await expect(page.getByTestId('lead-totals')).toContainText('€3,568');
    // Stage-2 content arrived
    await expect(page.getByText('E2E Gasthaus GmbH').first()).toBeVisible();
    // Plan generator panel is present
    await expect(page.getByTestId('generate-plan')).toBeVisible();
  });

  test('editing a catalog price is reflected on the public site', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByTestId('admin-email').fill(process.env.ADMIN_EMAIL!);
    await page.getByTestId('admin-password').fill(process.env.ADMIN_PASSWORD!);
    await page.getByTestId('admin-login-submit').click();
    await expect(page.getByTestId('stat-total-leads')).toBeVisible();

    await page.goto('/admin/catalog/bundles');
    await page.getByTestId('entity-row-gold').click();
    const priceInput = page.locator('label:has-text("Price €") + input');
    await priceInput.fill('3100');
    await page.getByTestId('entity-save-gold').click();
    await expect(page.getByText('Saved ✓')).toBeVisible();

    // Public configurator now shows the new price (fresh context → fresh funnel state).
    await page.goto('/');
    await page.getByRole('button', { name: 'Jetzt starten' }).click();
    await page.getByTestId('persona-gastro').click();
    await page.getByTestId('to-config').click();
    // 3100 + 350 + 190 + 290 + 490 + 150 = 4570
    await expect(page.getByTestId('sum-once')).toHaveText('€4.570');

    // Revert
    await page.goto('/admin/catalog/bundles');
    await page.getByTestId('entity-row-gold').click();
    await priceInput.fill('2990');
    await page.getByTestId('entity-save-gold').click();
    await expect(page.getByText('Saved ✓')).toBeVisible();
  });
});
