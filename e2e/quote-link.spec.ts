import { expect, test } from '@playwright/test';
import { fillLeadAndSubmit, passCalendlyPanel, walkToConfigurator } from './helpers/funnel';
import { db, getLeadByEmail, quotesSchemaReady } from './helpers/db';
import { GASTRO, testEmail } from './fixtures';

// Suite M — the customer's permanent quote link. After a submit the `?c=` link keeps
// working as the live quote: it reopens the configuration with the quote banner, edits are
// saved for the team, and a resubmit updates the same lead as a new version instead of
// creating a duplicate. Needs the quotes migration on the target DB.

const SESSION_ID_RE = /[?&]c=([A-Za-z0-9]{21})/;

test.describe('public funnel — permanent quote link', () => {
  test.beforeAll(async () => {
    test.skip(!(await quotesSchemaReady()), 'quotes migration not applied on this database');
  });

  test('the done screen shows the link; it reopens the quote elsewhere and a resubmit adds a version', async ({ page }) => {
    const email = testEmail('quotelink');
    await walkToConfigurator(page, GASTRO.persona);
    await expect(page.getByTestId('sum-once')).toHaveText(GASTRO.sumOnceDe);
    await page.getByTestId('to-lead').click();
    await fillLeadAndSubmit(page, email);
    await passCalendlyPanel(page);

    const link = await page.getByTestId('quote-link').inputValue();
    expect(link).toMatch(SESSION_ID_RE);
    const sessionId = link.match(SESSION_ID_RE)![1];

    const lead = await getLeadByEmail(email);
    expect(lead?.session_id).toBe(sessionId);
    expect(lead?.status).toBe('new');

    // The row is still there and knows about its quote.
    const meta = await fetch(`${new URL(link).origin}/api/sessions/${sessionId}`).then((r) => r.json());
    expect(meta.quote?.leadId).toBe(lead!.id);

    // Another device: the link resumes the configuration with the quote banner.
    const other = await page.context().browser()!.newContext();
    const restored = await other.newPage();
    await restored.goto(link);
    await expect(restored.getByTestId('quote-banner')).toBeVisible();
    await expect(restored.getByTestId('rec-name')).toBeVisible();
    await expect(restored.getByTestId('sum-once')).toHaveText(GASTRO.sumOnceDe);

    // Nothing changed yet, so there is nothing to send.
    await expect(restored.getByTestId('quote-send')).toBeDisabled();

    // Change the configuration and send it — same lead, new version. We already hold their
    // contact details, so the button sends from here rather than walking them to a form.
    await restored.getByTestId('addon-newsletter').click();
    await expect(restored.getByTestId('sum-once')).toHaveText('€4.850');
    await expect(restored.getByTestId('quote-send')).toBeEnabled();
    await restored.getByTestId('quote-send').click();
    await expect(restored.getByTestId('quote-banner')).toContainText('Ihre Änderungen sind bei uns', { timeout: 30_000 });
    // And with the change sent, there is nothing left to send again.
    await expect(restored.getByTestId('quote-send')).toBeDisabled({ timeout: 20_000 });
    await other.close();

    const { data: leads } = await db.from('leads').select('id, total_one_time').eq('email', email);
    expect(leads).toHaveLength(1);
    expect(Number(leads![0].total_one_time)).toBe(4850);
    const { data: versions } = await db.from('lead_versions').select('version, reason, actor').eq('lead_id', lead!.id).order('version');
    expect(versions?.map((v) => v.version)).toEqual([1, 2]);
    expect(versions?.every((v) => v.reason === 'submit' && v.actor === 'customer')).toBe(true);
  });

  test('saving the quote locks it and hands over the brief link', async ({ page }) => {
    const email = testEmail('quotesave');
    await walkToConfigurator(page, GASTRO.persona);
    await page.getByTestId('to-lead').click();
    await fillLeadAndSubmit(page, email);
    await passCalendlyPanel(page);
    const link = await page.getByTestId('quote-link').inputValue();
    const lead = await getLeadByEmail(email);

    // The customer reopens their own link. The quote is still theirs to change...
    const other = await page.context().browser()!.newContext();
    const cust = await other.newPage();
    await cust.goto(link);
    await expect(cust.getByTestId('quote-accept-side')).toBeVisible();
    await cust.getByTestId('addon-newsletter').click();
    await expect(cust.getByTestId('sum-once')).toHaveText('€4.850');

    // The save screen asks for nothing we already hold: a decision, a warning, and where
    // the brief link is going.
    await cust.getByTestId('to-lead').click();
    await expect(cust.getByTestId('quote-accept')).toBeVisible({ timeout: 20_000 });
    await expect(cust.getByTestId('lead-vorname')).toHaveCount(0);
    await expect(cust.getByTestId('lead-email')).toHaveCount(0);
    await expect(cust.getByTestId('quote-accept-warning')).toBeVisible();
    await expect(cust.getByTestId('quote-accept-recipient')).toContainText(email);

    // ...until they save it.
    await cust.getByTestId('quote-accept-cta').click();
    await expect(cust.getByTestId('quote-accepted')).toBeVisible({ timeout: 30_000 });
    await expect(cust.getByTestId('welcome-title')).toContainText('Willkommen an Bord');
    // The brief link is on screen. It names their own address when the mail went out, and
    // says so plainly when it did not (test addresses are undeliverable).
    const panel = await cust.getByTestId('quote-accepted').innerText();
    expect(panel.includes(email) || /nicht zustellen/.test(panel)).toBe(true);
    const briefUrl = (await cust.getByTestId('quote-accepted-url').innerText()).trim();
    expect(briefUrl).toMatch(/\/onboardingform\/[A-Za-z0-9]{21}$/);
    await expect(cust.getByTestId('quote-accepted-link')).toHaveAttribute('href', briefUrl);

    // The banner flips to locked without a reload, and stays locked on the next visit.
    await expect(cust.getByTestId('quote-banner')).toContainText('Angebot gespeichert');
    await cust.reload();
    await expect(cust.getByTestId('quote-accept-side')).toHaveCount(0);
    await other.close();

    // The team sees it as accepted, with the same form behind the link.
    const { data: after } = await db.from('leads').select('status, accepted_at').eq('id', lead!.id).single();
    expect(after?.status).toBe('accepted');
    expect(after?.accepted_at).toBeTruthy();
    const { data: form } = await db.from('onboarding_forms').select('id').eq('lead_id', lead!.id).single();
    expect(briefUrl.endsWith(`/onboardingform/${form!.id}`)).toBe(true);
    const { data: acts } = await db.from('lead_activity').select('kind').eq('lead_id', lead!.id);
    expect(acts?.some((a) => a.kind === 'accepted')).toBe(true);
  });

  test('a dead link starts fresh with a notice and does not re-create the row', async ({ page, baseURL }) => {
    const ghost = 'e2eGhostSessionId00001'.slice(0, 21);
    await page.goto(`/?c=${ghost}`);
    await expect(page.getByTestId('notice-link-dead')).toBeVisible();
    await expect(page).not.toHaveURL(/[?&]c=/);
    const res = await fetch(`${baseURL}/api/sessions/${ghost}`);
    expect(res.status).toBe(404);
  });

  test('the language toggle keeps the session in the URL', async ({ page }) => {
    await walkToConfigurator(page, GASTRO.persona);
    await expect(page).toHaveURL(SESSION_ID_RE);
    const before = page.url().match(SESSION_ID_RE)![1];
    await page.getByTestId('language-toggle').getByRole('button', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/en(\/|\?)/);
    await expect(page).toHaveURL(new RegExp(`[?&]c=${before}`));
    await expect(page.getByTestId('rec-name')).toBeVisible();
  });
});
