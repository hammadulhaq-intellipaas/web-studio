import { NextResponse } from 'next/server';
import { isValidSessionId } from '@/lib/session-id';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getOnboardingDefinition } from '@/lib/onboarding/definition';
import { formLink, sendSaveLinkEmail } from '@/lib/onboarding/emails';
import { ensureOnboardingForm } from '@/lib/onboarding/ensure-form';
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

  // The form already exists for any submitted lead; this only creates one for the rare
  // case where it does not yet (an older lead, or a draft the team sent by hand).
  const formId = await ensureOnboardingForm(lead.id);
  if (!formId) return NextResponse.json({ error: 'form_failed' }, { status: 500 });

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

  // Whether the mail actually went is reported back rather than swallowed: the screen tells
  // them to check their inbox, so it must not say that when nothing was sent.
  let emailed = false;
  if (!alreadyAccepted && lead.email) {
    const definition = await getOnboardingDefinition();
    emailed = await sendSaveLinkEmail({
      texts: definition.texts,
      locale: lead.locale,
      to: lead.email,
      name: [lead.vorname, lead.nachname].filter(Boolean).join(' ') || null,
      formId,
    });
    if (!emailed) console.error('[accept] onboarding link email failed for lead', lead.id);
    await logActivity(
      lead.id,
      'email',
      'system',
      emailed ? 'Onboarding link sent to the customer' : 'Onboarding link email FAILED',
      { formId },
    ).catch(() => undefined);
  }

  const link = formLink(formId, lead.locale);
  return NextResponse.json({ ok: true, formId, link, alreadyAccepted, emailed, email: lead.email });
}
