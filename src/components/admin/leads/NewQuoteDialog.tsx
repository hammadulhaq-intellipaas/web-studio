'use client';

import { useState, useTransition } from 'react';
import { createDraftQuote } from '@/app/admin/leads/actions';

const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none';

/**
 * "New quote": the team starts a draft for a customer (name + email required, phone
 * optional), then configures it on the public site in team mode and sends the link.
 */
export function NewQuoteDialog({ disabled = false }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ vorname: '', nachname: '', firma: '', email: '', telefon: '', locale: 'de' as 'de' | 'en' });

  const set = (key: keyof typeof form) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: ev.target.value }));

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    start(async () => {
      const r = await createDraftQuote(form);
      // On success the action redirects to the new lead; only failures come back.
      if (r && !r.ok) setError(r.error);
    });
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        data-testid="new-quote"
        title={disabled ? 'Available once the quotes migration has been applied' : undefined}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        + New quote
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 px-4 pt-24" onClick={() => !pending && setOpen(false)}>
          <form
            onSubmit={submit}
            onClick={(ev) => ev.stopPropagation()}
            data-testid="new-quote-dialog"
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-extrabold tracking-tight">New quote</h2>
            <p className="mt-1 text-sm text-slate-500">
              Creates a draft lead with a customer link. You configure it on the website in team mode, then send the link to the customer.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-xs font-bold text-slate-600">
                First name
                <input className={`${input} mt-1`} value={form.vorname} onChange={set('vorname')} data-testid="nq-vorname" />
              </label>
              <label className="text-xs font-bold text-slate-600">
                Last name
                <input className={`${input} mt-1`} value={form.nachname} onChange={set('nachname')} data-testid="nq-nachname" />
              </label>
              <label className="col-span-2 text-xs font-bold text-slate-600">
                Company
                <input className={`${input} mt-1`} value={form.firma} onChange={set('firma')} data-testid="nq-firma" />
              </label>
              <label className="text-xs font-bold text-slate-600">
                Email <span className="text-red-600">*</span>
                <input className={`${input} mt-1`} type="email" required value={form.email} onChange={set('email')} data-testid="nq-email" />
              </label>
              <label className="text-xs font-bold text-slate-600">
                Phone <span className="font-normal text-slate-400">(optional)</span>
                <input className={`${input} mt-1`} type="tel" value={form.telefon} onChange={set('telefon')} data-testid="nq-telefon" />
              </label>
              <label className="text-xs font-bold text-slate-600">
                Language
                <select className={`${input} mt-1`} value={form.locale} onChange={set('locale')} data-testid="nq-locale">
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                </select>
              </label>
            </div>
            {error && (
              <div className="mt-3 text-sm font-semibold text-red-600" data-testid="nq-error">
                {error}
              </div>
            )}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} disabled={pending} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                Cancel
              </button>
              <button type="submit" disabled={pending} data-testid="nq-submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                {pending ? 'Creating…' : 'Create draft'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
