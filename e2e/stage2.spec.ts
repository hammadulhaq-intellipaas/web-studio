import { expect, test } from '@playwright/test';
import { walkToConfigurator, fillLeadAndSubmit, passCalendlyPanel } from './helpers/funnel';
import { GASTRO, testEmail } from './fixtures';

// Suite D — stage-2 enrichment: readiness meter, real file upload to Supabase
// storage, oversize rejection, and finish.

test.describe('public funnel — stage 2', () => {
  test('readiness rises, file upload works, oversize is rejected, finish → done', async ({ page }) => {
    await walkToConfigurator(page, GASTRO.persona);
    await page.getByTestId('to-lead').click();
    await fillLeadAndSubmit(page, testEmail('stage2'));
    await passCalendlyPanel(page);

    // Readiness starts at 25% and rises as fields fill (Unternehmen is open by default).
    await expect(page.getByTestId('readiness')).toHaveText('25%');
    await page.getByTestId('s2-firmenname').fill('E2E Gasthaus GmbH');
    await expect(page.getByTestId('readiness')).not.toHaveText('25%');

    // Marke section: real upload to the lead-uploads bucket via POST /api/leads/[id]/uploads.
    await page.getByTestId('s2-section-marke').click();
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'e2e-logo.png',
      mimeType: 'image/png',
      buffer: Buffer.from('89504e470d0a1a0a', 'hex'), // minimal PNG header bytes
    });
    await expect(page.getByText('e2e-logo.png')).toBeVisible();

    // A >25 MB file is filtered client-side and never uploaded.
    await fileInput.setInputFiles({
      name: 'e2e-huge.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(26 * 1024 * 1024, 1),
    });
    await expect(page.getByText('e2e-huge.png')).toHaveCount(0);

    await page.getByTestId('s2-finish').click();
    await expect(page.getByText('Vielen Dank! Ihre Anfrage ist bei uns.')).toBeVisible();
  });
});
