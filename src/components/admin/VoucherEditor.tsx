'use client';

import { useState, useTransition } from 'react';
import { createVoucher, deleteVoucher, updateVoucher } from '@/app/admin/vouchers/actions';

export interface VoucherRow {
  id: string;
  code: string;
  percent: number;
  scope: string;
  valid_from: string | null;
  valid_until: string | null;
  max_redemptions: number | null;
  redemption_count: number;
  active: boolean;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function VoucherForm({
  row,
  onSubmit,
  submitLabel,
}: {
  row: VoucherRow | null;
  onSubmit: (values: Record<string, string>) => Promise<{ ok: boolean; error?: string }>;
  submitLabel: string;
}) {
  const [values, setValues] = useState<Record<string, string>>({
    code: row?.code ?? '',
    percent: row ? String(row.percent) : '10',
    scope: row?.scope ?? 'both',
    valid_from: toLocalInput(row?.valid_from ?? null),
    valid_until: toLocalInput(row?.valid_until ?? null),
    max_redemptions: row?.max_redemptions != null ? String(row.max_redemptions) : '',
    active: row ? String(row.active) : 'true',
  });
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (k: string, v: string) => setValues((prev) => ({ ...prev, [k]: v }));

  const submit = () =>
    startTransition(async () => {
      setMsg(null);
      const result = await onSubmit(values);
      setMsg(result.ok ? { ok: true, text: 'Saved ✓' } : { ok: false, text: result.error ?? 'Failed' });
    });

  const input = 'w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none';

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div>
        <label className="mb-1 block text-xs font-bold text-slate-500">Code</label>
        <input value={values.code} onChange={(ev) => set('code', ev.target.value.toUpperCase())} className={input} data-testid="voucher-code" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-slate-500">Percent</label>
        <input type="number" min={1} max={100} value={values.percent} onChange={(ev) => set('percent', ev.target.value)} className={input} data-testid="voucher-percent" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-slate-500">Scope</label>
        <select value={values.scope} onChange={(ev) => set('scope', ev.target.value)} className={input}>
          <option value="both">one-time + recurring</option>
          <option value="one_time">one-time only</option>
          <option value="recurring">recurring only</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-slate-500">Active</label>
        <select value={values.active} onChange={(ev) => set('active', ev.target.value)} className={input}>
          <option value="true">active</option>
          <option value="false">inactive</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-slate-500">Valid from</label>
        <input type="datetime-local" value={values.valid_from} onChange={(ev) => set('valid_from', ev.target.value)} className={input} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-slate-500">Valid until</label>
        <input type="datetime-local" value={values.valid_until} onChange={(ev) => set('valid_until', ev.target.value)} className={input} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-slate-500">Max redemptions</label>
        <input type="number" min={0} value={values.max_redemptions} onChange={(ev) => set('max_redemptions', ev.target.value)} placeholder="∞" className={input} />
      </div>
      <div className="flex items-end gap-3">
        <button
          onClick={submit}
          disabled={pending || !values.code}
          data-testid="voucher-save"
          className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? 'Saving…' : submitLabel}
        </button>
        {msg && (
          <span className={`text-sm font-semibold ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</span>
        )}
      </div>
    </div>
  );
}

export function VoucherEditor({ vouchers }: { vouchers: VoucherRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  return (
    <div>
      <div className="mb-6 rounded-xl border-2 border-dashed border-blue-300 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">New voucher</h2>
        <VoucherForm row={null} onSubmit={(v) => createVoucher(v)} submitLabel="Create" />
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {vouchers.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No vouchers yet.</div>
        ) : (
          vouchers.map((v) => (
            <div key={v.id} className="border-b border-slate-100 last:border-0">
              <button
                onClick={() => setOpen(open === v.id ? null : v.id)}
                className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm hover:bg-slate-50"
                data-testid={`voucher-row-${v.code}`}
              >
                <span className="font-mono font-bold">{v.code}</span>
                <span className="font-semibold text-emerald-700">−{v.percent}%</span>
                <span className="text-xs text-slate-500">{v.scope}</span>
                <span className="text-xs text-slate-400">
                  {v.redemption_count}
                  {v.max_redemptions != null ? `/${v.max_redemptions}` : ''} used
                </span>
                {!v.active && (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-500">
                    inactive
                  </span>
                )}
                <span className="ml-auto text-slate-400">{open === v.id ? '▴' : '▾'}</span>
              </button>
              {open === v.id && (
                <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
                  <VoucherForm row={v} onSubmit={(values) => updateVoucher(v.id, values)} submitLabel="Save" />
                  <button
                    onClick={() =>
                      startTransition(async () => {
                        if (confirm(`Delete voucher ${v.code}?`)) {
                          await deleteVoucher(v.id);
                          setOpen(null);
                        }
                      })
                    }
                    className="mt-3 text-sm font-semibold text-red-600 hover:underline"
                  >
                    Delete voucher
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
