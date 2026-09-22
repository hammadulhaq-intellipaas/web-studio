'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addNote } from '@/app/admin/leads/actions';
import { relativeTime } from '@/lib/admin/format';
import type { LeadActivity } from '@/lib/types';
import { LocalTime } from '@/components/admin/LocalTime';

const KIND_STYLE: Record<string, string> = {
  note: 'bg-amber-50 border-amber-200',
  status: 'bg-white border-slate-200',
  version: 'bg-blue-50 border-blue-100',
  email: 'bg-white border-slate-200',
  link: 'bg-white border-slate-200',
  onboarding: 'bg-emerald-50 border-emerald-100',
  archive: 'bg-slate-50 border-slate-200',
  owner: 'bg-white border-slate-200',
  agreed: 'bg-violet-50 border-violet-100',
  system: 'bg-white border-slate-200',
};

function who(actor: string | null): string {
  if (!actor) return '';
  if (actor === 'customer') return 'Customer';
  if (actor.startsWith('team:')) return actor.slice(5);
  return actor;
}

/** Notes by the team plus the automatic timeline (status, versions, emails, links…). */
export function ActivityPanel({ leadId, activity, ready }: { leadId: string; activity: LeadActivity[]; ready: boolean }) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!text.trim()) return;
    start(async () => {
      const r = await addNote(leadId, text);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setText('');
      setError(null);
      router.refresh();
    });
  };

  return (
    <div>
      {ready ? (
        <form onSubmit={submit} className="mb-4">
          <textarea
            value={text}
            onChange={(ev) => setText(ev.target.value)}
            rows={3}
            placeholder="Add a note for the team…"
            data-testid="lead-note-input"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <div className="mt-2 flex items-center gap-3">
            <button type="submit" disabled={pending || !text.trim()} data-testid="lead-note-submit" className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50">
              {pending ? 'Saving…' : 'Add note'}
            </button>
            {error && <span className="text-xs font-semibold text-red-600">{error}</span>}
          </div>
        </form>
      ) : (
        <p className="mb-4 text-sm text-slate-500">Notes and the timeline appear once the migration has been applied.</p>
      )}

      <ol className="space-y-2" data-testid="lead-activity">
        {activity.length === 0 && ready && <li className="text-sm text-slate-500">No activity yet.</li>}
        {activity.map((a) => (
          <li key={a.id} className={`rounded-lg border px-3 py-2 text-sm ${KIND_STYLE[a.kind] ?? KIND_STYLE.system}`} data-testid={`activity-${a.kind}`}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{a.kind}</span>
              <span className="whitespace-nowrap text-[11px] text-slate-400" title={a.created_at}>
                {relativeTime(a.created_at)} · <LocalTime iso={a.created_at} />
              </span>
            </div>
            <div className={`mt-0.5 whitespace-pre-wrap ${a.kind === 'note' ? 'text-slate-900' : 'text-slate-700'}`}>{a.body}</div>
            {a.actor && <div className="mt-0.5 text-[11px] text-slate-400">{who(a.actor)}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}
