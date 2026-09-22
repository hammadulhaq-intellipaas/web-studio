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

    // Change the configuration and send the update — same lead, new version, no consent checkbox.
    await restored.getByTestId('addon-newsletter').click();
    await expect(restored.getByTestId('sum-once')).toHaveText('€4.850');
    await restored.getByTestId('quote-send').click();
    await expect(restored.getByTestId('lead-heading')).toHaveText('Anfrage aktualisieren');
    await expect(restored.getByTestId('lead-consent-given')).toBeVisible();
    await expect(restored.getByTestId('lead-email')).toHaveValue(email);
    await restored.getByTestId('lead-submit').click();
    await expect(restored.getByTestId('done-title')).toHaveText('Danke, wir haben Ihre Änderungen erhalten.');
    await other.close();

    const { data: leads } = await db.from('leads').select('id, total_one_time').eq('email', email);
    expect(leads).toHaveLength(1);
    expect(Number(leads![0].total_one_time)).toBe(4850);
    const { data: versions } = await db.from('lead_versions').select('version, reason, actor').eq('lead_id', lead!.id).order('version');
    expect(versions?.map((v) => v.version)).toEqual([1, 2]);
    expect(versions?.every((v) => v.reason === 'submit' && v.actor === 'customer')).toBe(true);
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
