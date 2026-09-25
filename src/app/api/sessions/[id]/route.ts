import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isValidSessionId } from '@/lib/session-id';
import { loadBoundLead, quoteMeta } from '@/lib/quotes/binding';
import { getCatalog } from '@/lib/catalog';

/**
 * Restore a funnel state from a shared `?c=<id>` link. When the session belongs to a
 * submitted quote, `quote` tells the browser so it can show the quote banner and turn the
 * contact form into an update — it never carries the team's data (owner, notes).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidSessionId(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const [{ data, error }, bound, catalog] = await Promise.all([
    supabase.from('funnel_sessions').select('state').eq('id', id).maybeSingle(),
    loadBoundLead(id),
    getCatalog(),
  ]);

  if (error) {
    console.error('[sessions] read failed:', error);
    return NextResponse.json({ error: 'read_failed' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json({ state: data.state, quote: bound ? quoteMeta(bound, catalog) : null });
}
