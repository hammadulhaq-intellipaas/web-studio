/**
 * Takes the pictures for the onboarding form's gallery of example websites: for each of our
 * reference sites the whole homepage at laptop and phone width, and two inner pages at laptop
 * width. Run with plain Node (type stripping) from the repository root:
 *
 *   node scripts/capture-gallery.mts             every site
 *   node scripts/capture-gallery.mts graza rivian only these
 *
 * Writes WebP files to public/onboarding/gallery/<slug>/ and the list the gallery reads to
 * src/lib/onboarding/gallery-shots.json. Check every picture by eye afterwards: a site can
 * change, block us or open a popup the rules here do not catch.
 *
 * Each picture is stitched from screenshots taken while scrolling down the page, so sections
 * that only appear on scroll, and scroll-driven effects, look as a visitor sees them. Fixed
 * headers and bars are hidden after the first screen so they do not repeat down the picture.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices, type Page } from 'playwright';
import sharp from 'sharp';
import { REFERENCE_SITES } from '../supabase/seed/onboarding/fields.ts';
import { HIDE_BANNERS } from '../src/lib/hide-banners.ts';
import { PAGE_LINKS, SCROLL_THROUGH } from '../src/lib/developer/site-measure.ts';
import { pickPages } from '../src/lib/developer/reference-sources.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'onboarding', 'gallery');
const MANIFEST = join(ROOT, 'src', 'lib', 'onboarding', 'gallery-shots.json');

/** Picture sizes: wide enough to read on a laptop, small enough to load quickly. */
const LAPTOP = { width: 1280, height: 800, out: 1024, maxCss: 10000 };
const PHONE = { out: 585, maxCss: 10000 };
const INNER_MAX_CSS = 6000;
const QUALITY = 62;

/**
 * Inner pages chosen by hand where the automatic choice picks a language switch, a chat or a
 * page behind a bot check. Matched against the site's own menu links by their text.
 */
const INNER_PAGES: Record<string, RegExp[]> = {
  lanserhof: [/^concept$/i, /^lans$/i],
  'neko-health': [/^health scan$/i, /^about us$/i],
  '25hours-hotels': [/^about us$/i, /^dis-loyalty$/i],
  rivian: [/^r2$/i, /^our company$/i],
  graza: [/^about/i, /^shop/i],
};

/**
 * Homepages that are one long scroll animation: a still picture of the whole page is mostly
 * empty, so only the first screen is kept and the gallery points to the real website for the rest.
 */
const FIRST_SCREEN_ONLY = new Set(['rivian']);

/** Menu links that are not pages of their own: language switches and the like. */
const NOT_A_PAGE = /^(de|en|fr|sv|es|it|nl|da|deutsch|english|svenska|swedish|français|french|español|italiano|nederlands|dansk|danish|start your journey|gift vouchers?|cart|basket|search)$/i;

interface Shot {
  src: string;
  width: number;
  height: number;
  /** The page went on below the picture. */
  cut: boolean;
}
interface GalleryPage {
  /** null for the homepage; otherwise the menu text of the page. */
  name: string | null;
  url: string;
  laptop: Shot;
  phone: Shot | null;
}

const ACCEPT = /^(accept|accept all|accept all cookies|accept cookies|allow all|allow all cookies|agree|i agree|alle akzeptieren|akzeptieren|alle cookies akzeptieren|zustimmen|okay|ok|got it)$/i;

/** Accepts a cookie banner and closes a pop-up, where there is one. Only in our browser. */
async function dismiss(page: Page) {
  try {
    const accept = page.getByRole('button', { name: ACCEPT }).first();
    if (await accept.isVisible()) await accept.click({ timeout: 3000 });
  } catch {
    // no banner
  }
  try {
    const close = page
      .locator(
        '[role="dialog"] button[aria-label*="close" i], [aria-modal="true"] button[aria-label*="close" i], [class*="popup" i] [class*="close" i], [class*="modal" i] button[class*="close" i], button[aria-label="Close dialog"]',
      )
      .first();
    if (await close.isVisible()) await close.click({ timeout: 3000 });
  } catch {
    // no pop-up
  }
  await page.keyboard.press('Escape').catch(() => undefined);
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);
  await page.addStyleTag({ content: HIDE_BANNERS }).catch(() => undefined);
  await dismiss(page);
  await page.evaluate(SCROLL_THROUGH).catch(() => undefined);
  await page.waitForTimeout(1500);
  // Pop-ups that open after a few seconds or on scroll.
  await dismiss(page);
}

/** Hides fixed and sticky bars (headers, chat buttons) so they do not repeat down the picture. */
const HIDE_FIXED = String.raw`(() => {
  const vh = window.innerHeight;
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el);
    if (s.position !== 'fixed' && s.position !== 'sticky') continue;
    if (el.getBoundingClientRect().height > vh * 0.6) continue;
    el.style.setProperty('visibility', 'hidden', 'important');
  }
})()`;

/**
 * The page from the top down to `maxCss` page pixels, stitched from one screenshot per screen
 * while scrolling, scaled to `outWidth` and saved as WebP.
 */
