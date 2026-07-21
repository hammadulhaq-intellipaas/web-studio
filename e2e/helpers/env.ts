// Loads runtime config for the e2e suite from .env.local (app secrets) and
// .supabase-secrets (admin credentials). Playwright's Node context does NOT get
// Next.js env loading, so we do it here. Imported by every Node-side helper.
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const ROOT = path.join(__dirname, '..', '..');

// .env.local — Supabase URL / service-role key / integration keys.
dotenv.config({ path: path.join(ROOT, '.env.local') });

// .supabase-secrets — ADMIN_EMAIL / ADMIN_PASSWORD (same parse as playwright.config.ts).
const secretsPath = path.join(ROOT, '.supabase-secrets');
if (fs.existsSync(secretsPath)) {
  for (const line of fs.readFileSync(secretsPath, 'utf8').split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] ??= rest.join('=').trim();
  }
}

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[e2e] Missing required env var ${name} (check .env.local / .supabase-secrets)`);
  return v;
}

export const SUPABASE_URL = req('NEXT_PUBLIC_SUPABASE_URL');
export const SERVICE_ROLE_KEY = req('SUPABASE_SERVICE_ROLE_KEY');
export const ADMIN_EMAIL = req('ADMIN_EMAIL');
export const ADMIN_PASSWORD = req('ADMIN_PASSWORD');

// Optional — features degrade gracefully if unset.
export const CALENDLY_SIGNING_KEY = process.env.CALENDLY_WEBHOOK_SIGNING_KEY ?? '';
// Must match the running app's slug or the webhook drops our payloads as "foreign origin".
export const CALENDLY_ORIGIN = process.env.NEXT_PUBLIC_CALENDLY_ORIGIN ?? '';
export const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';

export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3111';
export const AUTH_FILE = 'e2e/.auth/admin.json';
