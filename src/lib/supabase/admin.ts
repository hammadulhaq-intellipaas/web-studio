import 'server-only';
import { createClient } from '@supabase/supabase-js';

/** Service-role client — server only. Used for public-side writes (leads, uploads, vouchers). */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
