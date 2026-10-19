import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { LocalTime } from '@/components/admin/LocalTime';
import { OnboardingRemoveButton } from '@/components/admin/OnboardingRemoveButton';
import { ONB_STATUS_COLORS } from '@/lib/admin/format';
import type { OnboardingFormRecord } from '@/lib/onboarding/types';

export const dynamic = 'force-dynamic';

const STATUSES = ['all', 'in_progress', 'review', 'brief', 'confirmed', 'removed'] as const;
const COLUMNS = 'id, locale, status, name, company, email, flags, current_step, created_at, updated_at, confirmed';

/**
 * Every onboarding form, newest first: who, where they are, what flags the team needs to act
 * on. Removed forms (`archived_at`) are out of the list unless "removed" is picked.
 */
export default async function OnboardingListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const removedView = status === 'removed';
  const build = (withArchive: boolean) => {
    let query = supabase
      .from('onboarding_forms')
      .select(withArchive ? `${COLUMNS}, archived_at` : COLUMNS)
      .order('updated_at', { ascending: false })
      .limit(200);
    if (status && status !== 'all' && !removedView) query = query.eq('status', status);
    if (withArchive) query = removedView ? query.not('archived_at', 'is', null) : query.is('archived_at', null);
    if (q) query = query.or(`email.ilike.%${q}%,company.ilike.%${q}%,name.ilike.%${q}%,id.ilike.%${q}%`);
    return query;
  };
  let { data, error } = await build(true);
  // Before migration 20261019000019 there is no archived_at: list everything, nothing is removed.
  const archiveReady = !error;
  if (error) ({ data, error } = removedView ? { data: [], error: null } : await build(false));
  const forms = (data ?? []) as unknown as (OnboardingFormRecord & { archived_at?: string | null })[];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Onboarding forms</h1>

      <form className="mb-4 flex flex-wrap items-center gap-3" action="/admin/onboarding" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search company, name, email, id…"
          data-testid="onb-admin-search"
          className="w-72 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={`/admin/onboarding?${new URLSearchParams({ ...(q ? { q } : {}), status: s })}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                (status ?? 'all') === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {s.replace('_', ' ')}
            </Link>
          ))}
        </div>
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
          Search
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3 font-bold">Client</th>
              <th className="px-5 py-3 font-bold">Status</th>
              <th className="px-5 py-3 font-bold">Step</th>
              <th className="px-5 py-3 font-bold">Flags</th>
              <th className="px-5 py-3 font-bold">Lang</th>
              <th className="px-5 py-3 font-bold">Updated</th>
              <th className="px-5 py-3 font-bold" aria-label="Actions" />
            </tr>
          </thead>
          <tbody data-testid="onb-admin-table">
            {forms.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                  {removedView ? (archiveReady ? 'No removed forms.' : 'Removing forms needs migration 20261019000019 first.') : 'No onboarding forms yet.'}
                </td>
              </tr>
            ) : (
              forms.map((f) => {
                const sales = f.flags.filter((x) => x.severity === 'sales').length;
                const warn = f.flags.filter((x) => x.severity === 'warn').length;
                return (
                  <tr key={f.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link href={`/admin/onboarding/${f.id}`} className="font-semibold text-blue-700 hover:underline" data-testid={`onb-admin-row-${f.id}`}>
                        {f.company || f.name || f.email || f.id}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {f.name ? `${f.name} · ` : ''}
                        {f.email ?? <span className="text-slate-400">no contact yet</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ${ONB_STATUS_COLORS[f.status] ?? ''}`}>{f.status.replace('_', ' ')}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{f.current_step ?? '—'}</td>
                    <td className="whitespace-nowrap px-5 py-3">
                      {sales > 0 && <span className="mr-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">{sales} sales</span>}
                      {warn > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{warn} warn</span>}
                      {!sales && !warn && <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-3 uppercase text-slate-500">{f.locale}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500">
                      <LocalTime iso={f.updated_at} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <OnboardingRemoveButton id={f.id} label={f.company || f.name || f.email || f.id} archived={!!f.archived_at} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
