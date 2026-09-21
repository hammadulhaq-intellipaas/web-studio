import { expect, request as playwrightRequest, test } from '@playwright/test';

// The onboarding form and its API sit behind HTTP Basic auth (fails closed). Other
// onboarding specs inherit the credentials from playwright.config.ts; this one checks
// the gate itself with a credential-less context.

const USER = process.env.ONBOARDING_BASIC_USER ?? '';
const PASS = process.env.ONBOARDING_BASIC_PASS ?? '';

test.describe('onboarding gate', () => {
  test.skip(!USER || !PASS, 'ONBOARDING_BASIC_USER / ONBOARDING_BASIC_PASS not set');

  test('pages and API answer 401 with a Basic challenge when no credentials are sent', async ({ baseURL }) => {
    const anon = await playwrightRequest.newContext({ baseURL });
    try {
      for (const path of ['/onboardingform', '/en/onboardingform', '/onboardingform/abc', '/api/onboarding/abc']) {
        const res = await anon.get(path, { maxRedirects: 0 });
        expect(res.status(), path).toBe(401);
        expect(res.headers()['www-authenticate'], path).toMatch(/^Basic realm=/);
      }
      // the rest of the site is untouched
      expect((await anon.get('/')).status()).toBe(200);
    } finally {
      await anon.dispose();
    }
  });

  test('wrong credentials are rejected', async ({ baseURL }) => {
    const wrong = await playwrightRequest.newContext({
      baseURL,
      httpCredentials: { username: USER, password: `${PASS}x` },
    });
    try {
      expect((await wrong.get('/onboardingform', { maxRedirects: 0 })).status()).toBe(401);
    } finally {
      await wrong.dispose();
    }
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
    const cookieOnly = await playwrightRequest.newContext({
      baseURL,
      extraHTTPHeaders: { cookie: `onb_gate=${cookie!.value}` },
    });
    try {
      // 404 = the gate passed and the route handler answered (unknown id); 401 would mean it did not.
      const res = await cookieOnly.get('/api/onboarding/notarealidnotarealid1');
      expect(res.status()).not.toBe(401);
    } finally {
      await cookieOnly.dispose();
    }
  });
});
