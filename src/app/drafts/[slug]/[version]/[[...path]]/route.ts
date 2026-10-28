import { NextResponse, type NextRequest } from 'next/server';
import { resolveDraft, readDraftFile, signedDraftFileUrl } from '@/lib/developer/designs';
import { contentTypeFor, encodePath, isLabel } from '@/lib/developer/drafts';

export const dynamic = 'force-dynamic';

/**
 * Public design drafts: /drafts/<client>/<version>/<file>. The files are uploaded Claude Design
 * exports, so they are untrusted HTML and scripts served from our own domain. The sandbox
 * header gives every page an opaque origin: its scripts run, but cannot read the admin's
 * cookies or call our APIs as the admin. Their own fetches of sibling files are then
 * cross-origin, hence the open CORS header (the files are public anyway).
 */
const BASE_HEADERS: Record<string, string> = {
  'Content-Security-Policy': 'sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals allow-downloads',
  'Access-Control-Allow-Origin': '*',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

/** Vercel functions cannot return much more than this; larger files go straight to storage. */
const MAX_PROXIED_BYTES = 4 * 1024 * 1024;

const SLUG = /^[a-z0-9-]{1,60}$/;

function notFound() {
  return new NextResponse('This draft link is not available.', {
    status: 404,
    headers: { ...BASE_HEADERS, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/** The file path after /drafts/<client>/<version>/, decoded segment by segment. */
function filePath(pathname: string, slug: string, version: string): string | null {
  const prefix = `/drafts/${slug}/${version}`;
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length).replace(/^\/+/, '');
  try {
    const segments = rest.split('/').filter(Boolean).map(decodeURIComponent);
    if (segments.some((s) => s === '..' || s === '.' || s.includes('\\'))) return null;
    return segments.join('/');
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string; version: string }> }) {
  const { slug, version: label } = await params;
  if (!SLUG.test(slug) || !isLabel(label)) return notFound();
  const path = filePath(request.nextUrl.pathname, slug, label);
  if (path === null) return notFound();

  const version = await resolveDraft(slug, label);
  if (!version?.entry_path) return notFound();

  // The bare link opens the design's start page, at a URL its relative asset links resolve from.
  if (!path) {
    const target = new URL(`/drafts/${slug}/${label}/${encodePath(version.entry_path)}`, request.url);
    return NextResponse.redirect(target, { status: 307, headers: { ...BASE_HEADERS, 'Cache-Control': 'no-store' } });
  }

  const size = version.manifest?.[path];
  if (size === undefined) return notFound();
  if (size > MAX_PROXIED_BYTES) {
    const url = await signedDraftFileUrl(version, path);
    return url ? NextResponse.redirect(url, { status: 307, headers: { ...BASE_HEADERS, 'Cache-Control': 'no-store' } }) : notFound();
  }

  const data = await readDraftFile(version, path);
  if (!data) return notFound();
  const type = contentTypeFor(path);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      ...BASE_HEADERS,
      'Content-Type': type,
      // Pages are never cached, so taking the links offline works at once; assets briefly.
      'Cache-Control': type.startsWith('text/html') ? 'no-store' : 'private, max-age=300',
    },
  });
}
