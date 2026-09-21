import { NextResponse } from 'next/server';
import { isValidSessionId } from '@/lib/session-id';
import { getOnboardingDefinition } from '@/lib/onboarding/definition';
import { loadFiles, loadForm } from '@/lib/onboarding/records';
import { startOrContinueReview } from '@/lib/onboarding/review';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Starts the gap check (or the next round once the queue drained). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidSessionId(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const [record, files, definition] = await Promise.all([loadForm(id), loadFiles(id), getOnboardingDefinition()]);
  if (!record) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const outcome = await startOrContinueReview(definition, record, files);
  if (!outcome.ok) {
    if (outcome.status === 422) return NextResponse.json({ error: outcome.error, fields: outcome.fields }, { status: 422 });
    return NextResponse.json({ error: outcome.error, record: outcome.record }, { status: outcome.status });
  }
  return NextResponse.json({ record: outcome.record });
}
