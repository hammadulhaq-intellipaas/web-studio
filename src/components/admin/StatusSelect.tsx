'use client';

import { useTransition } from 'react';
import { updateLeadStatus } from '@/app/admin/leads/[id]/actions';

export function StatusSelect({ leadId, status }: { leadId: string; status: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={pending}
      data-testid="lead-status"
      onChange={(ev) => {
        const next = ev.target.value;
        startTransition(async () => {
          await updateLeadStatus(leadId, next);
        });
      }}
      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold focus:border-blue-500 focus:outline-none disabled:opacity-60"
    >
      <option value="new">new</option>
      <option value="contacted">contacted</option>
      <option value="won">won</option>
      <option value="lost">lost</option>
    </select>
  );
}
