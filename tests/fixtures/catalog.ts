import type { Addon, Bundle, Catalog, Selection } from '@/lib/types';
import { EMPTY_ANSWERS } from '@/lib/questions';
import { SEEDED_ADDON_RULES, SEEDED_BUNDLE_RULES } from './rules';

const bundle = (id: string, price: number, backup: number | null, sort = 0): Bundle => ({
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
  sort,
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
  bundle_members: [],
  byow_only: false,
  not_byow: false,
  ai_bundle_member: false,
  sort: 0,
  active: true,
  ...partial,
});

/** Fixture mirroring the seeded catalog (subset needed for the vectors). */
export function makeCatalog(): Catalog {
  return {
    bundles: [
      bundle('silver', 1990, 29, 10),
      bundle('gold', 2990, 39, 20),
      bundle('platinum', 4990, 99, 30),
      bundle('byow', 1200, null, 40),
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
      addon('maps', { price_now: 190, price_later: 290 }),
      addon('geosetup', { category_id: 'seogeo_setup', price_now: 390, price_later: 590 }),
      addon('seogeosetup', {
        category_id: 'seogeo_setup',
        price_now: 765,
        price_later: 1090,
        bundle_members: ['seosetup', 'geosetup'],
      }),
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
    bundleRules: SEEDED_BUNDLE_RULES,
    addonRules: SEEDED_ADDON_RULES,
    legalPages: [],
    yearlyDiscountPct: 18,
    aiBundle: { setup_now: 1509, setup_later: 2320, monthly: 499 },
    aiBundleBullets: [],
    trustItems: [],
    nextSteps: [],
    calendlyEventUrl: '',
    defaultBundle: 'gold',
    defaultCarePlan: 'plus',
    defaultCloudflarePlan: 'shield',
    aiBundleCategory: 'ki',
  };
}

export function makeSelection(partial: Partial<Selection>): Selection {
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
