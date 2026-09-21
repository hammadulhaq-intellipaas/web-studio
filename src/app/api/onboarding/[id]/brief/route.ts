import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isValidSessionId } from '@/lib/session-id';
import { generateBrief } from '@/lib/onboarding/ai/brief';
import { loadBriefVersions, saveBriefVersion } from '@/lib/onboarding/briefs';
import { getOnboardingDefinition, getOnboardingSecrets } from '@/lib/onboarding/definition';
import { redactSecrets } from '@/lib/onboarding/guardrails';
import { loadBrief, loadFiles, loadForm, saveWithRev } from '@/lib/onboarding/records';
import { reviewDrained } from '@/lib/onboarding/review';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Writes the brief once the follow-ups are done. Idempotent: a form that already has a
 * brief gets it back instead of a second generation (and a second model bill).
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidSessionId(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const [record, files, definition] = await Promise.all([loadForm(id), loadFiles(id), getOnboardingDefinition()]);
  if (!record) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (record.status === 'brief' || record.status === 'confirmed') {
    const brief = await loadBrief(id, record.brief_version);
    if (brief) return NextResponse.json({ record, brief });
  }
  if (record.status !== 'review' && record.status !== 'brief') {
    return NextResponse.json({ error: 'status', record }, { status: 409 });
  }
  if (record.status === 'review' && !reviewDrained(record.review)) {
    return NextResponse.json({ error: 'followups_pending', record }, { status: 409 });
  }

  const secrets = await getOnboardingSecrets();
  const draft = await generateBrief({ definition, secrets, record, files });
  const brief = await saveBriefVersion(id, draft.source, draft.model, draft.sections);

  const saved = await saveWithRev(id, record.rev, { status: 'brief', brief_version: brief.version, current_step: 'review' }, ['review', 'brief']);
  if (!saved.ok) return NextResponse.json({ error: saved.error, record: saved.record }, { status: 409 });
  return NextResponse.json({ record: saved.record, brief });
}

const editSchema = z.object({
  section_id: z.string().min(1).max(64),
  content_markdown: z.string().min(1).max(8000),
});

/** Inline edit of one section by the client — a new version, marked as edited. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidSessionId(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  const parsed = editSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const record = await loadForm(id);
  if (!record) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (record.status !== 'brief') return NextResponse.json({ error: 'status', record }, { status: 409 });

  const [current] = await loadBriefVersions(id);
  if (!current || !(parsed.data.section_id in current.sections)) {
    return NextResponse.json({ error: 'unknown_section' }, { status: 400 });
  }

  const sections = {
    ...current.sections,
    [parsed.data.section_id]: {
      ...current.sections[parsed.data.section_id],
      content_markdown: redactSecrets(parsed.data.content_markdown).text,
      edited: true,
    },
  };
  const brief = await saveBriefVersion(id, 'client_edit', null, sections);
  const saved = await saveWithRev(id, record.rev, { brief_version: brief.version }, 'brief');
  if (!saved.ok) return NextResponse.json({ error: saved.error, record: saved.record }, { status: 409 });
  return NextResponse.json({ record: saved.record, brief });
}
