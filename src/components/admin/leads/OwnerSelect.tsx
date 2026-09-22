'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setOwner } from '@/app/admin/leads/actions';

export function OwnerSelect({ leadId, owner, users, disabled = false }: { leadId: string; owner: string | null; users: string[]; disabled?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const options = owner && !users.includes(owner) ? [owner, ...users] : users;

  return (
    <select
      value={owner ?? ''}
      disabled={disabled || pending}
      data-testid="lead-owner"
      onChange={(ev) => {
        const next = ev.target.value || null;
        start(async () => {
          await setOwner(leadId, next);
          router.refresh();
        });
      }}
      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold focus:border-blue-500 focus:outline-none disabled:opacity-60"
    >
      <option value="">No owner</option>
      {options.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
    </select>
  );
}
