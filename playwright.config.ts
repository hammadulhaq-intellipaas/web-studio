import { defineConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Admin credentials for the e2e suite live in the untracked .supabase-secrets file.
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
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'http://localhost:3111',
    locale: 'de-DE',
  },
  webServer: {
    command: 'npm run start -- -p 3111',
    url: 'http://localhost:3111',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
