import { describe, expect, it } from 'vitest';
import type { Answers } from '@/lib/types';
import { addonCost, calcTotals, isByow, qtyOf, stepQty, subAddonsOf } from '@/lib/pricing/engine';
import { buildReceipt, subAddonText, type SummaryLabels } from '@/lib/pricing/summary';
import { recommend, recSet } from '@/lib/pricing/recommend';
import { EMPTY_ANSWERS } from '@/lib/questions';
import { makeCatalog, makeSelection } from './fixtures/catalog';

/** Receipt labels are i18n strings at runtime; the vectors only need them non-empty. */
const makeLabels = (): SummaryLabels => ({
  paket: 'Package',
  pflege: 'Care',
  support: 'Support',
  cloudflare: 'Cloudflare',
  setupSuffix: ' — setup',
  included: 'included',
  cfDesc: 'WAF, bot & DDoS protection',
  upgradeSuffix: ' (upgrade)',
  aiSetupName: 'AI Agentic Bundle — setup',
  aiName: 'AI Agentic Bundle',
  aiDesc: 'Chatbot, content engine, reviews, GEO',
  perMonth: '/mo.',
  perYear: '/yr.',
  tierUnit: 'articles/mo.',
});

const catalog = makeCatalog();

describe('calcTotals', () => {
  it('gold + cookie + care plus + CF shield + yearly (default flow)', () => {
    const totals = calcTotals(catalog, makeSelection({ selectedAddons: { cookie: true }, cf: 'shield' }));
    expect(totals.oneTime).toBe(2990 + 150 + 350);
    expect(totals.monthly).toBe(89 + 39);
    expect(totals.monthlyDiscounted).toBeCloseTo(128 * 0.82, 6);
    expect(totals.oneTimeEffective).toBe(3490);
    expect(totals.monthlyEffective).toBeCloseTo(104.96, 6);
  });

  it('applies a scope=both voucher multiplicatively after the yearly discount', () => {
    const totals = calcTotals(
      catalog,
      makeSelection({
        selectedAddons: { cookie: true },
        cf: 'shield',
        voucher: { code: 'TKFF20', percent: 20, scope: 'both' },
      }),
    );
    expect(totals.oneTimeEffective).toBeCloseTo(3490 * 0.8, 6);
    expect(totals.monthlyEffective).toBeCloseTo(104.96 * 0.8, 6);
    expect(totals.voucherSavedOneTime).toBeCloseTo(3490 * 0.2, 6);
    expect(totals.voucherSavedMonthly).toBeCloseTo(104.96 * 0.2, 6);
  });

  it('scope=one_time voucher leaves recurring untouched', () => {
    const totals = calcTotals(
      catalog,
      makeSelection({
        payYearly: false,
        voucher: { code: 'X10', percent: 10, scope: 'one_time' },
      }),
    );
    expect(totals.oneTimeEffective).toBeCloseTo(2990 * 0.9, 6);
    expect(totals.monthlyEffective).toBe(89);
  });

  it('CF Shield is free with Platinum', () => {
    const totals = calcTotals(catalog, makeSelection({ bundle: 'platinum', cf: 'shield', payYearly: false }));
    expect(totals.oneTime).toBe(4990);
    expect(totals.monthly).toBe(89);
  });

  it('CF Shield is free with care=Pro (but Fortress is not)', () => {
    const shield = calcTotals(catalog, makeSelection({ bundle: 'silver', care: 'pro', cf: 'shield', payYearly: false }));
    expect(shield.oneTime).toBe(1990);
    expect(shield.monthly).toBe(179);

    const fortress = calcTotals(catalog, makeSelection({ bundle: 'silver', care: 'pro', cf: 'fortress', payYearly: false }));
    expect(fortress.oneTime).toBe(1990 + 200);
    expect(fortress.monthly).toBe(179 + 249);
  });

  it('BYOW: byow-only qty addons count, not_byow addons are excluded', () => {
    const totals = calcTotals(
      catalog,
      makeSelection({
        bundle: 'byow',
        care: 'basis',
        payYearly: false,
        selectedAddons: { byospage: true, byositer: true, page: true },
        qty: { byospage: 3, byositer: 2, page: 5 },
      }),
    );
    expect(totals.oneTime).toBe(1200 + 3 * 120 + 2 * 190);
    expect(totals.monthly).toBe(55);
  });

  it('bundle-included addons cost nothing (blogsetup in gold)', () => {
    const totals = calcTotals(catalog, makeSelection({ selectedAddons: { blogsetup: true }, payYearly: false }));
    expect(totals.oneTime).toBe(2990);
  });

  it('AI bundle adds setup+monthly and absorbs member addons', () => {
    const totals = calcTotals(
      catalog,
      makeSelection({
        aiBundle: true,
        payYearly: false,
        selectedAddons: { geomon: true, aichatmon: true },
        voucher: { code: 'X10', percent: 10, scope: 'one_time' },
      }),
    );
    expect(totals.oneTime).toBe(2990 + 1509);
    expect(totals.monthly).toBe(89 + 499);
    expect(totals.oneTimeEffective).toBeCloseTo((2990 + 1509) * 0.9, 6);
    expect(totals.monthlyEffective).toBe(588);
  });

  it('tiered blog subscription uses the tier price', () => {
    const totals = calcTotals(
      catalog,
      makeSelection({ payYearly: false, selectedAddons: { blogabo: true }, qty: { blogabo: 5 } }),
    );
    expect(totals.monthly).toBe(89 + 175);
  });

  it('backup upgrade is priced per bundle and unavailable for BYOW', () => {
    const gold = calcTotals(catalog, makeSelection({ backupUp: true, payYearly: false }));
    expect(gold.monthly).toBe(89 + 39);
    const silver = calcTotals(catalog, makeSelection({ bundle: 'silver', backupUp: true, payYearly: false }));
    expect(silver.monthly).toBe(89 + 29);
    const byow = calcTotals(catalog, makeSelection({ bundle: 'byow', backupUp: true, payYearly: false }));
    expect(byow.monthly).toBe(89);
  });

  it('yearly addons land in the yearly bucket with recurring voucher applied', () => {
    const totals = calcTotals(
      catalog,
      makeSelection({
        payYearly: false,
        selectedAddons: { dsgvoyear: true },
        voucher: { code: 'TKFF20', percent: 20, scope: 'both' },
      }),
    );
    expect(totals.yearly).toBe(199);
    expect(totals.yearlyEffective).toBeCloseTo(199 * 0.8, 6);
  });

  it('support plan adds its monthly price', () => {
    const totals = calcTotals(catalog, makeSelection({ support: 'vip', payYearly: false }));
    expect(totals.monthly).toBe(89 + 199);
  });
});

