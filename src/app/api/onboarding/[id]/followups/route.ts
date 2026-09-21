import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isValidSessionId } from '@/lib/session-id';
import { getOnboardingDefinition } from '@/lib/onboarding/definition';
import { MAX_FOLLOWUP_CHARS } from '@/lib/onboarding/limits';
import { loadFiles, loadForm } from '@/lib/onboarding/records';
import { answerFollowup } from '@/lib/onboarding/review';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const bodySchema = z.object({
  question_id: z.string().min(1).max(200),
  /** null = skipped. */
  answer: z.string().max(MAX_FOLLOWUP_CHARS).nullable(),
});

/** One follow-up answer (or skip) for the question currently shown. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidSessionId(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const [record, files, definition] = await Promise.all([loadForm(id), loadFiles(id), getOnboardingDefinition()]);
  if (!record) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const outcome = await answerFollowup(definition, record, files, parsed.data.question_id, parsed.data.answer);
  if (!outcome.ok) {
    if (outcome.status === 400) return NextResponse.json({ error: outcome.error, record }, { status: 400 });
    return NextResponse.json({ error: outcome.error, record: outcome.record }, { status: outcome.status });
  }
  return NextResponse.json({ record: outcome.record });
}
