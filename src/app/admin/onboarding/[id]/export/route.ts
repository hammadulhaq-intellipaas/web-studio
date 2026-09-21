import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isValidSessionId } from '@/lib/session-id';
import { getOnboardingDefinition } from '@/lib/onboarding/definition';
import { exportRecord } from '@/lib/onboarding/export';
import { loadBrief, loadFiles, loadForm } from '@/lib/onboarding/records';

export const dynamic = 'force-dynamic';

/** The structured record (spec §05) as a JSON download, for signed-in admins. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!isValidSessionId(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  const record = await loadForm(id);
  if (!record) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const [definition, files, brief] = await Promise.all([getOnboardingDefinition(), loadFiles(id), loadBrief(id, record.brief_version)]);

  return new NextResponse(JSON.stringify(exportRecord(definition, record, brief, files), null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="onboarding-${id}.json"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
