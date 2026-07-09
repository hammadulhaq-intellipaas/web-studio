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

/**
 * Remove everything this suite created on the shared cloud DB.
 * Deleting a lead cascades to lead_files + suggested_plans; appointments are
 * ON DELETE SET NULL, so we delete those explicitly by their test markers.
 */
export async function cleanupTestData() {
  await db.from('appointments').delete().ilike('invitee_email', 'e2e-%@example.com');
  await db.from('appointments').delete().ilike('calendly_event_uri', 'e2e://%');
  await db.from('leads').delete().ilike('email', 'e2e-%@example.com');
  await db.from('vouchers').delete().ilike('code', 'E2E%');
}
