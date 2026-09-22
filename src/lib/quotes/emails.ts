import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { sendLeadEmails, type CustomerEmailVariant, type EmailContext } from '@/lib/emails';
import { pickLocale, type Catalog, type Lead, type LeadConfig, type Locale } from '@/lib/types';
import { logActivity } from './activity';
import { diffConfigs, type QuoteChange } from './diff';
import { customerLink } from './links';
import type { PricedQuote } from './price';

/** Minimum gap between two "quote updated" team notifications for the same lead. */
export const TEAM_UPDATE_COOLDOWN_MS = 60 * 60_000;

async function teamEmailSetting(): Promise<string> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from('app_settings').select('value').eq('key', 'team_email').maybeSingle();
  return typeof data?.value === 'string' ? data.value : '';
}

type LeadForEmail = Pick<Lead, 'id' | 'locale' | 'vorname' | 'nachname' | 'firma' | 'email' | 'telefon' | 'ziel' | 'persona_id'>;

export function emailContext(
  lead: LeadForEmail,
  priced: PricedQuote,
  catalog: Catalog,
  opts: { sessionId?: string | null; variant?: CustomerEmailVariant } = {},
): EmailContext {
  const persona = catalog.personas.find((p) => p.id === lead.persona_id);
  return {
    locale: lead.locale as Locale,
    catalog: { eurToUsdRate: catalog.eurToUsdRate },
    lead: {
      id: lead.id,
      vorname: lead.vorname,
      nachname: lead.nachname,
      firma: lead.firma,
      email: lead.email,
      telefon: lead.telefon,
      ziel: lead.ziel,
    },
    bundleName: priced.config.bundleName,
    personaLabel: persona ? pickLocale(persona as unknown as Record<string, unknown>, 'label', 'en') : null,
    receipt: priced.receipt,
    totals: priced.totals,
    voucher: priced.config.voucher,
    customerLink: opts.sessionId ? customerLink(opts.sessionId, lead.locale as Locale) : null,
    variant: opts.variant ?? 'new',
  };
}

export function describeChanges(changes: QuoteChange[]): string[] {
  return changes.map((c) => {
    switch (c.kind) {
      case 'addon_added':
        return `Added: ${c.label}`;
      case 'addon_removed':
        return `Removed: ${c.label}`;
      case 'addon_changed':
        return `${c.label}: ${c.before} → ${c.after}`;
      default:
        return `${c.label}: ${c.before ?? '—'} → ${c.after ?? '—'}`;
    }
  });
}

/** First submit: customer confirmation (with link) + team notification. Never throws. */
export async function sendSubmitEmails(lead: LeadForEmail, priced: PricedQuote, catalog: Catalog, sessionId: string | null) {
  try {
    await sendLeadEmails(emailContext(lead, priced, catalog, { sessionId, variant: 'new' }), await teamEmailSetting());
  } catch (e) {
    console.error('[quotes] submit emails failed:', e);
  }
}

/**
 * Resubmit by the customer: updated confirmation for them, "quote updated" with the diff
 * for the team (at most one team mail per hour per lead). Never throws.
 */
export async function sendResubmitEmails(
  lead: LeadForEmail,
  previous: LeadConfig,
  priced: PricedQuote,
  catalog: Catalog,
  sessionId: string | null,
  version: number,
  actor: string,
) {
  try {
    const admin = createSupabaseAdminClient();
    const { data: lastMail } = await admin
      .from('lead_activity')
      .select('created_at')
      .eq('lead_id', lead.id)
      .eq('kind', 'email')
      .eq('meta->>type', 'quote_updated')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const notifyTeam = !lastMail || Date.now() - Date.parse(lastMail.created_at) > TEAM_UPDATE_COOLDOWN_MS;

    const changes = describeChanges(diffConfigs(previous, priced.config));
    await sendLeadEmails(emailContext(lead, priced, catalog, { sessionId, variant: 'updated' }), await teamEmailSetting(), {
      team: notifyTeam,
      teamExtras: { updated: { version, changes, actor: actor === 'customer' ? 'the customer' : actor.replace(/^team:/, '') } },
    });
    if (notifyTeam) {
      await logActivity(lead.id, 'email', actor, `Team notified: quote updated (v${version})`, { type: 'quote_updated', version });
    }
  } catch (e) {
    console.error('[quotes] resubmit emails failed:', e);
  }
}

/** The team sends a quote (link + receipt) to the customer. Resolves to whether Resend accepted it. */
export async function sendQuoteToCustomerEmail(
  lead: LeadForEmail,
  priced: PricedQuote,
  catalog: Catalog,
  sessionId: string,
): Promise<boolean> {
  const result = await sendLeadEmails(emailContext(lead, priced, catalog, { sessionId, variant: 'quote' }), '', { team: false });
  return result.customer;
}
