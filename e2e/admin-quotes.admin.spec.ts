import { expect, test } from '@playwright/test';
import { createLeadViaApi } from './helpers/api';
import { db, quotesSchemaReady } from './helpers/db';
import { testEmail } from './fixtures';

// Suite N — the quotes pipeline in the admin: team-created draft quotes configured in team
// mode, Remove/Restore, notes, "mark as agreed", readable questionnaire answers and the
// onboarding hand-off. Uses the stored admin session; needs the quotes migration.

test.describe.serial('admin — quotes pipeline', () => {
  test.beforeAll(async () => {
    test.skip(!(await quotesSchemaReady()), 'quotes migration not applied on this database');
  });

  test('New quote → team mode configurator → saved as a version', async ({ page }) => {
    const email = testEmail('draft');
    await page.goto('/admin/leads');
    await page.getByTestId('new-quote').click();
    await page.getByTestId('nq-vorname').fill('Thorsten');
    await page.getByTestId('nq-nachname').fill('Beispiel');
    await page.getByTestId('nq-firma').fill('E2E Therapy GmbH');
    await page.getByTestId('nq-email').fill(email);
    await page.getByTestId('nq-submit').click();

    await expect(page).toHaveURL(/\/admin\/leads\/[0-9a-f-]{36}$/);
    const leadId = page.url().split('/').pop()!;
    await expect(page.getByTestId('lead-title')).toContainText('Thorsten Beispiel');
    await expect(page.getByTestId('lead-status')).toHaveValue('draft');
    await expect(page.getByTestId('lead-quote')).toContainText('Draft quote');
    await expect(page.getByTestId('lead-versions')).toContainText('v1');

    // The admin's session makes the public configurator run in team mode.
    const href = await page.getByTestId('lead-open-configurator').getAttribute('href');
    expect(href).toMatch(/[?&]c=[A-Za-z0-9]{21}/);
    await page.goto(href!);
    await expect(page.getByTestId('quote-banner')).toContainText('Team-Modus');
    await expect(page.getByTestId('rec-name')).toBeVisible();
    await page.getByTestId('addon-newsletter').click();
    await page.getByTestId('quote-send').click();
    await expect(page.getByTestId('lead-heading')).toHaveText('Angebot speichern');
    await expect(page.getByTestId('lead-consent')).toHaveCount(0);
    await expect(page.getByTestId('s2-section-unternehmen')).toHaveCount(0); // not on a quote page

    await page.getByTestId('lead-submit').click();
    await expect(page.getByTestId('done-title')).toHaveText('Angebot gespeichert.');
    await page.getByTestId('done-back-to-admin').click();

    await expect(page).toHaveURL(new RegExp(`/admin/leads/${leadId}$`));
    await expect(page.getByTestId('lead-versions')).toContainText('v2');
    await expect(page.getByTestId('lead-status')).toHaveValue('draft');
    const { data: lead } = await db.from('leads').select('source, status, consent_at, telefon').eq('id', leadId).single();
    expect(lead?.source).toBe('team');
    expect(lead?.consent_at).toBeNull();
    expect(lead?.telefon).toBeNull();
  });

  test('Remove takes a lead out of the CMS for good, the row stays in the database', async ({ page, request }) => {
    const email = testEmail('archive');
    const leadId = await createLeadViaApi(request, email);
    await page.goto(`/admin/leads?q=${encodeURIComponent(email)}`);
    await expect(page.getByTestId(`lead-row-${leadId}`)).toBeVisible();
    // The row's actions are visible, not hidden behind a menu.
    await expect(page.getByTestId(`lead-open-${leadId}`)).toBeVisible();
    await expect(page.getByTestId(`lead-copy-${leadId}`)).toBeVisible();
    await expect(page.getByTestId(`lead-onboarding-new-${leadId}`)).toBeVisible();

    // Removing cannot be undone from the CMS, so it asks first.
    page.once('dialog', (d) => d.accept());
    await page.getByTestId(`lead-archive-${leadId}`).click();
    await expect(page.getByTestId(`lead-row-${leadId}`)).toHaveCount(0);

    // Gone from every view, including "All" and the detail page — but still in the database.
    await page.goto(`/admin/leads?q=${encodeURIComponent(email)}&status=all`);
    await expect(page.getByTestId(`lead-row-${leadId}`)).toHaveCount(0);
    await expect(page.getByTestId('lead-filter-archived')).toHaveCount(0);
    const detail = await page.goto(`/admin/leads/${leadId}`);
    expect(detail?.status()).toBe(404);
    const { data: stillThere } = await db.from('leads').select('archived_at, archived_by, email').eq('id', leadId).single();
    expect(stillThere?.archived_at).toBeTruthy();
    expect(stillThere?.email).toBe(email);
    const { data: versions } = await db.from('lead_versions').select('id').eq('lead_id', leadId);
    expect(versions?.length).toBeGreaterThan(0);
  });

  test('cancelling the confirmation keeps the lead', async ({ page, request }) => {
    const email = testEmail('keep');
    const leadId = await createLeadViaApi(request, email);
    await page.goto(`/admin/leads?q=${encodeURIComponent(email)}`);
    page.once('dialog', (d) => d.dismiss());
    await page.getByTestId(`lead-archive-${leadId}`).click();
    await expect(page.getByTestId(`lead-row-${leadId}`)).toBeVisible();
    const { data: lead } = await db.from('leads').select('archived_at').eq('id', leadId).single();
    expect(lead?.archived_at).toBeNull();
  });

  test('detail: readable answers, notes, agreed amount, customer link', async ({ page, request }) => {
    const email = testEmail('detail');
    const leadId = await createLeadViaApi(request, email);
    await page.goto(`/admin/leads/${leadId}`);

    // Questionnaire answers show the question and the chosen label, not raw keys.
    await expect(page.getByTestId('answer-hasSite')).toHaveText("No, I'm starting fresh");
    await expect(page.getByTestId('lead-answers')).toContainText('Do you already have a website');
    await expect(page.getByTestId('lead-answers')).not.toContainText('hasSite');

    // API-seeded leads get a link too (minted from the submission).
    await expect(page.getByTestId('lead-customer-link')).toContainText('?c=');

    await page.getByTestId('lead-note-input').fill('Called Thorsten, wants the newsletter add-on removed.');
    await page.getByTestId('lead-note-submit').click();
    await expect(page.getByTestId('lead-activity')).toContainText('wants the newsletter add-on removed');

    await page.getByTestId('mark-agreed-1').click();
    await page.getByTestId('agree-one-time').fill('4200');
    await page.getByTestId('agree-confirm').click();
    await expect(page.getByTestId('lead-agreed-amount')).toContainText('€4,200');
    await expect(page.getByTestId('lead-status')).toHaveValue('agreed');
    await expect(page.getByTestId('lead-activity')).toContainText('Agreed on v1');

    await page.getByTestId('lead-owner').selectOption({ index: 1 });
    await expect(page.getByTestId('lead-activity')).toContainText('Owner:');
  });

  test('the leads list starts the onboarding form, then links to it', async ({ page, request }) => {
    const email = testEmail('onbrow');
    const leadId = await createLeadViaApi(request, email);
    await page.goto(`/admin/leads?q=${encodeURIComponent(email)}`);

    // No form yet: the row offers to start one.
    await page.getByTestId(`lead-onboarding-new-${leadId}`).click();
    await expect(page).toHaveURL(/\/admin\/onboarding\/[A-Za-z0-9]{21}$/);
    const formId = page.url().split('/').pop()!;

    // Back on the list the same row now links straight to it.
    await page.goto(`/admin/leads?q=${encodeURIComponent(email)}`);
    await expect(page.getByTestId(`lead-onboarding-new-${leadId}`)).toHaveCount(0);
    await expect(page.getByTestId(`lead-onboarding-${leadId}`)).toHaveAttribute('href', `/admin/onboarding/${formId}`);
  });

  test('Create onboarding form prefills the client form from the quote', async ({ page, request }) => {
    const email = testEmail('handoff');
    const leadId = await createLeadViaApi(request, email);
    await page.goto(`/admin/leads/${leadId}`);
    await page.getByTestId('lead-create-onboarding').click();
    await expect(page).toHaveURL(/\/admin\/onboarding\/[A-Za-z0-9]{21}$/);
    const formId = page.url().split('/').pop()!;
    await expect(page.getByTestId('onb-admin-lead-link')).toBeVisible();

    const { data: form } = await db.from('onboarding_forms').select('lead_id, email, answers').eq('id', formId).single();
    expect(form?.lead_id).toBe(leadId);
    expect(form?.email).toBe(email);
    const answers = form?.answers as Record<string, { v: unknown; src?: string }>;
    expect(answers.contact_email?.v).toBe(email);
    expect(answers.contact_email?.src).toBe('lead');
    expect(answers.booked_package?.v).toBe('gold');
    expect(answers.booked_page_band?.v).toBe('14');
    expect(answers.project_type?.v).toBe('new');
    // hasSite is 'none', so there is no existing site to carry over.
    expect(answers.existing_url).toBeUndefined();
    // The quote also answered langs/contact/shop, and none of them mean what the
    // onboarding form's own questions mean, so they are deliberately left blank.
    for (const key of ['languages', 'visitor_action', 'sells_to_consumers', 'integrations', 'public_phone', 'legal_name']) {
      expect(answers[key], `${key} must not be inferred from the quote`).toBeUndefined();
    }

    await page.goto(`/admin/leads/${leadId}`);
    await expect(page.getByTestId('lead-open-onboarding')).toBeVisible();
    await expect(page.getByTestId('lead-onboarding')).toContainText('in progress');
  });
});
