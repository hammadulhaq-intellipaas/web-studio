import 'server-only';
import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from '@/lib/supabase/env';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type {
  OnbBriefSection,
  OnbExample,
  OnbField,
  OnbFlagRule,
  OnbFollowup,
  OnbPrompt,
  OnbScreen,
  OnbText,
  OnboardingDefinition,
  OnboardingSecrets,
  OnboardingSettings,
} from './types';

function anonClient() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, { auth: { persistSession: false } });
}

export function parseOnboardingSettings(settingsMap: Record<string, unknown>): OnboardingSettings {
  const num = (key: string, fallback: number) => {
    const n = Number(settingsMap[key]);
    return Number.isFinite(n) && settingsMap[key] !== undefined && settingsMap[key] !== null ? n : fallback;
  };
  const str = (key: string, fallback: string) =>
    settingsMap[key] == null ? fallback : String(settingsMap[key]);
  return {
    model: str('onb_model', 'gpt-6-luna'),
    maxFollowups: num('onb_max_followups', 12),
    maxRounds: num('onb_max_rounds', 2),
    maxAiCalls: num('onb_max_ai_calls', 20),
    buildWeeksMin: num('onb_build_weeks_min', 3),
    buildWeeksMax: num('onb_build_weeks_max', 6),
    estimatedMinutes: num('onb_estimated_minutes', 20),
    termsVersion: str('onb_terms_version', 'v2'),
    examplesUrl: str('onb_examples_url', ''),
    folderHelpUrl: str('onb_folder_help_url', ''),
    teamEmail: str('onb_team_email', '') || str('team_email', ''),
  };
}

/**
 * The form definition the public form renders from — screens, fields, follow-ups, flag
 * rules, brief sections, texts and settings. Cached per request like `getCatalog()`.
 * Inactive rows are dropped here so nothing downstream has to check `active`.
 */
export const getOnboardingDefinition = cache(async (): Promise<OnboardingDefinition> => {
  const supabase = anonClient();
  const [screens, fields, followups, flagRules, sections, texts, settings] = await Promise.all([
    supabase.from('onb_screens').select('*').eq('active', true).order('sort'),
    supabase.from('onb_fields').select('*').eq('active', true).order('screen_id').order('sort'),
    supabase.from('onb_followups').select('*').eq('active', true).order('sort'),
    supabase.from('onb_flag_rules').select('*').eq('active', true).order('sort'),
    supabase.from('onb_brief_sections').select('*').eq('active', true).order('sort'),
    supabase.from('onb_texts').select('*'),
    supabase.from('app_settings').select('*'),
  ]);

  const firstError =
    screens.error ?? fields.error ?? followups.error ?? flagRules.error ??
    sections.error ?? texts.error ?? settings.error;
  if (firstError) throw new Error(`Failed to load onboarding definition: ${firstError.message}`);

  const settingsMap = Object.fromEntries(
    (settings.data ?? []).map((row: { key: string; value: unknown }) => [row.key, row.value]),
  );

  const screenRows = (screens.data ?? []) as OnbScreen[];
  const screenOrder = new Map(screenRows.map((s) => [s.id, s.sort]));
  // Fields come back grouped by screen id (alphabetical); order them by screen sort instead.
  const fieldRows = ((fields.data ?? []) as OnbField[])
    .slice()
    .sort((a, b) => (screenOrder.get(a.screen_id) ?? 0) - (screenOrder.get(b.screen_id) ?? 0) || a.sort - b.sort);

  return {
    screens: screenRows,
    fields: fieldRows,
    followups: (followups.data ?? []) as OnbFollowup[],
    flagRules: (flagRules.data ?? []) as OnbFlagRule[],
    briefSections: (sections.data ?? []) as OnbBriefSection[],
    texts: (texts.data ?? []) as OnbText[],
    settings: parseOnboardingSettings(settingsMap),
  };
});

/** Prompts and worked examples — service-role only; never shipped to the browser. */
export const getOnboardingSecrets = cache(async (): Promise<OnboardingSecrets> => {
  const supabase = createSupabaseAdminClient();
  const [prompts, examples] = await Promise.all([
    supabase.from('onb_prompts').select('*'),
    supabase.from('onb_examples').select('*').eq('active', true).order('sort'),
  ]);
  const firstError = prompts.error ?? examples.error;
  if (firstError) throw new Error(`Failed to load onboarding prompts: ${firstError.message}`);
  return {
    prompts: (prompts.data ?? []) as OnbPrompt[],
    examples: (examples.data ?? []) as OnbExample[],
  };
});
