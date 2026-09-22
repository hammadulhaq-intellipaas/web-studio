'use client';

import { useTransition } from 'react';
import { updateLeadStatus } from '@/app/admin/leads/actions';
import { LEAD_STATUSES } from '@/lib/types';

export function StatusSelect({ leadId, status, compact = false }: { leadId: string; status: string; compact?: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={pending}
      data-testid={compact ? 'lead-status-row' : 'lead-status'}
      onChange={(ev) => {
        const next = ev.target.value;
        startTransition(async () => {
          await updateLeadStatus(leadId, next);
        });
      }}
      onClick={(ev) => ev.stopPropagation()}
      className={`rounded-lg border border-slate-300 bg-white font-semibold focus:border-blue-500 focus:outline-none disabled:opacity-60 ${
        compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'
      }`}
    >
      {LEAD_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
