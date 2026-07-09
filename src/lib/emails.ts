import 'server-only';
import { Resend } from 'resend';
import deMessages from '../../messages/de.json';
import enMessages from '../../messages/en.json';
import type { Locale } from './types';
import type { Receipt } from './pricing/summary';
import type { SummaryLabels } from './pricing/summary';
import { fmt, mon } from './format';
import type { Totals, Voucher } from './types';

export function messagesFor(locale: Locale) {
  return locale === 'de' ? deMessages : enMessages;
}

export function serverSummaryLabels(locale: Locale): SummaryLabels {
  return messagesFor(locale).summaryLabels;
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

interface EmailContext {
  locale: Locale;
  lead: {
    id: string;
    vorname: string;
    nachname: string;
    firma: string;
    email: string;
    telefon: string;
    ziel: string | null;
  };
  bundleName: string;
  personaLabel: string | null;
  receipt: Receipt;
  totals: Totals;
  voucher: Voucher | null;
}

function wrap(body: string): string {
  return `<div style="font-family:Inter,'Helvetica Neue',Arial,sans-serif;color:#0F2440;font-size:14px;line-height:1.55;max-width:560px">${body}</div>`;
}

export function renderCustomerEmail(ctx: EmailContext): { subject: string; html: string } {
  const m = messagesFor(ctx.locale).emails.customer;
  const { receipt, totals, voucher, locale } = ctx;
  const name = [ctx.lead.vorname, ctx.lead.nachname].filter(Boolean).join(' ') || ctx.lead.firma;

  const discountRow = (saved: string) =>
    voucher
      ? `<tr><td style="padding:3px 0;color:#2E8B57;font-weight:700">${interp(m.discount, {
          code: voucher.code,
          pct: voucher.percent,
        })}</td><td align="right" style="color:#2E8B57;font-weight:700">−${saved}</td></tr>`
      : '';

  const html = wrap(`
    <p>${interp(m.greeting, { name })}</p>
    <p>${m.intro}</p>
    <h3 style="margin:18px 0 6px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#5B6B85">${m.onceLabel}</h3>
    <table width="100%" style="border-collapse:collapse;font-size:14px">
      ${receiptRows(receipt.oneOff)}
      ${voucher && voucher.scope !== 'recurring' ? discountRow(fmt(totals.voucherSavedOneTime, locale)) : ''}
      <tr><td style="padding:8px 0 0;border-top:1px solid #EEF1F7;font-weight:800">${m.sumOnce}</td>
      <td align="right" style="padding:8px 0 0;border-top:1px solid #EEF1F7;font-weight:800">${fmt(totals.oneTimeEffective, locale)}</td></tr>
    </table>
    <h3 style="margin:18px 0 6px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#1E4FD6">${m.monthlyLabel}</h3>
    <table width="100%" style="border-collapse:collapse;font-size:14px">
      ${receiptRows(receipt.monthly)}
      ${voucher && voucher.scope !== 'one_time' ? discountRow(mon(totals.voucherSavedMonthly, locale)) : ''}
      <tr><td style="padding:8px 0 0;border-top:1px solid #EEF1F7;font-weight:800">${m.sumMonthly}</td>
      <td align="right" style="padding:8px 0 0;border-top:1px solid #EEF1F7;font-weight:800">${mon(totals.monthlyEffective, locale)}</td></tr>
    </table>
    ${
      totals.yearly > 0
        ? `<table width="100%" style="border-collapse:collapse;font-size:14px;margin-top:10px">
             <tr><td style="font-weight:700">${m.yearlyLabel}</td>
             <td align="right" style="font-weight:700">${mon(totals.yearlyEffective, locale)}</td></tr>
           </table>`
        : ''
    }
    <p style="margin-top:20px">${m.noRisk}</p>
    <p style="color:#7A879B">${m.signoff}</p>
  `);

  return { subject: m.subject, html };
}

export function renderTeamEmail(ctx: EmailContext, adminUrl: string): { subject: string; html: string } {
  // Internal notification — always English (the admin portal language).
  const m = enMessages.emails.team;
  const { receipt, totals, locale } = ctx;

  const html = wrap(`
    <h2 style="margin:0 0 12px">${interp(m.subject, { firma: ctx.lead.firma || '—', bundle: ctx.bundleName })}</h2>
    <h3 style="margin:14px 0 4px">${m.contact}</h3>
    <p style="margin:0">
      ${ctx.lead.vorname} ${ctx.lead.nachname}${ctx.lead.firma ? ` · ${ctx.lead.firma}` : ''}<br/>
      <a href="mailto:${ctx.lead.email}">${ctx.lead.email}</a> · ${ctx.lead.telefon}<br/>
      ${ctx.personaLabel ? `Persona: ${ctx.personaLabel} · ` : ''}Locale: ${locale}
    </p>
    ${ctx.lead.ziel ? `<h3 style="margin:14px 0 4px">${m.goal}</h3><p style="margin:0">${ctx.lead.ziel}</p>` : ''}
    <h3 style="margin:14px 0 4px">${m.configuration}</h3>
    <table width="100%" style="border-collapse:collapse;font-size:13px">
      ${receiptRows(receipt.oneOff)}
      ${receiptRows(receipt.monthly)}
      ${receiptRows(receipt.yearly)}
      <tr><td style="padding:8px 0 0;border-top:1px solid #EEF1F7;font-weight:800">One-time / Monthly</td>
      <td align="right" style="padding:8px 0 0;border-top:1px solid #EEF1F7;font-weight:800">
        ${fmt(totals.oneTimeEffective, 'en')} / ${mon(totals.monthlyEffective, 'en')}
      </td></tr>
    </table>
    <p style="margin-top:18px"><a href="${adminUrl}" style="color:#1E5EFF;font-weight:700">${m.openInAdmin}</a></p>
  `);

  return { subject: interp(m.subject, { firma: ctx.lead.firma || '—', bundle: ctx.bundleName }), html };
}

export async function sendLeadEmails(ctx: EmailContext, teamEmail: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.warn('[emails] RESEND_API_KEY / RESEND_FROM_EMAIL not set — skipping lead emails');
    return;
  }
  const resend = new Resend(apiKey);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const adminUrl = `${siteUrl}/admin/leads/${ctx.lead.id}`;

  const customer = renderCustomerEmail(ctx);
  const team = renderTeamEmail(ctx, adminUrl);

  const results = await Promise.allSettled([
    resend.emails.send({ from, to: ctx.lead.email, subject: customer.subject, html: customer.html }),
    teamEmail
      ? resend.emails.send({ from, to: teamEmail, subject: team.subject, html: team.html })
      : Promise.resolve(null),
  ]);
  for (const r of results) {
    if (r.status === 'rejected') console.error('[emails] send failed:', r.reason);
  }
}
