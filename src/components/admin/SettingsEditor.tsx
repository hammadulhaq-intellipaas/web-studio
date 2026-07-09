'use client';

import { useState, useTransition } from 'react';
import type { SettingDef } from '@/lib/admin/entities';
import { saveSetting } from '@/app/admin/catalog/actions';

function SettingRow({ def, initial }: { def: SettingDef; initial: unknown }) {
  const [value, setValue] = useState(() => {
    if (initial == null) return '';
    if (def.type === 'json') return JSON.stringify(initial, null, 2);
    return String(initial);
  });
  const [saving, startSaving] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = () =>
    startSaving(async () => {
      setMsg(null);
      const result = await saveSetting(def.key, value);
      setMsg(result.ok ? { ok: true, text: 'Saved ✓' } : { ok: false, text: result.error ?? 'Failed' });
    });

  return (
    <div className="border-b border-slate-100 px-5 py-4 last:border-0">
      <div className="mb-1 font-bold">{def.label}</div>
      <div className="mb-2 text-xs text-slate-500">{def.description}</div>
      {def.type === 'json' ? (
        <textarea
          value={value}
          onChange={(ev) => setValue(ev.target.value)}
          rows={5}
          data-testid={`setting-${def.key}`}
          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs focus:border-blue-500 focus:outline-none"
        />
      ) : (
        <input
          type={def.type === 'number' ? 'number' : 'text'}
          step="any"
          value={value}
          onChange={(ev) => setValue(ev.target.value)}
          data-testid={`setting-${def.key}`}
          className="w-full max-w-md rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
      )}
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          data-testid={`setting-save-${def.key}`}
          className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {msg && (
          <span className={`text-sm font-semibold ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}

export function SettingsEditor({
  settings,
  values,
}: {
  settings: SettingDef[];
  values: Record<string, unknown>;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {settings.map((def) => (
        <SettingRow key={def.key} def={def} initial={values[def.key]} />
      ))}
    </div>
  );
}
