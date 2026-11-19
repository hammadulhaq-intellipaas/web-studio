import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { AutoStep } from './auto-trigger';

/**
 * Steps of the automatic chain that could not be started straight away.
 *
 * Each step starts the next one with a request to our own app. Vercel's recursion protection
 * counts such requests from the one that began the chain and refuses the fifth in a row with
 * 508 (seen 19 Nov 2026: begin, pages, assets, content, then photos refused). A refused step is
 * stored here, and /api/developer/auto/queue (Vercel Cron, every minute) starts it again as a
 * new chain. So a long chain (reading a website, a design made in the app) loses at most a
 * minute every few steps instead of stopping.
 */
const TABLE = 'developer_auto_queue';

export interface QueuedStep {
  id: string;
  lead_id: string;
  step: AutoStep;
  reason: string | null;
  attempts: number;
  created_at: string;
}

const missing = (code?: string) => code === 'PGRST205' || code === '42P01';

/** Stores a step for the next run. False when the queue table is not there (migration 036 not run). */
export async function enqueueAutoStep(leadId: string, step: AutoStep, reason: string, attempts: number): Promise<boolean> {
  const { error } = await createSupabaseAdminClient().from(TABLE).insert({ lead_id: leadId, step, reason, attempts });
  if (error) {
    if (!missing(error.code)) console.error('[developer/auto-queue] could not store a step:', error.message);
    return false;
  }
  return true;
}

/**
 * The oldest waiting steps, each taken off the queue before it is returned: a row is only
 * returned to the run whose delete removed it, so two runs never start the same step.
 */
export async function takeQueuedSteps(limit = 10): Promise<QueuedStep[]> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db.from(TABLE).select('*').order('created_at').limit(limit);
  if (error) {
    if (!missing(error.code)) console.error('[developer/auto-queue] could not read the queue:', error.message);
    return [];
  }
  const taken: QueuedStep[] = [];
  for (const row of (data ?? []) as QueuedStep[]) {
    const { data: removed } = await db.from(TABLE).delete().eq('id', row.id).select('id');
    if (removed?.length) taken.push(row);
  }
  return taken;
}
