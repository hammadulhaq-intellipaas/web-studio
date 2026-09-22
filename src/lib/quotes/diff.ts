import type { LeadConfig } from '@/lib/types';

export type ChangeKind = 'bundle' | 'addon_added' | 'addon_removed' | 'addon_changed' | 'plan' | 'option' | 'billing' | 'voucher';

export interface QuoteChange {
  kind: ChangeKind;
  /** Human-readable label in the admin (English chrome, German add-on names as stored). */
  label: string;
  before?: string | null;
  after?: string | null;
  /** Price delta in EUR for this line, when it can be attributed (add-ons). */
  delta?: number;
}

const addonKey = (a: LeadConfig['addons'][number]) =>
  `${a.name}${a.qty != null ? ` × ${a.qty}` : ''}${a.subAddons?.length ? ` (${a.subAddons.join(', ')})` : ''}`;

/**
 * What changed between two quote snapshots — bundle, add-ons (added / removed / quantity
 * or options), plans, backup / AI bundle, payment cycle, voucher. Order is stable so the
 * timeline reads the same every time.
 */
export function diffConfigs(before: LeadConfig, after: LeadConfig): QuoteChange[] {
  const changes: QuoteChange[] = [];

  if (before.bundle !== after.bundle) {
    changes.push({ kind: 'bundle', label: 'Bundle', before: before.bundleName, after: after.bundleName });
  }

  const prev = new Map((before.addons ?? []).map((a) => [a.id, a]));
  const next = new Map((after.addons ?? []).map((a) => [a.id, a]));
  for (const [id, a] of next) {
    const b = prev.get(id);
    if (!b) {
      changes.push({ kind: 'addon_added', label: addonKey(a), delta: a.price });
    } else if (addonKey(a) !== addonKey(b) || a.price !== b.price) {
      changes.push({ kind: 'addon_changed', label: a.name, before: addonKey(b), after: addonKey(a), delta: a.price - b.price });
    }
  }
  for (const [id, b] of prev) {
    if (!next.has(id)) changes.push({ kind: 'addon_removed', label: addonKey(b), delta: -b.price });
  }

  const plan = (label: string, b: string, a: string) => {
    if (b !== a) changes.push({ kind: 'plan', label, before: b, after: a });
  };
  plan('Care plan', before.care, after.care);
  plan('Support plan', before.support, after.support);
  plan('Cloudflare plan', before.cf, after.cf);

  if (!!before.backupUp !== !!after.backupUp) {
    changes.push({ kind: 'option', label: 'Backup upgrade', before: before.backupUp ? 'yes' : 'no', after: after.backupUp ? 'yes' : 'no' });
  }
  if (!!before.aiBundle !== !!after.aiBundle) {
    changes.push({ kind: 'option', label: 'AI Agentic Bundle', before: before.aiBundle ? 'yes' : 'no', after: after.aiBundle ? 'yes' : 'no' });
  }
  if (!!before.payYearly !== !!after.payYearly) {
    changes.push({ kind: 'billing', label: 'Payment cycle', before: before.payYearly ? 'yearly' : 'monthly', after: after.payYearly ? 'yearly' : 'monthly' });
  }
  const vb = before.voucher ? `${before.voucher.code} (−${before.voucher.percent}%)` : null;
  const va = after.voucher ? `${after.voucher.code} (−${after.voucher.percent}%)` : null;
  if (vb !== va) changes.push({ kind: 'voucher', label: 'Voucher', before: vb, after: va });

  return changes;
}

/** Sum of the stored lines, for a quick "one-time / monthly" comparison without the engine. */
export function lineTotals(config: LeadConfig): { oneTime: number; monthly: number; yearly: number } {
  const sum = (lines: { price: number }[] | undefined) => (lines ?? []).reduce((s, l) => s + Number(l.price || 0), 0);
  return { oneTime: sum(config.lines?.oneOff), monthly: sum(config.lines?.monthly), yearly: sum(config.lines?.yearly) };
}
