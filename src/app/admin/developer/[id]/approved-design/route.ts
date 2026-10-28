import { NextResponse } from 'next/server';
import { approvedDownloadUrl } from '@/lib/developer/designs';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** Downloads the approved design as design.zip, for the client's build folder. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { id } = await params;
  const url = await approvedDownloadUrl(id);
  if (!url) return new NextResponse('No approved design yet.', { status: 404 });
  return NextResponse.redirect(url, 307);
}
