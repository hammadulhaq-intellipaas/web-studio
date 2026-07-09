'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const LINKS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/leads', label: 'Leads' },
  { href: '/admin/calendar', label: 'Calendar' },
  { href: '/admin/catalog', label: 'Catalog' },
  { href: '/admin/vouchers', label: 'Vouchers' },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/admin/login') return null;

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
        <Link href="/admin" className="flex items-center gap-2">
          <Image src="/intellipaas-logo.png" alt="" width={30} height={30} className="h-[30px] w-[30px] object-cover" />
          <span className="text-sm font-extrabold tracking-tight">
            Web Studio <span className="text-blue-600">Admin</span>
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
        <button
          onClick={signOut}
          data-testid="admin-signout"
          className="ml-auto rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
