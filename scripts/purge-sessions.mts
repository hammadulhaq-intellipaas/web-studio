/**
 * Housekeeping for `funnel_sessions`: removes abandoned rows that carry no information —
 * unbound (no lead points at them), owning no uploads, and either never got past the
 * landing page (no persona, older than 2 days) or are older than 90 days.
 *
 * Dry run by default; pass --apply to delete.
 *
 *   node scripts/purge-sessions.mts            # preview
 *   node scripts/purge-sessions.mts --apply    # delete
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].trim().replace(/^"|"$/g, '');
    }
  } catch {
    /* rely on process.env */
  }
  return { ...out, ...(process.env as Record<string, string>) };
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const apply = process.argv.includes('--apply');

const DAY = 24 * 60 * 60_000;
const now = Date.now();

const { data: sessions, error } = await db.from('funnel_sessions').select('id, updated_at, state').order('updated_at').limit(5000);
if (error) throw new Error(error.message);

const { data: bound, error: boundError } = await db.from('leads').select('session_id').not('session_id', 'is', null);
if (boundError && !/session_id/.test(boundError.message)) throw new Error(boundError.message);
if (boundError) console.log('quotes migration not applied yet: no session can be bound to a lead');
const boundIds = new Set((bound ?? []).map((r) => r.session_id as string));
const { data: withFiles } = await db.from('lead_files').select('session_id').not('session_id', 'is', null);
const fileIds = new Set((withFiles ?? []).map((r) => r.session_id as string));

type Row = { id: string; updated_at: string; state: { persona?: string | null; step?: string } | null };
const candidates = ((sessions ?? []) as Row[]).filter((s) => {
  if (boundIds.has(s.id) || fileIds.has(s.id)) return false;
  const age = now - Date.parse(s.updated_at);
  const noPersona = !s.state?.persona;
  return (noPersona && age > 2 * DAY) || age > 90 * DAY;
});

console.log(`sessions total: ${sessions?.length ?? 0}`);
console.log(`bound to a lead: ${boundIds.size}, owning uploads: ${fileIds.size}`);
console.log(`to purge: ${candidates.length} (no persona & >2 d, or >90 d, unbound, no files)`);

if (!apply) {
  console.log('dry run — pass --apply to delete');
  process.exit(0);
}

let deleted = 0;
for (let i = 0; i < candidates.length; i += 100) {
  const ids = candidates.slice(i, i + 100).map((c) => c.id);
  const { error: delError } = await db.from('funnel_sessions').delete().in('id', ids);
  if (delError) throw new Error(delError.message);
  deleted += ids.length;
}
console.log(`deleted ${deleted} sessions`);
