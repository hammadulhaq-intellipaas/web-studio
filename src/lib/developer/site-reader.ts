import 'server-only';
import type { Browser, Page } from 'playwright-core';
import { desktopUserAgent, explainBrowserError, HIDE_BANNERS, launchBrowser, phoneUserAgent } from '@/lib/browser';
import { pickPages, type PageMeasure, type SiteReading } from './reference-sources';
import { MEASURE_PAGE, PAGE_LINKS, SCROLL_THROUGH } from './site-measure';

/**
 * Reads a client's reference website the way the crawler read our 11 library sites, only
 * smaller, so it fits into one click on the Design tab: the homepage and up to 3 pages from its
 * menu at 1280 px, the homepage again at 390 px, and a few pictures for the model to look at.
 */

export class SiteReadError extends Error {}

const LAPTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };
const MORE_PAGES = 3;
/** After this no further pages are opened: the spec and the design prompts still need their time. */
const BUDGET_MS = 100_000;
const MAX_PICTURES = 5;

type Links = { nav: { href: string; text: string }[]; footer: { href: string; text: string }[] };

async function open(page: Page, url: string): Promise<void> {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25_000 });
  if (response && response.status() >= 400) throw new SiteReadError(`The website answered with error ${response.status()}.`);
  await page.waitForLoadState('load', { timeout: 10_000 }).catch(() => undefined);
  await page.addStyleTag({ content: HIDE_BANNERS }).catch(() => undefined);
  await page.evaluate('document.fonts ? document.fonts.ready.then(() => true) : true').catch(() => undefined);
  // Let entrance animations and the first lazy images finish.
  await page.waitForTimeout(1200);
}

async function measure(page: Page): Promise<PageMeasure> {
  await page.evaluate(SCROLL_THROUGH).catch(() => undefined);
  return (await page.evaluate(MEASURE_PAGE)) as PageMeasure;
}

const picture = async (page: Page) => page.screenshot({ type: 'jpeg', quality: 70 });
const pathOf = (url: string) => {
  try {
    return new URL(url).pathname || '/';
  } catch {
    return url;
  }
};

/** Opens the site and measures it. Throws SiteReadError with a reason the team can act on. */
export async function readSite(url: string): Promise<SiteReading> {
  const started = Date.now();
  let browser: Browser | null = null;
  const skipped: string[] = [];
  const pictures: SiteReading['pictures'] = [];
  try {
    browser = await launchBrowser();
    const laptop = await browser.newContext({ viewport: LAPTOP, deviceScaleFactor: 1, locale: 'de-DE', userAgent: desktopUserAgent(browser) });
    const page = await laptop.newPage();
    await open(page, url);
    const home = page.url();
    pictures.push({ label: 'the homepage at 1280 px, top of the page', image: await picture(page), mediaType: 'image/jpeg' });
    const links = (await page.evaluate(PAGE_LINKS)) as Links;
    const pages = [await measure(page)];
    // A second look further down the homepage, where the sections after the hero are.
    if (pages[0].height_px > LAPTOP.height * 2) {
      await page.evaluate(`window.scrollTo(0, ${Math.round(pages[0].height_px * 0.35)})`).catch(() => undefined);
      await page.waitForTimeout(500);
      pictures.push({ label: 'the homepage at 1280 px, about a third of the way down', image: await picture(page), mediaType: 'image/jpeg' });
    }

    for (const next of pickPages(home, [...links.nav, ...links.footer], MORE_PAGES)) {
      if (Date.now() - started > BUDGET_MS) {
        skipped.push(`${pathOf(next.url)} (no time left)`);
        continue;
      }
      try {
        await open(page, next.url);
        if (pictures.length < MAX_PICTURES - 1) {
          pictures.push({ label: `the page ${pathOf(page.url())} at 1280 px, top of the page`, image: await picture(page), mediaType: 'image/jpeg' });
        }
        pages.push(await measure(page));
      } catch (err) {
        skipped.push(`${pathOf(next.url)} (${err instanceof SiteReadError ? err.message : explainBrowserError(err, 'could not be opened')})`);
      }
    }
    await laptop.close().catch(() => undefined);

    let phone: PageMeasure | null = null;
    try {
      const mobile = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'de-DE', userAgent: phoneUserAgent(browser) });
      const p = await mobile.newPage();
      await open(p, home);
      pictures.push({ label: 'the homepage at 390 px (phone), top of the page', image: await picture(p), mediaType: 'image/jpeg' });
      phone = await measure(p);
    } catch (err) {
      skipped.push(`the homepage at 390 px (${explainBrowserError(err, 'could not be opened')})`);
    }

    return {
      url: home,
      title: String(pages[0].title ?? ''),
      readAt: new Date().toISOString(),
      pages,
      phone,
      navLinks: links.nav.map((l) => l.text).filter(Boolean),
      footerLinks: links.footer.map((l) => l.text).filter(Boolean),
      pictures,
      skipped,
    };
  } catch (err) {
    throw err instanceof SiteReadError ? err : new SiteReadError(explainBrowserError(err, 'The website could not be opened.'));
  } finally {
    await browser?.close().catch(() => undefined);
  }
}
