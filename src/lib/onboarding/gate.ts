/**
 * HTTP Basic-auth gate in front of the onboarding form while it is not public yet.
 *
 * Runs inside `src/proxy.ts`, so only Web APIs are used (no `node:crypto`). Credentials
 * come from env; the gate FAILS CLOSED — missing credentials lock the form for everyone,
 * and only `ONBOARDING_BASIC_AUTH=off` opens it. After a successful Basic challenge on a
 * page, a signed cookie is set so the page's `fetch()` calls to `/api/onboarding/*` pass:
 * browsers do not replay Basic credentials across path prefixes.
 */

export const GATE_COOKIE = 'onb_gate';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const REALM = 'Web Studio Onboarding';

const PAGE_RE = /^\/(?:en\/)?onboardingform(?:\/|$)/;
const API_RE = /^\/api\/onboarding(?:\/|$)/;

export type GateEnv = Partial<
  Record<'ONBOARDING_BASIC_AUTH' | 'ONBOARDING_BASIC_USER' | 'ONBOARDING_BASIC_PASS', string | undefined>
> &
  Record<string, string | undefined>;

export function isGatedPath(pathname: string): boolean {
  return PAGE_RE.test(pathname) || API_RE.test(pathname);
}

export function isGatedApiPath(pathname: string): boolean {
  return API_RE.test(pathname);
}

export function gateEnabled(env: GateEnv = process.env): boolean {
  return env.ONBOARDING_BASIC_AUTH?.toLowerCase() !== 'off';
}

export function gateConfigured(env: GateEnv = process.env): boolean {
  return !!env.ONBOARDING_BASIC_USER && !!env.ONBOARDING_BASIC_PASS;
}

export function parseBasicAuth(header: string | null | undefined): { user: string; pass: string } | null {
  if (!header) return null;
  const match = /^Basic\s+([A-Za-z0-9+/=]+)$/i.exec(header.trim());
  if (!match) return null;
  let decoded: string;
  try {
    decoded = new TextDecoder().decode(Uint8Array.from(atob(match[1]), (c) => c.charCodeAt(0)));
  } catch {
    return null;
  }
  const idx = decoded.indexOf(':');
  if (idx < 0) return null;
  return { user: decoded.slice(0, idx), pass: decoded.slice(idx + 1) };
}

/** Compares two strings without leaking their common prefix length through timing. */
export function constantTimeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

function base64url(bytes: ArrayBuffer): string {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** The cookie value: HMAC-SHA256 keyed by the password over `user:v1`. Changing either revokes every cookie. */
export async function expectedCookieValue(env: GateEnv = process.env): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(env.ONBOARDING_BASIC_PASS ?? ''),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${env.ONBOARDING_BASIC_USER ?? ''}:v1`));
  return base64url(sig);
}

export type GateVerdict = 'open' | 'pass-basic' | 'pass-cookie' | 'fail';

export async function checkGate(
  input: { authorization: string | null; cookie: string | null },
  env: GateEnv = process.env,
): Promise<GateVerdict> {
  if (!gateEnabled(env)) return 'open';
  if (!gateConfigured(env)) return 'fail';

  const creds = parseBasicAuth(input.authorization);
  if (creds && constantTimeEqual(creds.user, env.ONBOARDING_BASIC_USER!) && constantTimeEqual(creds.pass, env.ONBOARDING_BASIC_PASS!)) {
    return 'pass-basic';
  }
  if (input.cookie && constantTimeEqual(input.cookie, await expectedCookieValue(env))) return 'pass-cookie';
  return 'fail';
}

export function unauthorizedResponse(): Response {
  return new Response('Zugang geschützt · Access restricted', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export function gateCookieOptions(secure: boolean) {
  return {
    name: GATE_COOKIE,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  };
}
