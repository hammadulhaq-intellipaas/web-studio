'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signIn = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/admin');
    router.refresh();
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <form
        onSubmit={signIn}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="mb-6 flex items-center gap-3">
          <Image src="/intellipaas-logo.png" alt="" width={40} height={40} className="h-10 w-10 object-cover" />
          <div>
            <div className="text-base font-extrabold tracking-tight">Web Studio Admin</div>
            <div className="text-xs text-slate-500">Sign in with your admin account</div>
          </div>
        </div>
        <label className="mb-1 block text-sm font-semibold">Email</label>
        <input
          type="email"
          data-testid="admin-email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          required
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <label className="mb-1 block text-sm font-semibold">Password</label>
        <input
          type="password"
          data-testid="admin-password"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          required
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        {error && <div className="mb-4 text-sm font-medium text-red-600">{error}</div>}
        <button
          type="submit"
          disabled={busy}
          data-testid="admin-login-submit"
          className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
