import { expect, test } from '@playwright/test';
import { fillLeadAndSubmit, passCalendlyPanel, walkToConfigurator } from './helpers/funnel';
import { db, getLeadByEmail, quotesSchemaReady } from './helpers/db';
import { GASTRO, START_BUTTON, testEmail } from './fixtures';

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

    // Nothing changed yet, so there is nothing to save, and no save bar.
    await expect(restored.getByTestId('unsaved-bar')).toHaveCount(0);

    // A change only lives on this screen until it is saved: the bar says so at once...
    await restored.getByTestId('addon-newsletter').click();
    await expect(restored.getByTestId('sum-once')).toHaveText('€4.850');
    await expect(restored.getByTestId('unsaved-bar')).toBeVisible();
    // One place to save, not two: the banner has no Save button of its own.
    await expect(restored.getByTestId('quote-send')).toHaveCount(0);

    // ...and the link itself has not moved: someone else opening it still sees the saved quote.
    const third = await page.context().browser()!.newContext();
    const peek = await third.newPage();
    await peek.goto(link);
    await expect(peek.getByTestId('sum-once')).toHaveText(GASTRO.sumOnceDe);
    await expect(peek.getByTestId('unsaved-bar')).toHaveCount(0);

    // Saving moves the link, the lead and its versions together.
    await restored.getByTestId('unsaved-save').click();
    await expect(restored.getByTestId('unsaved-bar')).toHaveCount(0, { timeout: 30_000 });
    await expect(restored.getByTestId('quote-banner')).toContainText('Gespeichert');
    await peek.reload();
    await expect(peek.getByTestId('sum-once')).toHaveText('€4.850');
    await third.close();
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

    // The customer reopens their own link. The quote is still theirs to change, and this
    // change is deliberately left unsaved: saving the quote has to save it first.
    const other = await page.context().browser()!.newContext();
    const cust = await other.newPage();
    await cust.goto(link);
    await expect(cust.getByTestId('quote-accept-side')).toBeVisible();
    await cust.getByTestId('addon-newsletter').click();
    await expect(cust.getByTestId('sum-once')).toHaveText('€4.850');
    await expect(cust.getByTestId('unsaved-bar')).toBeVisible();

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
    const { data: after } = await db.from('leads').select('status, accepted_at, total_one_time').eq('id', lead!.id).single();
    expect(after?.status).toBe('accepted');
    expect(after?.accepted_at).toBeTruthy();
    // What they accepted is what was on their screen, including the change they never saved.
    expect(Number(after?.total_one_time)).toBe(4850);
    const { data: form } = await db.from('onboarding_forms').select('id').eq('lead_id', lead!.id).single();
    expect(briefUrl.endsWith(`/onboardingform/${form!.id}`)).toBe(true);
    const { data: acts } = await db.from('lead_activity').select('kind').eq('lead_id', lead!.id);
    expect(acts?.some((a) => a.kind === 'accepted')).toBe(true);
  });

  test('discard undoes, leaving warns, and the homepage starts clean', async ({ page }) => {
    const email = testEmail('quotediscard');
    await walkToConfigurator(page, GASTRO.persona);
    await page.getByTestId('to-lead').click();
    await fillLeadAndSubmit(page, email);
    await passCalendlyPanel(page);
    const link = await page.getByTestId('quote-link').inputValue();

    const other = await page.context().browser()!.newContext();
    const cust = await other.newPage();
    await cust.goto(link);
    await expect(cust.getByTestId('sum-once')).toHaveText(GASTRO.sumOnceDe);

    // An accidental wipe, undone in one click.
    await cust.getByTestId('addons-clear').click();
    await expect(cust.getByTestId('unsaved-bar')).toBeVisible();
    await cust.getByTestId('unsaved-discard').click();
    await expect(cust.getByTestId('unsaved-bar')).toHaveCount(0);
    await expect(cust.getByTestId('sum-once')).toHaveText(GASTRO.sumOnceDe);

    // Picking an add-on and unpicking it again leaves nothing to save.
    await cust.getByTestId('addon-newsletter').click();
    await expect(cust.getByTestId('unsaved-bar')).toBeVisible();
    await cust.getByTestId('addon-newsletter').click();
    await expect(cust.getByTestId('unsaved-bar')).toHaveCount(0);
    await expect(cust.getByTestId('sum-once')).toHaveText(GASTRO.sumOnceDe);

    // A language switch is moving around inside the page: unsaved edits come along.
    await cust.getByTestId('addon-newsletter').click();
    await expect(cust.getByTestId('sum-once')).toHaveText('€4.850');
    await expect(cust.getByTestId('unsaved-bar')).toBeVisible();
    await cust.getByTestId('language-toggle').getByRole('button', { name: 'English' }).click();
    await cust.waitForURL(/\/en(\/|\?)/);
    await expect(cust.getByTestId('unsaved-bar')).toBeVisible({ timeout: 20_000 });
    await expect(cust.getByTestId('addon-newsletter')).toBeVisible();
    await cust.getByTestId('language-toggle').getByRole('button', { name: 'Deutsch' }).click();
    await cust.waitForURL((u) => !u.pathname.startsWith('/en'));
    await expect(cust.getByTestId('sum-once')).toHaveText('€4.850', { timeout: 20_000 });

    // Leaving with something unsaved asks first.
    const dialog = cust.waitForEvent('dialog');
    await cust.close({ runBeforeUnload: true });
    const d = await dialog;
    expect(d.type()).toBe('beforeunload');
    await d.accept();

    // Opening the link again is a new page: it shows the quote as saved, not the leftovers.
    const reopened = await other.newPage();
    await reopened.goto(link);
    await expect(reopened.getByTestId('sum-once')).toHaveText(GASTRO.sumOnceDe, { timeout: 30_000 });
    await expect(reopened.getByTestId('unsaved-bar')).toHaveCount(0);

    // This browser remembers the quote, but the homepage without a link starts a new one:
    // that is how a team member ended up editing another customer's quote.
    const fresh = await other.newPage();
    await fresh.goto('/');
    await expect(fresh.getByRole('button', { name: START_BUTTON.de })).toBeVisible();
    await expect(fresh.getByTestId('quote-banner')).toHaveCount(0);
    expect(fresh.url()).not.toMatch(/[?&]c=/);
    await other.close();

    // And nothing of that reached the quote.
    const lead = await getLeadByEmail(email);
    const { data: versions } = await db.from('lead_versions').select('version').eq('lead_id', lead!.id);
    expect(versions).toHaveLength(1);
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
