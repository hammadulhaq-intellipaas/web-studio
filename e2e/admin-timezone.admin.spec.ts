import { expect, test } from '@playwright/test';
import { db } from './helpers/db';
import { RUN_ID } from './fixtures';

// Suite L — admin timestamps render in the viewer's timezone, not the server's UTC.
// The lead's submission time is seeded at a fixed UTC instant and asserted from a
// browser pinned to UTC+5, where it must land on the following calendar day.

const LEAD_ID = '2a2a2a2a-2a2a-4a2a-8a2a-2a2a2a2a2a2a';
const CREATED_AT = '2026-07-10T22:30:00+00:00'; // 22:30 UTC → 03:30 next day at UTC+5

test.use({ timezoneId: 'Asia/Karachi' });

test.describe('admin — timezone', () => {
  test.beforeAll(async () => {
    await db.from('leads').upsert({
      id: LEAD_ID,
      email: `e2e-${RUN_ID}-tz@example.com`,
      telefon: '0',
      consent_at: CREATED_AT,
      created_at: CREATED_AT,
      config: {
        bundle: 'gold',
        bundleName: 'Gold',
        addons: [],
        care: 'plus',
        support: 'none',
        cf: 'none',
        backupUp: false,
        aiBundle: false,
        payYearly: false,
        voucher: null,
        answers: {},
        lines: { oneOff: [], monthly: [], yearly: [] },
      },
    });
  });

  test.afterAll(async () => {
    await db.from('leads').delete().eq('id', LEAD_ID);
  });

  test('the submission time is shown in the browser timezone', async ({ page }) => {
    await page.goto(`/admin/leads/${LEAD_ID}`);
    const stamp = page.locator(`time[datetime="${CREATED_AT}"]`).first();
    await expect(stamp).toBeVisible();
    // UTC+5 pushes 22:30 on the 10th to 03:30 on the 11th; UTC would still read 22:30.
    await expect(stamp).toContainText('03:30');
    await expect(stamp).toContainText('11 Jul');
    await expect(stamp).not.toContainText('22:30');
  });
});
