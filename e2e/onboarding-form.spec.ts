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
    await page.click('[data-testid=opt-booked_page_band-58]');

    await expect(page.locator('[data-field=existing_url]')).toHaveCount(0);
    await page.click('[data-testid=opt-project_type-changes]');
    await page.fill('[data-testid=f-existing_url]', 'www.physio-nordend.de');
    await page.click('[data-testid=opt-project_type-new]');
    await expect(page.locator('[data-field=existing_url]')).toHaveCount(0);
    await page.click('[data-testid=opt-project_type-changes]');
    await expect(page.locator('[data-testid=f-existing_url]')).toHaveValue('www.physio-nordend.de');
    await expect(page.locator('[data-testid=onb-notice-restored]')).toBeVisible();
    await next(page, 'business');

    // ---- Screen 2 · Business: nationwide hides the regions question; "I don't know" asks when they will
    await page.fill('[data-testid=f-legal_name]', 'Physio Nordend Lena Hartmann e.K.');
    await page.fill('[data-testid=f-legal_form]', 'e.K.');
    await page.fill('[data-testid=f-address_street]', 'Eckenheimer Landstraße 12');
    await page.fill('[data-testid=f-address_city]', '60318 Frankfurt am Main');
    await page.fill('[data-testid=f-content_responsible]', 'Lena Hartmann');
    await page.fill('[data-testid=f-public_email]', 'praxis@physio-nordend.example');
    await page.click('[data-testid=dk-opening_hours]');
    await expect(page.locator('[data-testid=dk-active-opening_hours]')).toBeVisible();
    await page.fill('[data-testid=dk-date-opening_hours]', '2027-01-10');
    await page.click('[data-testid=opt-service_scope-one_town]');
    await expect(page.locator('[data-field=regions_served]')).toBeVisible();
    await page.click('[data-testid=opt-service_scope-national]');
    await expect(page.locator('[data-field=regions_served]')).toHaveCount(0);
    await page.click('[data-testid=opt-private_content-yes]');
    await expect(page.locator('[data-field=private_content_detail]')).toBeVisible();
    await page.fill('[data-testid=f-private_content_detail]', 'Preislisten für Partnerpraxen');
    await next(page, 'inboxes');

    // ---- Screen 3 · Inboxes: routing splits into a table
    await page.fill('[data-testid=f-site_emails]', 'praxis@physio-nordend.example');
    await page.click('[data-testid=opt-routing_split-yes]');
    await page.fill('[data-testid=f-notification_routing-0-type]', 'Allgemeine Anfrage');
    await page.fill('[data-testid=f-notification_routing-0-address]', 'praxis@physio-nordend.example');
    await page.click('[data-testid=add-notification_routing]');
    await expect(page.locator('[data-testid=row-notification_routing-2]')).toBeVisible();
    await page.fill('[data-testid=f-approver]', 'Lena Hartmann');
    await page.fill('[data-testid=f-content_sender]', 'Lena Hartmann');
    await next(page, 'design');

    // ---- Screen 4 · Look and sound: sliders carry captions, references need likes, colour mood caps at two
    await page.fill('[data-testid=f-business_one_liner]', 'Wir behandeln Rückenschmerzen und Sportverletzungen, mit Terminen innerhalb einer Woche.');
    await page.fill('[data-testid=f-target_audience]', 'Berufstätige zwischen 30 und 60, die seit Monaten Schmerzen haben.');
    await page.fill('[data-testid=f-usps]', 'Termine innerhalb einer Woche, alle Kassen, barrierefreier Zugang.');
    await page.click('[data-testid=opt-proof_to_show-reviews]');
    await expect(page.locator('[data-field=factual_claims]')).toBeVisible();
    await page.fill('[data-testid=f-factual_claims]', 'Bewertungen: 4,9 auf Google, bestätigt von Lena');
    await page.click('[data-testid=opt-tone_scale-4]');
    await expect(page.locator('[data-testid=slider-caption-tone_scale]')).toContainText('Professionell und zurückhaltend');
    await page.click('[data-testid=opt-personality_scale-2]');
    await page.fill('[data-testid=f-references-0-url]', 'https://www.beispiel-physio.de');
    await page.click('[data-testid=opt-brand_guidelines-no]');
    await page.click('[data-testid=onb-next]');
    await expect(page.locator('[data-testid=onb-fix-errors]')).toBeVisible(); // likes missing
    await page.fill('[data-testid=f-references-0-likes]', 'Ruhige Farben, große Fotos der Praxisräume');
    await page.click('[data-testid=none-avoid]');
    await page.click('[data-testid=opt-colour_mood-light]');
    await page.click('[data-testid=opt-colour_mood-muted]');
    await page.click('[data-testid=opt-colour_mood-bold]');
    await page.click('[data-testid=onb-next]');
    await expect(page.locator('[data-testid=err-colour_mood]')).toBeVisible(); // at most two
    await page.click('[data-testid=opt-colour_mood-bold]');
    await page.click('[data-testid=opt-typography_feel-modern]');
    await page.click('[data-testid=opt-photo_subjects-premises]');
    await page.click('[data-testid=opt-hero_intent-statement]');
    await page.click('[data-testid=opt-homepage_density-balanced]');
    await next(page, 'pages');

    // ---- Screen 5 · Pages: the live counter, one main action, the language reveal chain
    await page.fill('[data-testid=f-catalogue]', 'Krankengymnastik\nManuelle Therapie\nLymphdrainage');
    await page.fill('[data-testid=f-page_list]', 'Startseite\nLeistungen\n- Krankengymnastik\n- Manuelle Therapie\nTeam\nKontakt');
    await expect(page.locator('[data-testid=count-page_list]')).toContainText('6 Seiten');
    await page.click('[data-testid=opt-visitor_action-booking]');
    await page.click('[data-testid=opt-languages-de_en]');
    await expect(page.locator('[data-field=translation_by]')).toBeVisible();
    await page.click('[data-testid=opt-translation_by-studio]');
    await expect(page.locator('[data-testid=notice-notice_proofreading]')).toBeVisible();
    await page.fill('[data-testid=f-translation_approver]', 'Lena Hartmann');
    await next(page, 'integrations');

    // ---- Screen 6 · Integrations: a tick opens its sub-block, "none" is exclusive
    await page.click('[data-testid=opt-integrations-maps]');
    await expect(page.locator('[data-field=gbp_link]')).toBeVisible();
    await page.click('[data-testid=opt-integrations-none]');
    await expect(page.locator('[data-field=gbp_link]')).toHaveCount(0);
    await page.click('[data-testid=opt-integrations-maps]');
    await expect(page.locator('[data-testid=opt-integrations-none]')).toHaveAttribute('aria-checked', 'false');
    await page.fill('[data-testid=f-gbp_link]', 'https://g.page/physio-nordend');
    await next(page, 'files');

    // ---- Screen 7 · Files: a folder link asks for the sharing confirmation
    await page.fill('[data-testid=f-assets_folder]', 'https://drive.google.com/drive/folders/abc');
    await expect(page.locator('[data-field=assets_sharing_confirmed]')).toBeVisible();
    await page.click('[data-testid=opt-assets_sharing_confirmed-yes]');
    await page.click('[data-testid=opt-photo_portal_needed-no]');
    await next(page, 'access_legal');

    // ---- Screen 8 · Access & legal: the accounts table, and a pasted password is stripped on save
    await page.selectOption('[data-testid=f-accounts_table-0-account]', 'domain');
    await page.fill('[data-testid=f-accounts_table-0-provider]', 'IONOS');
    await page.fill('[data-testid=f-accounts_table-0-holder]', 'Lena Hartmann');
    await page.fill('[data-testid=f-domain]', 'www.physio-nordend.de');
    await page.fill('[data-testid=f-site_manager]', 'Lena Hartmann, Passwort: geheim123');
    await page.click('[data-testid=opt-legal_pages-reuse]');
    await page.fill('[data-testid=f-legal_reviewer]', 'Lena Hartmann');
    await page.click('[data-testid=opt-sells_to_consumers-no]');
    await waitSaved(page);
    await expect(page.locator('[data-testid=onb-notice-redacted]')).toBeVisible();
    await expect(page.locator('[data-testid=f-site_manager]')).toHaveValue(/redacted/);
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
    // The second tab moved the shared record's step to Screen 4, and the toggle reloads the
    // page from the record, so come back to the review node first.
    await page.reload();
    await page.click('[data-testid=step-review]');
    await expect(page.locator('[data-screen=onb-review-ready]')).toBeVisible();
    // The step is saved on a debounce and the toggle reloads the page from the record, so
    // wait for the server to have it (the review screen carries no save indicator).
    const formId = url.split('/').pop()!;
    await expect
      .poll(async () => (await (await page.request.get(`/api/onboarding/${formId}`)).json()).record.current_step, { timeout: 15_000 })
      .toBe('review');
    await page.click('[data-testid=language-toggle] button[aria-label=English]');
    await page.waitForURL(/\/en\/onboardingform\//);
    await expect(page.locator('h2')).toContainText('Review and confirm');
    await page.click('[data-testid=step-project]');
    await expect(page.locator('[data-field=contact_name] label')).toContainText('What is your name?');
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

  test('"save and come back later" sends the link in one click, no second button to find', async ({ page }) => {
    await start(page);
    await page.click('[data-testid=onb-savelink]', { timeout: 20_000 });
    const dialog = page.locator('[data-testid=onb-savelink-dialog]');
    await expect(dialog).toContainText(EMAIL);
    // The click already said what they want, so it sends on its own with no "now press
    // send". Resend refuses example.com, so what we can assert here is that the attempt
    // ran to a conclusion by itself — delivery is covered by the real-address run.
    const sent = page.locator('[data-testid=onb-savelink-sent]');
    const failed = page.locator('[data-testid=onb-savelink-error]');
    await expect(sent.or(failed)).toBeVisible({ timeout: 30_000 });
    // The copy fallback stays either way, for when the mail does not arrive.
    await expect(page.locator('[data-testid=onb-savelink-copy]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
});