describe('recommend', () => {
  const answers = (partial: Partial<Answers>): Answers => ({ ...EMPTY_ANSWERS, ...partial });

  it('maps page ranges to bundles', () => {
    expect(recommend(catalog, answers({ pages: '14' })).bundle).toBe('silver');
    expect(recommend(catalog, answers({ pages: '58' })).bundle).toBe('gold');
    expect(recommend(catalog, answers({ pages: '912' })).bundle).toBe('platinum');
    expect(recommend(catalog, answers({ pages: '12p' })).bundle).toBe('platinum');
  });

  it('upgrades silver for blog / 2 languages, anything to platinum for 3 languages or full shop', () => {
    expect(recommend(catalog, answers({ pages: '14', blog: 'ja' }))).toMatchObject({ bundle: 'gold', whyKeys: ['blog'] });
    expect(recommend(catalog, answers({ pages: '14', langs: '2' }))).toMatchObject({ bundle: 'gold', whyKeys: ['twoLangs'] });
    expect(recommend(catalog, answers({ pages: '58', langs: '3' }))).toMatchObject({ bundle: 'platinum', whyKeys: ['threeLangs'] });
    expect(recommend(catalog, answers({ pages: '14', shop: 'shop' })).bundle).toBe('platinum');
  });

  it('handles the BYOW paths', () => {
    const base = { hasSite: 'website', selfbuilt: 'ja' } as Partial<Answers>;
    expect(isByow(answers(base))).toBe(true);
    expect(recommend(catalog, answers({ ...base, byowScope: 'live' }))).toMatchObject({ bundle: 'byow', baseKey: 'byowLive' });
    expect(recommend(catalog, answers({ ...base, byowScope: 'changes' }))).toMatchObject({ bundle: 'gold', baseKey: 'byowChanges' });
  });
});

describe('recSet', () => {
  it('always pre-selects cookie, plus booking/fees/assets/url-driven addons', () => {
    const s = recSet(
      catalog,
      { ...EMPTY_ANSWERS, contact: 'booking', fees: 'ja', assets: 'nein' },
      null,
      'gold',
      'https://example.de',
    );
    expect(s).toMatchObject({ cookie: true, bookembed: true, bookpay: true, logo: true, foto: true, dsgvocheck: true });
  });

  it('maps BYOW aiMissing answers to addons and skips platinum-included ones', () => {
    const s = recSet(
      catalog,
      { ...EMPTY_ANSWERS, hasSite: 'website', selfbuilt: 'ja', aiMissing: ['seo', 'email', 'perf', 'legal'] },
      null,
      'byow',
      '',
    );
    expect(s).toMatchObject({ seosetup: true, gws: true, perf: true, dsgvocheck: true });
    // perf is included in platinum, so it must NOT be pre-selected there
    const p = recSet(catalog, { ...EMPTY_ANSWERS, assets: 'teil' }, null, 'platinum', '');
    expect(p.foto).toBe(true);
    expect(p.perf).toBeUndefined();
  });
});

