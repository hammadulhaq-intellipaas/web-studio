import { expect, test } from '@playwright/test';

// The onboarding form and its API sit behind HTTP Basic auth (fails closed). Other
// onboarding specs inherit the credentials from playwright.config.ts. Playwright's own
// request contexts inherit them too, so the anonymous probes here use Node's fetch.

const USER = process.env.ONBOARDING_BASIC_USER ?? '';
const PASS = process.env.ONBOARDING_BASIC_PASS ?? '';

const anon = (baseURL: string | undefined, path: string, init: RequestInit = {}) =>
  fetch(`${baseURL}${path}`, { redirect: 'manual', ...init });

test.describe('onboarding gate', () => {
  test.skip(!USER || !PASS, 'ONBOARDING_BASIC_USER / ONBOARDING_BASIC_PASS not set');

  test('pages and API answer 401 with a Basic challenge when no credentials are sent', async ({ baseURL }) => {
    for (const path of ['/onboardingform', '/en/onboardingform', '/onboardingform/abc', '/api/onboarding/abc']) {
      const res = await anon(baseURL, path);
      expect(res.status, path).toBe(401);
      expect(res.headers.get('www-authenticate'), path).toMatch(/^Basic realm=/);
    }
    // the rest of the site is untouched
    expect((await anon(baseURL, '/')).status).toBe(200);
  });

  test('wrong credentials are rejected', async ({ baseURL }) => {
    const res = await anon(baseURL, '/onboardingform', {
      headers: { authorization: `Basic ${Buffer.from(`${USER}:${PASS}x`).toString('base64')}` },
    });
    expect(res.status).toBe(401);
  });

  test('correct credentials open the landing page and hand out the gate cookie', async ({ page, context }) => {
    const res = await page.goto('/onboardingform');
    expect(res?.status()).toBe(200);
    const cookie = (await context.cookies()).find((c) => c.name === 'onb_gate');
    expect(cookie).toBeDefined();
    expect(cookie?.httpOnly).toBe(true);
  });

  test('the gate cookie alone is enough for the API (what the page\'s fetch() relies on)', async ({ baseURL, page, context }) => {
    await page.goto('/onboardingform');
    const cookie = (await context.cookies()).find((c) => c.name === 'onb_gate');
    expect(cookie).toBeDefined();
    // 404 = the gate passed and the route handler answered (unknown id); 401 would mean it did not.
    const res = await anon(baseURL, '/api/onboarding/notarealidnotarealid1', { headers: { cookie: `onb_gate=${cookie!.value}` } });
    expect(res.status).toBe(404);
    const forged = await anon(baseURL, '/api/onboarding/notarealidnotarealid1', { headers: { cookie: `onb_gate=${cookie!.value.slice(0, -1)}x` } });
    expect(forged.status).toBe(401);
  });
});
