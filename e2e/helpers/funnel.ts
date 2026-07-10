// Reusable funnel navigation helpers, extending the walkToConfigurator pattern
// from the original funnel spec.
import { expect, type Page } from '@playwright/test';
import { START_BUTTON, LEAD } from '../fixtures';

type Locale = 'de' | 'en';

export async function startFunnel(page: Page, locale: Locale = 'de') {
  await page.goto(locale === 'en' ? '/en' : '/');
  await page.getByRole('button', { name: START_BUTTON[locale] }).click();
}

/** intro → persona → questions → configurator (accepting the recommended answers). */
export async function walkToConfigurator(page: Page, persona = 'gastro', locale: Locale = 'de') {
  await startFunnel(page, locale);
  await page.getByTestId(`persona-${persona}`).click();
  await page.getByTestId('to-config').click();
  await expect(page.getByTestId('rec-name')).toBeVisible();
}

/** Fills the lead form (all required fields + consent) and submits. */
export async function fillLeadAndSubmit(page: Page, email: string) {
  await page.getByTestId('lead-vorname').fill(LEAD.vorname);
  await page.getByTestId('lead-nachname').fill(LEAD.nachname);
  await page.getByTestId('lead-firma').fill(LEAD.firma);
  await page.getByTestId('lead-email').fill(email);
  await page.getByTestId('lead-tel').fill(LEAD.tel);
  await page.getByTestId('lead-ziel').fill(LEAD.ziel);
  await page.getByTestId('lead-consent').check();
  await page.getByTestId('lead-submit').click();
}

const DONE_HEADLINE = 'Vielen Dank! Ihre Anfrage ist bei uns.';

/**
 * After a successful submit the Calendly booking panel shows when configured; booking (or
 * skipping) completes the funnel. Without Calendly the done screen appears immediately.
 */
export async function passCalendlyPanel(page: Page) {
  const cont = page.getByTestId('calendly-continue');
  const done = page.getByText(DONE_HEADLINE);
  await expect(cont.or(done)).toBeVisible();
  if (await cont.isVisible()) await cont.click();
  await expect(done).toBeVisible();
}
