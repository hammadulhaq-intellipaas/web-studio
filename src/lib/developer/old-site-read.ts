import 'server-only';
import { createHash } from 'node:crypto';
import { normalizeSiteUrl } from '@/lib/showcase/shared';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  assetFileName,
  choosePages,
  fontFaces,
  htmlToText,
  LEGAL_PAGE,
  OLD_SITE_LIMITS,
  pageAssets,
  pageLanguage,
  pageTitle,
  siteLinks,
  sitemapLocs,
  type AssetRef,
  type OldPage,
} from './old-site';

/**
 * Reads a Form B client's current website when they confirm the onboarding form, in steps that
 * each fit into one request (see auto.ts): the pages, then the files. The content sorting, the
 * photo descriptions and the spec follow in old-site-content.ts. Everything is kept in
 * developer_site_reads (one row per client) and the client-assets bucket.
 */

export const SITE_BUCKET = 'client-assets';
const TABLE = 'developer_site_reads';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36';
const db = () => createSupabaseAdminClient();

export interface StoredAsset {
  kind: AssetRef['kind'];
  url: string;
  /** Path in the client-assets bucket. */
  path: string;
  bytes: number;
  type: string;
  sha: string;
  label: string;
  page: string;
  logo?: boolean;
  weight?: string;
  style?: string;
}

export interface SiteFound {
  lang: string | null;
  menu: { url: string; text: string }[];
  assets: AssetRef[];
  googleFonts: string[];
}

export interface SiteRead {
  lead_id: string;
  url: string;
  status: 'reading' | 'ready' | 'failed';
  step: string | null;
  pages: OldPage[];
  found: SiteFound;
  assets: StoredAsset[];
  content: unknown;
  photos: unknown;
  spec: string | null;
  notes: string[];
  error: string | null;
  started_at: string;
  updated_at: string;
}

/** Whether the table exists (migration 20261118000034). */
export async function siteReadsReady(): Promise<boolean> {
  const { error } = await db().from(TABLE).select('lead_id').limit(1);
  return !(error?.code === 'PGRST205' || error?.code === '42P01');
}

export async function loadSiteRead(leadId: string): Promise<SiteRead | null> {
  const { data, error } = await db().from(TABLE).select('*').eq('lead_id', leadId).maybeSingle();
  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') return null;
    throw new Error(`Loading the site read failed: ${error.message}`);
  }
  return (data as SiteRead | null) ?? null;
}

export async function saveSiteRead(leadId: string, patch: Partial<SiteRead>): Promise<void> {
  const { error } = await db()
    .from(TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('lead_id', leadId);
  if (error) throw new Error(`Saving the site read failed: ${error.message}`);
}

/** Public web addresses only, for everything the read downloads (no IPs, no internal names). */
const publicUrl = (url: string) => normalizeSiteUrl(url) === new URL(url).toString();

async function fetchWithin(url: string, ms: number, maxBytes: number): Promise<{ status: number; url: string; type: string; body: Buffer } | null> {
  if (!publicUrl(url)) return null;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' }, redirect: 'follow', signal: AbortSignal.timeout(ms) });
    if (!res.ok || !res.body) return { status: res.status, url: res.url, type: '', body: Buffer.alloc(0) };
    const declared = Number(res.headers.get('content-length') ?? 0);
    if (declared > maxBytes) {
      await res.body.cancel().catch(() => undefined);
      return null;
    }
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      total += chunk.length;
      if (total > maxBytes) return null;
      chunks.push(Buffer.from(chunk));
    }
    return { status: res.status, url: res.url, type: (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase(), body: Buffer.concat(chunks) };
  } catch {
    return null;
  }
}

