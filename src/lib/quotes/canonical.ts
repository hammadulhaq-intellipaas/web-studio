import type { Selection } from '@/lib/types';

/**
 * The price-relevant part of a selection, in a canonical order.
 *
 * Kept away from `price.ts` because that module reaches for `node:crypto`: the browser
 * needs this same shape to tell whether the customer has actually changed their quote,
 * and it must be the very same function on both sides or the comparison lies.
 */
export function canonicalSelection(selection: Selection) {
  const sortKeys = <T>(o: Record<string, T>) =>
    Object.fromEntries(Object.entries(o).filter(([, v]) => v !== false && v != null).sort(([a], [b]) => a.localeCompare(b)));
  return {
    bundle: selection.bundle,
    addons: sortKeys(selection.selectedAddons),
    qty: sortKeys(selection.qty),
    sub: Object.fromEntries(
      Object.entries(selection.selectedSubAddons ?? {})
        .filter(([, v]) => v?.length)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, [...v].sort()]),
    ),
    care: selection.care,
    support: selection.support,
    cf: selection.cf,
    backupUp: selection.backupUp,
    aiBundle: selection.aiBundle,
    payYearly: selection.payYearly,
    voucher: selection.voucher?.code?.toUpperCase() ?? null,
  };
}

/**
 * What is being bought, as one comparable string. Two identical configurations produce the
 * same text, whichever order the customer clicked things in.
 */
export function quoteFingerprint(selection: Selection): string {
  return JSON.stringify(canonicalSelection(selection));
}
