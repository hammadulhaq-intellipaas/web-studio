import Link from 'next/link';
import { LEAD_STATUSES } from '@/lib/types';
import { loadLeadList, type LeadListFilter } from '@/lib/quotes/admin';
import { customerLink } from '@/lib/quotes/links';
import { toTableRow } from '@/lib/quotes/list-rows';
import { LeadsTable } from '@/components/admin/leads/LeadsTable';
import { MigrationNotice } from '@/components/admin/leads/MigrationNotice';
import { NewQuoteDialog } from '@/components/admin/leads/NewQuoteDialog';

export const dynamic = 'force-dynamic';

const FILTERS: { key: LeadListFilter; label: string }[] = [
  { key: 'open', label: 'Open' },
  ...LEAD_STATUSES.map((s) => ({ key: s as LeadListFilter, label: s })),
  { key: 'all', label: 'All' },
  { key: 'archived', label: 'Removed' },
];

function isFilter(v: string | undefined): v is LeadListFilter {
  return !!v && FILTERS.some((f) => f.key === v);
}

/**
 * Every lead as a quote in the pipeline: who, what they configured, where it stands,
 * who owns it and what happened last. "Remove" hides a lead (nothing is deleted); the
 * Removed tab brings it back.
 */
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  // `status=all` used to be the default; unknown values fall back to the open pipeline.
  const filter: LeadListFilter = isFilter(status) ? status : q ? 'all' : 'open';
  const { ready, rows, counts } = await loadLeadList(filter, q);
  const tableRows = rows.map((l) => toTableRow(l, ready && l.session_id ? customerLink(l.session_id, l.locale) : null));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Leads <span className="text-base font-semibold text-slate-400">{counts.all}</span>
        </h1>
        <div className="ml-auto">
          <NewQuoteDialog disabled={!ready} />
        </div>
      </div>

      {!ready && <MigrationNotice />}

      <form className="mb-4 flex flex-wrap items-center gap-3" action="/admin/leads" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search name, company, email…"
          data-testid="lead-search"
          className="w-72 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        {status && <input type="hidden" name="status" value={status} />}
        <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700">
          Search
        </button>
      </form>

      <div className="mb-4 flex flex-wrap gap-1" data-testid="lead-filters">
        {FILTERS.map((f) => {
          const count = counts[f.key] ?? 0;
          if (f.key === 'draft' && count === 0 && !ready) return null;
          const active = filter === f.key;
          return (
            <Link
              key={f.key}
              href={`/admin/leads?${new URLSearchParams({ ...(q ? { q } : {}), status: f.key })}`}
              data-testid={`lead-filter-${f.key}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize ${
                active ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
              } ${f.key === 'archived' ? 'ml-auto' : ''}`}
            >
              {f.label} <span className={active ? 'text-slate-300' : 'text-slate-400'}>{count}</span>
            </Link>
          );
        })}
      </div>

      <LeadsTable rows={tableRows} ready={ready} archivedView={filter === 'archived'} />
    </div>
  );
}
