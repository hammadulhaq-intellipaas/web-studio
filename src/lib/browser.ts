import 'server-only';
import { chromium as playwright, type Browser } from 'playwright-core';

/**
 * The headless browser the server opens websites with: the showcase screenshots and the
 * Developers page's reference specs. Every route that uses it needs the browser files in its
 * outputFileTracingIncludes (next.config.ts).
 */

export { HIDE_BANNERS } from './hide-banners';

/** Where @sparticuz/chromium unpacked the browser, once per running function. */
let executable: Promise<string> | null = null;

/**
 * On Vercel: the Chromium packaged with @sparticuz/chromium (unpacked to /tmp on a cold start).
 * Locally: the Chromium Playwright installed for the e2e tests.
 */
export async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL) {
    const { default: chromium } = await import('@sparticuz/chromium');
    // Two websites read side by side share one unpacking instead of writing the same file twice.
    executable ??= chromium.executablePath().catch((err) => {
      executable = null;
      throw err;
    });
    return playwright.launch({ args: chromium.args, executablePath: await executable, headless: true });
  }
  return playwright.launch({ headless: true });
}

/** Some sites turn away "HeadlessChrome": the same browser, named like a desktop one. */
export function desktopUserAgent(browser: Browser): string {
  const major = browser.version().split('.')[0];
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`;
}

/** The same browser, named like Chrome on a phone. */
export function phoneUserAgent(browser: Browser): string {
  const major = browser.version().split('.')[0];
  return `Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Mobile Safari/537.36`;
}

/** A browser error in words the team can act on. */
export function explainBrowserError(err: unknown, fallback: string): string {
  const text = err instanceof Error ? err.message : String(err);
  if (/ERR_NAME_NOT_RESOLVED|ENOTFOUND/.test(text)) return 'This address could not be found. Check the link.';
  if (/Timeout|ERR_TIMED_OUT/i.test(text)) return 'The website took too long to load.';
  if (/ERR_CONNECTION|ERR_SSL|ERR_CERT/.test(text)) return 'The website could not be reached.';
  return fallback;
}
