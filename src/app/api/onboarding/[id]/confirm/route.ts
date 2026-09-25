import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { isValidSessionId } from '@/lib/session-id';
import { getOnboardingDefinition } from '@/lib/onboarding/definition';
import { deliverConfirmedForm } from '@/lib/onboarding/delivery';
import { redactSecrets } from '@/lib/onboarding/guardrails';
import { validateAll } from '@/lib/onboarding/logic';
import { fileCounts, loadBrief, loadFiles, loadForm, saveWithRev } from '@/lib/onboarding/records';
import { listItems, textFor } from '@/lib/onboarding/texts';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const bodySchema = z.object({
  name: z.string().min(2).max(200),
  /** Indexes of the CMS confirmation checks the client ticked — all of them are required. */
  checks: z.array(z.number().int().min(0).max(20)).max(20),
});

/**
 * The client confirms the brief. The status flips immediately; PDF rendering, storage and
 * the emails run after the response so the client is not kept waiting on Resend.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidSessionId(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const [record, definition] = await Promise.all([loadForm(id), getOnboardingDefinition()]);
  if (!record) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (record.status === 'confirmed') return NextResponse.json({ record });
  if (record.status !== 'brief') return NextResponse.json({ error: 'status', record }, { status: 409 });
  if (!(await loadBrief(id, record.brief_version))) return NextResponse.json({ error: 'no_brief', record }, { status: 409 });

  // The answers can change after the review started (the client edits from the final
  // review, a date goes by, a required question is added), so check them once more here.
  const files = await loadFiles(id);
  const errors = validateAll(definition, record.answers, fileCounts(files), new Date().toISOString().slice(0, 10), record.locale);
  if (errors.length) {
    return NextResponse.json({ error: 'incomplete', fields: Array.from(new Set(errors.map((e) => e.field))) }, { status: 422 });
  }

  const checks = listItems(textFor(definition.texts, 'confirm_checks', record.locale)?.content_markdown ?? '');
  const ticked = new Set(parsed.data.checks);
  if (checks.some((_, i) => !ticked.has(i))) return NextResponse.json({ error: 'checks_incomplete' }, { status: 422 });

  const update = {
    status: 'confirmed' as const,
    confirmed: { name: redactSecrets(parsed.data.name).text, at: new Date().toISOString(), terms_version: definition.settings.termsVersion },
    current_step: 'review',
  };
  let saved = await saveWithRev(id, record.rev, update, 'brief');
  // The read-back writes the client's verdict through the normal autosave, so a save can
  // land between the read above and this one. Losing that race is not a reason to refuse a
  // confirmation: reload and try once more, with the status still guarding the transition.
  if (!saved.ok && saved.error === 'stale' && saved.record?.status === 'brief') {
    saved = await saveWithRev(id, saved.record.rev, update, 'brief');
  }
  if (!saved.ok) return NextResponse.json({ error: saved.error, record: saved.record }, { status: 409 });

  after(async () => {
    try {
      await deliverConfirmedForm(id);
    } catch (err) {
      console.error('[onboarding/confirm] delivery failed:', err);
    }
  });

  return NextResponse.json({ record: saved.record });
}
