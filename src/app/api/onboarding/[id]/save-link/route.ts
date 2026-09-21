import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isValidSessionId } from '@/lib/session-id';
import { getOnboardingDefinition } from '@/lib/onboarding/definition';
import { sendSaveLinkEmail } from '@/lib/onboarding/emails';
import { loadForm } from '@/lib/onboarding/records';

export const dynamic = 'force-dynamic';

const RESEND_COOLDOWN_MS = 60_000;

/** "Save and come back later": email the client their own link. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidSessionId(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const record = await loadForm(id);
  if (!record) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!record.email) return NextResponse.json({ error: 'no_email' }, { status: 400 });
  if (record.save_link_sent_at && Date.now() - Date.parse(record.save_link_sent_at) < RESEND_COOLDOWN_MS) {
    return NextResponse.json({ ok: true, throttled: true });
  }

  const definition = await getOnboardingDefinition();
  const sent = await sendSaveLinkEmail({
    texts: definition.texts,
    locale: record.locale,
    to: record.email,
    name: record.name,
    formId: id,
  });
  if (!sent) return NextResponse.json({ error: 'send_failed' }, { status: 502 });

  const supabase = createSupabaseAdminClient();
  await supabase.from('onboarding_forms').update({ save_link_sent_at: new Date().toISOString() }).eq('id', id);
  return NextResponse.json({ ok: true });
}
