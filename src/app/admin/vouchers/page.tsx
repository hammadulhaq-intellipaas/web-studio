import { createSupabaseServerClient } from '@/lib/supabase/server';
import { VoucherEditor, type VoucherRow } from '@/components/admin/VoucherEditor';

export const dynamic = 'force-dynamic';

export default async function VouchersPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('vouchers').select('*').order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Vouchers</h1>
      <VoucherEditor vouchers={(data ?? []) as VoucherRow[]} />
    </div>
  );
}
