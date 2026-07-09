'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return supabase;
}

const voucherSchema = z.object({
  code: z.string().min(2).max(64).transform((c) => c.trim().toUpperCase()),
  percent: z.coerce.number().int().min(1).max(100),
  scope: z.enum(['one_time', 'recurring', 'both']),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
  max_redemptions: z.string().optional(),
  active: z.coerce.boolean(),
});

function normalize(input: Record<string, string>) {
  const parsed = voucherSchema.parse(input);
  return {
    code: parsed.code,
    percent: parsed.percent,
    scope: parsed.scope,
    valid_from: parsed.valid_from ? new Date(parsed.valid_from).toISOString() : null,
    valid_until: parsed.valid_until ? new Date(parsed.valid_until).toISOString() : null,
    max_redemptions: parsed.max_redemptions ? Number(parsed.max_redemptions) : null,
    active: parsed.active,
  };
}

export async function createVoucher(input: Record<string, string>): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from('vouchers').insert(normalize(input));
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/vouchers');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invalid input' };
  }
}

export async function updateVoucher(
  id: string,
  input: Record<string, string>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from('vouchers').update(normalize(input)).eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/vouchers');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invalid input' };
  }
}

export async function deleteVoucher(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from('vouchers').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/vouchers');
  return { ok: true };
}