describe('qty stepping', () => {
  const blogabo = catalog.addons.find((a) => a.id === 'blogabo')!;
  const byositer = catalog.addons.find((a) => a.id === 'byositer')!;

  it('tiers step through tier list and clamp', () => {
    expect(qtyOf(blogabo, {})).toBe(1);
    expect(stepQty(blogabo, {}, 1)).toBe(3);
    expect(stepQty(blogabo, { blogabo: 10 }, 1)).toBe(10);
    expect(stepQty(blogabo, { blogabo: 3 }, -1)).toBe(1);
  });

  it('qty addons clamp at min/max', () => {
    expect(stepQty(byositer, { byositer: 10 }, 1)).toBe(10);
    expect(stepQty(byositer, { byositer: 1 }, -1)).toBe(1);
    expect(stepQty(byositer, { byositer: 4 }, 1)).toBe(5);
  });
});

describe('setup included free with the matching bundle', () => {
  const labels = makeLabels();
  const oneTime = (sel: Parameters<typeof calcTotals>[1]) => calcTotals(catalog, sel).oneTime;

  it('charges the setup when no bundle is taken', () => {
    expect(oneTime(makeSelection({ selectedAddons: { geosetup: true } }))).toBe(2990 + 360);
    expect(oneTime(makeSelection({ selectedAddons: { seosetup: true } }))).toBe(2990 + 360);
  });

  it('waives it once the bundle that covers it is selected', () => {
    const sel = makeSelection({ selectedAddons: { geomon: true, geosetup: true }, payYearly: false });
    expect(calcTotals(catalog, sel).oneTime).toBe(2990); // the 420 setup is absorbed
    expect(calcTotals(catalog, sel).monthly).toBe(89 + 149); // only the bundle is charged
  });

  it('covers only the setup for the service the bundle actually monitors', () => {
    // GEO monitoring waives the GEO setup; the SEO setup is still chargeable.
    const sel = makeSelection({
      selectedAddons: { geomon: true, geosetup: true, seosetup: true },
      payYearly: false,
    });
    expect(calcTotals(catalog, sel).oneTime).toBe(2990 + 360);
  });

  it('keeps a waived setup off the receipt entirely', () => {
    const sel = makeSelection({ selectedAddons: { geomon: true, geosetup: true } });
    const receipt = buildReceipt(catalog, sel, 'en', labels);
    expect(receipt.oneOff.some((l) => l.name.includes('geosetup'))).toBe(false);
    // And the printed lines still add up to the computed total.
    const lineSum = receipt.oneOff.reduce((n, l) => n + l.rawPrice, 0);
    expect(lineSum).toBe(calcTotals(catalog, sel).oneTime);
  });

  it('the setup combo still absorbs both individual setups', () => {
    const sel = makeSelection({
      selectedAddons: { seogeosetup: true, seosetup: true, geosetup: true },
    });
    // 765 for the combo, not 765 + 420 + 420.
    expect(calcTotals(catalog, sel).oneTime).toBe(2990 + 685);
  });

  it('the combo is cheaper than the two setups bought separately', () => {
    const combo = oneTime(makeSelection({ selectedAddons: { seogeosetup: true } }));
    const apart = oneTime(makeSelection({ selectedAddons: { seosetup: true, geosetup: true } }));
    // Guards the "Best value" badge: if someone raises the combo price above 840 in the
    // CMS without clearing the badge, this fails.
    expect(combo).toBeLessThan(apart);
  });
});

