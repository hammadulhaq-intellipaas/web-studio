import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isValidSessionId } from '@/lib/session-id';

/** Guards the anonymous write surface: a shared funnel state stays small. */
const MAX_STATE_BYTES = 64 * 1024;

const bodySchema = z.object({
  id: z.string().refine(isValidSessionId, 'invalid_session_id'),
  state: z.record(z.string(), z.unknown()),
});

/** Upsert the funnel state behind a shareable link. Anonymous, service-role backed. */
export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { id, state } = parsed.data;
  if (JSON.stringify(state).length > MAX_STATE_BYTES) {
    return NextResponse.json({ error: 'state_too_large' }, { status: 413 });
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('funnel_sessions')
    .upsert({ id, state, updated_at: new Date().toISOString() });

  if (error) {
    console.error('[sessions] upsert failed:', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
