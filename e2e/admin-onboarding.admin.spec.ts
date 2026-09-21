import { expect, test } from '@playwright/test';
import { testEmail } from './fixtures';
import { createFilledForm } from './helpers/onboarding';
import { snapshotField, setField } from './helpers/db';

// Admin side of the onboarding form: the list, the detail page with downloads, and a CMS
// edit that must show up on the public form immediately (no deploy).

const EMAIL = testEmail('onb-admin');

test.describe('admin · onboarding', () => {
  test('lists forms and shows the detail with answers, flags, brief, downloads', async ({ page, request }) => {
    const id = await createFilledForm(request, EMAIL, {
      private_content: { v: 'yes' },
      private_content_detail: { v: 'Preislisten für Partnerpraxen' },
      legal_pages: { v: 'unsure' },
    });
    // run the review + brief through the public API so the detail page has something to show
    expect((await request.post(`/api/onboarding/${id}/review`)).ok()).toBeTruthy();
    const rec = await (await request.get(`/api/onboarding/${id}`)).json();
    const q = rec.record.review.queue[rec.record.review.cursor];
    expect((await request.post(`/api/onboarding/${id}/followups`, { data: { question_id: q.id, answer: 'reuse' } })).ok()).toBeTruthy();
    expect((await request.post(`/api/onboarding/${id}/brief`)).ok()).toBeTruthy();

    await page.goto('/admin/onboarding');
    await expect(page.locator(`[data-testid=onb-admin-row-${id}]`)).toContainText('Physio Nordend');
    await page.fill('[data-testid=onb-admin-search]', EMAIL);
    await page.click('button[type=submit]');
    await expect(page.locator('[data-testid=onb-admin-table] tr')).toHaveCount(1);

    await page.click(`[data-testid=onb-admin-row-${id}]`);
    await expect(page.locator('[data-testid=onb-admin-title]')).toContainText('Physio Nordend');
    await expect(page.locator('[data-testid=onb-admin-status]')).toContainText('brief');
    await expect(page.locator('[data-testid=onb-admin-flags]')).toContainText('needs_quote · member_area');
    await expect(page.locator('[data-testid=onb-admin-followups]')).toContainText('reuse');
    await expect(page.locator('[data-testid=onb-admin-answers]')).toContainText('Preislisten für Partnerpraxen');
    await expect(page.locator('[data-testid=onb-admin-answers]')).toContainText('follow-up');
    await expect(page.locator('[data-testid=onb-admin-brief]')).toContainText('Physio Nordend');
    // every model call is logged: the completeness passes and the brief (fixture mode here)
    await expect(page.locator('[data-testid=onb-admin-ailog] details').first()).toBeVisible();
    await expect(page.locator('[data-testid=onb-admin-ailog]')).toContainText('brief');

    const json = await page.request.get(`/admin/onboarding/${id}/export`);
    expect(json.ok()).toBeTruthy();
    const exported = await json.json();
    expect(exported.form_id).toBe(id);
    expect(exported.answers.legal_pages.value).toBe('reuse');
    expect(exported.flags.some((f: { detail: string }) => f.detail === 'member_area')).toBe(true);

    const pdf = await page.request.get(`/admin/onboarding/${id}/pdf`);
    expect(pdf.ok()).toBeTruthy();
    expect((await pdf.body()).subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  test('a CMS edit of a field label is live on the public form', async ({ page, request, browser }) => {
    const original = await snapshotField('onb_fields', 'contact_name', 'label_de');
    try {
      await page.goto('/admin/catalog/onb_fields');
      await expect(page.locator('h1')).toContainText('Onboarding form');
      await page.click('[data-testid=entity-row-contact_name]');
      await page.fill('[data-testid=entity-field-contact_name-label_de]', 'Ihr vollständiger Name');
      await page.click('[data-testid=entity-save-contact_name]');
      await expect(page.locator('text=Saved ✓')).toBeVisible();

      const id = await createFilledForm(request, EMAIL);
      const client = await browser.newContext({
        httpCredentials: { username: process.env.ONBOARDING_BASIC_USER!, password: process.env.ONBOARDING_BASIC_PASS! },
      });
      const form = await client.newPage();
      await form.goto(`/onboardingform/${id}`);
      await form.click('[data-testid=step-project]');
      await expect(form.locator('[data-field=contact_name] label')).toContainText('Ihr vollständiger Name');
      await client.close();
    } finally {
      await setField('onb_fields', 'contact_name', 'label_de', original);
    }
  });
});
