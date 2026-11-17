/**
 * Reading a client's current website (Form B, "has a website and wants a new one"): plain helpers
 * with no server code, so they are easy to test. The server side is old-site-read.ts.
 *
 * What we take from the site: the text of its pages (word for word, with the page it came from),
 * its pictures, its PDFs and the font files it serves itself. Google Fonts are only named.
 */

/** Pages, files and sizes the read is limited to. */
export const OLD_SITE_LIMITS = {
  pages: 40,
  pageChars: 12_000,
  totalChars: 220_000,
  images: 150,
  imageBytes: 10 * 1024 * 1024,
  /** Smaller files are icons, spacers and tracking pixels. */
  minImageBytes: 3 * 1024,
  pdfs: 20,
  pdfBytes: 20 * 1024 * 1024,
  fonts: 24,
  fontBytes: 2 * 1024 * 1024,
  totalBytes: 250 * 1024 * 1024,
};

export interface OldPage {
  url: string;
  title: string;
  /** The page's words, headings as "# ", list items as "- ". */
  text: string;
  /** 'legal' for the imprint and privacy pages: kept, but not content for the new pages. */
  kind: 'page' | 'legal';
  /** How the text was read: a plain download, or the browser for a page built by scripts. */
  via: 'fetch' | 'browser';
}

export interface AssetRef {
  kind: 'image' | 'pdf' | 'font';
  url: string;
  /** The page it was found on. */
  page: string;
  /** Alt text of an image, link text of a PDF, family of a font. */
  label: string;
  /** An image in the header, or one whose name or alt text says logo. */
  logo?: boolean;
  /** Fonts: weight and style, as the site declares them. */
  weight?: string;
  style?: string;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rarr: '→',
  larr: '←',
  hellip: '…',
  euro: '€',
  copy: '©',
  reg: '®',
  shy: '',
  auml: 'ä',
  ouml: 'ö',
  uuml: 'ü',
  Auml: 'Ä',
  Ouml: 'Ö',
  Uuml: 'Ü',
  szlig: 'ß',
  laquo: '«',
  raquo: '»',
  bdquo: '„',
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
  sbquo: '‚',
  middot: '·',
  bull: '•',
  ndash: '-',
  mdash: '-',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : whole;
    }
    return ENTITIES[code] ?? ENTITIES[code.toLowerCase()] ?? whole;
  });
}

const attr = (tag: string, name: string): string | null => {
  const m = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return m ? decodeEntities((m[2] ?? m[3] ?? m[4] ?? '').trim()) : null;
};

