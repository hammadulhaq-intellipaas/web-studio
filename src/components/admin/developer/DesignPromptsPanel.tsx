'use client';

import { useState, useTransition } from 'react';
import { generateDesign, saveInternalNotes } from '@/app/admin/developer/[id]/actions';
import { LocalTime } from '@/components/admin/LocalTime';
import { PromptView } from './PromptView';

export interface ReferenceChoice {
  value: string;
  label: string;
  pickedByClient: boolean;
}

export interface DesignPromptRow {
  id: string;
  proposal: 'A' | 'B' | null;
  reference_slug: string | null;
  content: string;
  model: string;
  created_by: string | null;
  created_at: string;
}

interface Props {
  leadId: string;
  /** The onboarding form is confirmed: Phase 1 only generates from a confirmed form. */
  formReady: boolean;
  /** Migration 20261028000021 has run. */
  schemaReady: boolean;
  notes: string;
  choices: ReferenceChoice[];
  defaults: { A: string | null; B: string | null };
  prompts: DesignPromptRow[];
}

const NONE = '';

function NotesEditor({ leadId, initial, disabled }: { leadId: string; initial: string; disabled: boolean }) {
  const [notes, setNotes] = useState(initial);
  const [state, setState] = useState<'idle' | 'saved' | string>('idle');
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const r = await saveInternalNotes(leadId, notes);
      setState(r.ok ? 'saved' : r.error ?? 'Saving failed');
    });
  return (
    <div className="mb-5">
      <label htmlFor="dev-notes" className="mb-1 block text-xs font-semibold text-slate-500">
        Internal notes from Thorsten, Matt or Angelica (they override the form where they conflict)
      </label>
      <textarea
        id="dev-notes"
        data-testid="dev-notes"
        rows={3}
        value={notes}
        disabled={disabled}
        onChange={(e) => {
          setNotes(e.target.value);
          setState('idle');
        }}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={disabled || pending || notes === initial}
          data-testid="dev-notes-save"
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {pending ? 'Saving…' : 'Save notes'}
        </button>
        {state === 'saved' && <span className="text-xs font-semibold text-emerald-700">Saved</span>}
        {state !== 'idle' && state !== 'saved' && <span className="text-xs font-semibold text-red-600">{state}</span>}
      </div>
    </div>
  );
}

export function DesignPromptsPanel({ leadId, formReady, schemaReady, notes, choices, defaults, prompts }: Props) {
  const [refs, setRefs] = useState({ A: defaults.A ?? NONE, B: defaults.B ?? NONE });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const canGenerate = formReady && schemaReady && !pending;
  const nameOf = (slug: string | null) => (slug ? choices.find((c) => c.value === slug)?.label ?? slug : "the client's answers");

  const generate = () =>
    start(async () => {
      setError(null);
      const r = await generateDesign(leadId, refs.A || null, refs.B || null);
      if (!r.ok) setError(r.error ?? 'Generating failed');
    });

  return (
    <div data-testid="dev-design-prompts">
      {!schemaReady && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" data-testid="dev-migration-notice">
          Prompt generation needs migration <code>20261028000021_developer_prompts.sql</code> to be run in Supabase first.
        </p>
      )}
      <NotesEditor leadId={leadId} initial={notes} disabled={!schemaReady} />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        {(['A', 'B'] as const).map((p) => (
          <label key={p} className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-500">Proposal {p} follows</span>
            <select
              data-testid={`dev-ref-${p}`}
              value={refs[p]}
              onChange={(e) => setRefs({ ...refs, [p]: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value={NONE}>No reference website: the client&apos;s answers only</option>
              {choices.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                  {c.pickedByClient ? '  (picked by the client)' : ''}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={generate}
          disabled={!canGenerate}
          data-testid="dev-generate-design"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {pending ? 'Generating…' : prompts.length ? 'Generate new versions' : 'Generate the prompt for design'}
        </button>
        <span className="text-xs text-slate-500">
          {pending
            ? 'Writing both proposals. This takes a minute or two.'
            : !formReady
              ? 'Available once the client has confirmed the onboarding form.'
              : 'Generates Proposal A and Proposal B together.'}
        </span>
      </div>
      {error && (
        <p className="mt-3 text-sm font-semibold text-red-600" data-testid="dev-generate-error">
          {error}
        </p>
      )}

      {(['A', 'B'] as const).map((p) => {
        const versions = prompts.filter((x) => x.proposal === p);
        if (!versions.length) return null;
        const [latest, ...older] = versions;
        return (
          <div key={p} className="mt-6 border-t border-slate-100 pt-5" data-testid={`dev-proposal-${p}`}>
            <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-base font-bold">Proposal {p}</h3>
              <span className="text-sm text-slate-500">follows {nameOf(latest.reference_slug)}</span>
              <span className="text-xs text-slate-400">
                Version {versions.length} · <LocalTime iso={latest.created_at} /> · {latest.model}
                {latest.created_by ? ` · ${latest.created_by}` : ''}
              </span>
            </div>
            <PromptView content={latest.content} testId={`dev-prompt-${p}`} />
            {older.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-slate-500">Earlier versions ({older.length})</summary>
                <div className="mt-2 space-y-4">
                  {older.map((v, i) => (
                    <div key={v.id}>
                      <div className="mb-1 text-xs text-slate-400">
                        Version {older.length - i} · follows {nameOf(v.reference_slug)} · <LocalTime iso={v.created_at} />
                      </div>
                      <PromptView content={v.content} />
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}
