import { NextResponse } from 'next/server';
import { isValidSessionId } from '@/lib/session-id';
import { runCompleteness } from '@/lib/onboarding/ai/completeness';
import { modelConfigured, reserveAiCall } from '@/lib/onboarding/ai/client';
import { getOnboardingDefinition, getOnboardingSecrets } from '@/lib/onboarding/definition';
import { computeGaps, hashAnswers } from '@/lib/onboarding/logic';
import { fileCounts, loadFiles, loadForm, publicFiles, saveDerived } from '@/lib/onboarding/records';
import { buildReport, reportHash, reportIsCurrent } from '@/lib/onboarding/report';
import type { LlmQuestion } from '@/lib/onboarding/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * The completeness report the client sees on the closing screen: the deterministic gap
 * check, plus the model's view of whether their free text is specific enough.
 *
 * Cached on the record against the answers hash, so reopening the screen is free and a
 * report is only rebuilt after the client actually changed something.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidSessionId(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const [record, files, definition] = await Promise.all([loadForm(id), loadFiles(id), getOnboardingDefinition()]);
  if (!record) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (record.status === 'in_progress') return NextResponse.json({ error: 'status', record }, { status: 409 });

  const summaries = publicFiles(files).map((f) => ({
    field_key: f.field_key,
    file_name: f.file_name,
    size_bytes: f.size_bytes,
    mime_type: f.mime_type,
  }));

  if (reportIsCurrent(definition, record)) {
    return NextResponse.json({ report: record.review!.report, cached: true });
  }

  // The model only judges free text, and only when it has not already judged these exact
  // answers during the follow-up rounds. Confirmed forms never spend another call.
  const hash = reportHash(definition, record.answers);
  let questions: LlmQuestion[] = record.review?.llm_questions ?? [];
  // The follow-up round already judged these answers if its hash still matches.
  let modelChecked = record.review?.answers_hash === hashAnswers(record.answers);
  const alreadyReported = record.review?.report?.answers_hash === hash;

  if (!modelChecked && !alreadyReported && record.status !== 'confirmed' && modelConfigured()) {
    const gaps = computeGaps(definition, record.answers, fileCounts(summaries));
    if (await reserveAiCall(id, record.ai_calls, definition.settings)) {
      const secrets = await getOnboardingSecrets();
      const result = await runCompleteness({ definition, secrets, record, files: summaries, gaps, maxQuestions: 6 });
      if (result.ran) {
        questions = result.questions;
        modelChecked = true;
      }
    }
  }

  const report = buildReport(definition, record, summaries, questions, modelChecked);
  if (record.review) {
    // Cached so reopening the screen costs nothing. A failure here is not worth failing the
    // response over: the report is derived and the next open simply rebuilds it.
    await saveDerived(id, { review: { ...record.review, report } }).catch(() => undefined);
  }
  return NextResponse.json({ report });
}
