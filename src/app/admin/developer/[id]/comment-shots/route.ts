import { NextResponse, type NextRequest } from 'next/server';
import { promptOrder, shotName } from '@/lib/developer/comment-order';
import { loadCommentShots } from '@/lib/developer/comment-shot-files';
import { loadComments } from '@/lib/developer/comments';
import { zip } from '@/lib/developer/zip';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * The pictures of the places an improvement prompt is about, as one zip, named the way the prompt
 * refers to them (comment-01.jpg …). The team attaches them in Claude Design with the prompt.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { id: leadId } = await params;
  const promptId = request.nextUrl.searchParams.get('prompt') ?? '';
  const { data: prompt } = await createSupabaseAdminClient()
    .from('developer_prompts')
    .select('id, design_version_id, proposal')
    .eq('id', promptId)
    .eq('lead_id', leadId)
    .eq('kind', 'revision')
    .maybeSingle();
  if (!prompt?.design_version_id) return new NextResponse('This improvement prompt was not found.', { status: 404 });

  const taken = (await loadComments(leadId)).filter((c) => c.prompt_id === prompt.id);
  const ordered = promptOrder(taken, prompt.design_version_id);
  const shots = await loadCommentShots(ordered);
  const files = ordered.flatMap((c, i) => (shots.has(c.id) ? [{ path: shotName(i), data: shots.get(c.id)! }] : []));
  if (!files.length) return new NextResponse('These comments have no pictures.', { status: 404 });

  const name = `screenshots-proposal-${prompt.proposal === 'A' ? 1 : 2}.zip`;
  return new NextResponse(new Uint8Array(zip(files)), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  });
}
