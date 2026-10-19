'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { archiveOnboardingForms } from '@/app/admin/onboarding/actions';

/** "Remove" / "Restore" on one row of the onboarding list. Nothing is deleted either way. */
export function OnboardingRemoveButton({ id, label, archived }: { id: string; label: string; archived: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    if (!archived && !window.confirm(`Remove "${label}" from the CMS? The form and its answers stay in the database, and the client's link keeps working. You can restore it under "removed".`)) return;
    setError(null);
    start(async () => {
      const r = await archiveOnboardingForms([id], !archived);
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  };

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={run}
        data-testid={`onb-admin-${archived ? 'restore' : 'remove'}-${id}`}
        title={archived ? 'Put the form back in the list' : 'Takes the form out of the CMS list; the data stays in the database'}
        className={
          archived
            ? 'rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50'
            : 'rounded-lg border border-transparent px-2.5 py-1 text-xs font-bold text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50'
        }
      >
        {pending ? '…' : archived ? 'Restore' : 'Remove'}
      </button>
      {error && <span className="max-w-[220px] text-right text-[11px] font-semibold text-red-600">{error}</span>}
    </span>
  );
}
