// Public Supabase config. Both references are literal so Next.js inlines them
// at build time (client + server); the `||` resolves at runtime.
// Supports the new key naming (PUBLISHABLE) and the legacy one (ANON).
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export const SUPABASE_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
