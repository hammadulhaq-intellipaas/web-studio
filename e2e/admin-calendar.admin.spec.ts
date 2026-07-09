import { expect, test } from '@playwright/test';
import { createLeadViaApi } from './helpers/api';
import { sendSignedWebhook } from './helpers/calendly';
import { getAppointmentsByLead } from './helpers/db';
import { RUN_ID, testEmail } from './fixtures';

// Suite I — admin calendar via the REAL Calendly webhook endpoint (signed payload).
// The Calendly iframe itself is intentionally not driven (books real meetings); this
// exercises the identical server path Calendly hits.

test.describe.serial('admin — calendar (calendly webhook)', () => {
  const email = testEmail('appt');
  const eventUri = `e2e://appt/${RUN_ID}`;
  // Mid-month noon UTC so it lands inside the current month grid regardless of tz.
  const now = new Date();
  const startTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15, 12, 0, 0)).toISOString();
  let leadId: string;

  test('scheduled webhook creates an appointment linked to the lead', async ({ page, request }) => {
    leadId = await createLeadViaApi(request, email);
    await sendSignedWebhook(request, 'invitee.created', {
      leadId,
      email,
      eventUri,
      startTime,
      name: 'E2E Booker',
    });

    await page.goto('/admin/calendar');
    const appt = page.getByRole('link', { name: /E2E Booker/ }).first();
    await expect(appt).toBeVisible();
    await expect(appt).toHaveAttribute('href', `/admin/leads/${leadId}`);
  });

  test('canceled webhook flips the appointment status', async ({ request }) => {
    await sendSignedWebhook(request, 'invitee.canceled', {
      leadId,
      email,
      eventUri,
      startTime,
      name: 'E2E Booker',
    });
    const appts = await getAppointmentsByLead(leadId);
    const appt = appts.find((a) => a.calendly_event_uri === eventUri);
    expect(appt?.status).toBe('canceled');
  });
});
