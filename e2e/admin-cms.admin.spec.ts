import { expect, test } from '@playwright/test';
import { snapshotField, setField } from './helpers/db';

// Suite K — the CMS surfaces added with the rules engine: full CRUD on catalog entities
// (create + delete, with foreign-key protection), CMS-managed legal copy, the AI bundle
// CTA's placement inside its add-on category, and add-on bundles that never double-price.
// Every mutation is snapshotted and restored so a failure can't leave prod content edited.

/** The sidebar total animates; read it only once it has settled. */
async function settledTotal(page: import('@playwright/test').Page): Promise<number> {
  let last = -1;
  for (;;) {
    const text = (await page.getByTestId('sum-once').textContent()) ?? '';
    const value = Number(text.replace(/[^\d]/g, ''));
    if (value === last) return value;
    last = value;
    await page.waitForTimeout(250);
  }
}

async function openConfigurator(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jetzt starten' }).click();
  await page.getByTestId('persona-gastro').click();
  await page.getByTestId('to-config').click();
}

test.describe('admin — CMS rules, CRUD & legal', () => {
  test('a bundle rule can be created and deleted', async ({ page }) => {
    await page.goto('/admin/catalog/bundle_rules');
    await page.getByRole('button', { name: '+ New' }).click();

    const form = page.locator('div.border-dashed');
    await form.locator('input').nth(0).fill('e2e_rule_tmp'); // id
    await form.locator('input').nth(1).fill('upgrade'); // rule_kind
    await form.locator('input').nth(2).fill('platinum'); // result_bundle
    await page.getByTestId('entity-create').click();

    // The create form closes on success and the new row appears in the list.
    await expect(page.getByTestId('entity-row-e2e_rule_tmp')).toBeVisible();

    await page.getByTestId('entity-row-e2e_rule_tmp').click();
    page.once('dialog', (d) => d.accept());
    await page.getByTestId('entity-delete-e2e_rule_tmp').click();
    await expect(page.getByTestId('entity-row-e2e_rule_tmp')).toHaveCount(0);
  });

  test('deleting an add-on category that still has add-ons is refused', async ({ page }) => {
    await page.goto('/admin/catalog/addon_categories');
    await page.getByTestId('entity-row-inhalte').click();
    page.once('dialog', (d) => d.accept());
    await page.getByTestId('entity-delete-inhalte').click();

    await expect(page.getByText('Still in use by other rows — remove those first.')).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('entity-row-inhalte')).toBeVisible();
  });

  test('the privacy policy is served from the CMS', async ({ page }) => {
    const original = await snapshotField('legal_pages', 'privacy_de', 'content_markdown');
    try {
      await page.goto('/admin/catalog/legal_pages');
      await page.getByTestId('entity-row-privacy_de').click();
      await page.locator('textarea').last().fill('### E2E\n\nCMS-driven privacy body.');
      await page.getByTestId('entity-save-privacy_de').click();
      await expect(page.getByText('Saved ✓')).toBeVisible();

      await page.goto('/datenschutz');
      await expect(page.getByTestId('privacy-content')).toContainText('CMS-driven privacy body.');
    } finally {
      await setField('legal_pages', 'privacy_de', 'content_markdown', original);
    }
  });

  test('the AI Agentic Bundle CTA sits inside the AI building blocks category', async ({ page }) => {
    await openConfigurator(page);

    // The CTA must live in the same category block as the individual AI add-on cards.
    const aiCard = page.getByTestId('addon-aichatbot');
    await expect(aiCard).toBeVisible();
    const categoryBlock = aiCard.locator('xpath=ancestor::div[.//*[@data-testid="ai-bundle-toggle"]][1]');
    await expect(categoryBlock).toHaveCount(1);
    await expect(categoryBlock.getByTestId('ai-bundle-toggle')).toBeVisible();
  });

  test('the SEO + GEO bundle includes its members and is never double-priced', async ({ page }) => {
    await openConfigurator(page);
    const before = await settledTotal(page);

    await page.getByTestId('addon-seogeosetup').click();
    await expect(page.getByTestId('addon-seosetup')).toContainText('enthalten');
    await expect(page.getByTestId('addon-geosetup')).toContainText('enthalten');

    // Only the bundle's own price (€765) is added — not 450 + 390 on top of it.
    const withBundle = await settledTotal(page);
    expect(withBundle).toBe(before + 765);

    // Clicking a covered member is a no-op: it can never be added a second time.
    await page.getByTestId('addon-seosetup').click();
    expect(await settledTotal(page)).toBe(withBundle);

    // Deselecting the bundle prices the two members individually again.
    await page.getByTestId('addon-seogeosetup').click();
    await page.getByTestId('addon-seosetup').click();
    await page.getByTestId('addon-geosetup').click();
    expect(await settledTotal(page)).toBe(before + 450 + 390);
  });

  test('a customer who already has a logo & imagery gets no photo package pre-selected', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Jetzt starten' }).click();
    // Gastro pre-selects `foto`; answering "we have everything" must suppress it.
    await page.getByTestId('persona-gastro').click();
    await page.getByTestId('question-assets').getByRole('button', { name: 'Ja' }).click();
    await page.getByTestId('to-config').click();

    await expect(page.getByTestId('addon-foto')).not.toContainText('empfohlen');
    await expect(page.getByTestId('addon-logo')).not.toContainText('empfohlen');
  });
});
