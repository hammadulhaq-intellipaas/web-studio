import 'server-only';
import { Resend } from 'resend';
import enMessages from '../../messages/en.json';
import type { Catalog, Locale } from './types';
import type { Receipt } from './pricing/summary';
import type { SummaryLabels } from './pricing/summary';
import { fmt, mon } from './format';
import { messagesFor, summaryLabelsFor } from './messages';
import type { Totals, Voucher } from './types';

export { messagesFor };

export function serverSummaryLabels(locale: Locale): SummaryLabels {
  return summaryLabelsFor(locale);
}

function interp(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ''));
}

function receiptRows(lines: Receipt['oneOff']): string {
  return lines
    .map(
      (l) =>
        `<tr><td style="padding:3px 0;${l.bold ? 'font-weight:700' : ''}">${l.name}</td>` +
        `<td align="right" style="padding:3px 0;white-space:nowrap;${l.bold ? 'font-weight:700' : ''}">${l.price}</td></tr>`,
    )
    .join('');
}

/** Which customer email is being sent: first submit, a resubmit, or a quote the team sends. */
export type CustomerEmailVariant = 'new' | 'updated' | 'quote';

export interface EmailContext {
  locale: Locale;
  catalog: Pick<Catalog, 'eurToUsdRate'>;
  lead: {
    id: string;
    vorname: string;
    nachname: string;
    firma: string;
    email: string;
    telefon: string | null;
    ziel: string | null;
  };
  bundleName: string;
  personaLabel: string | null;
  receipt: Receipt;
  totals: Totals;
  voucher: Voucher | null;
  /** The customer's permanent configurator link, shown in the customer email when known. */
  customerLink?: string | null;
  variant?: CustomerEmailVariant;
}

