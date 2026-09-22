import { describe, expect, it } from 'vitest';
import type { LeadConfig } from '@/lib/types';
import { diffConfigs, lineTotals } from '@/lib/quotes/diff';

const base = (over: Partial<LeadConfig> = {}): LeadConfig => ({
  answers: { hasSite: null, selfbuilt: null, aiHas: [], aiMissing: [], byowScope: null, pages: null, langs: null, contact: null, fees: null, shop: null, blog: null, assets: null },
  bundle: 'gold',
  bundleName: 'Gold',
  addons: [{ id: 'cookie', name: 'Cookie-Banner', qty: null, billing: 'one_time', price: 350 }],
  care: 'plus',
  support: 'none',
  cf: 'shield',
  backupUp: false,
  aiBundle: false,
  payYearly: true,
  voucher: null,
  lines: { oneOff: [{ name: 'Gold', price: 2990 }, { name: 'Cookie-Banner', price: 350 }], monthly: [{ name: 'Pflege Plus', price: 72.98 }], yearly: [] },
  ...over,
});

describe('diffConfigs', () => {
  it('is empty for identical snapshots', () => {
    expect(diffConfigs(base(), base())).toEqual([]);
  });

  it('reports added / removed / changed add-ons with their price delta', () => {
    const before = base();
    const after = base({
      addons: [
        { id: 'cookie', name: 'Cookie-Banner', qty: null, billing: 'one_time', price: 350 },
        { id: 'newsletter', name: 'Newsletter', qty: null, billing: 'one_time', price: 390 },
      ],
    });
    const changes = diffConfigs(before, after);
    expect(changes).toEqual([{ kind: 'addon_added', label: 'Newsletter', delta: 390 }]);
    expect(diffConfigs(after, before)).toEqual([{ kind: 'addon_removed', label: 'Newsletter', delta: -390 }]);

    const qty = base({ addons: [{ id: 'page', name: 'Zusatzseite', qty: 3, billing: 'one_time', price: 570 }] });
    const qty2 = base({ addons: [{ id: 'page', name: 'Zusatzseite', qty: 5, billing: 'one_time', price: 950 }] });
    expect(diffConfigs(qty, qty2)).toEqual([{ kind: 'addon_changed', label: 'Zusatzseite', before: 'Zusatzseite × 3', after: 'Zusatzseite × 5', delta: 380 }]);
  });

  it('reports bundle, plans, options, billing and voucher changes in a stable order', () => {
    const before = base();
    const after = base({
      bundle: 'platinum',
      bundleName: 'Platinum',
      care: 'pro',
      backupUp: true,
      payYearly: false,
      voucher: { code: 'TKFF40', percent: 40, scope: 'both' },
    });
    expect(diffConfigs(before, after).map((c) => c.kind)).toEqual(['bundle', 'plan', 'option', 'billing', 'voucher']);
    const voucher = diffConfigs(before, after).find((c) => c.kind === 'voucher')!;
    expect(voucher.after).toBe('TKFF40 (−40%)');
    expect(voucher.before).toBeNull();
  });

  it('sums stored lines', () => {
    expect(lineTotals(base())).toEqual({ oneTime: 3340, monthly: 72.98, yearly: 0 });
  });
});
