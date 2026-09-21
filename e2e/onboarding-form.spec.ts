import { expect, test, type Page } from '@playwright/test';
import { testEmail } from './fixtures';

// The onboarding form: every screen once, the conditional reveals, the custom controls,
// resume from the bare link, and the DE → EN switch. Runs without the AI layer.

const EMAIL = testEmail('onb-form');

/** Mints a form and tags it with the test email straight away so teardown can find it. */
async function start(page: Page): Promise<string> {
  await page.goto('/onboardingform');
  await page.click('[data-testid=onb-start]');
  await page.waitForURL(/\/onboardingform\/[A-Za-z0-9_-]{21}$/);
  await expect(page.locator('[data-screen=onb-project]')).toBeVisible();
  await page.fill('[data-testid=f-contact_email]', EMAIL);
  await waitSaved(page);
  return page.url();
}

async function next(page: Page, expectScreen: string) {
  await page.click('[data-testid=onb-next]');
  await expect(page.locator(`[data-screen=onb-${expectScreen}]`)).toBeVisible();
}

async function waitSaved(page: Page) {
  await expect(page.locator('[data-testid=onb-save-status]')).toHaveAttribute('data-status', 'saved', { timeout: 20_000 });
}

test.describe('onboarding form', () => {
  test('walks every screen with reveals, custom controls, resume and language switch', async ({ page, browser }) => {
    const url = await start(page);

    // ---- Screen 1 · Your project: blocked while empty, reveal / clear / restore
    await page.click('[data-testid=onb-next]');
    await expect(page.locator('[data-testid=onb-fix-errors]')).toBeVisible();
    await expect(page.locator('[data-testid=err-contact_name]')).toBeVisible();

    await page.fill('[data-testid=f-contact_name]', 'Lena Hartmann');
    await page.fill('[data-testid=f-contact_company]', 'Physio Nordend');
    await page.click('[data-testid=opt-booked_package-gold]');
    await page.click('[data-testid=dk-booked_page_band]');
    await expect(page.locator('[data-testid=dk-active-booked_page_band]')).toBeVisible();

    await expect(page.locator('[data-field=existing_url]')).toHaveCount(0);
    await page.click('[data-testid=opt-project_type-changes]');
    await page.fill('[data-testid=f-existing_url]', 'www.physio-nordend.de');
    await page.click('[data-testid=opt-project_type-new]');
    await expect(page.locator('[data-field=existing_url]')).toHaveCount(0);
    await page.click('[data-testid=opt-project_type-changes]');
    await expect(page.locator('[data-testid=f-existing_url]')).toHaveValue('www.physio-nordend.de');
    await expect(page.locator('[data-testid=onb-notice-restored]')).toBeVisible();
    await next(page, 'business');

    // ---- Screen 2 · Business: nationwide hides the regions question
    await page.fill('[data-testid=f-legal_name]', 'Physio Nordend Lena Hartmann e.K.');
    await page.fill('[data-testid=f-legal_form]', 'e.K.');
    await page.fill('[data-testid=f-address_street]', 'Eckenheimer Landstraße 12');
    await page.fill('[data-testid=f-address_city]', '60318 Frankfurt am Main');
    await page.fill('[data-testid=f-content_responsible]', 'Lena Hartmann');
    await page.fill('[data-testid=f-public_email]', 'praxis@physio-nordend.example');
    await page.click('[data-testid=dk-opening_hours]');
    await page.click('[data-testid=opt-service_scope-one_region]');
    await expect(page.locator('[data-field=regions_served]')).toBeVisible();
    await page.click('[data-testid=opt-service_scope-national]');
    await expect(page.locator('[data-field=regions_served]')).toHaveCount(0);
    await page.click('[data-testid=opt-private_content-yes]');
    await expect(page.locator('[data-field=private_content_detail]')).toBeVisible();
    await page.fill('[data-testid=f-private_content_detail]', 'Preislisten für Partnerpraxen');
    await next(page, 'inboxes');

    // ---- Screen 3 · Inboxes: repeater rows
    await page.fill('[data-testid=f-site_emails]', 'praxis@physio-nordend.example');
    await page.selectOption('[data-testid=f-notification_routing-0-trigger]', 'enquiry');
    await page.fill('[data-testid=f-notification_routing-0-email]', 'praxis@physio-nordend.example');
    await page.click('[data-testid=add-notification_routing]');
    await expect(page.locator('[data-testid=row-notification_routing-2]')).toBeVisible();
    await page.fill('[data-testid=f-approver]', 'Lena Hartmann');
    await page.fill('[data-testid=f-content_sender]', 'Lena Hartmann');
    await next(page, 'design');

    // ---- Screen 4 · Design: sliders carry captions, references need likes
    await page.click('[data-testid=opt-tone_scale-4]');
    await expect(page.locator('[data-testid=slider-caption-tone_scale]')).toContainText('Professionell und zurückhaltend');
    await page.click('[data-testid=opt-personality_scale-2]');
    await page.fill('[data-testid=f-references-0-url]', 'https://www.beispiel-physio.de');
    await page.click('[data-testid=opt-brand_guidelines-no]');
    await page.click('[data-testid=onb-next]');
    await expect(page.locator('[data-testid=onb-fix-errors]')).toBeVisible(); // likes missing
    await page.fill('[data-testid=f-references-0-likes]', 'Ruhige Farben, große Fotos der Praxisräume');
    await next(page, 'pages');

    // ---- Screen 5 · Pages: ranking limits, language reveal chain
    await page.fill('[data-testid=f-page_count]', '6');
    await page.fill('[data-testid=f-page_list]', 'Startseite\nLeistungen\n- Krankengymnastik\n- Manuelle Therapie\nTeam\nKontakt');
    await page.fill('[data-testid=f-catalogue]', 'Krankengymnastik\nManuelle Therapie\nLymphdrainage');
    await page.selectOption('[data-testid=rank-visitor_actions-book]', 'most');
    await page.selectOption('[data-testid=rank-visitor_actions-call]', 'most');
    await page.click('[data-testid=opt-languages-de_en]');
    await expect(page.locator('[data-field=translation_by]')).toBeVisible();
    await page.click('[data-testid=opt-translation_by-us]');
    await expect(page.locator('[data-testid=notice-notice_proofreading]')).toBeVisible();
    await page.fill('[data-testid=f-translation_approver]', 'Lena Hartmann');
    await page.click('[data-testid=onb-next]');
    await expect(page.locator('[data-testid=err-visitor_actions]')).toContainText('Genau 1');
    await page.selectOption('[data-testid=rank-visitor_actions-call]', 'very');
    await next(page, 'integrations');

    // ---- Screen 6 · Integrations: a tick opens its sub-block, "none" is exclusive
    await page.click('[data-testid=opt-integrations-maps]');
    await expect(page.locator('[data-field=maps_link]')).toBeVisible();
    await page.click('[data-testid=opt-integrations-none]');
    await expect(page.locator('[data-field=maps_link]')).toHaveCount(0);
    await page.click('[data-testid=opt-integrations-maps]');
    await expect(page.locator('[data-testid=opt-integrations-none]')).toHaveAttribute('aria-checked', 'false');
    await page.fill('[data-testid=f-maps_link]', 'https://maps.app.goo.gl/abc123');
    await next(page, 'files');

    // ---- Screen 7 · Files
    await page.fill('[data-testid=f-assets_folder]', 'https://drive.google.com/drive/folders/abc');
    await page.click('[data-testid=opt-logo_vector-no]');
    await expect(page.locator('[data-testid=notice-notice_logo_redraw]')).toBeVisible();
    await page.click('[data-testid=opt-publish_rights-yes]');
    await next(page, 'access_legal');

    // ---- Screen 8 · Access & legal: a pasted password is stripped on save
    await page.fill('[data-testid=f-accounts]', 'Domain: IONOS – Lena Hartmann, Passwort: geheim123');
    await page.fill('[data-testid=f-domain]', 'www.physio-nordend.de');
    await page.click('[data-testid=opt-legal_pages-reuse]');
    await page.fill('[data-testid=f-legal_reviewer]', 'Lena Hartmann');
    await page.click('[data-testid=opt-sells_to_consumers-no]');
    await waitSaved(page);
    await expect(page.locator('[data-testid=onb-notice-redacted]')).toBeVisible();
    await expect(page.locator('[data-testid=f-accounts]')).toHaveValue(/redacted/);
    await next(page, 'timing');

    // ---- Screen 9 · Timing
    await page.fill('[data-testid=f-launch_date]', '2027-03-01');
    await page.fill('[data-testid=f-content_ready_date]', '2027-01-15');
    await page.click('[data-testid=onb-next]');
    await expect(page.locator('[data-screen=onb-review-ready]')).toBeVisible();
    await expect(page.locator('[data-testid=onb-start-review]')).toBeEnabled();
    await waitSaved(page).catch(() => undefined);

    // ---- Resume: the bare link in a fresh browser lands on the same step with the answers intact
    const fresh = await browser.newContext({
      httpCredentials: { username: process.env.ONBOARDING_BASIC_USER!, password: process.env.ONBOARDING_BASIC_PASS! },
    });
    const other = await fresh.newPage();
    await other.goto(url);
    await expect(other.locator('[data-screen=onb-review-ready]')).toBeVisible();
    await other.click('[data-testid=step-design]');
    await expect(other.locator('[data-testid=f-references-0-likes]')).toHaveValue('Ruhige Farben, große Fotos der Praxisräume');
    await expect(other.locator('[data-testid=slider-caption-tone_scale]')).toContainText('Professionell und zurückhaltend');
    await fresh.close();

    // ---- DE → EN switch keeps the record and translates the CMS copy
    await page.click('[data-testid=language-toggle] button[aria-label=English]');
    await page.waitForURL(/\/en\/onboardingform\//);
    await expect(page.locator('h2')).toContainText('Review and confirm');
    await page.click('[data-testid=step-project]');
    await expect(page.locator('[data-field=contact_name] label')).toContainText('Your name');
  });

  test('phones get the compact stepper and a single-row header', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await start(page);
    await expect(page.locator('[data-testid=onb-stepper]')).toBeHidden();
    await expect(page.locator('[data-testid=onb-stepper-compact]')).toContainText('Schritt 1 von 10');
    await expect(page.locator('[data-testid=onb-savelink]')).toBeHidden();
    await expect(page.locator('[data-testid=onb-savelink-mobile]')).toBeVisible();
    await expect(page.locator('[data-testid=onb-step-label]')).toBeHidden();
  });

  test('the save-link dialog offers to email the link to the Screen 1 address', async ({ page }) => {
    await start(page);
    await page.click('[data-testid=onb-savelink]');
    await expect(page.locator('[data-testid=onb-savelink-dialog]')).toContainText(EMAIL);
    await expect(page.locator('[data-testid=onb-savelink-send]')).toBeVisible();
    await expect(page.locator('[data-testid=onb-savelink-copy]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid=onb-savelink-dialog]')).toHaveCount(0);
  });
});
