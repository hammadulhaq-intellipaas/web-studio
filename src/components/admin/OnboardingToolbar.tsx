'use client';

import { useState, useTransition } from 'react';
import { regenerateBrief, resendDelivery } from '@/app/admin/onboarding/[id]/actions';

/** Copy link · download PDF / JSON · resend emails · regenerate brief. */
export function OnboardingToolbar({
  formId,
  formUrl,
  pdfUrl,
  jsonUrl,
  status,
}: {
  formId: string;
  formUrl: string;
  pdfUrl: string | null;
  jsonUrl: string;
  status: string;
}) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const run = (label: string, fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setMsg(null);
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: `${label} ✓` } : { ok: false, text: r.error ?? `${label} failed` });
    });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  const btn = 'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => void copy()} className={btn} data-testid="onb-admin-copy-link">
        {copied ? 'Link copied ✓' : 'Copy client link'}
      </button>
      {pdfUrl && (
        <a href={pdfUrl} className={btn} data-testid="onb-admin-pdf">
          Download PDF
        </a>
      )}
      <a href={jsonUrl} className={btn} data-testid="onb-admin-json">
        Download JSON
      </a>
      {status === 'confirmed' && (
        <button type="button" disabled={pending} onClick={() => run('Emails sent', () => resendDelivery(formId))} className={btn} data-testid="onb-admin-resend">
          Resend PDF + emails
        </button>
      )}
      {status !== 'in_progress' && (
        <button type="button" disabled={pending} onClick={() => run('Brief regenerated', () => regenerateBrief(formId))} className={btn} data-testid="onb-admin-regenerate">
          Regenerate brief
        </button>
      )}
      {pending && <span className="text-sm text-slate-500">Working…</span>}
      {msg && <span className={`text-sm font-semibold ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</span>}
    </div>
  );
}
