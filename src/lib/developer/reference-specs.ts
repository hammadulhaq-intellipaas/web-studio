import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Reference specs written on the spot from a client's own reference (migration
 * 20261103000028). A website's spec is shared: the next client who names the same page gets it
 * from here for 30 days. A spec of a client's pictures belongs to that client.
 */
export interface ReferenceSpecRow {
  id: string;
  /** "link:example.de/start" or "shots:<lead>:<file ids>" (reference-sources.ts sourceKey). */
  source_key: string;
  kind: 'link' | 'screenshots';
  url: string | null;
  /** Set for pictures, which belong to one client; null for a website. */
  lead_id: string | null;
  content: string;
  /** What it was made from, in one line ("Read 4 pages at 1280 px, the homepage at 390 px."). */
  summary: string | null;
  model: string;
  created_by: string | null;
  created_at: string;
}

const TABLE = 'developer_reference_specs';
/** How long a website's spec is reused before the site is read again. */
export const SPEC_MAX_AGE_DAYS = 30;
const db = () => createSupabaseAdminClient();

/** Whether the table exists. Before the migration the client's own references cannot be chosen. */
export async function referenceSpecsReady(): Promise<boolean> {
  const { error } = await db().from(TABLE).select('id').limit(1);
  return !(error?.code === 'PGRST205' || error?.code === '42P01');
}

/** The newest spec for a source, optionally only if it is younger than `maxAgeDays`. */
export async function latestSpec(key: string, maxAgeDays?: number): Promise<ReferenceSpecRow | null> {
  let query = db().from(TABLE).select('*').eq('source_key', key).order('created_at', { ascending: false }).limit(1);
  if (maxAgeDays) query = query.gte('created_at', new Date(Date.now() - maxAgeDays * 86_400_000).toISOString());
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Loading the reference spec failed: ${error.message}`);
  return (data as ReferenceSpecRow | null) ?? null;
}

/** The newest spec for each of several sources, for the Design tab. */
export async function latestSpecs(keys: string[]): Promise<Map<string, ReferenceSpecRow>> {
  const out = new Map<string, ReferenceSpecRow>();
  if (!keys.length) return out;
  const { data, error } = await db().from(TABLE).select('*').in('source_key', keys).order('created_at', { ascending: false });
  if (error) return out;
  for (const row of (data ?? []) as ReferenceSpecRow[]) if (!out.has(row.source_key)) out.set(row.source_key, row);
  return out;
}

export async function saveSpec(row: Omit<ReferenceSpecRow, 'id' | 'created_at'>): Promise<ReferenceSpecRow> {
  const { data, error } = await db().from(TABLE).insert(row).select('*').single();
  if (error || !data) throw new Error(`Saving the reference spec failed: ${error?.message ?? 'unknown'}`);
  return data as ReferenceSpecRow;
}
