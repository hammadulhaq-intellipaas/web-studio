import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Answers, Catalog } from '@/lib/types';
import { calcTotals, isAddonIncluded, isAddonVisible, isByow } from '@/lib/pricing/engine';
import { recommend, recSet } from '@/lib/pricing/recommend';
import { EMPTY_ANSWERS } from '@/lib/questions';
import { SEEDED_ADDON_RULES, SEEDED_BUNDLE_RULES } from './fixtures/rules';
import { makeCatalog, makeSelection } from './fixtures/catalog';

const MIGRATION = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260710000002_cms_rules_sessions_legal.sql'),
  'utf8',
);

/* ------------------------------------------------------------------ *
 * The pre-CMS implementation, kept verbatim as the parity oracle.
 * (src/lib/pricing/recommend.ts @ 643a221)
 * ------------------------------------------------------------------ */

function legacyRecommend(answers: Answers) {
  if (isByow(answers)) {
    if (answers.byowScope === 'changes') return { bundle: 'gold', baseKey: 'byowChanges', whyKeys: [] as string[] };
    return { bundle: 'byow', baseKey: 'byowLive', whyKeys: [] as string[] };
  }

  let bundle =
    ({ '14': 'silver', '58': 'gold', '912': 'platinum', '12p': 'platinum' } as Record<string, string>)[
      answers.pages ?? ''
    ] || 'gold';
  const whyKeys: string[] = [];

  if (answers.langs === '2' && bundle === 'silver') {
    bundle = 'gold';
    whyKeys.push('twoLangs');
  }
  if (answers.langs === '3' && bundle !== 'platinum') {
    bundle = 'platinum';
    whyKeys.push('threeLangs');
  }
  if (answers.blog === 'ja' && bundle === 'silver') {
    bundle = 'gold';
    whyKeys.push('blog');
  }
  if (answers.shop === 'shop' && bundle !== 'platinum') {
    bundle = 'platinum';
    whyKeys.push('shop');
  }

  return { bundle, baseKey: bundle, whyKeys };
}

function legacyRecSet(
  catalog: Catalog,
  answers: Answers,
  personaId: string | null,
  bundleId: string,
  sourceUrl: string,
): Record<string, boolean> {
  const s: Record<string, boolean> = {};
  const add = (id: string) => {
    const addon = catalog.addons.find((a) => a.id === id);
    if (addon && !isAddonIncluded(addon, bundleId, false) && isAddonVisible(addon, bundleId)) {
      s[id] = true;
    }
  };

  add('cookie');
  const persona = catalog.personas.find((p) => p.id === personaId);
  if (persona) persona.preselect_addons.forEach(add);
  if (answers.contact === 'booking') add('bookembed');
  if (answers.fees === 'ja') add('bookpay');
  if (answers.shop === 'paar' || answers.shop === 'shop') add('ecom');
  if (answers.assets === 'nein') {
    add('logo');
    add('foto');
  }
  if (answers.assets === 'teil') add('foto');
  if (sourceUrl && !isByow(answers)) add('dsgvocheck');
  if (isByow(answers)) {
    const missing = answers.aiMissing ?? [];
    if (missing.includes('seo')) add('seosetup');
    if (missing.includes('email')) add('gws');
    if (missing.includes('perf')) add('perf');
    if (missing.includes('legal')) add('dsgvocheck');
  }
  return s;
}

/* ------------------------------------------------------------------ */

const catalog = makeCatalog();

/** Cartesian product over the named dimensions. */
function* product(dims: Record<string, readonly unknown[]>): Generator<Record<string, unknown>> {
  const keys = Object.keys(dims);
  const idx = keys.map(() => 0);
  for (;;) {
    yield Object.fromEntries(keys.map((k, i) => [k, dims[k][idx[i]]]));
    let d = keys.length - 1;
    while (d >= 0 && ++idx[d] === dims[keys[d]].length) idx[d--] = 0;
    if (d < 0) return;
  }
}

const answersFrom = (partial: Record<string, unknown>): Answers =>
  ({ ...EMPTY_ANSWERS, ...partial }) as Answers;

type Dims = Record<string, readonly unknown[]>;

/** Dimensions the bundle recommendation actually reads. */
const BUNDLE_DIMS: Dims = {
  hasSite: ['none', 'website', 'social', 'concept'],
  selfbuilt: ['ja', 'nein'],
  byowScope: ['live', 'changes', null],
  pages: ['14', '58', '912', '12p', null],
  langs: ['1', '2', '3', null],
  blog: ['ja', 'nein', null],
  shop: ['nein', 'paar', 'shop', null],
};

/** Dimensions the add-on pre-selection actually reads. */
const ADDON_DIMS: Dims = {
  hasSite: ['none', 'website', 'concept'],
  selfbuilt: ['ja', 'nein'],
  contact: ['form', 'booking'],
  fees: ['ja', 'nein', null],
  shop: ['nein', 'paar', 'shop'],
  assets: ['ja', 'teil', 'nein', null],
  aiMissing: [[], ['seo'], ['email', 'perf'], ['seo', 'email', 'perf', 'legal']],
};

