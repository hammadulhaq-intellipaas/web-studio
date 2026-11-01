import 'server-only';
import { Resend } from 'resend';
import { teamRecipients } from '@/lib/emails';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/** One line of a team email: a short label and the text that goes with it. */
export interface MailLine {
  label: string;
  text: string;
}

/**
 * A plain email to the team (the `team_email` setting), for what happens on a client's review
 * link: feedback sent, a proposal chosen, the design approved. Never throws: a failed email must
 * not undo what the client just did.
 */
export async function mailTeam(subject: string, intro: string, lines: MailLine[], leadId: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const { data } = await createSupabaseAdminClient().from('app_settings').select('value').eq('key', 'team_email').maybeSingle();
  const team = teamRecipients(typeof data?.value === 'string' ? data.value : '');
  if (!apiKey || !from || !team.length) {
    console.warn('[developer] team email skipped: Resend or recipients not configured');
    return false;
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const link = site ? `${site}/admin/developer/${leadId}?tab=design` : '';
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#18181b;max-width:640px">
<p>${escape(intro)}</p>
${lines.map((l) => `<p style="margin:0 0 12px"><b>${escape(l.label)}</b><br>${escape(l.text).replace(/\n/g, '<br>')}</p>`).join('\n')}
${link ? `<p><a href="${link}">Open the Design tab</a></p>` : ''}
</div>`;
  try {
    const { error } = await new Resend(apiKey).emails.send({ from, to: team, subject, html });
    if (error) console.error('[developer] team email rejected:', error);
    return !error;
  } catch (err) {
    console.error('[developer] team email failed:', err);
    return false;
  }
}
