'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  archiveLeads,
  createCustomerLink,
  saveVersionNow,
  sendQuoteToCustomer,
  type ActionResult,
} from '@/app/admin/leads/actions';

const btn = 'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60';
const primary = 'rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60';

export interface LeadToolbarProps {
  leadId: string;
  ready: boolean;
  customerLink: string | null;
  /** Public configurator URL for the team (same link; the admin session switches it to team mode). */
  configuratorHref: string | null;
  status: string;
  onboardingFormId: string | null;
  onboardingFormHref: string | null;
  /** The customer's own brief link — the same one their email carries. */
  onboardingCustomerLink: string | null;
}

/** Copy link · open configurator · send to customer · save version · onboarding · remove. */
export function LeadToolbar(p: LeadToolbarProps) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState<'quote' | 'brief' | null>(null);
  const [pending, start] = useTransition();

  const run = (label: string, fn: () => Promise<ActionResult>) =>
    start(async () => {
      setMsg(null);
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: r.message ?? `${label} ✓` } : { ok: false, text: r.error });
      router.refresh();
    });

  const copyText = async (text: string | null, which: 'quote' | 'brief') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="lead-toolbar">
      {p.customerLink ? (
        <button type="button" onClick={() => void copyText(p.customerLink, 'quote')} className={btn} data-testid="lead-copy-link">
          {copied === 'quote' ? 'Link copied ✓' : 'Copy customer link'}
        </button>
      ) : (
        p.ready && (
          <button type="button" disabled={pending} onClick={() => run('Link created', () => createCustomerLink(p.leadId))} className={btn} data-testid="lead-create-link">
            Create customer link
          </button>
        )
      )}
      {p.configuratorHref && (
        <a href={p.configuratorHref} target="_blank" rel="noreferrer" className={btn} data-testid="lead-open-configurator">
          Open in configurator ↗
        </a>
      )}
      {p.ready && p.customerLink && (
        <button type="button" disabled={pending} onClick={() => run('Sent', () => sendQuoteToCustomer(p.leadId))} className={p.status === 'draft' ? primary : btn} data-testid="lead-send-quote">
          {p.status === 'draft' ? 'Send quote to customer' : 'Send link to customer'}
        </button>
      )}
      {p.ready && p.customerLink && (
        <button type="button" disabled={pending} onClick={() => run('Saved', () => saveVersionNow(p.leadId))} className={btn} data-testid="lead-save-version">
          Save version now
        </button>
      )}
      {p.onboardingFormHref && (
        <a href={p.onboardingFormHref} className={btn} data-testid="lead-open-onboarding">
          Open onboarding form
        </a>
      )}
      {p.onboardingCustomerLink && (
        <button
          type="button"
          onClick={() => void copyText(p.onboardingCustomerLink, 'brief')}
          title="The customer's own link to the brief — the same one their email carries"
          className={btn}
          data-testid="lead-copy-onboarding-link"
        >
          {copied === 'brief' ? 'Brief link copied ✓' : 'Copy brief link'}
        </button>
      )}
      {p.ready && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm('Remove this lead from the CMS? This cannot be undone here — the data stays in the database.')) return;
            start(async () => {
              setMsg(null);
              const r = await archiveLeads([p.leadId], true);
              if (!r.ok) {
                setMsg({ ok: false, text: r.error });
                return;
              }
              // The lead is gone from the CMS, so this page is gone with it.
              router.push('/admin/leads');
            });
          }}
          title="Takes the lead out of the CMS for good; the data stays in the database"
          className={`${btn} text-red-700 hover:bg-red-50`}
          data-testid="lead-archive"
        >
          Remove
        </button>
      )}
      {pending && <span className="text-sm text-slate-500">Working…</span>}
      {msg && (
        <span className={`text-sm font-semibold ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`} data-testid="lead-toolbar-msg">
          {msg.text}
        </span>
      )}
    </div>
  );
}
