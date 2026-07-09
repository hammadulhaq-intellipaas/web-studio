import { describe, expect, it } from 'vitest';
import type { Addon, Answers, Bundle, Catalog, Selection } from '@/lib/types';
import { calcTotals, isByow, qtyOf, stepQty } from '@/lib/pricing/engine';
import { recommend, recSet } from '@/lib/pricing/recommend';
import { EMPTY_ANSWERS } from '@/lib/questions';

const bundle = (id: string, price: number, backup: number | null): Bundle => ({
  id,
  name: id,
  tag_de: '',
  tag_en: '',
  price,
  chips: [],
  backup_upgrade_price: backup,
  backup_upgrade_label_de: null,
  backup_upgrade_label_en: null,
  backup_base_label_de: null,
  backup_base_label_en: null,
  sort: 0,
  active: true,
});

const addon = (id: string, partial: Partial<Addon>): Addon => ({
  id,
  category_id: 'inhalte',
  name_de: id,
  name_en: id,
  note_de: null,
  note_en: null,
  billing: 'once',
  price_now: 0,
  price_later: null,
  qty: null,
  tiers: null,
  included_in: [],
  byow_only: false,
  not_byow: false,
  ai_bundle_member: false,
  sort: 0,
  active: true,
  ...partial,
});

/** Fixture mirroring the seeded catalog (subset needed for the vectors). */
function makeCatalog(): Catalog {
  return {
    bundles: [
      bundle('silver', 1990, 29),
      bundle('gold', 2990, 39),
      bundle('platinum', 4990, 99),
      bundle('byow', 1200, null),
    ],
    addonCategories: [],
    addons: [
      addon('cookie', { category_id: 'compliance', price_now: 350, price_later: 590 }),
      addon('page', {
        price_now: 190,
        price_later: 290,
        not_byow: true,
        qty: { min: 1, max: 25, unit_de: 'Seiten', unit_en: 'pages' },
      }),
      addon('byospage', {
        category_id: 'byos',
        price_now: 120,
        byow_only: true,
        qty: { min: 1, max: 25, unit_de: 'Seiten', unit_en: 'pages' },
      }),
      addon('byositer', {
        category_id: 'byos',
        price_now: 190,
        byow_only: true,
        qty: { min: 1, max: 10, unit_de: 'Runden', unit_en: 'rounds' },
      }),
      addon('blogsetup', { price_now: 200, price_later: 350, included_in: ['gold', 'platinum'] }),
      addon('blogabo', {
        category_id: 'blogabo',
        billing: 'monthly',
        price_now: 40,
        tiers: [
          { n: 1, price: 40 },
          { n: 3, price: 110 },
          { n: 5, price: 175 },
          { n: 10, price: 320 },
        ],
      }),
      addon('dsgvoyear', { category_id: 'compliance', billing: 'yearly', price_now: 199, price_later: 299 }),
      addon('geomon', { category_id: 'seogeo_mon', billing: 'monthly', price_now: 149, ai_bundle_member: true }),
      addon('aichatmon', { category_id: 'ki', billing: 'monthly', price_now: 249, ai_bundle_member: true }),
      addon('bookembed', { price_now: 490, price_later: 790 }),
      addon('bookpay', { price_now: 490, price_later: 790 }),
      addon('ecom', { price_now: 1490, price_later: 2090 }),
      addon('foto', { price_now: 290, price_later: 440 }),
      addon('logo', { price_now: 490, price_later: 790 }),
      addon('dsgvocheck', { category_id: 'compliance', price_now: 490, price_later: 790 }),
      addon('seosetup', { category_id: 'seogeo_setup', price_now: 450, price_later: 690 }),
      addon('gws', { price_now: 290, price_later: 450 }),
      addon('perf', { price_now: 290, price_later: 490, included_in: ['platinum'] }),
      addon('localseo', { category_id: 'seogeo_setup', price_now: 350, price_later: 550 }),
    ],
    carePlans: [
      { id: 'basis', name: 'Basis', price_monthly: 55, desc_de: '', desc_en: '', short_de: '', short_en: '', recommended: false, sort: 0 },
      { id: 'plus', name: 'Plus', price_monthly: 89, desc_de: '', desc_en: '', short_de: '', short_en: '', recommended: true, sort: 1 },
      { id: 'pro', name: 'Pro', price_monthly: 179, desc_de: '', desc_en: '', short_de: '', short_en: '', recommended: false, sort: 2 },
    ],
    cloudflarePlans: [
      { id: 'none', name_de: '', name_en: '', setup_price: null, monthly_price: null, desc_de: '', desc_en: '', recommended: false, included_when: null, sort: 0 },
      { id: 'starter', name_de: '', name_en: '', setup_price: 120, monthly_price: null, desc_de: '', desc_en: '', recommended: false, included_when: null, sort: 1 },
      { id: 'shield', name_de: '', name_en: '', setup_price: 150, monthly_price: 39, desc_de: '', desc_en: '', recommended: true, included_when: { care: 'pro', bundle: 'platinum' }, sort: 2 },
      { id: 'fortress', name_de: '', name_en: '', setup_price: 200, monthly_price: 249, desc_de: '', desc_en: '', recommended: false, included_when: null, sort: 3 },
    ],
    supportPlans: [
      { id: 'none', name_de: '', name_en: '', price_monthly: null, desc_de: '', desc_en: '', sort: 0 },
      { id: 'std', name_de: '', name_en: '', price_monthly: 49, desc_de: '', desc_en: '', sort: 1 },
      { id: 'vip', name_de: '', name_en: '', price_monthly: 199, desc_de: '', desc_en: '', sort: 3 },
    ],
    personas: [
      {
        id: 'gastro',
        label_de: '',
        label_en: '',
        icon_path: '',
        default_answers: EMPTY_ANSWERS,
        preselect_addons: ['maps', 'foto'],
        sort: 0,
      },
    ],
    yearlyDiscountPct: 18,
    aiBundle: { setup_now: 1509, setup_later: 2320, monthly: 499 },
    aiBundleBullets: [],
    trustItems: [],
    nextSteps: [],
    calendlyEventUrl: '',
  };
}

