'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { archiveLeads } from '@/app/admin/leads/actions';
import { eur, relativeTime, STATUS_COLORS } from '@/lib/admin/format';
import type { LeadsTableRow } from '@/lib/quotes/list-rows';
import { StatusSelect } from '@/components/admin/StatusSelect';
import { LocalTime } from '@/components/admin/LocalTime';

function initials(email: string): string {
  const local = email.split('@')[0] ?? '';
  const parts = local.split(/[._-]/).filter(Boolean);
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : local.slice(0, 2)).toUpperCase();
}

export function LeadsTable({ rows, ready, archivedView }: { rows: LeadsTableRow[]; ready: boolean; archivedView: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const ids = useMemo(() => Array.from(selected), [selected]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));

  const archive = (targets: string[], archived: boolean) =>
    start(async () => {
      const r = await archiveLeads(targets, archived);
      setMessage(r.ok ? (r.message ?? 'Done') : r.error);
      setSelected(new Set());
      router.refresh();
    });

  const copy = async (row: LeadsTableRow) => {
    if (!row.customerLink) return;
    try {
      await navigator.clipboard.writeText(row.customerLink);
      setCopied(row.id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div>
      {ids.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm" data-testid="leads-bulk-bar">
          <span className="font-semibold">{ids.length} selected</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => archive(ids, !archivedView)}
            data-testid="leads-bulk-archive"
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {archivedView ? 'Restore selected' : 'Remove selected'}
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="text-xs font-semibold text-slate-500 hover:text-slate-800">
            Clear
          </button>
          {pending && <span className="text-xs text-slate-500">Working…</span>}
        </div>
      )}
      {message && !ids.length && (
        <div className="mb-3 text-sm font-semibold text-emerald-700" data-testid="leads-message">
          {message}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="w-10 px-4 py-3">
                {ready && (
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" data-testid="leads-select-all" className="h-4 w-4 accent-blue-600" />
                )}
              </th>
              <th className="px-4 py-3 font-bold">Lead</th>
              <th className="px-4 py-3 font-bold">Quote</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Owner</th>
              <th className="px-4 py-3 font-bold">Activity</th>
              <th className="px-4 py-3 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody data-testid="leads-table">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                  {archivedView ? 'Nothing removed yet.' : 'No leads found.'}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  data-testid={`lead-row-${r.id}`}
                  className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 ${selected.has(r.id) ? 'bg-blue-50/60' : ''}`}
                >
                  <td className="px-4 py-3 align-top">
                    {ready && (
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggle(r.id)}
                        aria-label={`Select ${r.name || r.email}`}
                        data-testid={`lead-select-${r.id}`}
                        className="mt-1 h-4 w-4 accent-blue-600"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Link href={`/admin/leads/${r.id}`} className="font-semibold text-slate-900 hover:text-blue-700 hover:underline">
                      {r.name || r.firma || r.email}
                    </Link>
                    {r.source === 'team' && (
                      <span className="ml-2 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">team</span>
                    )}
                    <div className="text-xs text-slate-500">
                      {r.firma && r.name ? <span className="font-semibold text-slate-600">{r.firma} · </span> : null}
                      {r.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-semibold">
                      {r.bundleName}
                      {r.addonCount > 0 && <span className="font-normal text-slate-500"> + {r.addonCount} add-on{r.addonCount === 1 ? '' : 's'}</span>}
                    </div>
                    <div className="whitespace-nowrap text-xs text-slate-500">
                      {eur(r.oneTime)} · {eur(r.monthly)}/mo.
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {ready ? (
                      <StatusSelect leadId={r.id} status={r.status} compact />
                    ) : (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLORS[r.status] ?? ''}`}>{r.status}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {r.ownerEmail ? (
                      <span className="inline-flex items-center gap-2 text-xs text-slate-600" title={r.ownerEmail}>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                          {initials(r.ownerEmail)}
                        </span>
                        {r.ownerEmail.split('@')[0]}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-600">
                    {r.activityLabel ? (
                      <>
                        <div className="max-w-[260px] truncate" title={r.activityLabel}>
                          {r.activityLabel}
                        </div>
                        {r.activityAt && <div className="text-slate-400">{relativeTime(r.activityAt)}</div>}
                      </>
                    ) : (
                      <div className="text-slate-400">
                        Created <LocalTime iso={r.createdAt} />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                      <Link
                        href={`/admin/leads/${r.id}`}
                        data-testid={`lead-open-${r.id}`}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                      >
                        Open
                      </Link>
                      {r.customerLink && (
                        <button
                          type="button"
                          onClick={() => void copy(r)}
                          data-testid={`lead-copy-${r.id}`}
                          title="Copy the customer's quote link"
                          className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${
                            copied === r.id
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'
                          }`}
                        >
                          {copied === r.id ? 'Copied ✓' : 'Copy link'}
                        </button>
                      )}
                      {ready && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => archive([r.id], !r.archived)}
                          data-testid={`lead-archive-${r.id}`}
                          title={r.archived ? 'Show the lead in the list again' : 'Hides the lead, nothing is deleted or closed'}
                          className="rounded-lg border border-transparent px-2.5 py-1 text-xs font-bold text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                        >
                          {r.archived ? 'Restore' : 'Remove'}
                        </button>
                      )}
                    </div>
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
