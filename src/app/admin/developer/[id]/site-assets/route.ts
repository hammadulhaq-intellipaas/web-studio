import { NextResponse, type NextRequest } from 'next/server';
import type { PhotoNote } from '@/lib/developer/old-site-content';
import { downloadAsset, loadSiteRead, SITE_BUCKET } from '@/lib/developer/old-site-read';
import { zip } from '@/lib/developer/zip';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The files of a Form B client's current website as one zip, in the folders the design prompt
 * names them by (assets/current-site/…, fonts in assets/current-site/fonts/): the logo, the photos
 * worth using (not the poor ones), the font files and the PDFs. The team attaches it in Claude
 * Design with the prompt. Too large to send through a function, so it is stored and downloaded
 * from storage.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { id: leadId } = await params;
  if (!UUID.test(leadId)) return new NextResponse('Not found', { status: 404 });
  const read = await loadSiteRead(leadId);
  if (!read || read.status !== 'ready') return new NextResponse('The website has not been read yet.', { status: 404 });

  const poor = new Set(((read.photos ?? []) as PhotoNote[]).filter((p) => p.quality === 'poor' && p.subject !== 'logo').map((p) => p.path));
  const wanted = read.assets.filter((a) => !poor.has(a.path) && (a.kind !== 'image' || a.logo || a.bytes >= 10 * 1024));
  const files: { path: string; data: Buffer }[] = [];
  let total = 0;
  for (const asset of wanted) {
    if (total > 150 * 1024 * 1024) break;
    const data = await downloadAsset(asset.path);
    if (!data) continue;
    total += data.length;
    const name = asset.path.split('/').pop()!;
    files.push({ path: asset.kind === 'font' ? `assets/current-site/fonts/${name}` : `assets/current-site/${name}`, data });
  }
  if (!files.length) return new NextResponse('No files were found on the website.', { status: 404 });

  const storage = createSupabaseAdminClient().storage.from(SITE_BUCKET);
  const path = `${leadId}/zips/current-site.zip`;
  const { error } = await storage.upload(path, zip(files), { contentType: 'application/zip', upsert: true });
  if (error) return new NextResponse(`The zip could not be stored: ${error.message}`, { status: 500 });
  const { data: signed } = await storage.createSignedUrl(path, 300, { download: 'current-site.zip' });
  if (!signed?.signedUrl) return new NextResponse('The zip could not be linked.', { status: 500 });
  return NextResponse.redirect(signed.signedUrl);
}
