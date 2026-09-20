'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { EntityDef } from '@/lib/admin/entities';
import { createEntityRow, deleteEntityRow, saveEntityRow } from '@/app/admin/catalog/actions';

type Row = Record<string, unknown> & { id: string };

/** Rows of other tables a `select` field may pick from, keyed by table name. */
export type LookupRows = Record<string, Row[]>;

function toInputValue(type: string, value: unknown): string {
  if (value == null) return '';
  if (type === 'json') return JSON.stringify(value, null, 2);
  return String(value);
}

/** Best human-readable name a CMS row offers, whatever table it comes from. */
function rowTitle(row: Row): string {
  const raw =
    row.name ?? row.name_de ?? row.label_de ?? row.title_de ?? row.question_de ?? row.title ?? row.key ?? row.code ?? row.id;
  const text = String(raw ?? row.id).trim() || row.id;
  return text.length > 90 ? `${text.slice(0, 88)}…` : text;
}

function RowForm({
  entityKey,
  entity,
  row,
  rows,
  lookups,
  isNew,
  onDone,
}: {
  entityKey: string;
  entity: EntityDef;
  row: Row | null;
  rows: Row[];
  lookups: LookupRows;
  isNew?: boolean;
  onDone?: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      entity.fields.map((f) => [f.key, row ? toInputValue(f.type, row[f.key]) : f.type === 'boolean' ? 'false' : '']),
    ),
  );
  const [newId, setNewId] = useState('');
  const [saving, startSaving] = useTransition();
  const [deleting, startDeleting] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();

  const save = () =>
    startSaving(async () => {
      setMsg(null);
      const result = isNew
        ? await createEntityRow(entityKey, newId, values)
        : await saveEntityRow(entityKey, row!.id, values);
      if (result.ok) {
        setMsg({ ok: true, text: 'Saved ✓' });
        onDone?.();
      } else {
        setMsg({ ok: false, text: result.error ?? 'Failed' });
      }
    });

  const remove = () => {
    if (!confirm(`Delete "${row!.id}"? This cannot be undone.`)) return;
    startDeleting(async () => {
      setMsg(null);
      const result = await deleteEntityRow(entityKey, row!.id);
      if (result.ok) router.refresh();
      else setMsg({ ok: false, text: result.error ?? 'Failed' });
    });
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {isNew && (
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-500">id</label>
          <input
            value={newId}
            onChange={(ev) => setNewId(ev.target.value)}
            placeholder="e.g. my_addon"
            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      )}
      {entity.fields.map((f) => (
        <div key={f.key} className={f.full ? 'sm:col-span-2' : ''}>
          <label className="mb-1 block text-xs font-bold text-slate-500">{f.label}</label>
          {f.type === 'boolean' ? (
            <select
              value={values[f.key]}
              onChange={(ev) => setValues({ ...values, [f.key]: ev.target.value })}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : f.type === 'select' ? (
            <select
              value={values[f.key]}
              onChange={(ev) => setValues({ ...values, [f.key]: ev.target.value })}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">{f.optionsFromTable ? '— none —' : '— top level —'}</option>
              {(f.optionsFromTable ? lookups[f.optionsFromTable] ?? [] : f.optionsFromRows ? rows : [])
                .filter((r) => f.optionsFromTable || r.id !== row?.id)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {rowTitle(r)}
                  </option>
                ))}
            </select>
          ) : f.type === 'json' || f.type === 'textarea' ? (
            <textarea
              value={values[f.key]}
              onChange={(ev) => setValues({ ...values, [f.key]: ev.target.value })}
              rows={f.type === 'json' ? 4 : 2}
              className={`w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none ${
                f.type === 'json' ? 'font-mono text-xs' : ''
              }`}
            />
          ) : (
            <input
              type={f.type === 'number' ? 'number' : 'text'}
              step="any"
              value={values[f.key]}
              onChange={(ev) => setValues({ ...values, [f.key]: ev.target.value })}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          )}
        </div>
      ))}
      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          onClick={save}
          disabled={saving || (isNew && !newId)}
          data-testid={isNew ? 'entity-create' : `entity-save-${row!.id}`}
          className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : isNew ? 'Create' : 'Save'}
        </button>
        {!isNew && entity.canDelete && (
          <button
            onClick={remove}
            disabled={deleting}
            data-testid={`entity-delete-${row!.id}`}
            className="rounded-lg border border-red-300 px-4 py-1.5 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        )}
        {msg && (
          <span className={`text-sm font-semibold ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}

export function EntityEditor({
  entityKey,
  entity,
  rows,
  lookups = {},
  groupBy,
}: {
  entityKey: string;
  entity: EntityDef;
  rows: Row[];
  lookups?: LookupRows;
  /** Column whose value changes start a new header row in the list (rows must arrive sorted by it). */
  groupBy?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const titleOf = rowTitle;

  const groupTable = groupBy ? entity.fields.find((f) => f.key === groupBy)?.optionsFromTable : undefined;
  const groupLabel = (value: unknown) => {
    const found = groupTable ? lookups[groupTable]?.find((r) => r.id === String(value)) : undefined;
    return found ? rowTitle(found) : String(value ?? '—');
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <p className="text-sm text-slate-500">{entity.description}</p>
        {entity.canCreate && (
          <button
            onClick={() => setCreating(!creating)}
            className="ml-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            {creating ? 'Cancel' : '+ New'}
          </button>
        )}
      </div>
      {creating && (
        <div className="mb-4 rounded-xl border-2 border-dashed border-blue-300 bg-white p-5">
          <RowForm
            entityKey={entityKey}
            entity={entity}
            row={null}
            rows={rows}
            lookups={lookups}
            isNew
            onDone={() => setCreating(false)}
          />
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {rows.map((row, i) => (
          <div key={row.id} className="border-b border-slate-100 last:border-0">
            {groupBy && (i === 0 || rows[i - 1][groupBy] !== row[groupBy]) && (
              <div className="border-b border-slate-100 bg-slate-50 px-5 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                {groupLabel(row[groupBy])}
              </div>
            )}
            <button
              onClick={() => setOpen(open === row.id ? null : row.id)}
              data-testid={`entity-row-${row.id}`}
              className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm hover:bg-slate-50"
            >
              {row.parent_id != null && <span className="text-slate-300">↳</span>}
              <span className={row.parent_id != null ? 'font-semibold text-slate-600' : 'font-bold'}>
                {titleOf(row)}
              </span>
              <span className="text-xs text-slate-400">{row.id}</span>
              {'price' in row && row.price != null && (
                <span className="ml-auto font-semibold">€{String(row.price)}</span>
              )}
              {'price_now' in row && row.price_now != null && (
                <span className="ml-auto font-semibold">
                  €{String(row.price_now)}
                  {row.price_later != null ? ` / €${String(row.price_later)}` : ''}
                </span>
              )}
              {'price_monthly' in row && row.price_monthly != null && (
                <span className="ml-auto font-semibold">€{String(row.price_monthly)}/mo.</span>
              )}
              {'active' in row && row.active === false && (
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-500">
                  inactive
                </span>
              )}
              <span className="text-slate-400">{open === row.id ? '▴' : '▾'}</span>
            </button>
            {open === row.id && (
              <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
                <RowForm entityKey={entityKey} entity={entity} row={row} rows={rows} lookups={lookups} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
