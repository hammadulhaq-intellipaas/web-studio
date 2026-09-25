import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getOnboardingDefinition } from './definition';
import { prefillFromLead } from './prefill';
import { applyPatch, createForm, loadForm, saveWithRev } from './records';
import type { Answers } from './types';

/**
 * The onboarding form belonging to a lead, created on first ask and returned unchanged
 * afterwards.
 *
 * Every lead has one from the moment it is submitted, so the link is always there to copy
 * or resend — the team never has to generate it, and accepting a quote only has to send a
 * link that already exists. Calling this twice never makes a second form.
 */
export async function ensureOnboardingForm(leadId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin
    .from('onboarding_forms')
    .select('id')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data: lead } = await admin
    .from('leads')
    .select('locale, vorname, nachname, firma, email, source_url, drive_link, config, stage2')
    .eq('id', leadId)
    .maybeSingle();
  if (!lead) return null;

  const formId = await createForm((lead.locale as 'de' | 'en') ?? 'de');
  const [record, definition] = await Promise.all([loadForm(formId), getOnboardingDefinition()]);
  if (!record) return null;

  const changes = prefillFromLead(lead as Parameters<typeof prefillFromLead>[0]);
  const patch = applyPatch(definition, record, { changes: changes as Record<string, Answers[string]> });
  if (!patch.ok) return null;

  const saved = await saveWithRev(formId, record.rev, { ...patch.update, lead_id: leadId });
  return saved.ok ? formId : null;
}
