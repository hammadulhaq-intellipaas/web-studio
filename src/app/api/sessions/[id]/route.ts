import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isValidSessionId } from '@/lib/session-id';

/** Restore a funnel state from a shared `?c=<id>` link. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidSessionId(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('funnel_sessions')
    .select('state')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[sessions] read failed:', error);
    return NextResponse.json({ error: 'read_failed' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json({ state: data.state });
}
