import 'server-only';
import { createSupabaseAdminClient } from './supabase/admin';

export interface VoucherCheck {
  valid: boolean;
  id?: string;
  percent?: number;
  scope?: 'one_time' | 'recurring' | 'both';
}

/** Server-side voucher validation (service role — vouchers are not anon-readable). */
export async function validateVoucherCode(code: string): Promise<VoucherCheck> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('vouchers')
    .select('id, percent, scope, valid_from, valid_until, max_redemptions, redemption_count, active')
    .eq('code', code.trim().toUpperCase())
    .maybeSingle();

  if (!data || !data.active) return { valid: false };
  const now = new Date();
  if (data.valid_from && new Date(data.valid_from) > now) return { valid: false };
  if (data.valid_until && new Date(data.valid_until) < now) return { valid: false };
  if (data.max_redemptions != null && data.redemption_count >= data.max_redemptions) {
    return { valid: false };
  }
  return { valid: true, id: data.id, percent: data.percent, scope: data.scope };
}
