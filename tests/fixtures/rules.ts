import type { AddonRule, BundleRule } from '@/lib/types';

/**
 * Mirrors the rules seeded in supabase/migrations/20260710000002_cms_rules_sessions_legal.sql.
 * `rules-parity.test.ts` asserts the ids here stay in sync with that migration.
 */
export const SEEDED_BUNDLE_RULES: BundleRule[] = [
  {
    id: 'base_byow_changes',
    rule_kind: 'base',
    conditions: [
      { key: 'byow', values: ['true'] },
      { key: 'byowScope', values: ['changes'] },
    ],
    result_bundle: 'gold',
    reason_key: 'byowChanges',
    priority: 210,
    active: true,
  },
  {
    id: 'base_byow_live',
    rule_kind: 'base',
    conditions: [{ key: 'byow', values: ['true'] }],
    result_bundle: 'byow',
    reason_key: 'byowLive',
    priority: 200,
    active: true,
  },
  {
    id: 'base_pages_14',
    rule_kind: 'base',
    conditions: [
      { key: 'byow', values: ['false'] },
      { key: 'pages', values: ['14'] },
    ],
    result_bundle: 'silver',
    reason_key: null,
    priority: 100,
    active: true,
  },
  {
    id: 'base_pages_58',
    rule_kind: 'base',
    conditions: [
      { key: 'byow', values: ['false'] },
      { key: 'pages', values: ['58'] },
    ],
    result_bundle: 'gold',
    reason_key: null,
    priority: 100,
    active: true,
  },
  {
    id: 'base_pages_912',
    rule_kind: 'base',
    conditions: [
      { key: 'byow', values: ['false'] },
      { key: 'pages', values: ['912', '12p'] },
    ],
    result_bundle: 'platinum',
    reason_key: null,
    priority: 100,
    active: true,
  },
  {
    id: 'up_langs_2',
    rule_kind: 'upgrade',
    conditions: [
      { key: 'byow', values: ['false'] },
      { key: 'langs', values: ['2'] },
    ],
    result_bundle: 'gold',
    reason_key: 'twoLangs',
    priority: 90,
    active: true,
  },
  {
    id: 'up_langs_3',
    rule_kind: 'upgrade',
    conditions: [
      { key: 'byow', values: ['false'] },
      { key: 'langs', values: ['3'] },
    ],
    result_bundle: 'platinum',
    reason_key: 'threeLangs',
    priority: 89,
    active: true,
  },
  {
    id: 'up_blog',
    rule_kind: 'upgrade',
    conditions: [
      { key: 'byow', values: ['false'] },
      { key: 'blog', values: ['ja'] },
    ],
    result_bundle: 'gold',
    reason_key: 'blog',
    priority: 80,
    active: true,
  },
  {
    id: 'up_shop',
    rule_kind: 'upgrade',
    conditions: [
      { key: 'byow', values: ['false'] },
      { key: 'shop', values: ['shop'] },
    ],
    result_bundle: 'platinum',
    reason_key: 'shop',
    priority: 70,
    active: true,
  },
];

const addonRule = (
  id: string,
  conditions: AddonRule['conditions'],
  add: string[],
  remove: string[] = [],
  sort = 0,
): AddonRule => ({
  id,
  conditions,
  add_addon_ids: add,
  remove_addon_ids: remove,
  note: null,
  active: true,
  sort,
});

export const SEEDED_ADDON_RULES: AddonRule[] = [
  addonRule('always_cookie', [], ['cookie'], [], 10),
  addonRule('contact_booking', [{ key: 'contact', values: ['booking'] }], ['bookembed'], [], 20),
  addonRule('fees_ja', [{ key: 'fees', values: ['ja'] }], ['bookpay'], [], 30),
  addonRule('shop_any', [{ key: 'shop', values: ['paar', 'shop'] }], ['ecom'], [], 40),
  addonRule('assets_nein', [{ key: 'assets', values: ['nein'] }], ['logo', 'foto'], [], 50),
  addonRule('assets_teil', [{ key: 'assets', values: ['teil'] }], ['foto'], [], 60),
  addonRule(
    'url_dsgvo',
    [
      { key: 'url', values: ['__set'] },
      { key: 'byow', values: ['false'] },
    ],
    ['dsgvocheck'],
    [],
    70,
  ),
  addonRule(
    'byow_seo',
    [
      { key: 'byow', values: ['true'] },
      { key: 'aiMissing', values: ['seo'] },
    ],
    ['seosetup'],
    [],
    80,
  ),
  addonRule(
    'byow_email',
    [
      { key: 'byow', values: ['true'] },
      { key: 'aiMissing', values: ['email'] },
    ],
    ['gws'],
    [],
    90,
  ),
  addonRule(
    'byow_perf',
    [
      { key: 'byow', values: ['true'] },
      { key: 'aiMissing', values: ['perf'] },
    ],
    ['perf'],
    [],
    100,
  ),
  addonRule(
    'byow_legal',
    [
      { key: 'byow', values: ['true'] },
      { key: 'aiMissing', values: ['legal'] },
    ],
    ['dsgvocheck'],
    [],
    110,
  ),
  // Change 3: an existing logo & imagery must never auto-select the photo/logo package,
  // not even via a persona pre-selection. Suppressions run last.
  addonRule('assets_ja_suppress', [{ key: 'assets', values: ['ja'] }], [], ['logo', 'foto'], 900),
];