describe('CMS rules engine parity with the previous hardcoded logic', () => {
  it('recommend() matches the legacy implementation for every answer combination', () => {
    let checked = 0;
    for (const combo of product(BUNDLE_DIMS)) {
      const answers = answersFrom(combo);
      expect(recommend(catalog, answers)).toEqual(legacyRecommend(answers));
      checked++;
    }
    expect(checked).toBeGreaterThan(1_000);
  });

  it('recSet() matches the legacy implementation, except for the intended assets="ja" fix', () => {
    const personas = [null, 'gastro'];
    const urls = ['', 'https://example.de'];
    const bundles = ['silver', 'gold', 'platinum', 'byow'];

    let checked = 0;
    let divergences = 0;
    for (const combo of product(ADDON_DIMS)) {
      const answers = answersFrom(combo);
      for (const personaId of personas) {
        for (const sourceUrl of urls) {
          for (const bundleId of bundles) {
            const next = recSet(catalog, answers, personaId, bundleId, sourceUrl);
            const legacy = legacyRecSet(catalog, answers, personaId, bundleId, sourceUrl);
            checked++;

            if (answers.assets === 'ja') {
              // Change 3: the photo/logo package is suppressed even when a persona pre-selects it.
              const expected = { ...legacy };
              delete expected.logo;
              delete expected.foto;
              expect(next).toEqual(expected);
              if (legacy.foto || legacy.logo) divergences++;
            } else {
              expect(next).toEqual(legacy);
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(1_000);
    // The gastro persona pre-selects `foto`, so the fix must actually bite somewhere.
    expect(divergences).toBeGreaterThan(0);
  });
});

describe('Change 3 — an existing logo & imagery never auto-selects the photo package', () => {
  const answers = (partial: Partial<Answers>): Answers => ({ ...EMPTY_ANSWERS, ...partial });

  it('suppresses logo/foto for assets="ja", even with a foto-preselecting persona', () => {
    const s = recSet(catalog, answers({ assets: 'ja' }), 'gastro', 'gold', '');
    expect(s.foto).toBeUndefined();
    expect(s.logo).toBeUndefined();
    // the persona's other pre-selection survives
    expect(s.maps).toBe(true);
  });

  it('still pre-selects the package when the customer has no assets', () => {
    const s = recSet(catalog, answers({ assets: 'nein' }), 'gastro', 'gold', '');
    expect(s).toMatchObject({ logo: true, foto: true });
  });
});

describe('Change 4 — the SEO + GEO bundle is never double-priced', () => {
  const base = { bundle: 'gold', care: 'plus', payYearly: false } as const;

  it('charges only the bundle price when the bundle is selected', () => {
    const bundleOnly = calcTotals(
      catalog,
      makeSelection({ ...base, selectedAddons: { seogeosetup: true } }),
    );
    // gold (2990) + care plus (89/mo) + seogeosetup (765)
    expect(bundleOnly.oneTime).toBe(2990 + 765);
  });

  it('does not add the members again when they are also selected', () => {
    const withMembers = calcTotals(
      catalog,
      makeSelection({
        ...base,
        selectedAddons: { seogeosetup: true, seosetup: true, geosetup: true },
      }),
    );
    expect(withMembers.oneTime).toBe(2990 + 765);
  });

  it('prices the members individually once the bundle is deselected', () => {
    const individually = calcTotals(
      catalog,
      makeSelection({ ...base, selectedAddons: { seosetup: true, geosetup: true } }),
    );
    expect(individually.oneTime).toBe(2990 + 450 + 390);
  });

  it('reports members as included while the bundle is selected', () => {
    const ctx = { addons: catalog.addons, selectedAddons: { seogeosetup: true } };
    const seosetup = catalog.addons.find((a) => a.id === 'seosetup')!;
    const geosetup = catalog.addons.find((a) => a.id === 'geosetup')!;
    expect(isAddonIncluded(seosetup, 'gold', false, ctx)).toBe(true);
    expect(isAddonIncluded(geosetup, 'gold', false, ctx)).toBe(true);
    expect(isAddonIncluded(seosetup, 'gold', false)).toBe(false);
  });
});

describe('rule fixtures stay in sync with the migration', () => {
  const idsIn = (table: string): string[] => {
    const start = MIGRATION.indexOf(`insert into ${table} (`);
    expect(start).toBeGreaterThan(-1);
    const end = MIGRATION.indexOf('on conflict', start);
    return [...MIGRATION.slice(start, end).matchAll(/^\('([a-z0-9_]+)'/gm)].map((m) => m[1]);
  };

  it('bundle_rules ids match', () => {
    expect(idsIn('bundle_rules').sort()).toEqual(SEEDED_BUNDLE_RULES.map((r) => r.id).sort());
  });

  it('addon_rules ids match', () => {
    expect(idsIn('addon_rules').sort()).toEqual(SEEDED_ADDON_RULES.map((r) => r.id).sort());
  });
});
