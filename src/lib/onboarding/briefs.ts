import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { BriefSectionContent, BriefSource, OnboardingBrief } from './types';

/** Every change to the brief is a new version: llm, fallback, rewrite or client_edit. */
export async function saveBriefVersion(
  formId: string,
  source: BriefSource,
  model: string | null,
  sections: Record<string, BriefSectionContent>,
): Promise<OnboardingBrief> {
  const supabase = createSupabaseAdminClient();
  const { data: latest } = await supabase
    .from('onboarding_briefs')
    .select('version')
    .eq('form_id', formId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = ((latest as { version: number } | null)?.version ?? 0) + 1;
  const { data, error } = await supabase
    .from('onboarding_briefs')
    .insert({ form_id: formId, version, source, model, sections })
    .select('*')
    .single();
  if (error || !data) throw new Error(`Failed to save brief: ${error?.message ?? 'no row'}`);
  return data as OnboardingBrief;
}

export async function loadBriefVersions(formId: string): Promise<OnboardingBrief[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('onboarding_briefs')
    .select('*')
    .eq('form_id', formId)
    .order('version', { ascending: false });
  if (error) throw new Error(`Failed to load briefs: ${error.message}`);
  return (data ?? []) as OnboardingBrief[];
}

export async function countRewrites(formId: string): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const { count } = await supabase
    .from('onboarding_briefs')
    .select('id', { count: 'exact', head: true })
    .eq('form_id', formId)
    .eq('source', 'rewrite');
  return count ?? 0;
}