/** The page's title, from <title>, else its first heading. */
export function pageTitle(html: string): string {
  const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ?? '';
  return decodeEntities(t.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** The language the page says it is in ("de", "en"), or null. */
export function pageLanguage(html: string): string | null {
  const lang = /<html[^>]*\slang\s*=\s*["']?([a-z]{2})/i.exec(html)?.[1];
  return lang ? lang.toLowerCase() : null;
}

/**
 * The words of a page as plain text: headings start with "# " (one # per level), list items with
 * "- ", every block on its own line. Scripts, styles, forms' hidden parts and pictures are left
 * out; a line repeated right after itself (a menu shown twice for phones) is kept once.
 */
export function htmlToText(html: string): string {
  let s = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template|iframe|head|select)\b[\s\S]*?<\/\1>/gi, ' ');
  s = s.replace(/<h([1-6])\b[^>]*>/gi, (_m, n: string) => `\n${'#'.repeat(Number(n))} `);
  s = s.replace(/<li\b[^>]*>/gi, '\n- ');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/?(p|div|section|article|header|footer|nav|main|aside|ul|ol|table|tr|blockquote|figure|figcaption|form|label|button|h[1-6]|dt|dd)\b[^>]*>/gi, '\n');
  s = s.replace(/<(td|th)\b[^>]*>/gi, ' | ');
  s = s.replace(/<[^>]+>/g, ' ');
  s = decodeEntities(s);
  const lines: string[] = [];
  for (const raw of s.split('\n')) {
    const line = raw.replace(/[ \t ]+/g, ' ').trim();
    if (!line || /^[-#|]+$/.test(line)) continue;
    if (lines[lines.length - 1] === line) continue;
    lines.push(line);
  }
  return lines.join('\n');
}

/** "https://www.Example.de/a/?x=1#y" → "https://www.example.de/a": the address a page is kept under. */
export function cleanUrl(href: string, base: string): string | null {
  try {
    const u = new URL(href, base);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    u.hash = '';
    u.search = '';
    u.hostname = u.hostname.toLowerCase();
    return u.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
};

/** Addresses that are never a content page. */
const NOT_A_PAGE =
  /(\/cdn-cgi\/|\/wp-(admin|login|json|content)|\/(cart|warenkorb|checkout|kasse|account|konto|login|anmelden|register|my-account|feed|rss|search|suche|tag|tags|category|kategorie|author|autor)(\/|$)|\/page\/\d+|\.(pdf|jpe?g|png|gif|webp|svg|zip|mp4|mp3|docx?|xlsx?|pptx?|ics|xml|txt|css|js)$)/i;
/** The imprint and privacy pages: read, but kept apart from the content. */
export const LEGAL_PAGE = /(impressum|imprint|datenschutz|privacy|agb|terms|widerruf|cookie|legal|rechtliches)/i;

/** Same-site links of a page, and whether each sits in its header or menu. */
export function siteLinks(html: string, base: string): { url: string; text: string; inMenu: boolean }[] {
  const host = hostOf(base);
  const menuParts = [...html.matchAll(/<(nav|header)\b[\s\S]*?<\/\1>/gi)].map((m) => m[0]);
  const inMenu = new Set<string>();
  for (const part of menuParts) for (const m of part.matchAll(/<a\b[^>]*>/gi)) {
    const href = attr(m[0], 'href');
    const url = href ? cleanUrl(href, base) : null;
    if (url) inMenu.add(url);
  }
  const out: { url: string; text: string; inMenu: boolean }[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = attr(`<a ${m[1]}>`, 'href');
    if (!href || /^(mailto|tel|javascript):/i.test(href)) continue;
    const url = cleanUrl(href, base);
    if (!url || hostOf(url) !== host || NOT_A_PAGE.test(url) || seen.has(url)) continue;
    seen.add(url);
    out.push({ url, text: decodeEntities(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim(), inMenu: inMenu.has(url) });
  }
  return out;
}

/** The page addresses in a sitemap (or the sitemaps a sitemap index points to). */
export function sitemapLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => decodeEntities(m[1]));
}

/**
 * Which pages to read, at most `max`: the homepage, then the menu, then every other page found,
 * shortest address first. Pages in another language than the homepage's (/en/ on a German site)
 * come last, and the legal pages are always kept (they hold the company details).
 */
export function choosePages(home: string, found: { url: string; inMenu: boolean }[], homeLang: string | null, max: number = OLD_SITE_LIMITS.pages): string[] {
  const homeUrl = cleanUrl(home, home) ?? home;
  const homeHost = hostOf(homeUrl);
  const otherLang = (url: string) => {
    const first = new URL(url).pathname.split('/').filter(Boolean)[0]?.toLowerCase() ?? '';
    return /^[a-z]{2}(-[a-z]{2})?$/.test(first) && first.slice(0, 2) !== (homeLang ?? '');
  };
  const unique = new Map<string, { url: string; inMenu: boolean }>();
  for (const f of found) {
    const url = cleanUrl(f.url, homeUrl);
    if (!url || url === homeUrl || hostOf(url) !== homeHost || NOT_A_PAGE.test(url)) continue;
    const had = unique.get(url);
    unique.set(url, { url, inMenu: f.inMenu || !!had?.inMenu });
  }
  const depth = (url: string) => new URL(url).pathname.split('/').filter(Boolean).length;
  const rank = (p: { url: string; inMenu: boolean }) => (otherLang(p.url) ? 2 : 0) + (p.inMenu ? 0 : 1);
  const sorted = [...unique.values()].sort((a, b) => rank(a) - rank(b) || depth(a.url) - depth(b.url) || a.url.length - b.url.length);
  const legal = sorted.filter((p) => LEGAL_PAGE.test(p.url) && !otherLang(p.url)).slice(0, 3);
  const rest = sorted.filter((p) => !legal.includes(p));
  return [homeUrl, ...legal.map((p) => p.url), ...rest.map((p) => p.url)].slice(0, max);
}

const IMAGE_FILE = /\.(jpe?g|png|webp|gif|avif|svg)(\?|$)/i;

/** The largest picture of a srcset ("a.jpg 400w, b.jpg 1200w" → "b.jpg"). */
export function largestFromSrcset(srcset: string): string | null {
  let best: { url: string; size: number } | null = null;
  for (const part of srcset.split(/,\s+(?=\S)/)) {
    const [url, size] = part.trim().split(/\s+/);
    if (!url) continue;
    const n = size ? parseFloat(size) : 1;
    if (!best || n > best.size) best = { url, size: Number.isFinite(n) ? n : 1 };
  }
  return best?.url ?? null;
}

/** The pictures, PDFs, style sheets and Google Fonts a page uses. */
export function pageAssets(html: string, base: string): { assets: AssetRef[]; stylesheets: string[]; googleFonts: string[]; inlineCss: string } {
  const assets: AssetRef[] = [];
  const seen = new Set<string>();
  const push = (a: AssetRef) => {
    if (seen.has(a.url)) {
      // Found again in the header: it is the logo.
      if (a.logo) {
        const had = assets.find((x) => x.url === a.url);
        if (had) had.logo = true;
      }
      return;
    }
    seen.add(a.url);
    assets.push(a);
  };
  const resolve = (href: string | null) => {
    if (!href || href.startsWith('data:')) return null;
    try {
      const u = new URL(href, base);
      return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
    } catch {
      return null;
    }
  };
  const header = [...html.matchAll(/<header\b[\s\S]*?<\/header>/gi)].map((m) => m[0]).join(' ');
  const inHeader = (tag: string) => header.includes(tag);

  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const srcset = attr(tag, 'srcset') ?? attr(tag, 'data-srcset');
    const src = (srcset && largestFromSrcset(srcset)) || attr(tag, 'data-src') || attr(tag, 'data-lazy-src') || attr(tag, 'src');
    const url = resolve(src);
    if (!url) continue;
    const alt = attr(tag, 'alt') ?? '';
    const logo = inHeader(tag) || /logo/i.test(`${alt} ${attr(tag, 'class') ?? ''} ${url}`);
    push({ kind: 'image', url, page: base, label: alt, ...(logo ? { logo: true } : {}) });
  }
  for (const m of html.matchAll(/<source\b[^>]*>/gi)) {
    const srcset = attr(m[0], 'srcset') ?? attr(m[0], 'data-srcset');
    const url = resolve(srcset ? largestFromSrcset(srcset) : null);
    if (url && IMAGE_FILE.test(url)) push({ kind: 'image', url, page: base, label: '' });
  }
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (!/property\s*=\s*["']og:image["']/i.test(m[0])) continue;
    const url = resolve(attr(m[0], 'content'));
    if (url) push({ kind: 'image', url, page: base, label: 'og:image' });
  }
  for (const m of html.matchAll(/background(?:-image)?\s*:[^;"']*url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    const url = resolve(decodeEntities(m[1]));
    if (url && IMAGE_FILE.test(url)) push({ kind: 'image', url, page: base, label: '' });
  }
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = attr(`<a ${m[1]}>`, 'href');
    const url = resolve(href);
    if (url && /\.pdf(\?|$)/i.test(url)) {
      push({ kind: 'pdf', url, page: base, label: decodeEntities(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim() });
    }
  }
  const stylesheets: string[] = [];
  const googleFonts: string[] = [];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const href = resolve(attr(m[0], 'href'));
    if (!href || !/stylesheet/i.test(attr(m[0], 'rel') ?? '')) continue;
    if (/fonts\.googleapis\.com/i.test(href)) googleFonts.push(...googleFontFamilies(href));
    else stylesheets.push(href);
  }
  const inlineCss = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
  for (const m of inlineCss.matchAll(/@import\s+url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    if (/fonts\.googleapis\.com/i.test(m[1])) googleFonts.push(...googleFontFamilies(m[1]));
  }
  return { assets, stylesheets, googleFonts: [...new Set(googleFonts)], inlineCss };
}

/** "https://fonts.googleapis.com/css2?family=Lora:wght@400;700&family=Inter" → ["Lora", "Inter"]. */
export function googleFontFamilies(href: string): string[] {
  try {
    const u = new URL(href.replace(/&amp;/g, '&'));
    return u.searchParams
      .getAll('family')
      .flatMap((f) => f.split('|'))
      .map((f) => f.split(':')[0].replace(/\+/g, ' ').trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** The font files a style sheet declares with @font-face, the best format of each. */
export function fontFaces(css: string, base: string): AssetRef[] {
  const out: AssetRef[] = [];
  for (const m of css.matchAll(/@font-face\s*\{([^}]*)\}/gi)) {
    const block = m[1];
    const family = /font-family\s*:\s*["']?([^;"']+)["']?/i.exec(block)?.[1]?.trim() ?? '';
    const weight = /font-weight\s*:\s*([^;]+)/i.exec(block)?.[1]?.trim() ?? '400';
    const style = /font-style\s*:\s*([^;]+)/i.exec(block)?.[1]?.trim() ?? 'normal';
    const urls = [...block.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)].map((u) => u[1]).filter((u) => !u.startsWith('data:'));
    const order = ['woff2', 'woff', 'ttf', 'otf'];
    const pick = urls.sort((a, b) => {
      const rank = (u: string) => {
        const i = order.findIndex((ext) => new RegExp(`\\.${ext}(\\?|#|$)`, 'i').test(u));
        return i < 0 ? 9 : i;
      };
      return rank(a) - rank(b);
    })[0];
    if (!family || !pick) continue;
    try {
      const url = new URL(pick, base).toString();
      if (/fonts\.gstatic\.com/i.test(url)) continue;
      out.push({ kind: 'font', url, page: base, label: family, weight, style });
    } catch {
      /* not an address */
    }
  }
  return out;
}

/* ------------------------------------------------------------------ evidence */

/** Lower case, one space, typographic quotes and dashes made plain: for comparing texts. */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[„“”‚‘’«»"']/g, '')
    .replace(/[‐-―−]/g, '-')
    .replace(/­/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const words = (text: string) => normalise(text).replace(/[^\p{L}\p{N}\s.,€$%:/-]/gu, ' ').split(/\s+/).filter(Boolean);

/**
 * Whether a fact the model took from the site is really there. The evidence is the sentence the
 * model quoted from the page:
 * - a price or other number: every number in the fact must appear in the evidence, and the
 *   evidence must be on the page (format-tolerant: "120 €", "120,00 EUR" and "€120" all hold 120);
 * - a quote: the evidence must be on the page nearly word for word (90 % of its words, in order);
 * - a description: the evidence sentence must be on the page nearly word for word.
 */
export function hasEvidence(fact: { kind: 'text' | 'price' | 'quote'; text: string; evidence: string }, pageText: string): boolean {
  const evidence = fact.evidence.trim();
  if (evidence.length < 3) return false;
  const page = normalise(pageText);
  const onPage = page.includes(normalise(evidence)) || nearlyContains(words(pageText), words(evidence), 0.9);
  if (!onPage) return false;
  if (fact.kind === 'price') {
    const nums = (t: string) => (t.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => parseFloat(n.replace(/\.(?=\d{3}\b)/, '').replace(',', '.')));
    const inEvidence = nums(evidence);
    return nums(fact.text).every((n) => inEvidence.some((m) => Math.abs(m - n) < 0.005));
  }
  return true;
}

/** Whether `needle`'s words appear in `hay` in order, allowing a few to differ. */
function nearlyContains(hay: string[], needle: string[], share: number): boolean {
  if (!needle.length) return false;
  const need = Math.ceil(needle.length * share);
  const first = new Set(needle.slice(0, Math.max(1, needle.length - need + 1)));
  for (let i = 0; i < hay.length; i++) {
    if (!first.has(hay[i])) continue;
    let matched = 0;
    let j = i;
    for (const w of needle) {
      // Look a little ahead for each word, so an inserted or changed word does not end the match.
      const at = hay.slice(j, j + 4).indexOf(w);
      if (at >= 0) {
        matched++;
        j += at + 1;
      }
    }
    if (matched >= need) return true;
  }
  return false;
}

/** A safe storage name for a downloaded file: "<sha>-<name>.<ext>". */
export function assetFileName(url: string, sha: string, fallbackExt: string): string {
  let name = 'file';
  try {
    name = decodeURIComponent(new URL(url).pathname.split('/').pop() ?? 'file');
  } catch {
    /* keep the fallback */
  }
  const ext = (/\.([a-z0-9]{2,5})$/i.exec(name)?.[1] ?? fallbackExt).toLowerCase();
  const stem = name
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .normalize('NFKD')
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'file';
  return `${sha.slice(0, 12)}-${stem}.${ext}`;
}
