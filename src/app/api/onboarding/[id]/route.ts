import { NextResponse } from 'next/server';
import { isValidSessionId } from '@/lib/session-id';
import { getOnboardingDefinition } from '@/lib/onboarding/definition';
import { applyPatch, loadFiles, loadForm, publicFiles, saveWithRev } from '@/lib/onboarding/records';
import { patchSchema } from '@/lib/onboarding/schemas';

export const dynamic = 'force-dynamic';

/** The client's own record (it holds the unguessable link). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidSessionId(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  const [record, files] = await Promise.all([loadForm(id), loadFiles(id)]);
  if (!record) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ record, files: publicFiles(files) });
}

/**
 * Field-level autosave. The body carries only what changed plus the revision the client
 * last saw; a stale revision answers 409 with the current row so the client can merge.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidSessionId(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const record = await loadForm(id);
  if (!record) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (record.status === 'confirmed') {
    return NextResponse.json({ error: 'confirmed', record }, { status: 409 });
  }
  if (parsed.data.base_rev !== record.rev) {
    return NextResponse.json({ error: 'stale', record }, { status: 409 });
  }

  const definition = await getOnboardingDefinition();
  const patch = applyPatch(definition, record, parsed.data);
  if (!patch.ok) return NextResponse.json({ error: patch.error }, { status: patch.status });

  const saved = await saveWithRev(id, record.rev, patch.update, ['in_progress', 'review', 'brief']);
  if (!saved.ok) return NextResponse.json({ error: saved.error, record: saved.record }, { status: 409 });

  return NextResponse.json({ record: saved.record, removed: patch.removed, redactions: patch.redactions });
}
