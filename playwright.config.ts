import { defineConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// The e2e suite runs against the cloud Supabase project. App secrets come from
// .env.local; admin credentials from the untracked .supabase-secrets file.
dotenv.config({ path: path.join(__dirname, '.env.local') });
const secretsPath = path.join(__dirname, '.supabase-secrets');
if (fs.existsSync(secretsPath)) {
  for (const line of fs.readFileSync(secretsPath, 'utf8').split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] ??= rest.join('=').trim();
  }
}

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: 1, // absorb cloud/network jitter on a shared prod DB
  workers: 1, // serial: avoids catalog-edit races and shared-state collisions
  reporter: [['html', { open: 'never' }], ['list']],
  globalTeardown: './e2e/global.teardown.ts',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3111',
    locale: 'de-DE',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Logs in once, saves storageState for the `admin` project.
    { name: 'setup', testMatch: /global\.setup\.ts/ },
    // Public + logged-out flows. Excludes admin-* (auth + stored-session specs).
    {
      name: 'public',
      testIgnore: [/global\.setup\.ts/, /\.admin\.spec\.ts$/, /admin-auth\.spec\.ts$/],
    },
    // Authenticated admin flows — reuse the stored session.
    {
      name: 'admin',
      testMatch: /\.admin\.spec\.ts$/,
      dependencies: ['setup'],
      use: { storageState: 'e2e/.auth/admin.json' },
    },
    // Login/signout flows run LAST: the signout test does a global Supabase
    // signout that would otherwise revoke the shared admin session mid-suite.
    {
      name: 'authflow',
      testMatch: /admin-auth\.spec\.ts$/,
      dependencies: ['admin'],
    },
  ],
  webServer: {
    command: 'npm run start -- -p 3111',
    url: 'http://localhost:3111',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
