import { NextResponse } from 'next/server';
import { isValidSessionId } from '@/lib/session-id';
import { getOnboardingDefinition } from '@/lib/onboarding/definition';
import { answersPdfFileName, renderAnswersPdf } from '@/lib/onboarding/pdf/render';
import { loadFiles, loadForm, publicFiles } from '@/lib/onboarding/records';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * The client's answers as a PDF, rendered on demand from the record as it stands: a draft
 * during the final review, the confirmed version afterwards. Same credential as the rest
 * of the form (the unguessable id behind the Basic-auth gate).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidSessionId(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const [record, definition, files] = await Promise.all([loadForm(id), getOnboardingDefinition(), loadFiles(id)]);
  if (!record) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const buffer = await renderAnswersPdf(definition, record, publicFiles(files));
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${answersPdfFileName(record)}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