/** Runs `work` over `items`, `n` at a time, until done or the deadline. */
async function pool<T>(items: T[], n: number, deadline: number, work: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const lane = async () => {
    while (next < items.length && Date.now() < deadline) {
      const item = items[next++];
      await work(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, lane));
}

/** Starts (or restarts) the read of a client's website: one fresh row. */
export async function beginSiteRead(leadId: string, rawUrl: string): Promise<string | null> {
  const url = normalizeSiteUrl(rawUrl);
  if (!url) return null;
  const { error } = await db()
    .from(TABLE)
    .upsert(
      {
        lead_id: leadId,
        url,
        status: 'reading',
        step: 'pages',
        pages: [],
        found: { lang: null, menu: [], assets: [], googleFonts: [] },
        assets: [],
        content: null,
        photos: null,
        spec: null,
        notes: [],
        error: null,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'lead_id' },
    );
  if (error) throw new Error(`Starting the site read failed: ${error.message}`);
  return url;
}

/**
 * Step 1: the pages. The homepage, its menu and sitemap, then up to 40 pages, as plain downloads;
 * a page that comes back nearly empty (built by scripts) is opened in the browser instead. Also
 * collects every picture, PDF and font the pages use, for step 2.
 */
export async function readSitePages(leadId: string): Promise<void> {
  const row = await loadSiteRead(leadId);
  if (!row) throw new Error('No site read started.');
  const started = Date.now();
  const notes: string[] = [];
  const home = await fetchWithin(row.url, 15_000, 4 * 1024 * 1024);
  if (!home || home.status >= 400 || !home.body.length) {
    await saveSiteRead(leadId, { status: 'failed', error: home ? `The website answered with error ${home.status}.` : 'The website could not be reached.' });
    return;
  }
  const homeUrl = home.url || row.url;
  const homeHtml = home.body.toString('utf8');
  const lang = pageLanguage(homeHtml);
  const links = siteLinks(homeHtml, homeUrl);

  // The sitemap finds pages the menu does not show.
  const sitemapPages: string[] = [];
  const origin = new URL(homeUrl).origin;
  for (const path of ['/sitemap.xml', '/sitemap_index.xml', '/wp-sitemap.xml']) {
    const map = await fetchWithin(`${origin}${path}`, 8_000, 2 * 1024 * 1024);
    if (!map || map.status >= 400) continue;
    const locs = sitemapLocs(map.body.toString('utf8'));
    const children = locs.filter((l) => /\.xml(\?|$)/i.test(l));
    sitemapPages.push(...locs.filter((l) => !/\.xml(\?|$)/i.test(l)));
    // An index: the page sitemaps first, then a couple of others.
    const ordered = [...children.filter((c) => /page/i.test(c)), ...children.filter((c) => !/page/i.test(c))].slice(0, 3);
    for (const child of ordered) {
      const sub = await fetchWithin(child, 8_000, 2 * 1024 * 1024);
      if (sub && sub.status < 400) sitemapPages.push(...sitemapLocs(sub.body.toString('utf8')).filter((l) => !/\.xml(\?|$)/i.test(l)));
    }
    if (locs.length) break;
  }

  const chosen = choosePages(homeUrl, [...links, ...sitemapPages.map((url) => ({ url, inMenu: false }))], lang);
  const htmlByUrl = new Map<string, string>([[chosen[0], homeHtml]]);
  await pool(chosen.slice(1), 6, started + 100_000, async (url) => {
    const page = await fetchWithin(url, 12_000, 4 * 1024 * 1024);
    if (page && page.status < 400 && /html/.test(page.type || 'text/html')) htmlByUrl.set(url, page.body.toString('utf8'));
    else notes.push(`${url}: ${page ? `error ${page.status}` : 'could not be loaded'}`);
  });

  const pages: OldPage[] = [];
  for (const url of chosen) {
    const html = htmlByUrl.get(url);
    if (!html) continue;
    pages.push({ url, title: pageTitle(html), text: htmlToText(html), kind: LEGAL_PAGE.test(url) ? 'legal' : 'page', via: 'fetch' });
  }

  // Pages built by scripts come back nearly empty: open those in the browser.
  const thin = pages.filter((p) => p.text.length < 300).slice(0, 8);
  if (thin.length && Date.now() - started < 150_000) {
    try {
      const { launchBrowser, desktopUserAgent } = await import('@/lib/browser');
      const browser = await launchBrowser();
      try {
        const context = await browser.newContext({ userAgent: desktopUserAgent(browser), viewport: { width: 1280, height: 900 } });
        const tab = await context.newPage();
        for (const p of thin) {
          if (Date.now() - started > 220_000) break;
          try {
            await tab.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
            await tab.waitForLoadState('load', { timeout: 8_000 }).catch(() => undefined);
            await tab.waitForTimeout(1500);
            const html = await tab.content();
            htmlByUrl.set(p.url, html);
            p.text = htmlToText(html);
            p.title = p.title || pageTitle(html);
            p.via = 'browser';
          } catch {
            notes.push(`${p.url}: could not be opened in the browser`);
          }
        }
      } finally {
        await browser.close().catch(() => undefined);
      }
    } catch (err) {
      notes.push(`The browser could not start: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Keep the text within limits, the homepage and menu pages first (they come first).
  let total = 0;
  for (const p of pages) {
    p.text = p.text.slice(0, Math.max(0, Math.min(OLD_SITE_LIMITS.pageChars, OLD_SITE_LIMITS.totalChars - total)));
    total += p.text.length;
  }

  // Every picture, PDF and font the pages use. Style sheets of the site itself are read for fonts.
  const assets: AssetRef[] = [];
  const seen = new Set<string>();
  const googleFonts = new Set<string>();
  const stylesheets = new Set<string>();
  for (const [url, html] of htmlByUrl) {
    const found = pageAssets(html, url);
    for (const a of found.assets) {
      if (seen.has(a.url)) {
        if (a.logo) assets.find((x) => x.url === a.url)!.logo = true;
        continue;
      }
      seen.add(a.url);
      assets.push(a);
    }
    found.googleFonts.forEach((f) => googleFonts.add(f));
    found.stylesheets.forEach((s) => stylesheets.add(s));
    for (const f of fontFaces(found.inlineCss, url)) {
      if (seen.has(f.url)) continue;
      seen.add(f.url);
      assets.push(f);
    }
  }
  for (const sheet of [...stylesheets].slice(0, 10)) {
    const css = await fetchWithin(sheet, 8_000, 2 * 1024 * 1024);
    if (!css || css.status >= 400) continue;
    const text = css.body.toString('utf8');
    for (const f of fontFaces(text, css.url || sheet)) {
      if (seen.has(f.url)) continue;
      seen.add(f.url);
      assets.push(f);
    }
    for (const m of text.matchAll(/@import\s+url\(\s*["']?([^"')]+fonts\.googleapis\.com[^"')]+)["']?\s*\)/gi)) {
      for (const family of new URL(m[1]).searchParams.getAll('family')) googleFonts.add(family.split(':')[0].replace(/\+/g, ' '));
    }
  }

  const menu = links.filter((l) => l.inMenu && l.text && l.url !== homeUrl).map((l) => ({ url: l.url, text: l.text }));
  await saveSiteRead(leadId, {
    pages,
    found: { lang, menu: [...new Map(menu.map((m) => [m.url, m])).values()], assets, googleFonts: [...googleFonts] },
    notes,
    step: 'assets',
  });
}

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
  'font/woff2': 'woff2',
  'font/woff': 'woff',
  'font/ttf': 'ttf',
  'font/otf': 'otf',
};

/**
 * Step 2: the files. The logo first, then the pictures (largest share of the budget), the PDFs and
 * the font files, each stored once even when several pages use it. Icons and tracking pixels (very
 * small files) are skipped.
 */
export async function downloadSiteAssets(leadId: string): Promise<void> {
  const row = await loadSiteRead(leadId);
  if (!row) throw new Error('No site read started.');
  const started = Date.now();
  const L = OLD_SITE_LIMITS;
  const refs = row.found.assets ?? [];
  const order = (a: AssetRef) => (a.logo ? 0 : a.kind === 'image' ? 1 : a.kind === 'font' ? 2 : 3);
  const queue = [...refs].sort((a, b) => order(a) - order(b));
  const stored: StoredAsset[] = [];
  const shas = new Set<string>();
  const notes = [...(row.notes ?? [])];
  const count = { image: 0, pdf: 0, font: 0 };
  let bytes = 0;
  const storage = db().storage.from(SITE_BUCKET);

  await pool(queue, 6, started + 200_000, async (ref) => {
    const cap = ref.kind === 'image' ? L.imageBytes : ref.kind === 'pdf' ? L.pdfBytes : L.fontBytes;
    const max = ref.kind === 'image' ? L.images : ref.kind === 'pdf' ? L.pdfs : L.fonts;
    if (count[ref.kind] >= max || bytes > L.totalBytes) return;
    const file = await fetchWithin(ref.url, 15_000, cap);
    if (!file || file.status >= 400 || !file.body.length) return;
    const type = file.type || '';
    if (ref.kind === 'image' && !type.startsWith('image/')) return;
    if (ref.kind === 'image' && !ref.logo && type !== 'image/svg+xml' && file.body.length < L.minImageBytes) return;
    const sha = createHash('sha256').update(file.body).digest('hex');
    if (shas.has(sha)) return;
    shas.add(sha);
    count[ref.kind]++;
    bytes += file.body.length;
    const name = assetFileName(ref.url, sha, EXT[type] ?? (ref.kind === 'font' ? 'woff2' : ref.kind === 'pdf' ? 'pdf' : 'jpg'));
    const path = `${leadId}/${ref.kind}s/${name}`;
    const contentType = type || (ref.kind === 'pdf' ? 'application/pdf' : 'application/octet-stream');
    const { error } = await storage.upload(path, file.body, { contentType, upsert: true });
    if (error) {
      notes.push(`${ref.url}: not stored (${error.message})`);
      return;
    }
    stored.push({
      kind: ref.kind,
      url: ref.url,
      path,
      bytes: file.body.length,
      type: contentType,
      sha,
      label: ref.label,
      page: ref.page,
      ...(ref.logo ? { logo: true } : {}),
      ...(ref.weight ? { weight: ref.weight } : {}),
      ...(ref.style ? { style: ref.style } : {}),
    });
  });
  if (Date.now() - started >= 200_000) notes.push('Not every file could be downloaded in time; the first ones were kept.');
  // In the order of the queue (the logo first), whatever order the downloads finished in.
  const rank = new Map(queue.map((r, i) => [r.url, i]));
  stored.sort((a, b) => (rank.get(a.url) ?? 0) - (rank.get(b.url) ?? 0));
  await saveSiteRead(leadId, { assets: stored, notes, step: 'content' });
}

/** A file of the read as a short-lived link (for the Design tab and the photo zip). */
export async function signedAssetUrl(path: string, seconds = 3600): Promise<string | null> {
  const { data } = await db().storage.from(SITE_BUCKET).createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}

export async function downloadAsset(path: string): Promise<Buffer | null> {
  const { data, error } = await db().storage.from(SITE_BUCKET).download(path);
  return error || !data ? null : Buffer.from(await data.arrayBuffer());
}
