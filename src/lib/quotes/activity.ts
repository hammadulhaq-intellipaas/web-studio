import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { LeadActivity, LeadActivityKind } from '@/lib/types';

/**
 * Appends one entry to a lead's timeline. Never throws — the timeline is a convenience,
 * the write it describes has already happened.
 */
export async function logActivity(
  leadId: string,
  kind: LeadActivityKind,
  actor: string | null,
  body: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from('lead_activity').insert({ lead_id: leadId, kind, actor, body, meta });
  if (error) console.error('[quotes] activity insert failed:', error.message);
}

export async function loadActivity(leadId: string, limit = 200): Promise<LeadActivity[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('lead_activity')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[quotes] activity read failed:', error.message);
    return [];
  }
  return (data ?? []) as LeadActivity[];
}

/** Newest activity per lead, for the list's "last activity" column. */
export async function latestActivityFor(leadIds: string[]): Promise<Map<string, LeadActivity>> {
  const out = new Map<string, LeadActivity>();
  if (!leadIds.length) return out;
  const admin = createSupabaseAdminClient();
  // Batched: hundreds of ids in one `in` filter would blow the URL length.
  for (let i = 0; i < leadIds.length; i += 50) {
    const batch = leadIds.slice(i, i + 50);
    const { data } = await admin
      .from('lead_activity')
      .select('*')
      .in('lead_id', batch)
      .order('created_at', { ascending: false })
      .limit(batch.length * 10);
    for (const row of (data ?? []) as LeadActivity[]) {
      if (!out.has(row.lead_id)) out.set(row.lead_id, row);
    }
  }
  return out;
}
