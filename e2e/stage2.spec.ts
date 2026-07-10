import { expect, test } from '@playwright/test';
import { walkToConfigurator, fillLeadAndSubmit, passCalendlyPanel } from './helpers/funnel';
import { GASTRO, testEmail } from './fixtures';

// Suite D — the optional intake sections, now collapsed inside the single inquiry form:
// they start closed, accept a real upload to the lead-uploads bucket (keyed to the funnel
// session, before any lead exists), reject oversize files, and submit with the form.

test.describe('public funnel — optional intake sections', () => {
  test('sections are collapsed, upload works, oversize is rejected, submit → done', async ({ page }) => {
    await walkToConfigurator(page, GASTRO.persona);
    await page.getByTestId('to-lead').click();

    // Optional intake is collapsed: no field is reachable until a section is opened.
    await expect(page.getByTestId('s2-firmenname')).toHaveCount(0);

    await page.getByTestId('s2-section-unternehmen').click();
    await page.getByTestId('s2-firmenname').fill('E2E Gasthaus GmbH');

    // Marke section: real upload via POST /api/sessions/[id]/uploads, pre-lead.
    await page.getByTestId('s2-section-marke').click();
    const fileInput = page.getByTestId('upload-logo').locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'e2e-logo.png',
      mimeType: 'image/png',
      buffer: Buffer.from('89504e470d0a1a0a', 'hex'), // minimal PNG header bytes
    });
    await expect(page.getByText('e2e-logo.png')).toBeVisible();

    // A browser that reports no MIME type must still upload by extension.
    await fileInput.setInputFiles({
      name: 'e2e-notype.png',
      mimeType: '',
      buffer: Buffer.from('89504e470d0a1a0a', 'hex'),
    });
    await expect(page.getByText('e2e-notype.png')).toBeVisible();

    // An unsupported type is rejected with a visible message, not silently dropped.
    await fileInput.setInputFiles({
      name: 'e2e-notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello'),
    });
    await expect(page.getByTestId('upload-error-logo')).toContainText('e2e-notes.txt');
    await expect(page.getByText('e2e-notes.txt', { exact: true })).toHaveCount(0);

    // A >25 MB file is caught client-side (never leaves the browser) and reported.
    await fileInput.setInputFiles({
      name: 'e2e-huge.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(26 * 1024 * 1024, 1),
    });
    await expect(page.getByTestId('upload-error-logo')).toContainText('e2e-huge.png');

    // The intake travels with the single submit — there is no second form.
    await fillLeadAndSubmit(page, testEmail('intake'));
    await passCalendlyPanel(page);
  });
});
