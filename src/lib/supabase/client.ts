'use client';
import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from './env';

export function createSupabaseBrowserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
}
