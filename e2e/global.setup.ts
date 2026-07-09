// Authenticates once as admin and stores the session so the `admin` project
// doesn't re-login per test. Runs as the `setup` project.
import { test as setup, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, AUTH_FILE } from './helpers/env';

setup('authenticate admin', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByTestId('admin-email').fill(ADMIN_EMAIL);
  await page.getByTestId('admin-password').fill(ADMIN_PASSWORD);
  await page.getByTestId('admin-login-submit').click();
  // Dashboard renders the total-leads stat only when authenticated.
  await expect(page.getByTestId('stat-total-leads')).toBeVisible();
  await page.context().storageState({ path: AUTH_FILE });
});
