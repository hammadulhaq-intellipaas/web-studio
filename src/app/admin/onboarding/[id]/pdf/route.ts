import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isValidSessionId } from '@/lib/session-id';
import { getOnboardingDefinition } from '@/lib/onboarding/definition';
import { pdfFileName, renderBriefPdf } from '@/lib/onboarding/pdf/render';
import { loadBrief, loadForm } from '@/lib/onboarding/records';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Team copy of the brief PDF (with the internal flags page), for signed-in admins. */
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
  const version = Number(new URL(_request.url).searchParams.get('v') ?? record.brief_version ?? 0) || record.brief_version;
  const [definition, brief] = await Promise.all([getOnboardingDefinition(), loadBrief(id, version)]);
  if (!brief) return NextResponse.json({ error: 'no_brief' }, { status: 404 });

  const buffer = await renderBriefPdf(definition, record, brief, { team: true });
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="team-${pdfFileName(record, brief.version)}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
