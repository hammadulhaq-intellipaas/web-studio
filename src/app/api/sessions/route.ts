import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCatalog } from '@/lib/catalog';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isValidSessionId } from '@/lib/session-id';
import { currentActor, isTeam } from '@/lib/quotes/actor';
import { isLocked, loadBoundLead } from '@/lib/quotes/binding';
import { quotesSchemaReady } from '@/lib/quotes/schema';
import { captureFromState, quoteIdleMs, shouldCaptureBoundary } from '@/lib/quotes/versions';

/** Guards the anonymous write surface: a shared funnel state stays small. */
const MAX_STATE_BYTES = 64 * 1024;

const bodySchema = z.object({
  id: z.string().refine(isValidSessionId, 'invalid_session_id'),
  state: z.record(z.string(), z.unknown()),
});

/**
 * Upsert the funnel state behind a shareable link. Anonymous, service-role backed.
 *
 * When the session belongs to a submitted quote, the write also keeps the quote's history:
 * the state stored *before* this write is kept as a version whenever it closes a burst of
 * edits (the writer changed, or the previous write is older than the idle window), and
 * `won` / `lost` quotes refuse customer writes. All of that fails open — a history hiccup
 * never loses a save.
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
      row.last_actor = actor;
      try {
        const { data: prev } = await supabase
          .from('funnel_sessions')
          .select('state, updated_at, last_actor')
          .eq('id', id)
          .maybeSingle();
        if (prev) {
          const reason = shouldCaptureBoundary(
            { updatedAt: prev.updated_at, lastActor: prev.last_actor },
            Date.now(),
            actor,
            await quoteIdleMs(),
          );
          if (reason) {
            await captureFromState({
              lead: { id: bound.id, locale: bound.locale, config: bound.config },
              state: prev.state,
              actor: prev.last_actor ?? 'customer',
              reason,
              catalog: await getCatalog(),
            });
          }
        }
      } catch (e) {
        console.error('[sessions] history capture failed:', e);
      }
    }
  }

  const { error } = await supabase.from('funnel_sessions').upsert(row);

  if (error) {
    console.error('[sessions] upsert failed:', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
