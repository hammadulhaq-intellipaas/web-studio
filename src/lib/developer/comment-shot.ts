import 'server-only';
import type { Browser } from 'playwright-core';
import { desktopUserAgent, HIDE_BANNERS, launchBrowser, phoneUserAgent } from '@/lib/browser';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { DEVICE_WIDTH, shotGeometry } from './comment-order';
import { shotPath } from './comment-shot-files';
import { setCommentShot, type DesignComment } from './comments';
import { DESIGN_BUCKET } from './drafts';

/**
 * A picture of the place a client marked on the review link: the design page opened at the same
 * width as they saw it, the box drawn in red, and some of the page around it. The improvement
 * prompt sends it to the model and the team attaches it in Claude Design, so "the button" is never
 * mistaken for another one. No number is drawn in: the prompt numbers comments only when it is
 * written, and names the files after that (comment-01.jpg …). Runs after the comment is saved; a
 * failure only means the comment has no picture, so it is logged, never thrown.
 */
export async function captureCommentShot(origin: string, comment: DesignComment): Promise<void> {
  if (comment.kind !== 'pin' || !comment.page_path || comment.x == null || comment.y == null) return;
  const started = Date.now();
  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const device = comment.device ?? 'laptop';
    const width = DEVICE_WIDTH[device];
    // One page only: on Vercel the browser runs as a single process, where a second context fails.
    const page = await browser.newPage({
      viewport: { width, height: device === 'laptop' ? 800 : device === 'tablet' ? 1024 : 844 },
      deviceScaleFactor: 1,
      userAgent: device === 'laptop' ? desktopUserAgent(browser) : phoneUserAgent(browser),
    });
    await page.goto(new URL(comment.page_path, origin).toString(), { waitUntil: 'load', timeout: 25_000 });
    await page.addStyleTag({ content: HIDE_BANNERS }).catch(() => undefined);
    await page.evaluate('document.fonts ? document.fonts.ready.then(() => true) : true').catch(() => undefined);
    await page.waitForTimeout(800);

    const size = (await page.evaluate(
      '({ width: Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0, 1), height: Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0, 1) })',
    )) as { width: number; height: number };
    const { box, clip } = shotGeometry({ x: comment.x, y: comment.y, w: comment.w ?? null, h: comment.h ?? null }, size);

    // Scroll there first, so sections that fade in on scroll are visible in the picture.
    await page.evaluate(`window.scrollTo(0, ${Math.max(0, box.y - 200)})`);
    await page.waitForTimeout(900);
    await page.evaluate(
      `(() => {
        const b = document.createElement('div');
        b.style.cssText = 'position:absolute;z-index:2147483647;pointer-events:none;box-sizing:border-box;border:4px solid #E5484D;border-radius:6px;background:rgba(229,72,77,.06);left:${box.x}px;top:${box.y}px;width:${box.width}px;height:${box.height}px;';
        document.body.appendChild(b);
      })()`,
    );
    const image = await page.screenshot({ type: 'jpeg', quality: 78, fullPage: true, clip, timeout: 20_000 });

    const path = shotPath(comment.lead_id, comment.id);
    const { error } = await createSupabaseAdminClient().storage.from(DESIGN_BUCKET).upload(path, image, { contentType: 'image/jpeg', upsert: true });
    if (error) throw new Error(error.message);
    await setCommentShot(comment.id, path);
    console.info(`[review/shot] ${comment.id}: ${device} ${clip.width}x${clip.height} in ${Math.round((Date.now() - started) / 1000)}s`);
  } catch (err) {
    console.warn(`[review/shot] ${comment.id} failed after ${Math.round((Date.now() - started) / 1000)}s: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await browser?.close().catch(() => undefined);
  }
}

