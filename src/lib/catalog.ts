import 'server-only';
import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import type {
  AddonCategory,
  Addon,
  Bundle,
  CarePlan,
  Catalog,
  CloudflarePlan,
  LocalizedText,
  Persona,
  SupportPlan,
} from './types';

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

/** Loads the full public catalog. Cached per request; pages revalidate on admin edits. */
export const getCatalog = cache(async (): Promise<Catalog> => {
  const supabase = anonClient();

  const [bundles, categories, addons, care, cf, support, personas, settings] =
    await Promise.all([
      supabase.from('bundles').select('*').eq('active', true).order('sort'),
      supabase.from('addon_categories').select('*').order('sort'),
      supabase.from('addons').select('*').eq('active', true).order('sort'),
      supabase.from('care_plans').select('*').order('sort'),
      supabase.from('cloudflare_plans').select('*').order('sort'),
      supabase.from('support_plans').select('*').order('sort'),
      supabase.from('personas').select('*').order('sort'),
      supabase.from('app_settings').select('*'),
    ]);

  const firstError =
    bundles.error ?? categories.error ?? addons.error ?? care.error ??
    cf.error ?? support.error ?? personas.error ?? settings.error;
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
    yearlyDiscountPct: Number(settingsMap.yearly_discount_pct ?? 18),
    aiBundle: (settingsMap.ai_bundle ?? { setup_now: 1509, setup_later: 2320, monthly: 499 }) as Catalog['aiBundle'],
    aiBundleBullets: (settingsMap.ai_bundle_bullets ?? []) as LocalizedText[],
    trustItems: (settingsMap.trust_items ?? []) as LocalizedText[],
    nextSteps: (settingsMap.next_steps ?? []) as LocalizedText[],
    calendlyEventUrl: String(settingsMap.calendly_event_url ?? ''),
  };
});
