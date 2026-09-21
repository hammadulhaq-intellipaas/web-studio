import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isValidSessionId } from '@/lib/session-id';
import { rewriteSection, stillNeededSection } from '@/lib/onboarding/ai/brief';
import { countRewrites, loadBriefVersions, saveBriefVersion } from '@/lib/onboarding/briefs';
import { getOnboardingDefinition, getOnboardingSecrets } from '@/lib/onboarding/definition';
import { redactSecrets } from '@/lib/onboarding/guardrails';
import { loadFiles, loadForm, saveWithRev } from '@/lib/onboarding/records';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const bodySchema = z.object({
  section_id: z.string().min(1).max(64),
  instruction: z.string().min(3).max(1000),
});

/** "Rewrite this section": the client says what is wrong, the model redoes that section only. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidSessionId(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const [record, files, definition] = await Promise.all([loadForm(id), loadFiles(id), getOnboardingDefinition()]);
  if (!record) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (record.status !== 'brief') return NextResponse.json({ error: 'status', record }, { status: 409 });

  const [current] = await loadBriefVersions(id);
  if (!current || !(parsed.data.section_id in current.sections)) {
    return NextResponse.json({ error: 'unknown_section' }, { status: 400 });
  }
  if ((await countRewrites(id)) >= definition.settings.maxRewrites) {
    return NextResponse.json({ error: 'rewrite_limit' }, { status: 429 });
  }

  const secrets = await getOnboardingSecrets();
  const result = await rewriteSection({
    definition,
    secrets,
    record,
    files,
    current: current.sections,
    sectionId: parsed.data.section_id,
    instruction: redactSecrets(parsed.data.instruction).text,
  });
  if (!result.ok || !result.section) {
    return NextResponse.json({ error: 'rewrite_failed', violations: result.violations }, { status: 422 });
  }

  const sections = { ...current.sections, [parsed.data.section_id]: result.section };
  // Section 9 lists what is still open across the model's sections — recompose it after the rewrite.
  const systemIds = new Set(definition.briefSections.filter((x) => x.generated_by === 'system').map((x) => x.id));
  const llmOnly = Object.fromEntries(Object.entries(sections).filter(([key]) => !systemIds.has(key)));
  for (const sid of systemIds) sections[sid] = stillNeededSection(definition, record, files, llmOnly);
  const brief = await saveBriefVersion(id, 'rewrite', result.model, sections);
  const saved = await saveWithRev(id, record.rev, { brief_version: brief.version }, 'brief');
  if (!saved.ok) return NextResponse.json({ error: saved.error, record: saved.record }, { status: 409 });
  return NextResponse.json({ record: saved.record, brief });
}