function makeSelection(partial: Partial<Selection>): Selection {
  return {
    answers: { ...EMPTY_ANSWERS },
    personaId: null,
    sourceUrl: '',
    bundle: 'gold',
    selectedAddons: {},
    qty: {},
    care: 'plus',
    support: 'none',
    cf: 'none',
    backupUp: false,
    aiBundle: false,
    payYearly: true,
    voucher: null,
    ...partial,
  };
}

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
    expect(recommend(answers({ pages: '14' })).bundle).toBe('silver');
    expect(recommend(answers({ pages: '58' })).bundle).toBe('gold');
    expect(recommend(answers({ pages: '912' })).bundle).toBe('platinum');
    expect(recommend(answers({ pages: '12p' })).bundle).toBe('platinum');
  });

  it('upgrades silver for blog / 2 languages, anything to platinum for 3 languages or full shop', () => {
    expect(recommend(answers({ pages: '14', blog: 'ja' }))).toMatchObject({ bundle: 'gold', whyKeys: ['blog'] });
    expect(recommend(answers({ pages: '14', langs: '2' }))).toMatchObject({ bundle: 'gold', whyKeys: ['twoLangs'] });
    expect(recommend(answers({ pages: '58', langs: '3' }))).toMatchObject({ bundle: 'platinum', whyKeys: ['threeLangs'] });
    expect(recommend(answers({ pages: '14', shop: 'shop' })).bundle).toBe('platinum');
  });

  it('handles the BYOW paths', () => {
    const base = { hasSite: 'website', selfbuilt: 'ja' } as Partial<Answers>;
    expect(isByow(answers(base))).toBe(true);
    expect(recommend(answers({ ...base, byowScope: 'live' }))).toMatchObject({ bundle: 'byow', baseKey: 'byowLive' });
    expect(recommend(answers({ ...base, byowScope: 'changes' }))).toMatchObject({ bundle: 'gold', baseKey: 'byowChanges' });
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
