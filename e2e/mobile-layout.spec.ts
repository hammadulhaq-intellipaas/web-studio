import { expect, test, type Page } from '@playwright/test';
import { walkToConfigurator } from './helpers/funnel';
import { completeAnswers } from './helpers/onboarding';
import { testEmail } from './fixtures';

// Phones: no page may scroll sideways, and nothing in the header may sit on top of
// anything else (the Web Studio badge and "Step 3 of 4" used to run into DE/EN).

async function expectFitsPhone(page: Page, where: string) {
  const report = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const header = document.querySelector('header');
    const overlaps: string[] = [];
    if (header) {
      const leaves = Array.from(header.querySelectorAll<HTMLElement>('a, button, span, div, img')).filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (e.children.length === 0 || e.tagName === 'IMG');
      });
      for (let i = 0; i < leaves.length; i++)
        for (let j = i + 1; j < leaves.length; j++) {
          if (leaves[i].contains(leaves[j]) || leaves[j].contains(leaves[i])) continue;
          const a = leaves[i].getBoundingClientRect();
          const b = leaves[j].getBoundingClientRect();
          if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1)
            overlaps.push(`${leaves[i].innerText || leaves[i].tagName} x ${leaves[j].innerText || leaves[j].tagName}`);
        }
    }
    const toggle = document.querySelector('[data-testid=language-toggle]')?.getBoundingClientRect();
    return {
      vw,
      scrollWidth: document.documentElement.scrollWidth,
      overlaps,
      toggleInside: !toggle || (toggle.left >= 0 && toggle.right <= vw),
      headerHeight: header?.getBoundingClientRect().height ?? 0,
    };
  });
  expect(report.scrollWidth, `${where}: page scrolls sideways`).toBeLessThanOrEqual(report.vw);
  expect(report.overlaps, `${where}: header overlaps`).toEqual([]);
  expect(report.toggleInside, `${where}: DE/EN off screen`).toBe(true);
  expect(report.headerHeight, `${where}: header is more than one row`).toBeLessThan(70);
}

for (const width of [360, 390]) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    test('the quote form fits, header included', async ({ page }) => {
      await page.goto('/');
      await expectFitsPhone(page, 'intro');
      await walkToConfigurator(page, 'gastro', 'de');
      await expectFitsPhone(page, 'configurator');
      await page.getByTestId('to-lead').click();
      await expectFitsPhone(page, 'contact step');
    });

    test('the onboarding form fits, header included', async ({ page, request }) => {
      await page.goto('/onboardingform');
      await expectFitsPhone(page, 'landing');
      const res = await request.get('/onboardingform/new', { maxRedirects: 0 });
      const id = (res.headers()['location'] ?? '').split('/').pop()!;
      await request.patch(`/api/onboarding/${id}`, { data: { base_rev: 0, changes: completeAnswers(testEmail('onb-mobile')), current_step: 'design' } });
      await page.goto(`/onboardingform/${id}`);
      await expect(page.locator('[data-screen=onb-design]')).toBeVisible();
      await expectFitsPhone(page, 'design step');
      await expect(page.locator('[data-testid=onb-stepper-compact]')).toHaveText(/^Schritt 4 von 10$/);
    });
  });
}

test('tablet widths: the onboarding header keeps DE/EN on screen next to "save for later"', async ({ page, request }) => {
  const res = await request.get('/onboardingform/new', { maxRedirects: 0 });
  const id = (res.headers()['location'] ?? '').split('/').pop()!;
  await request.patch(`/api/onboarding/${id}`, { data: { base_rev: 0, changes: completeAnswers(testEmail('onb-tablet')), current_step: 'access_legal' } });
  for (const width of [768, 820]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/onboardingform/${id}`);
    await expect(page.locator('[data-screen=onb-access_legal]')).toBeVisible();
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    expect(fits, `${width}px: page scrolls sideways`).toBe(true);
  }
});
