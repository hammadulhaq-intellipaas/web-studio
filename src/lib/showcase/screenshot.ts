import 'server-only';
import { chromium as playwright, type Browser } from 'playwright-core';
import { siteNameFrom } from './shared';

/** The size the card's 16:10 frame is made for. */
const VIEWPORT = { width: 1440, height: 900 };

/**
 * Hides the usual cookie and consent banners, so the picture shows the page and not the
 * banner over it. Only for the screenshot; the site itself is not changed.
 */
const HIDE_BANNERS = `
#CybotCookiebotDialog, #usercentrics-root, #onetrust-consent-sdk, #cmplz-cookiebanner-container,
.cky-consent-container, .cc-window, .cookie-notice-container, #cookie-notice, #BorlabsCookieBox,
[id*="cookie" i][role="dialog"], [class*="cookie-banner" i], [class*="cookiebanner" i],
[id*="cookie-banner" i], [id*="consent-banner" i], [class*="consent-banner" i] {
  display: none !important;
}
html, body { overflow: auto !important; }
`;

/**
 * On Vercel: the Chromium packaged with @sparticuz/chromium (unpacked to /tmp on a cold start).
 * Locally: the Chromium Playwright installed for the e2e tests.
 */
async function launch(): Promise<Browser> {
  if (process.env.VERCEL) {
    const { default: chromium } = await import('@sparticuz/chromium');
    return playwright.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
  }
  return playwright.launch({ headless: true });
}

export class ScreenshotError extends Error {}

function explain(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err);
  if (/ERR_NAME_NOT_RESOLVED|ENOTFOUND/.test(text)) return 'This address could not be found. Check the link.';
  if (/Timeout|ERR_TIMED_OUT/i.test(text)) return 'The website took too long to load.';
  if (/ERR_CONNECTION|ERR_SSL|ERR_CERT/.test(text)) return 'The website could not be reached.';
  return 'The website could not be opened for a screenshot.';
}

/** Opens the homepage like a visitor on a laptop and returns a picture of the top of it. */
export async function captureHomepage(url: string): Promise<{ image: Buffer; siteName: string }> {
  let browser: Browser | null = null;
  try {
    browser = await launch();
    const major = browser.version().split('.')[0];
    const page = await browser.newPage({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      locale: 'de-DE',
      // Some sites turn away "HeadlessChrome"; this is the same browser, named like a desktop one.
      userAgent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`,
    });
    const response = await page.goto(url, { waitUntil: 'load', timeout: 25_000 });
    if (response && response.status() >= 400) throw new ScreenshotError(`The website answered with error ${response.status()}.`);
    await page.addStyleTag({ content: HIDE_BANNERS }).catch(() => undefined);
    await page.evaluate(() => document.fonts?.ready).catch(() => undefined);
    // Let entrance animations and the first lazy images finish.
    await page.waitForTimeout(1500);
    const image = await page.screenshot({ type: 'jpeg', quality: 82 });
    const [title, ogSiteName] = await page.evaluate(() => [
      document.title,
      document.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ?? '',
    ]);
    return { image, siteName: siteNameFrom(title ?? '', ogSiteName ?? '') };
  } catch (err) {
    throw err instanceof ScreenshotError ? err : new ScreenshotError(explain(err));
  } finally {
    await browser?.close().catch(() => undefined);
  }
}
