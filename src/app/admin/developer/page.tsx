import Link from 'next/link';
import { LocalTime } from '@/components/admin/LocalTime';
import { ONB_STATUS_COLORS, STATUS_COLORS } from '@/lib/admin/format';
import { loadDeveloperCards } from '@/lib/developer/clients';
import { parseView, promptsReady, type DeveloperView } from '@/lib/developer/filters';

export const dynamic = 'force-dynamic';

const VIEWS: { id: DeveloperView; label: string }[] = [
  { id: 'all', label: 'All quotes' },
  { id: 'committed', label: 'Committed' },
];

/**
 * One card per client quote. Clicking a card opens the client's Design, Build and Handover
 * tabs. Phase 1 generates prompts from the confirmed onboarding form, so each card shows
 * whether that form is ready.
 */
export default async function DeveloperListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string }>;
}) {
  const { q, view: rawView } = await searchParams;
  const view = parseView(rawView);
  const { cards, counts } = await loadDeveloperCards(view, q);

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight">Developers</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        One card per client quote. Design and build prompts are generated from the confirmed onboarding form.
      </p>

      <form className="mb-4 flex flex-wrap items-center gap-3" action="/admin/developer" method="get">
        <input type="hidden" name="view" value={view} />
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search company, name, email…"
          data-testid="dev-search"
          className="w-72 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <div className="flex gap-1">
          {VIEWS.map((v) => (
            <Link
              key={v.id}
              href={`/admin/developer?${new URLSearchParams({ ...(q ? { q } : {}), view: v.id })}`}
              data-testid={`dev-view-${v.id}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                view === v.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {v.label} <span className="opacity-60">{counts[v.id]}</span>
            </Link>
          ))}
        </div>
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
          Search
        </button>
      </form>

      {cards.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500" data-testid="dev-empty">
          {view === 'committed'
            ? 'No committed quotes. A quote shows up here once it is accepted, agreed or won, or once its onboarding form is under way.'
            : 'No quotes found.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="dev-cards">
          {cards.map((c) => {
            const ready = promptsReady(c.onboardingStatus);
            return (
              <Link
                key={c.id}
                href={`/admin/developer/${c.id}`}
                data-testid={`dev-card-${c.id}`}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-bold">{c.company || c.name || c.email}</div>
                    <div className="truncate text-xs text-slate-500">
                      {c.company && c.name ? `${c.name} · ` : ''}
                      {c.email}
                    </div>
                  </div>
                  <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLORS[c.leadStatus] ?? ''}`}>
                    {c.leadStatus}
                  </span>
                </div>
                <div className="mb-4 mt-3 text-sm text-slate-600">{c.bundleName ?? <span className="text-slate-400">No package chosen</span>}</div>
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    Onboarding
                    <span className={`rounded-full px-2 py-0.5 font-bold ${c.onboardingStatus ? ONB_STATUS_COLORS[c.onboardingStatus] ?? '' : 'bg-slate-100 text-slate-500'}`}>
                      {c.onboardingStatus ? c.onboardingStatus.replace('_', ' ') : 'not started'}
                    </span>
                  </span>
                  {ready ? (
                    <span className="font-bold text-emerald-700">Ready for prompts</span>
                  ) : (
                    <span className="text-slate-400">
                      <LocalTime iso={c.createdAt} />
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
