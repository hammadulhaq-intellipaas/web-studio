'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { markAgreed } from '@/app/admin/leads/actions';
import { eur } from '@/lib/admin/format';
import type { QuoteChange } from '@/lib/quotes/diff';
import { LocalTime } from '@/components/admin/LocalTime';

export interface VersionRow {
  id: string;
  version: number;
  actor: string;
  reason: string;
  createdAt: string;
  oneTime: number;
  monthly: number;
  yearly: number;
  bundleName: string;
  addonCount: number;
  /** What changed against the previous version (empty for v1). */
  changes: QuoteChange[];
  lines: { oneOff: { name: string; price: number }[]; monthly: { name: string; price: number }[]; yearly: { name: string; price: number }[] };
  voucher: string | null;
}

const REASON_LABEL: Record<string, string> = {
  submit: 'submitted',
  idle: 'auto-saved',
  actor_change: 'auto-saved',
  manual: 'saved by the team',
  restore: 'link restored',
  backfill: 'imported',
};

function who(actor: string): string {
  if (actor === 'customer') return 'Customer';
  if (actor.startsWith('team:')) return actor.slice(5);
  return actor;
}

export function ChangeList({ changes }: { changes: QuoteChange[] }) {
  if (!changes.length) return <p className="text-xs text-slate-500">No configuration changes.</p>;
  return (
    <ul className="space-y-0.5 text-xs">
      {changes.map((c, i) => (
        <li key={i} className="flex justify-between gap-3">
          <span>
            {c.kind === 'addon_added' && <span className="font-bold text-emerald-700">+ </span>}
            {c.kind === 'addon_removed' && <span className="font-bold text-red-700">− </span>}
            {c.kind === 'addon_added' || c.kind === 'addon_removed' ? c.label : `${c.label}: ${c.before ?? '—'} → ${c.after ?? '—'}`}
          </span>
          {c.delta != null && c.delta !== 0 && (
            <span className={`whitespace-nowrap font-semibold ${c.delta > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {c.delta > 0 ? '+' : '−'}
              {eur(Math.abs(c.delta))}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Every stored snapshot of the quote, newest first, with what changed and "Mark as agreed". */
export function VersionsTimeline({ leadId, versions, agreedVersionId, ready }: { leadId: string; versions: VersionRow[]; agreedVersionId: string | null; ready: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(versions[0]?.id ?? null);
  const [agreeing, setAgreeing] = useState<string | null>(null);
  const [override, setOverride] = useState<{ oneTime: string; monthly: string }>({ oneTime: '', monthly: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const agree = (v: VersionRow) =>
    start(async () => {
      const r = await markAgreed(leadId, v.id, {
        oneTime: override.oneTime.trim() ? Number(override.oneTime.replace(',', '.')) : null,
        monthly: override.monthly.trim() ? Number(override.monthly.replace(',', '.')) : null,
      });
      setMsg(r.ok ? (r.message ?? 'Agreed') : r.error);
      setAgreeing(null);
      router.refresh();
    });

  if (!versions.length) {
    return <p className="text-sm text-slate-500">{ready ? 'No versions yet.' : 'Version history appears once the migration has been applied.'}</p>;
  }

  return (
    <ol className="space-y-2" data-testid="lead-versions">
      {msg && <li className="text-sm font-semibold text-emerald-700">{msg}</li>}
      {versions.map((v) => {
        const agreed = v.id === agreedVersionId;
        const expanded = open === v.id;
        return (
          <li key={v.id} className={`rounded-xl border ${agreed ? 'border-violet-300 bg-violet-50/60' : 'border-slate-200 bg-white'}`} data-testid={`version-${v.version}`}>
            <button type="button" onClick={() => setOpen(expanded ? null : v.id)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-left text-sm">
              <span className="font-extrabold">v{v.version}</span>
              <span className="text-slate-600">
                {who(v.actor)} · {REASON_LABEL[v.reason] ?? v.reason}
              </span>
              <span className="text-xs text-slate-400">
                <LocalTime iso={v.createdAt} />
              </span>
              {agreed && <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">agreed</span>}
              <span className="ml-auto whitespace-nowrap font-semibold">
                {eur(v.oneTime)} · {eur(v.monthly)}/mo.
              </span>
              <span className="text-slate-400">{expanded ? '▾' : '▸'}</span>
            </button>
            {expanded && (
              <div className="border-t border-slate-100 px-4 py-3">
                <div className="mb-2 text-xs text-slate-500">
                  {v.bundleName}
                  {v.addonCount ? ` + ${v.addonCount} add-on${v.addonCount === 1 ? '' : 's'}` : ''}
                  {v.voucher ? ` · voucher ${v.voucher}` : ''}
                </div>
                {v.version > 1 && (
                  <div className="mb-3">
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Changes vs v{v.version - 1}</div>
                    <ChangeList changes={v.changes} />
                  </div>
                )}
                <details className="text-xs">
                  <summary className="cursor-pointer font-semibold text-slate-600">Lines</summary>
                  <div className="mt-2 space-y-0.5">
                    {v.lines.oneOff.map((l, i) => (
                      <div key={`o${i}`} className="flex justify-between">
                        <span>{l.name}</span>
                        <span>{eur(l.price)}</span>
                      </div>
                    ))}
                    {v.lines.monthly.map((l, i) => (
                      <div key={`m${i}`} className="flex justify-between text-blue-900">
                        <span>{l.name}</span>
                        <span>{eur(l.price)}/mo.</span>
                      </div>
                    ))}
                    {v.lines.yearly.map((l, i) => (
                      <div key={`y${i}`} className="flex justify-between">
                        <span>{l.name}</span>
                        <span>{eur(l.price)}/yr.</span>
                      </div>
                    ))}
                  </div>
                </details>
                {ready && !agreed && (
                  <div className="mt-3">
                    {agreeing === v.id ? (
                      <div className="flex flex-wrap items-end gap-2 text-xs">
                        <label className="font-semibold text-slate-600">
                          One-time (€)
                          <input
                            value={override.oneTime}
                            onChange={(ev) => setOverride((o) => ({ ...o, oneTime: ev.target.value }))}
                            placeholder={String(v.oneTime)}
                            data-testid="agree-one-time"
                            className="mt-1 block w-28 rounded-lg border border-slate-300 px-2 py-1"
                          />
                        </label>
                        <label className="font-semibold text-slate-600">
                          Monthly (€)
                          <input
                            value={override.monthly}
                            onChange={(ev) => setOverride((o) => ({ ...o, monthly: ev.target.value }))}
                            placeholder={String(v.monthly)}
                            data-testid="agree-monthly"
                            className="mt-1 block w-28 rounded-lg border border-slate-300 px-2 py-1"
                          />
                        </label>
                        <button type="button" disabled={pending} onClick={() => agree(v)} data-testid="agree-confirm" className="rounded-lg bg-violet-600 px-3 py-1.5 font-bold text-white hover:bg-violet-700 disabled:opacity-60">
                          Confirm agreed
                        </button>
                        <button type="button" onClick={() => setAgreeing(null)} className="px-2 py-1.5 font-semibold text-slate-500">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setAgreeing(v.id)} data-testid={`mark-agreed-${v.version}`} className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-50">
                        Mark as agreed
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
