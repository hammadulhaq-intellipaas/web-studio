import type { LeadListRow } from './admin';

/**
 * Plain, serialisable rows for the admin leads table (built on the server, rendered by the
 * client component). Kept out of the 'use client' module so the page can import it.
 */
export interface LeadsTableRow {
  id: string;
  name: string;
  firma: string;
  email: string;
  bundleName: string;
  addonCount: number;
  oneTime: number;
  monthly: number;
  status: string;
  source: string;
  ownerEmail: string | null;
  createdAt: string;
  customerLink: string | null;
  /** Last event, already phrased ("Customer edited", "Note by …"). */
  activityLabel: string | null;
  activityAt: string | null;
}

export function toTableRow(l: LeadListRow, link: string | null): LeadsTableRow {
  const activity = describeActivity(l);
  return {
    id: l.id,
    name: [l.vorname, l.nachname].filter(Boolean).join(' '),
    firma: l.firma ?? '',
    email: l.email,
    bundleName: l.config?.bundleName ?? '—',
    addonCount: l.config?.addons?.length ?? 0,
    oneTime: Number(l.total_one_time),
    monthly: Number(l.total_monthly),
    status: l.status,
    source: l.source,
    ownerEmail: l.owner_email,
    createdAt: l.created_at,
    customerLink: link,
    activityLabel: activity?.label ?? null,
    activityAt: activity?.at ?? null,
  };
}

/** The most recent thing that happened: a live edit on the link beats older timeline rows. */
function describeActivity(l: LeadListRow): { label: string; at: string } | null {
  const candidates: { label: string; at: string }[] = [];
  if (l.session_updated_at && l.submitted_at && Date.parse(l.session_updated_at) > Date.parse(l.submitted_at) + 60_000) {
    const who = l.session_last_actor?.startsWith('team:') ? l.session_last_actor.slice(5) : 'Customer';
    candidates.push({ label: `${who} edited the quote`, at: l.session_updated_at });
  }
  if (l.last_activity) {
    const a = l.last_activity;
    const who = a.actor?.startsWith('team:') ? a.actor.slice(5) : a.actor === 'customer' ? 'Customer' : null;
    const label =
      a.kind === 'note'
        ? `Note${who ? ` by ${who}` : ''}`
        : a.kind === 'version'
          ? a.body
          : a.kind === 'status'
            ? a.body
            : a.kind === 'email'
              ? a.body
              : a.body || a.kind;
    candidates.push({ label, at: a.created_at });
  }
  if (!candidates.length) return l.submitted_at ? { label: 'Submitted', at: l.submitted_at } : null;
  candidates.sort((x, y) => Date.parse(y.at) - Date.parse(x.at));
  return candidates[0];
}

