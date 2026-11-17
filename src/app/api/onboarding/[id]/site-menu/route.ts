import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loadForm } from '@/lib/onboarding/records';
import { fetchSiteMenu } from '@/lib/onboarding/site-menu';
import { isValidSessionId } from '@/lib/session-id';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

const bodySchema = z.object({ url: z.string().min(4).max(500) });

/**
 * Form B: the pages in the menu of the client's current website, to fill "which of your current
 * pages should stay?". Reads only the homepage's HTML (no AI, no browser) and returns names and
 * paths; nothing is saved here, the form keeps what the client accepts.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidSessionId(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  const record = await loadForm(id);
  if (!record) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (record.status === 'confirmed') return NextResponse.json({ error: 'confirmed' }, { status: 409 });
  return NextResponse.json({ pages: await fetchSiteMenu(parsed.data.url) });
}
