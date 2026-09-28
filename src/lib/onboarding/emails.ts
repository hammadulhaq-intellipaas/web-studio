import 'server-only';
import { Resend } from 'resend';
import type { Locale } from '@/lib/types';
import { teamRecipients } from '@/lib/emails';
import { fillPlaceholders, textFor } from './texts';
import type { OnbText } from './types';

/**
 * Email copy lives in onb_texts (`email_*` keys): the row's title is the subject, the
 * markdown body a plain-text letter with {name} {company} {email} {link} {admin_link}
 * placeholders. Sending is fire-and-forget like the lead emails — never blocks a route.
 */

export interface Attachment {
  filename: string;
  content: Buffer;
}

function client(): { resend: Resend; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.warn('[onboarding/emails] RESEND_API_KEY / RESEND_FROM_EMAIL not set — skipping email');
    return null;
  }
  return { resend: new Resend(apiKey), from };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Plain paragraphs → minimal HTML in the app's email style; links become clickable. */
function letterHtml(body: string): string {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => escapeHtml(p.trim()).replace(/\n/g, '<br>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#1E5EFF">$1</a>'))
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 12px">${p}</p>`)
    .join('');
  return `<div style="font-family:Inter,'Helvetica Neue',Arial,sans-serif;color:#0F2440;font-size:14px;line-height:1.55;max-width:560px">${paragraphs}</div>`;
}

export function renderTextEmail(
  texts: OnbText[],
  key: string,
  locale: Locale,
  params: Record<string, string | number | null | undefined>,
): { subject: string; html: string; text: string } | null {
  const row = textFor(texts, key, locale);
  if (!row) return null;
  const subject = fillPlaceholders(row.title, params);
  const text = fillPlaceholders(row.content_markdown, params);
  return { subject, html: letterHtml(text), text };
}

export function formLink(formId: string, locale: Locale): string {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
  return `${site}${locale === 'de' ? '' : '/en'}/onboardingform/${formId}`;
}

export function adminFormLink(formId: string): string {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
  return `${site}/admin/onboarding/${formId}`;
}

export async function sendSaveLinkEmail(input: {
  texts: OnbText[];
  locale: Locale;
  to: string;
  name: string | null;
  formId: string;
  /**
   * `welcome` is the letter that goes out when the customer saves their quote: the quote
   * is settled and the brief is what happens next. The default is the plain "here is your
   * link back" note the form's own save button sends.
   */
  kind?: 'save_link' | 'welcome';
}): Promise<boolean> {
  const c = client();
  if (!c) return false;
  const mail = renderTextEmail(input.texts, input.kind === 'welcome' ? 'email_welcome_onboard' : 'email_save_link', input.locale, {
    name: input.name ?? '',
    link: formLink(input.formId, input.locale),
  });
  if (!mail) return false;
  const { error } = await c.resend.emails.send({ from: c.from, to: input.to, subject: mail.subject, html: mail.html, text: mail.text });
  if (error) {
    console.error('[onboarding/emails] save-link send failed:', error);
    return false;
  }
  return true;
}

export interface BriefEmailInput {
  texts: OnbText[];
  locale: Locale;
  formId: string;
  to: string | null;
  name: string | null;
  company: string | null;
  teamEmailSetting: string;
  pdf: Attachment | null;
  /** When the client confirmed (ISO); the team letter says it in German time. */
  confirmedAt: string;
}

/** "28 September 2026" and "11:22", in German time: the team's clock. */
export function germanDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-GB', { timeZone: 'Europe/Berlin', day: 'numeric', month: 'long', year: 'numeric' }),
    time: d.toLocaleTimeString('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' }),
  };
}

export async function sendBriefEmails(input: BriefEmailInput): Promise<{ client: boolean; team: boolean }> {
  const c = client();
  if (!c) return { client: false, team: false };
  const when = germanDateTime(input.confirmedAt);
  const params = {
    name: input.name ?? '',
    company: input.company ?? '',
    email: input.to ?? '',
    link: formLink(input.formId, input.locale),
    admin_link: adminFormLink(input.formId),
    date: when.date,
    time: when.time,
  };
  const pdf = input.pdf ? [{ filename: input.pdf.filename, content: input.pdf.content }] : undefined;

  const clientMail = input.to ? renderTextEmail(input.texts, 'email_brief_client', input.locale, params) : null;
  // The team letter: who completed the form and when, with the brief attached. Nothing else
  // (flags, open points and the data export live in the admin).
  const teamMail = renderTextEmail(input.texts, 'email_brief_team', 'en', params);
  const team = teamRecipients(input.teamEmailSetting);

  const results = await Promise.allSettled([
    clientMail && input.to
      ? c.resend.emails.send({
          from: c.from,
          to: input.to,
          subject: clientMail.subject,
          html: clientMail.html,
          text: clientMail.text,
          attachments: pdf,
        })
      : Promise.reject(new Error('no client address')),
    teamMail && team.length
      ? c.resend.emails.send({
          from: c.from,
          to: team,
          subject: teamMail.subject,
          html: teamMail.html,
          text: teamMail.text,
          attachments: pdf,
        })
      : Promise.reject(new Error('no team recipients')),
  ]);
  const ok = (r: PromiseSettledResult<unknown>) =>
    r.status === 'fulfilled' && !(r.value as { error?: unknown } | null)?.error;
  for (const r of results) {
    if (r.status === 'rejected') console.error('[onboarding/emails] brief send failed:', r.reason);
    else if ((r.value as { error?: unknown } | null)?.error) console.error('[onboarding/emails] brief send failed:', (r.value as { error: unknown }).error);
  }
  return { client: ok(results[0]), team: ok(results[1]) };
}
