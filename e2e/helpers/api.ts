// Seed a lead directly through the real `POST /api/leads` handler — same code path
// the funnel uses (validation, voucher revalidation, DB insert, email dispatch).
// Lets admin specs get a deterministic lead without re-walking the funnel UI.
import { expect, type APIRequestContext } from '@playwright/test';
import { leadApiPayload } from '../fixtures';

export async function createLeadViaApi(
  request: APIRequestContext,
  email: string,
  opts?: { voucherCode?: string },
): Promise<string> {
  const res = await request.post('/api/leads', { data: leadApiPayload(email, opts) });
  expect(res.ok(), `POST /api/leads failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  expect(body.id, 'lead id in response').toBeTruthy();
  return body.id as string;
}
