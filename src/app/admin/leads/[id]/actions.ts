'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { generatePhases } from '@/lib/plan-generator/generate';
import type { Lead, SuggestedPlanPhase } from '@/lib/types';

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return supabase;
}

export async function updateLeadStatus(leadId: string, status: string) {
  const supabase = await requireAdmin();
  if (!['new', 'contacted', 'won', 'lost'].includes(status)) throw new Error('Invalid status');
  const { error } = await supabase
    .from('leads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', leadId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath('/admin/leads');
}

export async function generateSuggestedPlan(leadId: string) {
  await requireAdmin();
  // Service role: reads lead + files, writes the plan row.
  const admin = createSupabaseAdminClient();

  const [{ data: lead }, { data: files }, { data: latest }] = await Promise.all([
    admin.from('leads').select('*').eq('id', leadId).single(),
    admin.from('lead_files').select('file_name').eq('lead_id', leadId),
    admin
      .from('suggested_plans')
      .select('version')
      .eq('lead_id', leadId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!lead) throw new Error('Lead not found');

  const { phases, model } = await generatePhases(
    lead as Lead,
    (files ?? []).map((f: { file_name: string }) => f.file_name),
  );

  const version = (latest?.version ?? 0) + 1;
  const { error } = await admin.from('suggested_plans').insert({
    lead_id: leadId,
    version,
    model,
    status: 'generated',
    phases,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function savePhasePrompt(planId: string, phaseKey: string, prompt: string) {
  const supabase = await requireAdmin();
  const { data: plan, error: readError } = await supabase
    .from('suggested_plans')
    .select('id, lead_id, phases')
    .eq('id', planId)
    .single();
  if (readError || !plan) throw new Error('Plan not found');

  const phases = (plan.phases as SuggestedPlanPhase[]).map((p) =>
    p.key === phaseKey ? { ...p, prompt_markdown: prompt } : p,
  );
  const { error } = await supabase
    .from('suggested_plans')
    .update({ phases, status: 'edited' })
    .eq('id', planId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/leads/${plan.lead_id}`);
}
