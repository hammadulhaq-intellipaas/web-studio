import type { Addon, Answers, Catalog, Selection, Totals, Voucher } from '../types';

/** BYOW path: user has an existing website they built themselves (e.g. with AI tools). */
export function isByow(answers: Answers): boolean {
  return answers.hasSite === 'website' && answers.selfbuilt === 'ja';
}

export function isAddonVisible(addon: Addon, bundleId: string): boolean {
  if (addon.byow_only && bundleId !== 'byow') return false;
  if (addon.not_byow && bundleId === 'byow') return false;
  return true;
}

export function isAddonIncluded(addon: Addon, bundleId: string, aiBundle: boolean): boolean {
  if (addon.included_in.includes(bundleId)) return true;
  if (aiBundle && addon.ai_bundle_member) return true;
  return false;
}

export function qtyOf(addon: Addon, qtyState: Record<string, number>): number {
  const q = qtyState[addon.id];
  if (q != null) return q;
  if (addon.tiers && addon.tiers.length) return addon.tiers[0].n;
  return addon.qty ? addon.qty.min : 1;
}

export function addonCost(addon: Addon, qtyState: Record<string, number>): number {
  const n = qtyOf(addon, qtyState);
  if (addon.tiers && addon.tiers.length) {
    const tier = addon.tiers.find((t) => t.n === n) ?? addon.tiers[0];
    return tier.price;
  }
  return addon.qty ? addon.price_now * n : addon.price_now;
}

/** Step a qty/tier stepper; returns the new quantity. */
export function stepQty(addon: Addon, qtyState: Record<string, number>, dir: 1 | -1): number {
  if (addon.tiers && addon.tiers.length) {
    const ns = addon.tiers.map((t) => t.n);
    const i = Math.max(0, ns.indexOf(qtyOf(addon, qtyState)));
    const j = Math.min(ns.length - 1, Math.max(0, i + dir));
    return ns[j];
  }
  const q = addon.qty!;
  return Math.min(q.max, Math.max(q.min, qtyOf(addon, qtyState) + dir));
}

/** Is a Cloudflare plan included at no cost for this care/bundle combination? */
export function isCfIncluded(catalog: Catalog, cfId: string, careId: string, bundleId: string): boolean {
  const plan = catalog.cloudflarePlans.find((p) => p.id === cfId);
  if (!plan?.included_when) return false;
  return plan.included_when.care === careId || plan.included_when.bundle === bundleId;
}

function voucherRates(voucher: Voucher | null): { oneTime: number; recurring: number } {
  if (!voucher) return { oneTime: 1, recurring: 1 };
  const rate = 1 - voucher.percent / 100;
  return {
    oneTime: voucher.scope === 'recurring' ? 1 : rate,
    recurring: voucher.scope === 'one_time' ? 1 : rate,
  };
}

/** Yearly-payment discount on recurring prices (prototype: −18 %). */
export function discMonthly(price: number, payYearly: boolean, yearlyDiscountPct: number): number {
  return payYearly ? price * (1 - yearlyDiscountPct / 100) : price;
}

export function calcTotals(catalog: Catalog, sel: Selection): Totals {
  const bundle = catalog.bundles.find((b) => b.id === sel.bundle);
  if (!bundle) throw new Error(`Unknown bundle: ${sel.bundle}`);

  let e = Number(bundle.price);
  let m = 0;
  let y = 0;

  const careId = sel.care || 'plus';
  const care = catalog.carePlans.find((c) => c.id === careId);
  if (care) m += Number(care.price_monthly);

  const sup = catalog.supportPlans.find((s) => s.id === sel.support);
  if (sup?.price_monthly != null) m += Number(sup.price_monthly);

  const cf = catalog.cloudflarePlans.find((c) => c.id === sel.cf);
  const cfIncluded = isCfIncluded(catalog, sel.cf, careId, sel.bundle);
  if (cf && !cfIncluded) {
    if (cf.setup_price != null) e += Number(cf.setup_price);
    if (cf.monthly_price != null) m += Number(cf.monthly_price);
  }

  if (sel.backupUp && bundle.backup_upgrade_price != null) {
    m += Number(bundle.backup_upgrade_price);
  }

  if (sel.aiBundle) {
    e += catalog.aiBundle.setup_now;
    m += catalog.aiBundle.monthly;
  }

  for (const addon of catalog.addons) {
    if (!isAddonVisible(addon, sel.bundle)) continue;
    if (isAddonIncluded(addon, sel.bundle, sel.aiBundle)) continue;
    if (!sel.selectedAddons[addon.id]) continue;
    const cost = addonCost(addon, sel.qty);
    if (addon.billing === 'yearly') y += cost;
    else if (addon.billing === 'monthly') m += cost;
    else e += cost;
  }

  const mDisc = discMonthly(m, sel.payYearly, catalog.yearlyDiscountPct);
  const rates = voucherRates(sel.voucher);

  return {
    oneTime: e,
    monthly: m,
    yearly: y,
    monthlyDiscounted: mDisc,
    oneTimeEffective: e * rates.oneTime,
    monthlyEffective: mDisc * rates.recurring,
    yearlyEffective: y * rates.recurring,
    voucherSavedOneTime: e * (1 - rates.oneTime),
    voucherSavedMonthly: mDisc * (1 - rates.recurring),
  };
}
