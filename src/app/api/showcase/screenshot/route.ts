import { NextResponse } from 'next/server';
import { normalizeSiteUrl } from '@/lib/showcase/shared';
import { captureHomepage, ScreenshotError } from '@/lib/showcase/screenshot';
import { storeScreenshot } from '@/lib/showcase/store';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
// A cold start unpacks Chromium first; a screenshot usually takes 5 to 15 seconds.
export const maxDuration = 60;

/**
 * Takes the screenshot for a showcase entry: opens the website link, stores a picture of the
 * top of the homepage in the showcase bucket and returns its path and the site's name. Its own
 * route, so the large browser package is only in this function. Team only.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
  const url = normalizeSiteUrl(typeof body?.url === 'string' ? body.url : '');
  if (!url) return NextResponse.json({ error: 'The website link does not look right. Example: praxis-x.de' }, { status: 400 });

  try {
    const shot = await captureHomepage(url);
    const path = await storeScreenshot(shot.image);
    return NextResponse.json({ path, siteName: shot.siteName, takenAt: new Date().toISOString() });
  } catch (err) {
    if (!(err instanceof ScreenshotError)) console.error('[showcase] screenshot failed', err);
    const message = err instanceof Error ? err.message : 'The screenshot failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
