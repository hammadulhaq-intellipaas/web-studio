import { expect, test } from '@playwright/test';
import { SEEDED_VOUCHER } from './fixtures';

// Cross-cutting API smoke tests via the request fixture (no browser).

test.describe('api smoke', () => {
  test('GET / returns 200', async ({ request }) => {
    const res = await request.get('/');
    expect(res.status()).toBe(200);
  });

  test('GET /admin redirects to login', async ({ request }) => {
    const res = await request.get('/admin', { maxRedirects: 0 });
    expect([302, 307]).toContain(res.status());
    expect(res.headers()['location']).toContain('/admin/login');
  });

  test('POST /api/vouchers/validate accepts the seeded code', async ({ request }) => {
    const res = await request.post('/api/vouchers/validate', { data: { code: SEEDED_VOUCHER.code } });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.percent).toBe(SEEDED_VOUCHER.percent);
    expect(body.scope).toBe(SEEDED_VOUCHER.scope);
  });

  test('POST /api/webhooks/calendly rejects an unsigned request with 401', async ({ request }) => {
    const res = await request.post('/api/webhooks/calendly', { data: { event: 'invitee.created' } });
    expect(res.status()).toBe(401);
  });
});
