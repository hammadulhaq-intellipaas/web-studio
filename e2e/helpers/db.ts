// Service-role Supabase client for the e2e suite: seeding assertions, snapshot/restore
// of catalog rows, and teardown cleanup. Bypasses RLS — test-only, never shipped.
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SERVICE_ROLE_KEY } from './env';

export const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function getLeadByEmail(email: string) {
  const { data } = await db
    .from('leads')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getAppointmentsByLead(leadId: string) {
  const { data } = await db.from('appointments').select('*').eq('lead_id', leadId);
  return data ?? [];
}

/** Read a single column value from a catalog row (for snapshot/restore). */
export async function snapshotField(table: string, id: string, field: string): Promise<unknown> {
  const { data } = await db.from(table).select(field).eq('id', id).single();
  return (data as Record<string, unknown> | null)?.[field];
}

export async function setField(table: string, id: string, field: string, value: unknown) {
  const { error } = await db.from(table).update({ [field]: value }).eq('id', id);
  if (error) throw new Error(`[e2e] setField ${table}.${field} failed: ${error.message}`);
}

export async function getSetting(key: string): Promise<unknown> {
  const { data } = await db.from('app_settings').select('value').eq('key', key).maybeSingle();
  return data?.value;
}

export async function setSetting(key: string, value: unknown) {
  const { error } = await db
    .from('app_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw new Error(`[e2e] setSetting ${key} failed: ${error.message}`);
}

export async function insertVoucher(input: {
  code: string;
  percent: number;
  scope?: string;
  valid_until?: string | null;
  max_redemptions?: number | null;
  redemption_count?: number;
  active?: boolean;
}) {
  const { error } = await db.from('vouchers').insert({
    code: input.code,
    percent: input.percent,
    scope: input.scope ?? 'both',
    valid_until: input.valid_until ?? null,
    max_redemptions: input.max_redemptions ?? null,
    redemption_count: input.redemption_count ?? 0,
    active: input.active ?? true,
  });
  if (error) throw new Error(`[e2e] insertVoucher ${input.code} failed: ${error.message}`);
}

export async function deleteVoucherByCode(code: string) {
  await db.from('vouchers').delete().eq('code', code);
}

/** Whether the quotes-pipeline migration (lead_versions etc.) is applied on the target DB. */
export async function quotesSchemaReady(): Promise<boolean> {
  // A real GET: a HEAD on an unknown table answers 204 and would look "ready".
  const { error } = await db.from('lead_versions').select('id').limit(1);
  return !error;
}

/**
 * Remove everything this suite created on the shared cloud DB.
 * Deleting a lead cascades to lead_files, suggested_plans, lead_versions and lead_activity;
 * appointments are ON DELETE SET NULL, so we delete those explicitly by their test markers.
 * Funnel sessions are collected first (the leads' `session_id` marker disappears with the
 * lead), their un-adopted files removed (the owner check forbids orphaning them), then the
 * sessions themselves.
 */
export async function cleanupTestData() {
  await db.from('appointments').delete().ilike('invitee_email', 'e2e-%@example.com');
  await db.from('appointments').delete().ilike('calendly_event_uri', 'e2e://%');

  const sessionIds = new Set<string>();
  const { data: byLead } = await db.from('leads').select('session_id').ilike('email', 'e2e-%@example.com');
  for (const row of (byLead ?? []) as { session_id?: string | null }[]) if (row.session_id) sessionIds.add(row.session_id);
  const { data: byState } = await db.from('funnel_sessions').select('id').ilike('state->lead->>email', 'e2e-%@example.com');
  for (const row of byState ?? []) sessionIds.add(row.id);
  const ids = Array.from(sessionIds);
  if (ids.length) {
    const { data: files } = await db.from('lead_files').select('storage_path').in('session_id', ids).is('lead_id', null);
    const paths = (files ?? []).map((f) => f.storage_path).filter(Boolean);
    if (paths.length) await db.storage.from('lead-uploads').remove(paths);
    await db.from('lead_files').delete().in('session_id', ids).is('lead_id', null);
  }

  await db.from('leads').delete().ilike('email', 'e2e-%@example.com');
  if (ids.length) await db.from('funnel_sessions').delete().in('id', ids);
  await db.from('vouchers').delete().ilike('code', 'E2E%');
  // Onboarding forms cascade to their briefs, AI log and upload rows. Every test fills the
  // contact email first, so the marker covers forms abandoned mid-test as well. The objects
  // themselves (uploads in `<id>/<field>/`, PDFs in `<id>/`) do not cascade: remove the
  // form's folder first.
  const { data: forms } = await db.from('onboarding_forms').select('id').ilike('email', 'e2e-%@example.com');
  for (const f of forms ?? []) {
    const paths: string[] = [];
    const { data: top } = await db.storage.from('onboarding-uploads').list(f.id);
    for (const o of top ?? []) {
      if (o.id) paths.push(`${f.id}/${o.name}`);
      else {
        const { data: inner } = await db.storage.from('onboarding-uploads').list(`${f.id}/${o.name}`);
        for (const i of inner ?? []) paths.push(`${f.id}/${o.name}/${i.name}`);
      }
    }
    if (paths.length) await db.storage.from('onboarding-uploads').remove(paths);
  }
  await db.from('onboarding_forms').delete().ilike('email', 'e2e-%@example.com');
}
