import 'server-only';
import { launchBrowser } from '@/lib/browser';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { CHECK_PAGE, CHECK_WIDTHS, type PageCheck, type WidthCheck } from './app-design-shared';
import { contentTypeFor, DESIGN_BUCKET } from './drafts';
import type { DesignVersion } from './designs';

/**
 * Opens every page of a design made in the app at the seven widths it must work at and records
 * what is wrong: anything sticking out sideways, text under 16 px and tap targets under 44 px on
 * phones, images that do not load. The pages are served straight from storage to the browser (a
 * made-up address the browser never leaves), so no review link or password is involved. The top
 * of each page is photographed at phone, tablet and laptop width.
 */
const ORIGIN = 'https://design.check';
const SHOT_WIDTHS = [390, 768, 1440];

export async function checkDesign(
  version: Pick<DesignVersion, 'id' | 'lead_id'>,
  pages: { name: string; file: string }[],
): Promise<PageCheck[]> {
  const storage = createSupabaseAdminClient().storage.from(DESIGN_BUCKET);
  const cache = new Map<string, Buffer | null>();
  const fetchFile = async (path: string): Promise<Buffer | null> => {
    if (!cache.has(path)) {
      const { data } = await storage.download(`${version.lead_id}/${version.id}/site/${Buffer.from(path, 'utf8').toString('hex')}`);
      cache.set(path, data ? Buffer.from(await data.arrayBuffer()) : null);
    }
    return cache.get(path) ?? null;
  };
  const browser = await launchBrowser();
  const results: PageCheck[] = [];
  try {
    // One page, resized: the browser on Vercel runs as a single process and cannot open a second context.
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const tab = await context.newPage();
    await tab.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== ORIGIN) {
        // Google Fonts may load; nothing else leaves the check.
        return /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) ? route.continue() : route.abort();
      }
      const path = decodeURIComponent(url.pathname.replace(/^\/+/, '')) || 'index.html';
      const body = await fetchFile(path);
      return body ? route.fulfill({ status: 200, body, contentType: contentTypeFor(path) }) : route.fulfill({ status: 404, body: 'not found' });
    });
    for (const page of pages) {
      const widths: WidthCheck[] = [];
      const pictures: PageCheck['shots'] = [];
      for (const width of CHECK_WIDTHS) {
        await tab.setViewportSize({ width, height: width < 600 ? 844 : 900 });
        await tab.goto(`${ORIGIN}/${page.file}`, { waitUntil: 'load', timeout: 20_000 }).catch(() => undefined);
        await tab.waitForTimeout(300);
        const found = (await tab.evaluate(CHECK_PAGE).catch(() => null)) as Omit<WidthCheck, 'width'> | null;
        widths.push({ width, overflow: [], smallText: [], smallTargets: [], brokenImages: [], ...(found ?? {}) });
        if (SHOT_WIDTHS.includes(width)) {
          const shot = await tab.screenshot({ type: 'jpeg', quality: 70, timeout: 15_000 }).catch(() => null);
          if (shot) {
            const path = `${version.lead_id}/${version.id}/checks/${page.file.replace(/\.html$/, '')}-${width}.jpg`;
            const { error } = await storage.upload(path, shot, { contentType: 'image/jpeg', upsert: true });
            if (!error) pictures.push({ width, path });
          }
        }
      }
      results.push({ file: page.file, name: page.name, widths, shots: pictures });
    }
  } finally {
    await browser.close().catch(() => undefined);
  }
  return results;
}
