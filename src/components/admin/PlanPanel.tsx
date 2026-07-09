'use client';

import { useState, useTransition } from 'react';
import ReactMarkdown from 'react-markdown';
import type { SuggestedPlanPhase } from '@/lib/types';
import { generateSuggestedPlan, savePhasePrompt } from '@/app/admin/leads/[id]/actions';

export interface PlanRow {
  id: string;
  version: number;
  model: string;
  status: string;
  phases: SuggestedPlanPhase[];
  created_at: string;
}

function PhaseCard({ plan, phase, index }: { plan: PlanRow; phase: SuggestedPlanPhase; index: number }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(phase.prompt_markdown);
  const [copied, setCopied] = useState(false);
  const [saving, startSaving] = useTransition();

  const copy = async () => {
    await navigator.clipboard.writeText(phase.prompt_markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const save = () =>
    startSaving(async () => {
      await savePhasePrompt(plan.id, phase.key, draft);
      setEditing(false);
    });

  return (
    <div className="rounded-xl border border-slate-200 bg-white" data-testid={`phase-${phase.key}`}>
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
          {index + 1}
        </span>
        <span className="font-bold">{phase.title}</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
            phase.tool === 'claude_design'
              ? 'bg-violet-100 text-violet-700'
              : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          Run in {phase.tool === 'claude_design' ? 'Claude Design' : 'Claude Code'}
        </span>
        {phase.inputs.length > 0 && (
          <span className="text-xs text-slate-500">needs: {phase.inputs.join(', ')}</span>
        )}
        <div className="ml-auto flex gap-2">
          <button
            onClick={copy}
            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-bold hover:bg-slate-50"
          >
            {copied ? 'Copied ✓' : 'Copy prompt'}
          </button>
          <button
            onClick={() => {
              setDraft(phase.prompt_markdown);
              setEditing(!editing);
            }}
            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-bold hover:bg-slate-50"
          >
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>
      </div>
      <div className="px-5 py-4">
        {editing ? (
          <div>
            <textarea
              value={draft}
              onChange={(ev) => setDraft(ev.target.value)}
              rows={16}
              className="w-full rounded-lg border border-slate-300 p-3 font-mono text-xs focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={save}
              disabled={saving}
              className="mt-2 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save prompt'}
            </button>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-[13px] leading-relaxed [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-100 [&_pre]:p-3">
            <ReactMarkdown>{phase.prompt_markdown}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export function PlanPanel({ leadId, plans }: { leadId: string; plans: PlanRow[] }) {
  const [generating, startGenerating] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeVersion, setActiveVersion] = useState<number | null>(plans[0]?.version ?? null);

  const active = plans.find((p) => p.version === activeVersion) ?? plans[0] ?? null;

  const generate = () =>
    startGenerating(async () => {
      setError(null);
      try {
        await generateSuggestedPlan(leadId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Generation failed');
      }
    });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold">Suggested build plan</h2>
        {plans.length > 0 && (
          <select
            value={active?.version ?? ''}
            onChange={(ev) => setActiveVersion(Number(ev.target.value))}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm font-semibold"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.version}>
                v{p.version} · {p.model}
                {p.status === 'edited' ? ' · edited' : ''}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={generate}
          disabled={generating}
          data-testid="generate-plan"
          className="ml-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {generating ? 'Generating…' : plans.length ? 'Regenerate (new version)' : 'Generate plan'}
        </button>
      </div>
      {error && <div className="mb-4 text-sm font-medium text-red-600">{error}</div>}
      {!active ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No plan generated yet. The generator tailors a phased Claude Design / Claude Code prompt
          chain to this lead&apos;s configuration and content.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {active.phases.map((phase, i) => (
            <PhaseCard key={phase.key} plan={active} phase={phase} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
