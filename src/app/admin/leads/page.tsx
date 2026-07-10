import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { eur, STATUS_COLORS } from '@/lib/admin/format';
import { LocalTime } from '@/components/admin/LocalTime';
import type { Lead } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUSES = ['all', 'new', 'contacted', 'won', 'lost'] as const;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const supabase = await createSupabaseServerClient();

  let query = supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(200);
  if (status && status !== 'all') query = query.eq('status', status);
  if (q) {
    query = query.or(
      `email.ilike.%${q}%,firma.ilike.%${q}%,vorname.ilike.%${q}%,nachname.ilike.%${q}%`,
    );
  }
  const { data } = await query;
  const leads = (data ?? []) as Lead[];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Leads</h1>

      <form className="mb-4 flex flex-wrap items-center gap-3" action="/admin/leads" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search name, company, email…"
          data-testid="lead-search"
          className="w-72 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={`/admin/leads?${new URLSearchParams({ ...(q ? { q } : {}), status: s })}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                (status ?? 'all') === s
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {s}
            </Link>
          ))}
        </div>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          Search
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3 font-bold">Lead</th>
              <th className="px-5 py-3 font-bold">Bundle</th>
              <th className="px-5 py-3 font-bold">One-time</th>
              <th className="px-5 py-3 font-bold">Monthly</th>
              <th className="px-5 py-3 font-bold">Persona</th>
              <th className="px-5 py-3 font-bold">Status</th>
              <th className="px-5 py-3 font-bold">Created</th>
            </tr>
          </thead>
          <tbody data-testid="leads-table">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                  No leads found.
                </td>
              </tr>
            ) : (
              leads.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link href={`/admin/leads/${l.id}`} className="font-semibold text-blue-700 hover:underline">
                      {[l.vorname, l.nachname].filter(Boolean).join(' ') || l.email}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {l.firma ? `${l.firma} · ` : ''}
                      {l.email}
                    </div>
                  </td>
                  <td className="px-5 py-3">{l.config?.bundleName}</td>
                  <td className="px-5 py-3 font-semibold">{eur(l.total_one_time)}</td>
                  <td className="px-5 py-3">{eur(l.total_monthly)}/mo.</td>
                  <td className="px-5 py-3 text-slate-500">{l.persona_id ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLORS[l.status]}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500">
                    <LocalTime iso={l.created_at} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
