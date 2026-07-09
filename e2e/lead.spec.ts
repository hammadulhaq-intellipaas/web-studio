import { expect, test } from '@playwright/test';
import { walkToConfigurator, fillLeadAndSubmit } from './helpers/funnel';
import { GASTRO, LEAD, testEmail } from './fixtures';
import { EMAIL_VERIFICATION_NOTE } from './helpers/resend';

// Suite C — lead capture, validation, Calendly panel. A successful submit means
// POST /api/leads returned 200, which is where the real Resend emails dispatch
// (see EMAIL_VERIFICATION_NOTE for why inbox delivery isn't asserted here).

test.describe('public funnel — lead capture', () => {
  test('required-field and invalid-email validation block submission', async ({ page }) => {
    await walkToConfigurator(page, GASTRO.persona);
    await page.getByTestId('to-lead').click();

    // Empty submit → errors on email, tel, consent.
    await page.getByTestId('lead-submit').click();
    await expect(page.getByTestId('lead-err-email')).toBeVisible();
    await expect(page.getByTestId('lead-err-tel')).toBeVisible();
    await expect(page.getByTestId('lead-err-consent')).toBeVisible();

    // Invalid email is rejected even with the other fields valid.
    await page.getByTestId('lead-email').fill('not-an-email');
    await page.getByTestId('lead-tel').fill(LEAD.tel);
    await page.getByTestId('lead-consent').check();
    await page.getByTestId('lead-submit').click();
    await expect(page.getByTestId('lead-err-email')).toBeVisible();
  });

  test('successful submit shows the Calendly panel and continues to stage 2', async ({ page }) => {
    // eslint-disable-next-line no-console
    console.log('[e2e]', EMAIL_VERIFICATION_NOTE);
    await walkToConfigurator(page, GASTRO.persona);
    await page.getByTestId('to-lead').click();
    await fillLeadAndSubmit(page, testEmail('lead'));

    // With a Calendly URL configured, the scheduling panel renders (real embed iframe).
    const cont = page.getByTestId('calendly-continue');
    await expect(cont).toBeVisible();
    await expect(page.locator('iframe[src*="calendly.com"]')).toBeVisible();

    await cont.click();
    await expect(page.getByTestId('readiness')).toBeVisible();
  });
});
