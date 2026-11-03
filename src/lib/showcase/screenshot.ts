import 'server-only';
import type { Browser } from 'playwright-core';
import { desktopUserAgent, explainBrowserError, HIDE_BANNERS, launchBrowser } from '@/lib/browser';
import { siteNameFrom } from './shared';

/** The size the card's 16:10 frame is made for. */
const VIEWPORT = { width: 1440, height: 900 };

export class ScreenshotError extends Error {}

/** Opens the homepage like a visitor on a laptop and returns a picture of the top of it. */
export async function captureHomepage(url: string): Promise<{ image: Buffer; siteName: string }> {
  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      locale: 'de-DE',
      userAgent: desktopUserAgent(browser),
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
    throw err instanceof ScreenshotError ? err : new ScreenshotError(explainBrowserError(err, 'The website could not be opened for a screenshot.'));
  } finally {
    await browser?.close().catch(() => undefined);
  }
}
