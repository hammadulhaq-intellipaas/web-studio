'use client';

import { useState, useTransition } from 'react';
import { generateBuildPrompt, saveDevInstructions } from '@/app/admin/developer/[id]/actions';
import { PromptHistory, type GeneratedRow } from './PromptView';

interface Props {
  leadId: string;
  /** Migration 20261028000022 has run. */
  schemaReady: boolean;
  formReady: boolean;
  approved: { label: string; proposal: 'A' | 'B' } | null;
  instructions: string;
  project: string;
  cms: boolean;
  setup: string;
  prompts: GeneratedRow[];
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{n}</span>
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-sm font-bold">{title}</p>
        {children}
      </div>
    </li>
  );
}

function SetupBlock({ setup }: { setup: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div data-testid="dev-setup">
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          data-testid="dev-setup-copy"
          onClick={async () => {
            await navigator.clipboard.writeText(setup);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          {copied ? 'Copied' : 'Copy commands'}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-lg bg-slate-900 px-4 py-3 text-xs leading-relaxed text-slate-100">{setup}</pre>
    </div>
  );
}

export function BuildPanel({ leadId, schemaReady, formReady, approved, instructions, project, cms, setup, prompts }: Props) {
  const [text, setText] = useState(instructions);
  const [saved, setSaved] = useState<'idle' | 'saved' | string>('idle');
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [generating, startGenerate] = useTransition();

  if (!schemaReady) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" data-testid="dev-build-migration-notice">
        The Build tab needs migration <code>20261028000022_developer_designs.sql</code> to be run in Supabase first.
      </p>
    );
  }

  const save = () =>
    startSave(async () => {
      const r = await saveDevInstructions(leadId, text);
      setSaved(r.ok ? 'saved' : r.error ?? 'Saving failed');
    });
  const generate = () =>
    startGenerate(async () => {
      setError(null);
      if (text !== instructions) {
        const r = await saveDevInstructions(leadId, text);
        if (!r.ok) return setError(r.error ?? 'Saving the instructions failed');
      }
      const r = await generateBuildPrompt(leadId);
      if (!r.ok) setError(r.error ?? 'Generating failed');
    });

  return (
    <div data-testid="dev-build">
      {approved ? (
        <p className="mb-4 text-sm text-slate-600">
          Building from <strong>{approved.label}</strong> (Proposal {approved.proposal}). Project name <code>{project}</code>, used for the
          GitHub repository, the Vercel project and the Supabase project. {cms ? 'The client booked a CMS.' : 'No CMS was booked.'}
        </p>
      ) : (
        <p className="mb-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600" data-testid="dev-build-locked">
          Approve a design version in the Design tab first. The developer instructions can be written already.
        </p>
      )}

      <ol className="space-y-5">
        <Step n={1} title="Developer instructions">
          <textarea
            rows={4}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSaved('idle');
            }}
            data-testid="dev-instructions"
            placeholder="Tech stack changes, integrations, anything Claude Code must know. Leave empty for the default: Next.js, Tailwind, Vercel, Resend."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving || text === instructions}
              data-testid="dev-instructions-save"
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saving ? 'Saving…' : 'Save instructions'}
            </button>
            {saved === 'saved' && <span className="text-xs font-semibold text-emerald-700">Saved</span>}
            {saved !== 'idle' && saved !== 'saved' && <span className="text-xs font-semibold text-red-600">{saved}</span>}
          </div>
        </Step>

        <Step n={2} title="Download the approved design">
          {approved ? (
            <a
              href={`/admin/developer/${leadId}/approved-design`}
              data-testid="dev-download-design"
              className="inline-block rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Download design.zip ({approved.label})
            </a>
          ) : (
            <p className="text-xs text-slate-500">Available once a version is approved.</p>
          )}
        </Step>

        <Step n={3} title="Set up the project">
          <p className="mb-2 text-xs text-slate-500">
            Run these in a terminal, one folder per client. You need the gh, vercel, supabase and claude command line tools,
            each signed in. The tools ask for anything secret themselves; nothing secret goes into a prompt.
          </p>
          <SetupBlock setup={setup} />
        </Step>

        <Step n={4} title="Generate the prompt for Claude Code to build">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={generate}
              disabled={!approved || !formReady || generating}
              data-testid="dev-generate-build"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              {generating ? 'Generating…' : prompts.length ? 'Generate a new version' : 'Generate the prompt for Claude Code to build'}
            </button>
            <span className="text-xs text-slate-500">
              {generating ? 'This takes a minute or two.' : 'Paste it into Claude Code, started in the project folder.'}
            </span>
          </div>
          {error && (
            <p className="mt-3 text-sm font-semibold text-red-600" data-testid="dev-build-error">
              {error}
            </p>
          )}
          <PromptHistory rows={prompts} testId="dev-build-prompt" />
        </Step>
      </ol>
    </div>
  );
}
