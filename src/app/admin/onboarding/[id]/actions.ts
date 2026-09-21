'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { generateBrief } from '@/lib/onboarding/ai/brief';
import { saveBriefVersion } from '@/lib/onboarding/briefs';
import { getOnboardingDefinition, getOnboardingSecrets } from '@/lib/onboarding/definition';
import { deliverConfirmedForm } from '@/lib/onboarding/delivery';
import { loadFiles, loadForm } from '@/lib/onboarding/records';

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return supabase;
}

type Result = { ok: boolean; error?: string };

/** Re-run PDF + emails for a confirmed form (e.g. after fixing Resend credentials). */
export async function resendDelivery(formId: string): Promise<Result> {
  await requireAdmin();
  const record = await loadForm(formId);
  if (!record) return { ok: false, error: 'Form not found' };
  if (record.status !== 'confirmed') return { ok: false, error: 'Only confirmed forms are delivered' };
  const delivery = await deliverConfirmedForm(formId);
  revalidatePath(`/admin/onboarding/${formId}`);
  if (delivery.pdf_error) return { ok: false, error: `PDF: ${delivery.pdf_error}` };
  if (delivery.email_error) return { ok: false, error: `Email: ${delivery.email_error}` };
  return { ok: true };
}

/**
 * Generate a fresh brief version for the team's own reading (the client's confirmed version
 * stays the one they signed off; `brief_version` on the form is untouched when confirmed).
 */
export async function regenerateBrief(formId: string): Promise<Result> {
  await requireAdmin();
  const record = await loadForm(formId);
  if (!record) return { ok: false, error: 'Form not found' };
  if (record.status === 'in_progress') return { ok: false, error: 'The client has not finished the form yet' };
  const [definition, secrets, files] = await Promise.all([getOnboardingDefinition(), getOnboardingSecrets(), loadFiles(formId)]);
  const draft = await generateBrief({ definition, secrets, record, files });
  const brief = await saveBriefVersion(formId, draft.source, draft.model, draft.sections);
  if (record.status !== 'confirmed') {
    const supabase = await requireAdmin();
    await supabase.from('onboarding_forms').update({ brief_version: brief.version, status: 'brief' }).eq('id', formId);
  }
  revalidatePath(`/admin/onboarding/${formId}`);
  return { ok: true };
}
