/**
 * Applies the onboarding form definition in supabase/seed/onboarding/ to the linked
 * Supabase project. Same content and same effect as the generated upsert migration
 * (20260923000014_onboarding_v2.sql) — this is the route for a machine that has the
 * service-role key but no database password.
 *
 *   node scripts/apply-onboarding-seed.mts            # show what would change
 *   node scripts/apply-onboarding-seed.mts --apply
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import {
  briefSections,
  examples,
  fields,
  flagRules,
  followups,
  prompts,
  screens,
  texts,
} from '../supabase/seed/onboarding/index.ts';
import { retiredFieldIds } from '../supabase/seed/onboarding/fields.ts';

const env: Record<string, string> = { ...(process.env as Record<string, string>) };
try {
  for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^"|"$/g, '');
  }
} catch {
  /* env vars may come from the environment instead */
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const apply = process.argv.includes('--apply');

const tables = [
  ['onb_screens', screens],
  ['onb_fields', fields],
  ['onb_followups', followups],
  ['onb_flag_rules', flagRules],
  ['onb_brief_sections', briefSections],
  ['onb_texts', texts],
  ['onb_prompts', prompts],
  ['onb_examples', examples],
] as const;

for (const [table, rows] of tables) {
  console.log(`${table}: ${rows.length} rows`);
  if (!apply) continue;
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await db.from(table).upsert(batch as never[], { onConflict: 'id' });
    if (!error) continue;
    // `onb_prompts.id` has a check constraint; widening it needs the SQL migration. Until
    // then the assist prompt lives in code (src/lib/onboarding/ai/assist.ts) and is skipped here.
    if (table === 'onb_prompts' && /onb_prompts_id_check/.test(error.message)) {
      const known = batch.filter((r) => (r as { id: string }).id !== 'assist');
      const retry = await db.from(table).upsert(known as never[], { onConflict: 'id' });
      if (retry.error) throw new Error(`${table}: ${retry.error.message}`);
      console.log('  note: onb_prompts.assist skipped — run the v2 migration to allow that id');
      continue;
    }
    throw new Error(`${table}: ${error.message}`);
  }
}

console.log(`retired fields: ${retiredFieldIds.length}`);
if (apply) {
  const { error } = await db.from('onb_fields').update({ active: false }).in('id', retiredFieldIds);
  if (error) throw new Error(`retire: ${error.message}`);
  // The build takes 3 weeks in the 23 Sep 2026 terms; the date-conflict flag uses this.
  for (const key of ['onb_build_weeks_min', 'onb_build_weeks_max']) {
    const { error: e } = await db.from('app_settings').update({ value: 3 }).eq('key', key);
    if (e) throw new Error(`${key}: ${e.message}`);
  }
}

console.log(apply ? 'applied' : 'dry run — pass --apply to write');
