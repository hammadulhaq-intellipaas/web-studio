import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isValidSessionId } from '@/lib/session-id';
import { currentActor, isTeam } from '@/lib/quotes/actor';
import { isLocked, loadBoundLead } from '@/lib/quotes/binding';
import { quotesSchemaReady } from '@/lib/quotes/schema';

/** Guards the anonymous write surface: a shared funnel state stays small. */
const MAX_STATE_BYTES = 64 * 1024;

const bodySchema = z.object({
  id: z.string().refine(isValidSessionId, 'invalid_session_id'),
  state: z.record(z.string(), z.unknown()),
});

/**
 * Upsert the funnel state behind a shareable link. Anonymous, service-role backed.
 *
 * Only for a visitor who has not enquired yet. Once the session belongs to a quote, this
 * refuses the write: a quote is saved explicitly, through the leads endpoint, so the link,
 * the lead and its versions can never disagree.
 */
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
  const ready = await quotesSchemaReady();
  const row: Record<string, unknown> = { id, state, updated_at: new Date().toISOString() };

  if (ready) {
    const bound = await loadBoundLead(id);
    if (bound) {
      const actor = await currentActor();
      if (isLocked(bound) && !isTeam(actor)) {
        return NextResponse.json({ error: 'locked' }, { status: 403 });
      }
      // A quote only changes when someone presses "Save changes", which writes the link
      // and the lead together. This is the old autosave (or a tab opened before that
      // change): refuse it, so a stray click can never move a quote on its own.
      return NextResponse.json({ error: 'save_required' }, { status: 409 });
    }
  }

  const { error } = await supabase.from('funnel_sessions').upsert(row);

  if (error) {
    console.error('[sessions] upsert failed:', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
