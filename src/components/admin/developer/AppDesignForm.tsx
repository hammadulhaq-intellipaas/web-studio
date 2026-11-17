'use client';

import { useState, useTransition } from 'react';
import { makeAppDesign } from '@/app/admin/developer/[id]/actions';

/**
 * Makes a proposal's design in the app from its design prompt, with Claude Opus or GPT Sol. It
 * becomes the next iteration of that proposal, with its own review link, once it is ready (about
 * ten minutes: the design system, one page at a time, the checks at seven screen widths).
 */
export function AppDesignForm({
  leadId,
  proposals,
  models,
  defaultModel,
}: {
  leadId: string;
  /** The proposals that have a design prompt. */
  proposals: ('A' | 'B')[];
  models: { id: string; label: string }[];
  defaultModel: string;
}) {
  const [proposal, setProposal] = useState<'A' | 'B'>(proposals[0] ?? 'A');
  const [model, setModel] = useState(models.some((m) => m.id === defaultModel) ? defaultModel : (models[0]?.id ?? defaultModel));
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (!proposals.length) return <p className="text-sm text-slate-500">Generate the design prompts first.</p>;

  const go = () =>
    start(async () => {
      setMessage(null);
      const result = await makeAppDesign(leadId, proposal, model);
      setMessage(result.ok ? { ok: true, text: 'Started. It appears under Design versions and takes about ten minutes.' } : { ok: false, text: result.error ?? 'Could not start.' });
    });

  return (
    <div className="flex flex-wrap items-end gap-3 text-sm" data-testid="dev-app-design">
      <label className="grid gap-1">
        <span className="text-xs font-semibold text-slate-500">Proposal</span>
        <select value={proposal} onChange={(e) => setProposal(e.target.value as 'A' | 'B')} className="rounded-lg border border-slate-300 px-2 py-1.5" data-testid="dev-app-design-proposal">
          {proposals.map((p) => (
            <option key={p} value={p}>
              Proposal {p === 'A' ? 1 : 2}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        <span className="text-xs font-semibold text-slate-500">Model</span>
        <select value={model} onChange={(e) => setModel(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5" data-testid="dev-app-design-model">
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={go}
        disabled={pending}
        data-testid="dev-app-design-start"
        className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {pending ? 'Starting…' : 'Make the design in the app'}
      </button>
      {message && <p className={`w-full ${message.ok ? 'text-emerald-700' : 'text-red-600'}`}>{message.text}</p>}
    </div>
  );
}
