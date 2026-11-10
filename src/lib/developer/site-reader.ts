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
/**
 * Time limits. On Vercel a request ends after 300 s, and the spec still has to be written after
 * the read, so the read stops opening pages after BUDGET_MS and is cut off at HARD_LIMIT_MS
 * whatever happens. Every step inside a page has its own limit too: a page that never finishes
 * scrolling or measuring must not take the whole read with it.
 */
const BUDGET_MS = 60_000;
const HARD_LIMIT_MS = 110_000;
const STEP_MS = 25_000;
const MAX_PICTURES = 5;

type Links = { nav: { href: string; text: string }[]; footer: { href: string; text: string }[] };

/** A step of the read, stopped with a clear reason when it takes too long. */
function within<T>(run: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new SiteReadError(`${what} took too long.`)), ms);
  });
  return Promise.race([run, late]).finally(() => clearTimeout(timer));
}

async function open(page: Page, url: string): Promise<void> {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25_000 });
  if (response && response.status() >= 400) throw new SiteReadError(`The website answered with error ${response.status()}.`);
  await page.waitForLoadState('load', { timeout: 10_000 }).catch(() => undefined);
  await page.addStyleTag({ content: HIDE_BANNERS }).catch(() => undefined);
  await within(page.evaluate('document.fonts ? document.fonts.ready.then(() => true) : true'), 5_000, 'Loading the fonts').catch(() => undefined);
  // Let entrance animations and the first lazy images finish.
  await page.waitForTimeout(1200);
}

async function measure(page: Page): Promise<PageMeasure> {
  await within(page.evaluate(SCROLL_THROUGH), STEP_MS, 'Scrolling through the page').catch(() => undefined);
  return (await within(page.evaluate(MEASURE_PAGE), STEP_MS, 'Measuring the page')) as PageMeasure;
}

const picture = async (page: Page) => page.screenshot({ type: 'jpeg', quality: 70, timeout: 20_000 });
const pathOf = (url: string) => {
  try {
    return new URL(url).pathname || '/';
  } catch {
    return url;
  }
};

/**
 * Opens the site and measures it, within HARD_LIMIT_MS. Throws SiteReadError with a reason the
 * team can act on.
 */
export async function readSite(url: string): Promise<SiteReading> {
  let browser: Browser | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  // How long each step took, for the log: on a slow read it shows where the time went.
  const started = Date.now();
  const trail: string[] = [];
  const mark = (what: string) => trail.push(`${what} ${Math.round((Date.now() - started) / 1000)}s`);
  const stop = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      // Closing the browser ends every step still waiting on it.
      void browser?.close().catch(() => undefined);
      reject(new SiteReadError('The website took too long to read.'));
    }, HARD_LIMIT_MS);
  });
  try {
    const reading = await Promise.race([read(url, (b) => (browser = b), mark), stop]);
    console.info(`[developer/read] ${url}: ${trail.join(', ')}`);
    return reading;
  } catch (err) {
    console.warn(`[developer/read] ${url} stopped (${err instanceof Error ? err.message : String(err)}): ${trail.join(', ')}`);
    throw err;
  } finally {
    clearTimeout(timer);
    await (browser as Browser | null)?.close().catch(() => undefined);
  }
}

async function read(url: string, opened: (browser: Browser) => void, mark: (what: string) => void): Promise<SiteReading> {
  const started = Date.now();
  let browser: Browser | null = null;
  const skipped: string[] = [];
  const pictures: SiteReading['pictures'] = [];
  try {
    browser = await launchBrowser();
    opened(browser);
    mark('browser');
    const laptop = await browser.newContext({ viewport: LAPTOP, deviceScaleFactor: 1, locale: 'de-DE', userAgent: desktopUserAgent(browser) });
    const page = await laptop.newPage();
    await open(page, url);
    mark('home open');
    const home = page.url();
    pictures.push({ label: 'the homepage at 1280 px, top of the page', image: await picture(page), mediaType: 'image/jpeg' });
    mark('picture');
    const links = (await within(page.evaluate(PAGE_LINKS), STEP_MS, 'Reading the menu')) as Links;
    const pages = [await measure(page)];
    mark('home measured');
    // A second look further down the homepage, where the sections after the hero are.
    if (pages[0].height_px > LAPTOP.height * 2) {
      await page.evaluate(`window.scrollTo(0, ${Math.round(pages[0].height_px * 0.35)})`).catch(() => undefined);
      await page.waitForTimeout(500);
      pictures.push({ label: 'the homepage at 1280 px, about a third of the way down', image: await picture(page), mediaType: 'image/jpeg' });
      mark('picture');
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
        mark(pathOf(next.url));
      } catch (err) {
        skipped.push(`${pathOf(next.url)} (${err instanceof SiteReadError ? err.message : explainBrowserError(err, 'could not be opened')})`);
        mark(`${pathOf(next.url)} failed`);
      }
    }
    await laptop.close().catch(() => undefined);

    let phone: PageMeasure | null = null;
    if (Date.now() - started > BUDGET_MS + 20_000) {
      skipped.push('the homepage at 390 px (no time left)');
    } else {
      try {
        const mobile = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'de-DE', userAgent: phoneUserAgent(browser) });
        const p = await mobile.newPage();
        await open(p, home);
        pictures.push({ label: 'the homepage at 390 px (phone), top of the page', image: await picture(p), mediaType: 'image/jpeg' });
        phone = await measure(p);
        mark('phone');
      } catch (err) {
        skipped.push(`the homepage at 390 px (${err instanceof SiteReadError ? err.message : explainBrowserError(err, 'could not be opened')})`);
        mark('phone failed');
      }
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
