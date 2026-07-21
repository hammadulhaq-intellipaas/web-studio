import 'server-only';
import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import type {
  AddonCategory,
  Addon,
  AddonRule,
  Bundle,
  BundleRule,
  CarePlan,
  Catalog,
  CloudflarePlan,
  LegalPage,
  LocalizedText,
  Persona,
  SupportPlan,
} from './types';
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from './supabase/env';

function anonClient() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    auth: { persistSession: false },
  });
}

/** Loads the full public catalog. Cached per request; pages revalidate on admin edits. */
export const getCatalog = cache(async (): Promise<Catalog> => {
  const supabase = anonClient();

  const [bundles, categories, addons, care, cf, support, personas, settings, bundleRules, addonRules, legalPages] =
    await Promise.all([
      supabase.from('bundles').select('*').eq('active', true).order('sort'),
      supabase.from('addon_categories').select('*').order('sort'),
      supabase.from('addons').select('*').eq('active', true).order('sort'),
      supabase.from('care_plans').select('*').order('sort'),
      supabase.from('cloudflare_plans').select('*').order('sort'),
      supabase.from('support_plans').select('*').order('sort'),
      supabase.from('personas').select('*').order('sort'),
      supabase.from('app_settings').select('*'),
      supabase.from('bundle_rules').select('*').eq('active', true).order('priority', { ascending: false }),
      supabase.from('addon_rules').select('*').eq('active', true).order('sort'),
      supabase.from('legal_pages').select('*'),
    ]);

  const firstError =
    bundles.error ?? categories.error ?? addons.error ?? care.error ??
    cf.error ?? support.error ?? personas.error ?? settings.error ??
    bundleRules.error ?? addonRules.error ?? legalPages.error;
  if (firstError) throw new Error(`Failed to load catalog: ${firstError.message}`);

  const settingsMap = Object.fromEntries(
    (settings.data ?? []).map((row: { key: string; value: unknown }) => [row.key, row.value]),
  );

  return {
    bundles: (bundles.data ?? []) as Bundle[],
    addonCategories: (categories.data ?? []) as AddonCategory[],
    addons: (addons.data ?? []) as Addon[],
    carePlans: (care.data ?? []) as CarePlan[],
    cloudflarePlans: (cf.data ?? []) as CloudflarePlan[],
    supportPlans: (support.data ?? []) as SupportPlan[],
    personas: (personas.data ?? []) as Persona[],
    bundleRules: (bundleRules.data ?? []) as BundleRule[],
    addonRules: (addonRules.data ?? []) as AddonRule[],
    legalPages: (legalPages.data ?? []) as LegalPage[],
    yearlyDiscountPct: Number(settingsMap.yearly_discount_pct ?? 18),
    aiBundle: (settingsMap.ai_bundle ?? { setup_now: 1509, setup_later: 2320, monthly: 499 }) as Catalog['aiBundle'],
    aiBundleBullets: (settingsMap.ai_bundle_bullets ?? []) as LocalizedText[],
    trustItems: (settingsMap.trust_items ?? []) as LocalizedText[],
    nextSteps: (settingsMap.next_steps ?? []) as LocalizedText[],
    calendlyEventUrl: String(settingsMap.calendly_event_url || process.env.NEXT_PUBLIC_CALENDLY_URL || ''),
    defaultBundle: String(settingsMap.default_bundle ?? 'gold'),
    defaultCarePlan: String(settingsMap.default_care_plan ?? 'plus'),
    defaultCloudflarePlan: String(settingsMap.default_cloudflare_plan ?? 'shield'),
    aiBundleCategory: String(settingsMap.ai_bundle_category ?? 'ki'),
  };
});
