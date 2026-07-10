import { describe, expect, it } from 'vitest';
import type { Answers } from '@/lib/types';
import { calcTotals, isByow, qtyOf, stepQty } from '@/lib/pricing/engine';
import { recommend, recSet } from '@/lib/pricing/recommend';
import { EMPTY_ANSWERS } from '@/lib/questions';
import { makeCatalog, makeSelection } from './fixtures/catalog';

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
