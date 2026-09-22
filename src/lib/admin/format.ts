export function eur(n: number | string): string {
  const value = Number(n);
  // Whole amounts stay clean (€2,990); anything with cents shows both digits (€4,483.20).
  const decimals = Number.isInteger(value) ? 0 : 2;
  return '€' + value.toLocaleString('en-IE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function dateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Lead pipeline (draft → new → contacted → agreed → won / lost). */
export const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-500',
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-amber-100 text-amber-700',
  agreed: 'bg-violet-100 text-violet-700',
  won: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-slate-200 text-slate-600',
};

/** "3 min ago" / "2 d ago" for the activity columns. */
export function relativeTime(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} d ago`;
  return dateOnly(iso);
}

/** Onboarding form statuses (in_progress → review → brief → confirmed). */
export const ONB_STATUS_COLORS: Record<string, string> = {
  in_progress: 'bg-slate-200 text-slate-600',
  review: 'bg-amber-100 text-amber-700',
  brief: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
};
