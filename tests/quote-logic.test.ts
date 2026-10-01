import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { recSet } from '@/lib/pricing/recommend';
import { ruleMatches } from '@/lib/pricing/rules';
import { calcTotals, isAddonIncluded } from '@/lib/pricing/engine';
import { EMPTY_ANSWERS } from '@/lib/questions';
import { useFunnel } from '@/stores/funnel';
import type { Answers } from '@/lib/types';
import { makeCatalog, makeSelection } from './fixtures/catalog';

/** The quote page logic agreed in October 2026: CMS by package, Stripe by intent, the reset button. */
const catalog = makeCatalog();
const answers = (partial: Partial<Answers> = {}): Answers => ({ ...EMPTY_ANSWERS, ...partial });
const cms = catalog.addons.find((a) => a.id === 'cms')!;

describe('CMS setup by package', () => {
  it('Silver adds CMS setup as an add-on', () => {
    expect(recSet(catalog, answers(), null, 'silver', '').cms).toBe(true);
  });

  it('Silver with a blog adds Blog setup as well', () => {
    const s = recSet(catalog, answers({ blog: 'ja' }), null, 'silver', '');
    expect(s).toMatchObject({ cms: true, blogsetup: true });
  });

  it('Silver without a blog adds CMS setup only', () => {
    const s = recSet(catalog, answers({ blog: 'nein' }), null, 'silver', '');
    expect(s.cms).toBe(true);
    expect(s.blogsetup).toBeUndefined();
  });

  it('Gold includes CMS setup, so it is never added as an add-on there', () => {
    expect(isAddonIncluded(cms, 'gold', false)).toBe(true);
    expect(recSet(catalog, answers({ blog: 'ja' }), null, 'gold', '').cms).toBeUndefined();
  });

  it('Platinum still includes it', () => {
    expect(isAddonIncluded(cms, 'platinum', false)).toBe(true);
  });

  it('Silver charges for CMS setup, Gold does not', () => {
    const silver = calcTotals(catalog, makeSelection({ bundle: 'silver', care: 'plus', payYearly: false, selectedAddons: { cms: true } }));
    const silverBare = calcTotals(catalog, makeSelection({ bundle: 'silver', care: 'plus', payYearly: false }));
    expect(silver.oneTime - silverBare.oneTime).toBe(490);
    const gold = calcTotals(catalog, makeSelection({ bundle: 'gold', care: 'plus', payYearly: false, selectedAddons: { cms: true } }));
    const goldBare = calcTotals(catalog, makeSelection({ bundle: 'gold', care: 'plus', payYearly: false }));
    expect(gold.oneTime).toBe(goldBare.oneTime);
  });

  // Bundle rules choose the package, so a `bundle` clause can never steer that choice.
  it('a bundle clause never matches when the package is not known yet', () => {
    expect(ruleMatches([{ key: 'bundle', values: ['silver'] }], answers(), '')).toBe(false);
    expect(ruleMatches([{ key: 'bundle', values: ['silver'] }], answers(), '', 'silver')).toBe(true);
  });
});

describe('Payment at booking (Stripe) only with payment intent', () => {
  it('paid appointments with online booking switch it on', () => {
    expect(recSet(catalog, answers({ contact: 'booking', fees: 'ja' }), null, 'gold', '').bookpay).toBe(true);
  });

  it('free appointments do not', () => {
    expect(recSet(catalog, answers({ contact: 'booking', fees: 'nein' }), null, 'gold', '').bookpay).toBeUndefined();
  });

  it('an old "paid" answer left behind after switching to "contact form only" does not', () => {
    expect(recSet(catalog, answers({ contact: 'form', fees: 'ja' }), null, 'gold', '').bookpay).toBeUndefined();
  });

  it('selling online gets the eCommerce checkout, not payment at booking', () => {
    const s = recSet(catalog, answers({ contact: 'form', shop: 'paar' }), null, 'gold', '');
    expect(s.ecom).toBe(true);
    expect(s.bookpay).toBeUndefined();
  });
});

describe('"Remove all add-ons" and its way back', () => {
  beforeEach(() => {
    useFunnel.setState({
      sel: { cookie: true, foto: true, cms: true },
      recSel: { cookie: true, cms: true },
      qty: { page: 3 },
      selectedSubAddons: { widgets: ['whatsapp'] },
      aiBundle: true,
      bundle: 'silver',
      care: 'plus',
      cf: 'shield',
      support: 'std',
    });
  });

  it('empties every add-on and leaves the package and the plans alone', () => {
    useFunnel.getState().clearAddons();
    const s = useFunnel.getState();
    expect(s.sel).toEqual({});
    expect(s.qty).toEqual({});
    expect(s.selectedSubAddons).toEqual({});
    expect(s.aiBundle).toBe(false);
    expect({ bundle: s.bundle, care: s.care, cf: s.cf, support: s.support }).toEqual({
      bundle: 'silver',
      care: 'plus',
      cf: 'shield',
      support: 'std',
    });
  });

  it('restores exactly what was recommended, not what had been picked by hand', () => {
    useFunnel.getState().clearAddons();
    useFunnel.getState().restoreRecommended();
    expect(useFunnel.getState().sel).toEqual({ cookie: true, cms: true });
  });
});

describe('the data changes are in both the migration and the seed', () => {
  const read = (f: string) => readFileSync(join(process.cwd(), f), 'utf8');
  const migration = read('supabase/migrations/20261001000018_quote_logic.sql');
  const seed = read('supabase/seed.sql');

  it('SEO Lite, €180 a month', () => {
    for (const sql of [migration, seed]) {
      expect(sql).toContain("'seolite'");
      expect(sql).toMatch(/SEO Lite — keyword monitoring and monthly reports[\s\S]{0,40}'monthly', 180/);
    }
  });

  it('Care plan Plus no longer promises an SEO review', () => {
    const plusRow = seed.split('\n').find((l) => l.startsWith("('plus'"))!;
    expect(plusRow).not.toMatch(/SEO/);
    expect(migration).toMatch(/update care_plans set[\s\S]*where id = 'plus'/);
  });

  it('CMS setup is included in Gold and on the Gold card', () => {
    expect(seed).toContain("'{gold,platinum}'");
    expect(seed).toContain('"en":"CMS setup (manage pages, blog & events yourself)"');
    expect(migration).toContain('"en":"CMS setup (manage pages, blog & events yourself)"');
  });
});