describe('sub-addons (per-option pricing)', () => {
  const widgets = catalog.addons.find((a) => a.id === 'widgets')!;
  const cookie = catalog.addons.find((a) => a.id === 'cookie')!;
  const labels = makeLabels();

  const totalFor = (selectedSubAddons: Record<string, string[]>) =>
    calcTotals(catalog, makeSelection({ selectedAddons: { widgets: true }, selectedSubAddons })).oneTime;

  it('resolves no stored entry to the first option', () => {
    expect(subAddonsOf(widgets, {})).toEqual(['whatsapp']);
    expect(addonCost(widgets, {}, {})).toBe(190);
  });

  it('charges price_now once per ticked option', () => {
    expect(addonCost(widgets, {}, { widgets: ['whatsapp'] })).toBe(190);
    expect(addonCost(widgets, {}, { widgets: ['whatsapp', 'reviews'] })).toBe(380);
    expect(addonCost(widgets, {}, { widgets: ['whatsapp', 'reviews', 'clicktocall'] })).toBe(570);
  });

  it('adds the per-option total to the one-time bundle total', () => {
    expect(totalFor({})).toBe(2990 + 190);
    expect(totalFor({ widgets: ['whatsapp', 'reviews'] })).toBe(2990 + 380);
    expect(totalFor({ widgets: ['whatsapp', 'reviews', 'clicktocall'] })).toBe(2990 + 570);
  });

  it('never prices a selected add-on at zero', () => {
    // An empty list, or ids the CMS no longer has, must fall back to one option —
    // not to a free add-on.
    expect(addonCost(widgets, {}, { widgets: [] })).toBe(190);
    expect(addonCost(widgets, {}, { widgets: ['deleted-in-cms'] })).toBe(190);
    expect(totalFor({ widgets: [] })).toBe(2990 + 190);
  });

  it('collapses duplicate ids instead of multiplying the price', () => {
    // A repeated id is one option, not several — otherwise the line would read
    // "Widgets (WhatsApp)" next to a €570 price.
    expect(subAddonsOf(widgets, { widgets: ['whatsapp', 'whatsapp', 'whatsapp'] })).toEqual([
      'whatsapp',
    ]);
    expect(addonCost(widgets, {}, { widgets: ['whatsapp', 'whatsapp', 'whatsapp'] })).toBe(190);
    expect(addonCost(widgets, {}, { widgets: ['reviews', 'whatsapp', 'reviews'] })).toBe(380);
  });

  it('cannot be pushed above the number of real options', () => {
    const crafted = Array.from({ length: 500 }, () => 'whatsapp');
    expect(addonCost(widgets, {}, { widgets: crafted })).toBe(190);
    expect(subAddonsOf(widgets, { widgets: crafted })).toHaveLength(1);
  });

  it('names exactly what it charges for, whatever the stored order', () => {
    const cases: string[][] = [
      ['clicktocall', 'whatsapp'],
      ['whatsapp', 'clicktocall'],
      ['whatsapp', 'whatsapp', 'clicktocall'],
    ];
    for (const stored of cases) {
      const state = { widgets: stored };
      const names = subAddonText(widgets, state, 'en');
      // One name per €190 charged, always in CMS order.
      expect(names).toBe('WhatsApp, Click-to-call');
      expect(addonCost(widgets, {}, state)).toBe(names.split(', ').length * 190);
    }
  });

  it('ignores ids the CMS no longer has but keeps the valid ones', () => {
    expect(subAddonsOf(widgets, { widgets: ['reviews', 'gone'] })).toEqual(['reviews']);
    expect(addonCost(widgets, {}, { widgets: ['reviews', 'gone'] })).toBe(190);
    expect(addonCost(widgets, {}, { widgets: ['reviews', 'clicktocall', 'gone'] })).toBe(380);
  });

  it('leaves add-ons without sub-options untouched', () => {
    expect(subAddonsOf(cookie, {})).toEqual([]);
    expect(addonCost(cookie, {}, {})).toBe(350);
    expect(addonCost(cookie, {}, { cookie: ['whatever'] })).toBe(350);
  });

  it('names the ticked options on the receipt line, in CMS order', () => {
    const receipt = buildReceipt(
      catalog,
      makeSelection({
        selectedAddons: { widgets: true },
        // Click order is reversed; the label must still read in CMS order.
        selectedSubAddons: { widgets: ['clicktocall', 'whatsapp'] },
      }),
      'en',
      labels,
    );
    const line = receipt.oneOff.find((l) => l.name.startsWith('Widgets'))!;
    expect(line.name).toBe('Widgets (WhatsApp, Click-to-call)');
    expect(line.rawPrice).toBe(380);
  });

  it('localises the option names on the receipt', () => {
    const receipt = buildReceipt(
      catalog,
      makeSelection({
        selectedAddons: { widgets: true },
        selectedSubAddons: { widgets: ['reviews'] },
      }),
      'de',
      labels,
    );
    const line = receipt.oneOff.find((l) => l.name.startsWith('Widgets'))!;
    expect(line.name).toBe('Widgets (Bewertungen)');
    expect(line.rawPrice).toBe(190);
  });

  it('keeps the receipt line in step with calcTotals', () => {
    const sel = makeSelection({
      selectedAddons: { widgets: true },
      selectedSubAddons: { widgets: ['whatsapp', 'reviews', 'clicktocall'] },
    });
    const receipt = buildReceipt(catalog, sel, 'en', labels);
    const lineSum = receipt.oneOff.reduce((n, l) => n + l.rawPrice, 0);
    expect(lineSum).toBe(calcTotals(catalog, sel).oneTime);
  });
});
