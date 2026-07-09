import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from './env';

/** Cookie-bound client for server components / route handlers (admin session). */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_PUBLIC_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — session refresh happens in proxy.ts.
          }
        },
      },
    },
  );
}
