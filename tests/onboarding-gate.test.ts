import { describe, expect, it } from 'vitest';
import {
  checkGate,
  constantTimeEqual,
  expectedCookieValue,
  isGatedApiPath,
  isGatedPath,
  parseBasicAuth,
  unauthorizedResponse,
} from '@/lib/onboarding/gate';

const env = { ONBOARDING_BASIC_USER: 'intellipaas.io', ONBOARDING_BASIC_PASS: 'Access!' };
const basic = (user: string, pass: string) => `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;

describe('gate paths', () => {
  it('covers the form pages in both locales and the API, nothing else', () => {
    for (const p of ['/onboardingform', '/onboardingform/abc', '/en/onboardingform/abc', '/api/onboarding/abc', '/api/onboarding']) {
      expect(isGatedPath(p), p).toBe(true);
    }
    for (const p of ['/', '/en', '/onboardingformx', '/api/leads', '/admin', '/impressum']) {
      expect(isGatedPath(p), p).toBe(false);
    }
    expect(isGatedApiPath('/api/onboarding/x')).toBe(true);
    expect(isGatedApiPath('/onboardingform/x')).toBe(false);
  });
});

describe('parseBasicAuth', () => {
  it('decodes user and password, tolerating colons in the password', () => {
    expect(parseBasicAuth(basic('intellipaas.io', 'Acc:ess!'))).toEqual({ user: 'intellipaas.io', pass: 'Acc:ess!' });
    expect(parseBasicAuth('Bearer xyz')).toBeNull();
    expect(parseBasicAuth('Basic %%%')).toBeNull();
    expect(parseBasicAuth(null)).toBeNull();
  });
});

describe('checkGate', () => {
  it('fails closed without credentials configured', async () => {
    expect(await checkGate({ authorization: basic('a', 'b'), cookie: null }, {})).toBe('fail');
  });

  it('is open only when switched off explicitly', async () => {
    expect(await checkGate({ authorization: null, cookie: null }, { ...env, ONBOARDING_BASIC_AUTH: 'off' })).toBe('open');
    expect(await checkGate({ authorization: null, cookie: null }, { ...env, ONBOARDING_BASIC_AUTH: 'on' })).toBe('fail');
  });

  it('passes correct Basic credentials and rejects wrong ones', async () => {
    expect(await checkGate({ authorization: basic('intellipaas.io', 'Access!'), cookie: null }, env)).toBe('pass-basic');
    expect(await checkGate({ authorization: basic('intellipaas.io', 'access!'), cookie: null }, env)).toBe('fail');
    expect(await checkGate({ authorization: basic('someone', 'Access!'), cookie: null }, env)).toBe('fail');
  });

  it('passes the signed cookie and rejects a forged one', async () => {
    const cookie = await expectedCookieValue(env);
    expect(cookie).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await checkGate({ authorization: null, cookie }, env)).toBe('pass-cookie');
    expect(await checkGate({ authorization: null, cookie: `${cookie.slice(0, -1)}x` }, env)).toBe('fail');
    // a different password invalidates every cookie
    expect(await checkGate({ authorization: null, cookie }, { ...env, ONBOARDING_BASIC_PASS: 'Other!' })).toBe('fail');
  });

  it('answers 401 with a Basic challenge', () => {
    const res = unauthorizedResponse();
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toMatch(/^Basic realm=/);
  });

  it('compares in constant time without prefix leaks', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
    expect(constantTimeEqual('', '')).toBe(true);
  });
});
