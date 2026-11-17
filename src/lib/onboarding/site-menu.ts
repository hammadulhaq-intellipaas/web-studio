import { normalizeSiteUrl } from '@/lib/showcase/shared';

/**
 * The pages in a website's menu, for Form B's "which of your current pages should stay?":
 * the homepage's HTML is downloaded once and the links in its header and navigation are read.
 * No AI and no browser, so it costs nothing and takes about a second. A site that builds its
 * menu only with JavaScript yields nothing; the client then adds their pages by hand.
 */

export interface MenuPage {
  /** The link text as the menu shows it: "Über uns". */
  name: string;
  /** The page's path on the site: "/ueber-uns". */
  path: string;
}

const MAX_PAGES = 30;
const MAX_HTML_BYTES = 2_000_000;
/** Pages every site gets anyway, or that are not pages: never offered for keeping or dropping. */
const SKIP_PATH = /(impressum|imprint|datenschutz|privacy|cookie|agb|terms|legal|disclaimer|widerruf|login|anmelden|warenkorb|cart|checkout|account|konto|wp-admin|feed)(\/|$|\.|-)/i;
const SKIP_FILE = /\.(pdf|jpe?g|png|gif|webp|svg|zip|docx?|xlsx?|mp4|mp3)$/i;
const LANGUAGE_PATH = /^\/(de|en|fr|it|es|nl)(\/)?$/i;
const LANGUAGE_NAME = /^(de|en|deutsch|english|fr|it|es|nl)$/i;

const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z])uml;/gi, (_m, c: string) => ({ a: 'ä', o: 'ö', u: 'ü', A: 'Ä', O: 'Ö', U: 'Ü' })[c as 'a'] ?? c)
    .replace(/&szlig;/g, 'ß');

const textOf = (html: string) => decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const attr = (tag: string, name: string) => {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? decode(m[2] ?? m[3] ?? m[4] ?? '') : null;
};

/** The parts of the page a menu lives in: its header and nav elements, or the whole page without them. */
function menuParts(html: string): string[] {
  const clean = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, '');
  const parts = [...clean.matchAll(/<(header|nav)\b[\s\S]*?<\/\1>/gi)].map((m) => m[0]);
  return parts.length ? parts : [clean];
}

export function menuFromHtml(html: string, pageUrl: string): MenuPage[] {
  let base: URL;
  try {
    base = new URL(pageUrl);
  } catch {
    return [];
  }
  const host = base.hostname.replace(/^www\./, '');
  const seen = new Set<string>();
  const pages: MenuPage[] = [];
  for (const part of menuParts(html)) {
    for (const m of part.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
      const href = attr(m[1], 'href');
      if (!href || /^(#|mailto:|tel:|javascript:|whatsapp:)/i.test(href)) continue;
      let url: URL;
      try {
        url = new URL(href, base);
      } catch {
        continue;
      }
      if (url.hostname.replace(/^www\./, '') !== host) continue;
      const path = decodeURIComponent(url.pathname).replace(/\/+$/, '') || '/';
      if (path === '/' || SKIP_PATH.test(path) || SKIP_FILE.test(path) || LANGUAGE_PATH.test(path)) continue;
      const name = (textOf(m[2]) || attr(m[1], 'title') || attr(m[1], 'aria-label') || '').slice(0, 80);
      if (!name || LANGUAGE_NAME.test(name) || /^folder:/i.test(name)) continue;
      const key = path.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      pages.push({ name, path });
      if (pages.length >= MAX_PAGES) return pages;
    }
  }
  return pages;
}

/** Downloads the homepage and reads its menu; an empty list when the site cannot be read. */
export async function fetchSiteMenu(raw: string): Promise<MenuPage[]> {
  const url = normalizeSiteUrl(raw);
  if (!url) return [];
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        Accept: 'text/html',
      },
    });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('html')) return [];
    const html = (await res.text()).slice(0, MAX_HTML_BYTES);
    return menuFromHtml(html, res.url || url);
  } catch {
    return [];
  }
}
