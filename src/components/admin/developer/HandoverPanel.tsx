'use client';

import { useState, useTransition } from 'react';
import { generateHandoverDoc, saveHandoverLinks, setDraftLinksOffline } from '@/app/admin/developer/[id]/actions';
import { PromptHistory, type GeneratedRow } from './PromptView';

interface Props {
  leadId: string;
  /** Migration 20261028000022 has run. */
  schemaReady: boolean;
  formReady: boolean;
  liveUrl: string;
  cmsUrl: string;
  cms: boolean;
  offline: boolean;
  hasDrafts: boolean;
  fileName: string;
  docs: GeneratedRow[];
}

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none';

export function HandoverPanel({ leadId, schemaReady, formReady, liveUrl, cmsUrl, cms, offline, hasDrafts, fileName, docs }: Props) {
  const [live, setLive] = useState(liveUrl);
  const [admin, setAdmin] = useState(cmsUrl);
  const [saved, setSaved] = useState<'idle' | 'saved' | string>('idle');
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [generating, startGenerate] = useTransition();
  const [toggling, startToggle] = useTransition();
  const dirty = live !== liveUrl || admin !== cmsUrl;

  if (!schemaReady) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" data-testid="dev-handover-migration-notice">
        The Handover tab needs migration <code>20261028000022_developer_designs.sql</code> to be run in Supabase first.
      </p>
    );
  }

  const save = () =>
    startSave(async () => {
      const r = await saveHandoverLinks(leadId, live, admin);
      setSaved(r.ok ? 'saved' : r.error ?? 'Saving failed');
    });
  const generate = () =>
    startGenerate(async () => {
      setError(null);
      if (dirty) {
        const r = await saveHandoverLinks(leadId, live, admin);
        if (!r.ok) return setError(r.error ?? 'Saving the links failed');
      }
      const r = await generateHandoverDoc(leadId);
      if (!r.ok) setError(r.error ?? 'Generating failed');
    });
  const toggle = () => {
    const goOffline = !offline;
    if (goOffline && !window.confirm('Take every draft link of this client offline? Anyone opening one sees "not available". You can switch them back on.')) return;
    startToggle(async () => {
      setError(null);
      const r = await setDraftLinksOffline(leadId, goOffline);
      if (!r.ok) setError(r.error ?? 'Changing the draft links failed');
    });
  };

  return (
    <div data-testid="dev-handover">
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-500">Live website</span>
          <input
            type="url"
            value={live}
            onChange={(e) => {
              setLive(e.target.value);
              setSaved('idle');
            }}
            placeholder="https://www.example.de"
            data-testid="dev-live-url"
            className={inputClass}
          />
        </label>
        {cms && (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-500">CMS (admin area)</span>
            <input
              type="url"
              value={admin}
              onChange={(e) => {
                setAdmin(e.target.value);
                setSaved('idle');
              }}
              placeholder="https://www.example.de/admin"
              data-testid="dev-cms-url"
              className={inputClass}
            />
          </label>
        )}
      </div>
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          data-testid="dev-links-save"
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {saving ? 'Saving…' : 'Save links'}
        </button>
        {saved === 'saved' && <span className="text-xs font-semibold text-emerald-700">Saved</span>}
        {saved !== 'idle' && saved !== 'saved' && <span className="text-xs font-semibold text-red-600">{saved}</span>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={generate}
          disabled={!formReady || generating}
          data-testid="dev-generate-handover"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {generating ? 'Generating…' : docs.length ? 'Generate a new version' : 'Generate the handover document'}
        </button>
        <span className="text-xs text-slate-500">
          {generating ? 'This takes about a minute.' : 'Written in the language the client used in the form. Logins are never part of it.'}
        </span>
      </div>
      {error && (
        <p className="mt-3 text-sm font-semibold text-red-600" data-testid="dev-handover-error">
          {error}
        </p>
      )}
      <PromptHistory rows={docs} testId="dev-handover-doc" copyLabel="Copy document" downloadName={fileName} />

      {hasDrafts && (
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5" data-testid="dev-drafts-toggle">
          <span className="min-w-0 flex-1 text-sm text-slate-600">
            {offline
              ? 'The design draft links are offline.'
              : 'The design draft links are still online. Take them offline once the website is live.'}
          </span>
          <button
            type="button"
            onClick={toggle}
            disabled={toggling}
            data-testid="dev-drafts-toggle-button"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            {offline ? 'Put the draft links back online' : 'Take the draft links offline'}
          </button>
        </div>
      )}
    </div>
  );
}
