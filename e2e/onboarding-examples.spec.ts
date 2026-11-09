import { expect, test } from '@playwright/test';
import { testEmail } from './fixtures';
import { createLeadViaApi } from './helpers/api';
import { db } from './helpers/db';
import { createFilledForm, getRecord } from './helpers/onboarding';

// The design screen's two examples and the gallery, the page list as a searchable multi-select,
// and the design prompts written automatically when the client confirms. Needs the server in
// AI fixture mode (ONBOARDING_AI_FIXTURE=1) and, until migration 20261109000030 has run, with
// ONBOARDING_PREVIEW_DEFINITION=seed so the form has the new questions.

test.describe('design examples, gallery and page list', () => {
  test('the gallery opens over the form; a tick there is the example on the form, and back returns', async ({ page, request }) => {
    // Their own link only: one example of two.
    const id = await createFilledForm(request, testEmail('onb-gallery'), { reference_sites: null });
    await page.goto(`/onboardingform/${id}`);
    await page.click('[data-testid=step-design]');

    await expect(page.getByTestId('heading-design_part_examples')).toBeVisible();
    const order = await page.locator('[data-field]').evaluateAll((els) => els.map((e) => e.getAttribute('data-field')));
    expect(order.indexOf('tone_note')).toBe(order.indexOf('tone_scale') + 1);
    expect(order.indexOf('design_part_business')).toBe(0);
    expect(order[order.length - 1]).toBe('avoid');
    await expect(page.getByTestId('proposal-example-1')).toContainText('beispiel-physio.de');
    await expect(page.getByTestId('proposal-example-2')).toContainText('Noch nicht gewählt');

    await page.click('[data-testid=opt-reference_sites-graza-link]');
    const gallery = page.getByTestId('reference-gallery');
    await expect(gallery).toBeVisible();
    await expect(page).toHaveURL(/#gallery=graza$/);
    const picture = gallery.locator('[data-testid=gallery-picture] img');
    await expect.poll(() => picture.evaluate((img: HTMLImageElement) => (img.complete ? img.naturalWidth : 0))).toBeGreaterThan(0);
    await expect(picture).toHaveAttribute('src', /home-laptop\.webp$/);
    await page.click('[data-testid=gallery-device-phone]');
    await expect(picture).toHaveAttribute('src', /home-phone\.webp$/);
    await page.click('[data-testid=gallery-page-1]');
    await expect(picture).toHaveAttribute('src', /page-1-laptop\.webp$/);
    await expect(page.getByTestId('gallery-device-phone')).toBeDisabled();
    await expect(page.getByTestId('gallery-visit')).toHaveAttribute('href', 'https://www.graza.co/');

    await page.click('[data-testid=gallery-choose-graza]');
    await expect(page.getByTestId('gallery-counter')).toContainText('2 von 2');
    // Both examples chosen: the next site cannot be chosen as well.
    await page.click('[data-testid=gallery-next]');
    await expect(page.getByTestId('gallery-choose-25hours-hotels')).toBeDisabled();

    // The browser's back button returns to the form, where the tick is on the card.
    await page.goBack();
    await expect(gallery).toHaveCount(0);
    await expect(page).not.toHaveURL(/#gallery/);
    await expect(page.locator('[data-testid=opt-reference_sites-graza]')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('proposal-example-1')).toContainText('Graza');
    await expect(page.getByTestId('proposal-example-2')).toContainText('beispiel-physio.de');
    await expect(page.getByTestId('examples-full')).toBeVisible();
    const rivian = page.locator('[data-testid=opt-reference_sites-rivian]');
    await expect(rivian).toHaveAttribute('aria-disabled', 'true');
    await rivian.click({ force: true });
    await expect(rivian).toHaveAttribute('aria-checked', 'false');
    await expect.poll(async () => (await getRecord(request, id)).record.answers.reference_sites?.v).toEqual(['graza']);

    // The overview: every site as a tile, closed with its own button.
    await page.click('[data-testid=gallery-open]');
    await expect(gallery.locator('[data-testid^=gallery-tile-]')).toHaveCount(11);
    await page.click('[data-testid=gallery-back]');
    await expect(gallery).toHaveCount(0);
  });

  test('a page list typed before the change opens as a list, and saves as one', async ({ page, request }) => {
    // The helper's answer is the old typed list: six lines, two of them dashed sub-pages.
    const id = await createFilledForm(request, testEmail('onb-pages'));
    await page.goto(`/onboardingform/${id}`);
    await page.click('[data-testid=step-pages]');
    const chips = page.locator('[data-testid=ms-chip-page_list]');
    await expect(chips).toHaveCount(6);
    await expect(page.locator('[data-testid=count-page_list]')).toContainText('6 Seiten');
    // Their own services are offered as pages; Enter takes the first match, not the typed text.
    await page.fill('[data-testid=f-page_list]', 'Lymph');
    await expect(page.locator('[data-testid=ms-option-page_list]', { hasText: 'Lymphdrainage' })).toBeVisible();
    await page.press('[data-testid=f-page_list]', 'Enter');
    await expect(chips).toHaveCount(7);
    await expect(chips.last()).toContainText('Lymphdrainage');
    await page.getByRole('button', { name: 'Team entfernen' }).click();
    await expect(chips).toHaveCount(6);
    await expect
      .poll(async () => (await getRecord(request, id)).record.answers.page_list?.v)
      .toEqual(['Startseite', 'Leistungen', 'Krankengymnastik', 'Manuelle Therapie', 'Kontakt', 'Lymphdrainage']);
  });

  test('a confirmed form still opens the gallery, to look only', async ({ page, request }) => {
    const id = await createFilledForm(request, testEmail('onb-gallery-done'));
    await db.from('onboarding_forms').update({ status: 'confirmed', confirmed: { name: 'Lena Hartmann', at: new Date().toISOString() } }).eq('id', id);
    await page.goto(`/onboardingform/${id}`);
    await page.click('[data-testid=step-design]');
    await page.click('[data-testid=opt-reference_sites-conductlaw-link]');
    const gallery = page.getByTestId('reference-gallery');
    await expect(gallery).toBeVisible();
    await expect(page.getByTestId('gallery-counter')).toContainText('bestätigt');
    await expect(gallery.locator('[data-testid^=gallery-choose-]')).toHaveCount(0);
    await expect(page.getByTestId('gallery-visit')).toHaveAttribute('href', 'https://www.conductlaw.com/');
  });
});

test.describe('design prompts on confirmation', () => {
  let leadId: string | null = null;

  test.afterAll(async () => {
    if (!leadId) return;
    await db.from('developer_prompts').delete().eq('lead_id', leadId);
    await db.from('developer_projects').delete().eq('lead_id', leadId);
  });

  test('confirming the form writes Proposal 1 and 2 from the two examples, in order', async ({ page, request }) => {
    test.setTimeout(240_000);
    const email = testEmail('onb-auto');
    leadId = await createLeadViaApi(request, email);
    // Two gallery sites, so nothing outside is read.
    const id = await createFilledForm(request, email, { reference_sites: { v: ['graza', 'devol'] }, references: null });
    await db.from('onboarding_forms').update({ lead_id: leadId }).eq('id', id);

    await page.goto(`/onboardingform/${id}`);
    await page.click('[data-testid=onb-start-review]');
    await page.click('[data-testid=onb-to-brief]');
    await expect(page.locator('[data-testid=onb-answer-check]')).toBeVisible({ timeout: 60_000 });
    await page.click('[data-testid=onb-understood-yes]');
    await page.click('[data-testid=onb-to-confirm]');
    await expect(page.locator('[data-screen=onb-confirm]')).toBeVisible();
    const checks = page.locator('[data-testid^=onb-check-]');
    for (let i = 0; i < (await checks.count()); i++) await checks.nth(i).check();
    await page.fill('[data-testid=onb-confirm-name]', 'Lena Hartmann');
    await page.click('[data-testid=onb-confirm-submit]');
    await expect(page.locator('[data-screen=onb-done]')).toBeVisible({ timeout: 30_000 });

    const prompts = async () =>
      ((await db.from('developer_prompts').select('proposal, reference_slug, created_by').eq('lead_id', leadId!).eq('kind', 'design')).data ?? []) as {
        proposal: string;
        reference_slug: string | null;
        created_by: string | null;
      }[];
    await expect.poll(async () => (await prompts()).length, { timeout: 150_000, intervals: [2000] }).toBe(2);
    const rows = await prompts();
    expect(rows.map((r) => `${r.proposal}:${r.reference_slug}`).sort()).toEqual(['A:graza', 'B:devol']);
    expect(rows.every((r) => r.created_by === 'Automatic (client confirmed)')).toBe(true);
  });
});
