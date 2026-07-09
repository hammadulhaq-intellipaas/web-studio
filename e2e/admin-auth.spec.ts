import { expect, test } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers/env';

// Suite G — admin auth. Runs in the `public` project (no stored session), so each
// test starts logged out.

test.describe('admin auth', () => {
  test('unauthenticated /admin redirects to login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('protected sub-routes redirect to login when logged out', async ({ page }) => {
    for (const route of ['/admin/leads', '/admin/vouchers', '/admin/calendar', '/admin/catalog']) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/admin\/login$/);
    }
  });

  test('wrong password shows an error and stays on login', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByTestId('admin-email').fill(ADMIN_EMAIL);
    await page.getByTestId('admin-password').fill('definitely-wrong-password');
    await page.getByTestId('admin-login-submit').click();
    await expect(page.getByText(/invalid|credential/i)).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('valid login reaches the dashboard, then sign out returns to login', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByTestId('admin-email').fill(ADMIN_EMAIL);
    await page.getByTestId('admin-password').fill(ADMIN_PASSWORD);
    await page.getByTestId('admin-login-submit').click();
    await expect(page.getByTestId('stat-total-leads')).toBeVisible();

    await page.getByTestId('admin-signout').click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    // Session cleared — /admin bounces again.
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});
