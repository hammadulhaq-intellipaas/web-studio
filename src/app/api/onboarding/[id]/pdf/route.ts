import { NextResponse } from 'next/server';
import { isValidSessionId } from '@/lib/session-id';
import { getOnboardingDefinition } from '@/lib/onboarding/definition';
import { downloadPdf, ensurePdf, pdfStoragePath } from '@/lib/onboarding/delivery';
import { pdfFileName } from '@/lib/onboarding/pdf/render';
import { loadBrief, loadForm } from '@/lib/onboarding/records';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * The client's PDF. Served from storage once delivery stored it; rendered on the spot
 * (and stored) when the client is quicker than the background job.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidSessionId(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const record = await loadForm(id);
  if (!record) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (record.status !== 'confirmed' || record.brief_version == null) {
    return NextResponse.json({ error: 'not_confirmed' }, { status: 409 });
  }

  const [definition, brief] = await Promise.all([getOnboardingDefinition(), loadBrief(id, record.brief_version)]);
  if (!brief) return NextResponse.json({ error: 'no_brief' }, { status: 409 });

  let buffer = await downloadPdf(record.delivery?.pdf_path ?? pdfStoragePath(id, brief.version));
  if (!buffer) buffer = (await ensurePdf(definition, record, brief)).buffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${pdfFileName(record, brief.version)}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
