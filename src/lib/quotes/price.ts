import { createHash } from 'node:crypto';
import { quoteFingerprint } from './canonical';
import type { Catalog, LeadConfig, Locale, Selection, Totals } from '@/lib/types';
import {
  addonCost,
  calcTotals,
  hasSubAddons,
  isAddonIncluded,
  isAddonVisible,
  qtyOf,
  subAddonsOf,
} from '@/lib/pricing/engine';
import { buildReceipt, type Receipt } from '@/lib/pricing/summary';
import { summaryLabelsFor } from '@/lib/messages';

export interface PricedQuote {
  config: LeadConfig;
  totals: Totals;
  receipt: Receipt;
}

/**
 * Price a selection the way `POST /api/leads` always has: totals from the engine, receipt
 * lines in the customer's language, and the `LeadConfig` snapshot stored on the lead
 * (add-on names in German, EUR `rawPrice` lines). Pure — the voucher must already be
 * validated by the caller (`resolveVoucher`); the selection's bundle must exist.
 */
export function priceSelection(
  catalog: Catalog,
  selection: Selection,
  locale: Locale,
  opts: { siteNotes?: string } = {},
): PricedQuote {
  const bundleRow = catalog.bundles.find((b) => b.id === selection.bundle);
  if (!bundleRow) throw new Error(`Unknown bundle: ${selection.bundle}`);

  const totals = calcTotals(catalog, selection);
  const receipt = buildReceipt(catalog, selection, locale, summaryLabelsFor(locale));

  const inclusionCtx = { addons: catalog.addons, selectedAddons: selection.selectedAddons };
  const chosenAddons = catalog.addons
    .filter(
      (a) =>
        isAddonVisible(a, selection.bundle) &&
        !isAddonIncluded(a, selection.bundle, selection.aiBundle, inclusionCtx) &&
        selection.selectedAddons[a.id],
    )
    .map((a) => ({
      id: a.id,
      name: a.name_de,
      qty: a.qty || a.tiers ? qtyOf(a, selection.qty) : null,
      // Which options were ticked, so the sales team can read the €N × M back off the lead.
      subAddons: hasSubAddons(a) ? subAddonsOf(a, selection.selectedSubAddons) : null,
      billing: a.billing,
      price: addonCost(a, selection.qty, selection.selectedSubAddons),
    }));

  const config: LeadConfig = {
    answers: selection.answers,
    siteNotes: opts.siteNotes || '',
    bundle: selection.bundle,
    bundleName: bundleRow.name,
    addons: chosenAddons,
    care: selection.care,
    support: selection.support,
    cf: selection.cf,
    backupUp: selection.backupUp,
    aiBundle: selection.aiBundle,
    payYearly: selection.payYearly,
    voucher: selection.voucher,
    lines: {
      oneOff: receipt.oneOff.map((l) => ({ name: l.name, price: l.rawPrice })),
      monthly: receipt.monthly.map((l) => ({ name: l.name, price: l.rawPrice })),
      yearly: receipt.yearly.map((l) => ({ name: l.name, price: l.rawPrice })),
    },
  };

  return { config, totals, receipt };
}

/** Stable fingerprint of what is being bought; two identical configurations hash equal. */
export function hashSelection(selection: Selection): string {
  return createHash('sha256').update(quoteFingerprint(selection)).digest('hex');
}