async function save(page: Page, file: string, outWidth: number, maxCss: number): Promise<Shot> {
  const { width: vw, height: vh } = page.viewportSize()!;
  const dpr = (await page.evaluate('window.devicePixelRatio')) as number;
  const full = (await page.evaluate('Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0)')) as number;
  const total = Math.min(full, maxCss);
  const height = Math.round(total * dpr);
  const frames: { input: Buffer; top: number; left: number }[] = [];
  let y = 0;
  for (let i = 0; i < 40; i++) {
    await page.evaluate(`window.scrollTo(0, ${y})`);
    await page.waitForTimeout(700);
    const at = (await page.evaluate('window.scrollY')) as number;
    if (i === 1) await page.evaluate(HIDE_FIXED).catch(() => undefined);
    const top = Math.round(at * dpr);
    if (top >= height) break;
    let shot = await page.screenshot({ type: 'png', timeout: 60000 });
    const meta = await sharp(shot).metadata();
    if (top + meta.height! > height) shot = await sharp(shot).extract({ left: 0, top: 0, width: meta.width!, height: height - top }).png().toBuffer();
    frames.push({ input: shot, top, left: 0 });
    if (at + vh >= total || at + vh >= full - 1) break;
    y = at + vh;
  }
  const stitched = await sharp({ create: { width: Math.round(vw * dpr), height, channels: 3, background: '#ffffff' } })
    .composite(frames)
    .png()
    .toBuffer();
  const buffer = await sharp(stitched, { limitInputPixels: false }).resize({ width: outWidth }).webp({ quality: QUALITY }).toBuffer();
  writeFileSync(file, buffer);
  const out = await sharp(buffer).metadata();
  await page.evaluate('window.scrollTo(0, 0)');
  return {
    src: '/' + file.slice(join(ROOT, 'public').length + 1).replace(/\\/g, '/'),
    width: out.width!,
    height: out.height!,
    cut: full > total,
  };
}

/** "SERVICES" → "Services"; other names stay as the site writes them. */
const nameOf = (text: string) => (text === text.toUpperCase() ? text.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()) : text);

async function main() {
  const only = process.argv.slice(2);
  const sites = REFERENCE_SITES.filter((s) => !only.length || only.includes(s.value));
  let manifest: Record<string, GalleryPage[]> = {};
  try {
    manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')).sites ?? {};
  } catch {
    // First run.
  }

  const browser = await chromium.launch();
  for (const site of sites) {
    const dir = join(OUT, site.value);
    mkdirSync(dir, { recursive: true });
    const pages: GalleryPage[] = [];
    try {
      const laptop = await browser.newContext({ viewport: { width: LAPTOP.width, height: LAPTOP.height }, locale: 'en-GB' });
      const page = await laptop.newPage();
      await page.goto(site.url!, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await settle(page);
      const links = (await page.evaluate(PAGE_LINKS)) as { nav: { href: string; text: string }[]; footer: { href: string; text: string }[] };
      const all = [...links.nav, ...links.footer].filter((l) => l.text && !NOT_A_PAGE.test(l.text.trim()));
      const chosen = (INNER_PAGES[site.value] ?? [])
        .map((re) => all.find((l) => re.test(l.text.trim())))
        .filter((l): l is { href: string; text: string } => !!l)
        .map((l) => ({ url: l.href, text: l.text.trim() }));
      // Too few of the hand-picked pages found: the automatic choice fills up.
      const inner = [...chosen, ...pickPages(site.url!, all, 3).filter((p) => !chosen.some((c) => c.url === p.url))].slice(0, 2);
      const homeMax = FIRST_SCREEN_ONLY.has(site.value) ? LAPTOP.height : LAPTOP.maxCss;
      const home: GalleryPage = { name: null, url: page.url(), laptop: await save(page, join(dir, 'home-laptop.webp'), LAPTOP.out, homeMax), phone: null };
      pages.push(home);
      for (const [i, link] of inner.slice(0, 2).entries()) {
        try {
          await page.goto(link.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
          await settle(page);
          const name = nameOf(link.text || new URL(link.url).pathname.split('/').filter(Boolean).pop() || 'Page');
          pages.push({ name, url: page.url(), laptop: await save(page, join(dir, `page-${i + 1}-laptop.webp`), LAPTOP.out, INNER_MAX_CSS), phone: null });
        } catch (err) {
          console.log(`  ${site.value}: inner page ${link.url} failed: ${(err as Error).message.split('\n')[0]}`);
        }
      }
      await laptop.close();

      const phone = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-GB' });
      const p = await phone.newPage();
      await p.goto(site.url!, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await settle(p);
      const phoneHeight = (await p.evaluate('document.documentElement.scrollHeight')) as number;
      // A page that scrolls inside its own box shows only one screen here: better no phone
      // picture (the gallery then greys out "Phone") than one that looks broken.
      home.phone = phoneHeight > p.viewportSize()!.height * 1.5 ? await save(p, join(dir, 'home-phone.webp'), PHONE.out, PHONE.maxCss) : null;
      await phone.close();

      manifest[site.value] = pages;
      console.log(`${site.value}: ${pages.map((pg) => `${pg.name ?? 'home'} ${pg.laptop.height}px`).join(', ')}; phone ${home.phone ? `${home.phone.height}px` : 'none'}`);
    } catch (err) {
      console.log(`${site.value}: FAILED ${(err as Error).message.split('\n')[0]}`);
    }
  }
  await browser.close();

  const ordered = Object.fromEntries(REFERENCE_SITES.filter((s) => manifest[s.value]).map((s) => [s.value, manifest[s.value]]));
  writeFileSync(MANIFEST, JSON.stringify({ captured_at: new Date().toISOString().slice(0, 10), sites: ordered }, null, 2) + '\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
