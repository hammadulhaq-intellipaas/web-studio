import { NextResponse } from 'next/server';
import { isValidSessionId } from '@/lib/session-id';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getOnboardingDefinition } from '@/lib/onboarding/definition';
import { formLink, sendSaveLinkEmail } from '@/lib/onboarding/emails';
import { prefillFromLead } from '@/lib/onboarding/prefill';
import { applyPatch, createForm, loadForm, saveWithRev } from '@/lib/onboarding/records';
import type { Answers as OnboardingAnswers } from '@/lib/onboarding/types';
import { logActivity } from '@/lib/quotes/activity';
import { loadBoundLead } from '@/lib/quotes/binding';
import { quotesSchemaReady } from '@/lib/quotes/schema';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * "Accept the quote", pressed by the customer on their own link.
 *
 * Accepting does three things at once, and all three have to survive being pressed twice:
 * it locks the configuration (the accepted scope is what the fixed price is based on),
 * it starts their onboarding form prefilled from the quote, and it emails them the link.
 *
 * Idempotent by design. A second press returns the same form rather than creating another,
 * and a form the team already made by hand is reused rather than duplicated.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidSessionId(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  if (!(await quotesSchemaReady())) return NextResponse.json({ error: 'schema_pending' }, { status: 503 });

  const lead = await loadBoundLead(id);
  if (!lead || lead.archived_at) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (lead.status === 'won' || lead.status === 'lost') {
    return NextResponse.json({ error: 'closed', status: lead.status }, { status: 409 });
  }
  // A draft has not been sent to anybody yet, so there is nothing for a customer to accept.
  if (lead.status === 'draft') return NextResponse.json({ error: 'not_sent' }, { status: 409 });

  const admin = createSupabaseAdminClient();

  // Reuse an existing form for this lead — the team may have created one already, or this
  // may be a second press of the button.
  const { data: existing } = await admin
    .from('onboarding_forms')
    .select('id')
    .eq('lead_id', lead.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let formId = (existing?.id as string | undefined) ?? null;

  if (!formId) {
    formId = await createForm(lead.locale);
    const [record, definition] = await Promise.all([loadForm(formId), getOnboardingDefinition()]);
    if (!record) return NextResponse.json({ error: 'form_failed' }, { status: 500 });

    const { data: full } = await admin
      .from('leads')
      .select('vorname, nachname, firma, email, source_url, drive_link, config, stage2')
      .eq('id', lead.id)
      .single();

    const patch = applyPatch(definition, record, {
      changes: prefillFromLead(full as Parameters<typeof prefillFromLead>[0]) as Record<string, OnboardingAnswers[string]>,
    });
    if (!patch.ok) return NextResponse.json({ error: patch.error }, { status: patch.status });
    const saved = await saveWithRev(formId, record.rev, { ...patch.update, lead_id: lead.id });
    if (!saved.ok) return NextResponse.json({ error: 'form_failed' }, { status: 500 });
  }

  const alreadyAccepted = lead.status === 'accepted';
  if (!alreadyAccepted) {
    const { error } = await admin
      .from('leads')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', lead.id);
    if (error) return NextResponse.json({ error: 'save_failed' }, { status: 500 });
    // No new version: the configuration they accepted is already the latest one, either
    // from their submit or from the changes they just sent. The timeline entry is what
    // records that it was the customer who accepted, and when.
    await logActivity(lead.id, 'accepted', 'customer', 'Customer accepted the quote', { formId }).catch(() => undefined);
  }

  const link = formLink(formId, lead.locale);
  if (!alreadyAccepted && lead.email) {
    await sendSaveLinkEmail({
      texts: (await getOnboardingDefinition()).texts,
      locale: lead.locale,
      to: lead.email,
      name: [lead.vorname, lead.nachname].filter(Boolean).join(' ') || null,
      formId,
    }).catch(() => undefined);
  }

  return NextResponse.json({ ok: true, formId, link, alreadyAccepted });
}
