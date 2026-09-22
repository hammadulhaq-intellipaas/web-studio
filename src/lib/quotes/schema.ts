import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/** The migration that adds the quotes pipeline (`supabase/migrations/…`). */
export const QUOTES_MIGRATION = '20260922000012_quotes_pipeline.sql';

let cached: { ready: boolean; at: number } | null = null;

/**
 * Whether the quotes-pipeline migration has been applied to the database. The code ships
 * ahead of the SQL (the schema is changed by hand in the Supabase SQL editor), so every
 * new write path checks this and keeps the legacy behaviour until the tables exist.
 * Cached per server instance: 10 minutes once ready (a schema never goes back), 20 seconds
 * while pending so the switch is picked up quickly after the migration runs.
 */
export async function quotesSchemaReady(): Promise<boolean> {
  const now = Date.now();
  if (cached && now - cached.at < (cached.ready ? 10 * 60_000 : 20_000)) return cached.ready;
  const admin = createSupabaseAdminClient();
  // A real GET: PostgREST answers a HEAD on an unknown table with 204, which would read as "ready".
  const { error } = await admin.from('lead_versions').select('id').limit(1);
  const ready = !error;
  if (error && !/lead_versions|schema cache|does not exist/i.test(error.message)) {
    // A transient failure must not flip a ready database back to legacy mode.
    if (cached?.ready) return true;
  }
  cached = { ready, at: now };
  return ready;
}

/** Test hook. */
export function resetQuotesSchemaCache() {
  cached = null;
}
