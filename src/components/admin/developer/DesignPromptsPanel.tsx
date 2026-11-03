'use client';

import { useState, useTransition } from 'react';
import { generateDesign, makeReferenceSpec, saveInternalNotes } from '@/app/admin/developer/[id]/actions';
import { LocalTime } from '@/components/admin/LocalTime';
import { PromptView } from './PromptView';

export interface ReferenceChoice {
  value: string;
  label: string;
  pickedByClient: boolean;
  /** The client's own link or pictures, or one of our 11 library websites. */
  group?: 'client' | 'library';
}

/** A reference spec written on the spot from one of the client's own references. */
export interface ReferenceSpecView {
  content: string;
  summary: string | null;
  model: string;
  created_at: string;
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
  /** A design version is approved: no new design prompts until it is reopened. */
  locked: boolean;
  notes: string;
  choices: ReferenceChoice[];
  defaults: { A: string | null; B: string | null };
  prompts: DesignPromptRow[];
  /** Migration 20261103000028 has run: the client's own references can be chosen. */
  specsReady: boolean;
  specs: Record<string, ReferenceSpecView>;
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

/** The spec a proposal was built from, when it follows one of the client's own references. */
function SpecBlock({ spec, label, onRead, busy, disabled, testId }: { spec: ReferenceSpecView | undefined; label: string; onRead: () => void; busy: boolean; disabled: boolean; testId: string }) {
  const again = (
    <button
      type="button"
      onClick={onRead}
      disabled={disabled || busy}
      className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? 'Reading…' : spec ? 'Read it again' : 'Try again'}
    </button>
  );
  if (!spec) {
    return (
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid={testId}>
        <span className="min-w-0 flex-1">No spec could be made from {label}, so this proposal follows the client&apos;s description of it.</span>
        {again}
      </div>
    );
  }
  return (
    <details className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2" data-testid={testId}>
      <summary className="cursor-pointer text-sm">
        <span className="font-semibold">Reference spec from {label}</span>
        <span className="text-xs text-slate-500">
          {' '}
          · <LocalTime iso={spec.created_at} /> · {spec.model}
          {spec.summary ? ` · ${spec.summary}` : ''}
        </span>
      </summary>
      <div className="mt-2 flex justify-end">{again}</div>
      <div className="mt-2">
        <PromptView content={spec.content} copyLabel="Copy spec" />
      </div>
    </details>
  );
}

export function DesignPromptsPanel({ leadId, formReady, schemaReady, locked, notes, choices, defaults, prompts, specsReady, specs }: Props) {
  const [refs, setRefs] = useState({ A: defaults.A ?? NONE, B: defaults.B ?? NONE });
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [step, setStep] = useState<string | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  // A plain flag, not a transition: a transition would hold back the step texts until the end.
  const [pending, setPending] = useState(false);
  const canGenerate = formReady && schemaReady && !locked && !pending;
  const nameOf = (slug: string | null) => (slug ? choices.find((c) => c.value === slug)?.label ?? slug : "the client's answers");
  const isOwn = (value: string | null) => !!value && choices.some((c) => c.value === value && c.group === 'client');
  const own = choices.filter((c) => c.group === 'client');
  const library = choices.filter((c) => c.group !== 'client');

  /** Reads the client's own references first (one step each), then writes both proposals. */
  const generate = async () => {
    setPending(true);
    setError(null);
    setWarnings([]);
    const notes: string[] = [];
    try {
      for (const value of [...new Set([refs.A, refs.B].filter(isOwn))]) {
        const label = nameOf(value);
        setStep(label.includes('screenshots') ? "Looking at the client's pictures and writing their spec…" : `Reading ${label.replace("The client's link: ", '')} and writing its spec…`);
        const r = await makeReferenceSpec(leadId, value, false);
        if (!r.ok) notes.push(`${label}: ${r.error ?? 'the spec could not be made'}. The proposal follows the client's description instead.`);
      }
      setStep('Writing both proposals…');
      const r = await generateDesign(leadId, refs.A || null, refs.B || null);
      if (!r.ok) setError(r.error ?? 'Generating failed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generating failed');
    } finally {
      setStep(null);
      setWarnings(notes);
      setPending(false);
    }
  };

  const readAgain = async (value: string) => {
    setPending(true);
    setError(null);
    setReading(value);
    try {
      const r = await makeReferenceSpec(leadId, value, true);
      if (!r.ok) setError(`${nameOf(value)}: ${r.error ?? 'the spec could not be made'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reading failed');
    } finally {
      setReading(null);
      setPending(false);
    }
  };

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
            <span className="mb-1 block text-xs font-semibold text-slate-500">Proposal {p === 'A' ? 1 : 2} follows</span>
            <select
              data-testid={`dev-ref-${p}`}
              value={refs[p]}
              onChange={(e) => setRefs({ ...refs, [p]: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value={NONE}>No reference website: the client&apos;s answers only</option>
              {own.length > 0 && (
                <optgroup label="The client's own references (a spec is written when you generate)">
                  {own.map((c) => (
                    <option key={c.value} value={c.value} disabled={!specsReady}>
                      {c.label}
                      {!specsReady ? '  (needs migration 20261103000028)' : ''}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Our reference library">
                {library.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                    {c.pickedByClient ? '  (picked by the client)' : ''}
                  </option>
                ))}
              </optgroup>
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
          {pending && step ? 'Generating…' : prompts.length ? 'Generate new versions' : 'Generate the prompt for design'}
        </button>
        <span className="text-xs text-slate-500" data-testid="dev-generate-step">
          {pending && step
            ? `${step} This takes a minute or two.`
            : !formReady
              ? 'Available once the client has confirmed the onboarding form.'
              : locked
                ? 'The design is approved and locked. Reopen it below to generate again.'
                : [refs.A, refs.B].some(isOwn)
                  ? "Reads the client's own reference first and writes its spec, then both proposals. About 3 to 4 minutes."
                  : 'Generates Proposal 1 and Proposal 2 together: the homepage plus 4 to 5 key pages each.'}
        </span>
      </div>
      {error && (
        <p className="mt-3 text-sm font-semibold text-red-600" data-testid="dev-generate-error">
          {error}
        </p>
      )}
      {warnings.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid="dev-generate-warnings">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      {(['A', 'B'] as const).map((p) => {
        const versions = prompts.filter((x) => x.proposal === p);
        if (!versions.length) return null;
        const [latest, ...older] = versions;
        return (
          <div key={p} className="mt-6 border-t border-slate-100 pt-5" data-testid={`dev-proposal-${p}`}>
            <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-base font-bold">Proposal {p === 'A' ? 1 : 2}</h3>
              <span className="text-sm text-slate-500">follows {nameOf(latest.reference_slug)}</span>
              <span className="text-xs text-slate-400">
                Version {versions.length} · <LocalTime iso={latest.created_at} /> · {latest.model}
                {latest.created_by ? ` · ${latest.created_by}` : ''}
              </span>
            </div>
            {latest.reference_slug && isOwn(latest.reference_slug) && (
              <SpecBlock
                spec={specs[latest.reference_slug]}
                label={nameOf(latest.reference_slug).replace("The client's link: ", '').replace("The client's screenshots", "the client's pictures")}
                onRead={() => readAgain(latest.reference_slug!)}
                busy={reading === latest.reference_slug}
                disabled={pending || locked}
                testId={`dev-spec-${p}`}
              />
            )}
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
