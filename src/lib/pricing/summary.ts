import type { Addon, Catalog, Locale, Selection } from '../types';
import { pickLocale } from '../types';
import { fmt, mon } from '../format';
import {
  addonCost,
  discMonthly,
  isAddonIncluded,
  isAddonVisible,
  isCfIncluded,
  qtyOf,
  type InclusionContext,
} from './engine';

/** Translated fragments needed to compose receipt line names. */
export interface SummaryLabels {
  paket: string; // "Paket" / "Package"
  pflege: string; // "Pflege" / "Care"
  support: string;
  cloudflare: string;
  setupSuffix: string; // " — Einrichtung" / " — setup"
  included: string; // "inklusive" / "included"
  cfDesc: string; // "WAF, Bot- & DDoS-Schutz"
  upgradeSuffix: string; // " (Upgrade)"
  aiSetupName: string; // "AI Agentic Bundle — Einrichtung"
  aiName: string; // "AI Agentic Bundle"
  aiDesc: string; // "Chatbot, Content-Engine, Reviews, GEO"
  perMonth: string; // "/Mon." / "/mo."
  perYear: string; // "/Jahr" / "/yr."
  tierUnit: string; // "Artikel/Mon." / "articles/mo."
}

export interface ReceiptLine {
  name: string;
  price: string; // formatted, e.g. "€2.990" or "€72,98/Mon."
  rawPrice: number;
  desc?: string;
  bold?: boolean;
}

export interface Receipt {
  oneOff: ReceiptLine[];
  monthly: ReceiptLine[];
  yearly: ReceiptLine[];
}

export function qtyText(addon: Addon, qtyState: Record<string, number>, locale: Locale, labels: SummaryLabels): string {
  const n = qtyOf(addon, qtyState);
  if (addon.tiers && addon.tiers.length) return `${n} ${labels.tierUnit}`;
  if (addon.qty) return `${n} ${locale === 'de' ? addon.qty.unit_de : addon.qty.unit_en}`;
  return '';
}

/** Receipt lines for sidebar, step-4 summary, confirmation and emails — ported from buildSummary(). */
export function buildReceipt(
  catalog: Catalog,
  sel: Selection,
  locale: Locale,
  labels: SummaryLabels,
): Receipt {
  const bundle = catalog.bundles.find((b) => b.id === sel.bundle)!;
  const careId = sel.care || catalog.defaultCarePlan;
  const disc = (p: number) => discMonthly(p, sel.payYearly, catalog.yearlyDiscountPct);
  const inclusionCtx: InclusionContext = { addons: catalog.addons, selectedAddons: sel.selectedAddons };

  const oneOff: ReceiptLine[] = [];
  const monthly: ReceiptLine[] = [];
  const yearly: ReceiptLine[] = [];

  oneOff.push({
    name: `${labels.paket} ${bundle.name}`,
    price: fmt(Number(bundle.price), locale),
    rawPrice: Number(bundle.price),
    bold: true,
  });

  for (const addon of catalog.addons) {
    if (!isAddonVisible(addon, sel.bundle)) continue;
    if (isAddonIncluded(addon, sel.bundle, sel.aiBundle, inclusionCtx)) continue;
    if (!sel.selectedAddons[addon.id]) continue;
    const name = pickLocale(addon as unknown as Record<string, unknown>, 'name', locale);
    const qtyTag = addon.qty || addon.tiers ? ` (${qtyText(addon, sel.qty, locale, labels)})` : '';
    const cost = addonCost(addon, sel.qty);
    if (addon.billing === 'yearly') {
      yearly.push({ name: name + qtyTag, price: `${mon(cost, locale)}${labels.perYear}`, rawPrice: cost });
    } else if (addon.billing === 'monthly') {
      monthly.push({ name: name + qtyTag, price: `${mon(disc(cost), locale)}${labels.perMonth}`, rawPrice: disc(cost) });
    } else {
      oneOff.push({ name: name + qtyTag, price: fmt(cost, locale), rawPrice: cost });
    }
  }

  const care = catalog.carePlans.find((c) => c.id === careId)!;
  monthly.push({
    name: `${labels.pflege} ${care.name}`,
    desc: pickLocale(care as unknown as Record<string, unknown>, 'short', locale),
    price: `${mon(disc(Number(care.price_monthly)), locale)}${labels.perMonth}`,
    rawPrice: disc(Number(care.price_monthly)),
  });

  const sup = catalog.supportPlans.find((s) => s.id === sel.support);
  if (sup?.price_monthly != null) {
    monthly.push({
      name: `${labels.support} ${pickLocale(sup as unknown as Record<string, unknown>, 'name', locale)}`,
      desc: pickLocale(sup as unknown as Record<string, unknown>, 'desc', locale),
      price: `${mon(disc(Number(sup.price_monthly)), locale)}${labels.perMonth}`,
      rawPrice: disc(Number(sup.price_monthly)),
    });
  }

  const cf = catalog.cloudflarePlans.find((c) => c.id === sel.cf);
  if (cf && cf.id !== 'none') {
    const name = pickLocale(cf as unknown as Record<string, unknown>, 'name', locale);
    if (isCfIncluded(catalog, sel.cf, careId, sel.bundle)) {
      monthly.push({
        name: `${labels.cloudflare} ${name}`,
        desc: labels.included,
        price: `${mon(0, locale)}${labels.perMonth}`,
        rawPrice: 0,
      });
    } else {
      if (cf.setup_price != null) {
        oneOff.push({
          name: `${labels.cloudflare} ${name}${labels.setupSuffix}`,
          price: fmt(Number(cf.setup_price), locale),
          rawPrice: Number(cf.setup_price),
        });
      }
      if (cf.monthly_price != null) {
        monthly.push({
          name: `${labels.cloudflare} ${name}`,
          desc: labels.cfDesc,
          price: `${mon(disc(Number(cf.monthly_price)), locale)}${labels.perMonth}`,
          rawPrice: disc(Number(cf.monthly_price)),
        });
      }
    }
  }

  if (sel.backupUp && bundle.backup_upgrade_price != null) {
    const label = pickLocale(bundle as unknown as Record<string, unknown>, 'backup_upgrade_label', locale);
    monthly.push({
      name: `${label}${labels.upgradeSuffix}`,
      price: `${mon(disc(Number(bundle.backup_upgrade_price)), locale)}${labels.perMonth}`,
      rawPrice: disc(Number(bundle.backup_upgrade_price)),
    });
  }

  if (sel.aiBundle) {
    oneOff.push({
      name: labels.aiSetupName,
      price: fmt(catalog.aiBundle.setup_now, locale),
      rawPrice: catalog.aiBundle.setup_now,
    });
    monthly.push({
      name: labels.aiName,
      desc: labels.aiDesc,
      price: `${mon(disc(catalog.aiBundle.monthly), locale)}${labels.perMonth}`,
      rawPrice: disc(catalog.aiBundle.monthly),
    });
  }

  return { oneOff, monthly, yearly };
}