function wrap(body: string): string {
  return `<div style="font-family:Inter,'Helvetica Neue',Arial,sans-serif;color:#0F2440;font-size:14px;line-height:1.55;max-width:560px">${body}</div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
}

export function renderCustomerEmail(ctx: EmailContext): { subject: string; html: string } {
  const m = messagesFor(ctx.locale).emails.customer;
  const { receipt, totals, voucher, locale, catalog } = ctx;
  const name = [ctx.lead.vorname, ctx.lead.nachname].filter(Boolean).join(' ') || ctx.lead.firma;
  const variant = ctx.variant ?? 'new';
  const subject = variant === 'updated' ? m.subjectUpdated : variant === 'quote' ? m.subjectQuote : m.subject;
  const intro = variant === 'updated' ? m.introUpdated : variant === 'quote' ? m.introQuote : m.intro;
  // The quote the team sends is the one they are asked to accept; the copy they get back
  // after their own enquiry is theirs to look over.
  const cta = variant === 'quote' ? m.ctaQuote : m.cta;
  const detailsLabel = variant === 'quote' ? m.detailsLabelQuote : m.detailsLabel;

  const discountRow = (saved: string) =>
    voucher
      ? `<tr><td style="padding:3px 0;color:#2E8B57;font-weight:700">${interp(m.discount, {
          code: voucher.code,
          pct: voucher.percent,
        })}</td><td align="right" style="color:#2E8B57;font-weight:700">−${saved}</td></tr>`
      : '';

  // The call to action is a real button in the site's own blue, with the address printed
  // underneath: plenty of mail clients strip backgrounds, and some strip links entirely.
  const linkBlock = ctx.customerLink
    ? `<div style="margin:22px 0;padding:18px 18px 16px;background:#F5F7FB;border:1px solid #E3E8F2;border-radius:12px">
         <div style="font-weight:800;margin-bottom:10px">${m.linkLabel}</div>
         <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate">
           <tr><td align="center" bgcolor="#1E5EFF" style="border-radius:12px">
             <a href="${escapeHtml(ctx.customerLink)}"
                style="display:inline-block;padding:14px 30px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;background:#1E5EFF">
               ${cta}
             </a>
           </td></tr>
         </table>
         ${variant === 'quote' ? '' : `<div style="color:#5B6B85;font-size:12.5px;margin-top:12px">${m.linkHint}</div>`}
         <div style="color:#5B6B85;font-size:12.5px;margin-top:10px">${m.linkFallback}</div>
         <div style="margin-top:6px"><a href="${escapeHtml(ctx.customerLink)}" style="color:#1E5EFF;font-size:12px;word-break:break-all">${escapeHtml(ctx.customerLink)}</a></div>
       </div>`
    : '';

  const html = wrap(`
    <p>${interp(m.greeting, { name })}</p>
    <p>${intro}</p>
    ${linkBlock}
    <p style="margin:22px 0 4px;font-weight:800">${detailsLabel}</p>
    <h3 style="margin:14px 0 6px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#5B6B85">${m.onceLabel}</h3>
    <table width="100%" style="border-collapse:collapse;font-size:14px">
      ${receiptRows(receipt.oneOff)}
      ${voucher && voucher.scope !== 'recurring' ? discountRow(fmt(totals.voucherSavedOneTime, locale, catalog)) : ''}
      <tr><td style="padding:8px 0 0;border-top:1px solid #EEF1F7;font-weight:800">${m.sumOnce}</td>
      <td align="right" style="padding:8px 0 0;border-top:1px solid #EEF1F7;font-weight:800">${fmt(totals.oneTimeEffective, locale, catalog)}</td></tr>
    </table>
    <h3 style="margin:18px 0 6px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#1E4FD6">${m.monthlyLabel}</h3>
    <table width="100%" style="border-collapse:collapse;font-size:14px">
      ${receiptRows(receipt.monthly)}
      ${voucher && voucher.scope !== 'one_time' ? discountRow(mon(totals.voucherSavedMonthly, locale, catalog)) : ''}
      <tr><td style="padding:8px 0 0;border-top:1px solid #EEF1F7;font-weight:800">${m.sumMonthly}</td>
      <td align="right" style="padding:8px 0 0;border-top:1px solid #EEF1F7;font-weight:800">${mon(totals.monthlyEffective, locale, catalog)}</td></tr>
    </table>
    ${
      totals.yearly > 0
        ? `<table width="100%" style="border-collapse:collapse;font-size:14px;margin-top:10px">
             <tr><td style="font-weight:700">${m.yearlyLabel}</td>
             <td align="right" style="font-weight:700">${mon(totals.yearlyEffective, locale, catalog)}</td></tr>
           </table>`
        : ''
    }
    <p style="margin-top:24px">${m.regards}</p>
    <p style="color:#7A879B;margin-top:2px">${m.signoff}</p>
  `);

  return { subject, html };
}

export interface TeamEmailExtras {
  /** "Quote updated" notifications list what changed and which version this is. */
  updated?: { version: number; changes: string[]; actor: string };
}

export function renderTeamEmail(ctx: EmailContext, adminUrl: string, extras: TeamEmailExtras = {}): { subject: string; html: string } {
  // Internal notification — chrome is always English (the admin portal language), but the
  // money is shown in the CUSTOMER's currency so this matches their quote line for line.
  const m = enMessages.emails.team;
  const { receipt, totals, locale, catalog } = ctx;
  const params = { firma: ctx.lead.firma || '—', bundle: ctx.bundleName, version: extras.updated?.version ?? 0 };
  const subject = extras.updated ? interp(m.updatedSubject, params) : interp(m.subject, params);

  const changesBlock = extras.updated
    ? `<h3 style="margin:14px 0 4px">${m.changes}</h3>
       <p style="margin:0 0 4px;color:#5B6B85">${interp(m.changedBy, { actor: escapeHtml(extras.updated.actor) })}</p>
       ${
         extras.updated.changes.length
           ? `<ul style="margin:0;padding-left:18px">${extras.updated.changes.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul>`
           : `<p style="margin:0">${m.noChanges}</p>`
       }`
    : '';

  const html = wrap(`
    <h2 style="margin:0 0 12px">${subject}</h2>
    <h3 style="margin:14px 0 4px">${m.contact}</h3>
    <p style="margin:0">
      ${ctx.lead.vorname} ${ctx.lead.nachname}${ctx.lead.firma ? ` · ${ctx.lead.firma}` : ''}<br/>
      <a href="mailto:${ctx.lead.email}">${ctx.lead.email}</a>${ctx.lead.telefon ? ` · ${ctx.lead.telefon}` : ''}<br/>
      ${ctx.personaLabel ? `Persona: ${ctx.personaLabel} · ` : ''}Locale: ${locale}
    </p>
    ${ctx.lead.ziel ? `<h3 style="margin:14px 0 4px">${m.goal}</h3><p style="margin:0">${ctx.lead.ziel}</p>` : ''}
    ${changesBlock}
    <h3 style="margin:14px 0 4px">${m.configuration}</h3>
    <table width="100%" style="border-collapse:collapse;font-size:13px">
      ${receiptRows(receipt.oneOff)}
      ${receiptRows(receipt.monthly)}
      ${receiptRows(receipt.yearly)}
      <tr><td style="padding:8px 0 0;border-top:1px solid #EEF1F7;font-weight:800">One-time / Monthly</td>
      <td align="right" style="padding:8px 0 0;border-top:1px solid #EEF1F7;font-weight:800">
        ${fmt(totals.oneTimeEffective, locale, catalog)} / ${mon(totals.monthlyEffective, locale, catalog)}
      </td></tr>
    </table>
    <p style="margin-top:18px"><a href="${adminUrl}" style="color:#1E5EFF;font-weight:700">${m.openInAdmin}</a></p>
    ${
      ctx.customerLink
        ? `<p style="margin-top:6px;color:#5B6B85;font-size:12.5px">${m.customerLink}: <a href="${escapeHtml(ctx.customerLink)}" style="color:#1E5EFF">${escapeHtml(ctx.customerLink)}</a></p>`
        : ''
    }
  `);

  return { subject, html };
}

/**
 * Team notification recipients: the `RESEND_TO_EMAIL` CSV, falling back to the
 * `team_email` app setting when the env var is unset.
 */
export function teamRecipients(teamEmailSetting = ''): string[] {
  const raw = process.env.RESEND_TO_EMAIL || teamEmailSetting;
  return raw
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean);
}

export interface SendLeadEmailsOptions {
  /** Skip the customer copy (team-only notifications). */
  customer?: boolean;
  /** Skip the team copy (e.g. a quote the team sends to the customer). */
  team?: boolean;
  teamExtras?: TeamEmailExtras;
}

export interface SendLeadEmailsResult {
  /** False when Resend is not configured or the send was rejected. */
  customer: boolean;
  team: boolean;
}

/** Customer confirmation + team notification for a new or updated inquiry. */
export async function sendLeadEmails(
  ctx: EmailContext,
  teamEmailSetting: string,
  options: SendLeadEmailsOptions = {},
): Promise<SendLeadEmailsResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.warn('[emails] RESEND_API_KEY / RESEND_FROM_EMAIL not set — skipping lead emails');
    return { customer: false, team: false };
  }
  const resend = new Resend(apiKey);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const adminUrl = `${siteUrl}/admin/leads/${ctx.lead.id}`;
  const team = teamRecipients(teamEmailSetting);
  const sendCustomer = options.customer !== false;
  const sendTeam = options.team !== false && team.length > 0;

  const customer = renderCustomerEmail(ctx);
  const teamMail = renderTeamEmail(ctx, adminUrl, options.teamExtras);

  const results = await Promise.allSettled([
    sendCustomer
      ? resend.emails.send({ from, to: ctx.lead.email, subject: customer.subject, html: customer.html })
      : Promise.resolve(null),
    sendTeam
      ? resend.emails.send({ from, to: team, subject: teamMail.subject, html: teamMail.html })
      : Promise.resolve(null),
  ]);
  for (const r of results) {
    if (r.status === 'rejected') console.error('[emails] send failed:', r.reason);
  }
  // Resend reports delivery problems (e.g. a rejected recipient) in `error`, not by throwing.
  const ok = (r: PromiseSettledResult<{ error: unknown } | null>, wanted: boolean) =>
    wanted && r.status === 'fulfilled' && r.value != null && !r.value.error;
  return { customer: ok(results[0], sendCustomer), team: ok(results[1], sendTeam) };
}

export interface BookingEmailContext {
  lead: { id: string; vorname: string; nachname: string; firma: string; email: string } | null;
  inviteeName: string | null;
  inviteeEmail: string | null;
  startTime: string;
}

export function renderBookingEmail(
  ctx: BookingEmailContext,
  adminUrl: string | null,
): { subject: string; html: string } {
  const who =
    [ctx.lead?.vorname, ctx.lead?.nachname].filter(Boolean).join(' ') ||
    ctx.inviteeName ||
    ctx.inviteeEmail ||
    'Unknown';
  const firma = ctx.lead?.firma ? ` (${ctx.lead.firma})` : '';
  const when = new Date(ctx.startTime).toUTCString();
  const subject = `Appointment booked: ${who}${firma} — ${when}`;

  const html = wrap(`
    <h2 style="margin:0 0 12px">${subject}</h2>
    <p style="margin:0">
      ${who}${firma}<br/>
      ${ctx.inviteeEmail ? `<a href="mailto:${ctx.inviteeEmail}">${ctx.inviteeEmail}</a><br/>` : ''}
      Start: ${when}
    </p>
    ${
      adminUrl
        ? `<p style="margin-top:18px"><a href="${adminUrl}" style="color:#1E5EFF;font-weight:700">Open lead in admin</a></p>`
        : ''
    }
  `);

  return { subject, html };
}

/** Fired from the Calendly webhook once a booking is confirmed. */
export async function sendBookingEmail(
  ctx: BookingEmailContext,
  teamEmailSetting: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const team = teamRecipients(teamEmailSetting);
  if (!apiKey || !from || !team.length) {
    console.warn('[emails] booking notification skipped — Resend or recipients not configured');
    return;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const adminUrl = ctx.lead && siteUrl ? `${siteUrl}/admin/leads/${ctx.lead.id}` : null;
  const mail = renderBookingEmail(ctx, adminUrl);

  const resend = new Resend(apiKey);
  try {
    await resend.emails.send({ from, to: team, subject: mail.subject, html: mail.html });
  } catch (e) {
    console.error('[emails] booking notification failed:', e);
  }
}
