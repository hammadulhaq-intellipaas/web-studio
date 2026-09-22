import type { Locale } from '@/lib/types';

/** Absolute site origin for links in emails and the admin (no trailing slash). */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
}

/** The customer's permanent configurator link: `/?c=<id>` (DE) or `/en?c=<id>`. */
export function customerLink(sessionId: string, locale: Locale): string {
  return `${siteUrl()}${locale === 'en' ? '/en' : '/'}?c=${sessionId}`;
}

export function adminLeadLink(leadId: string): string {
  return `${siteUrl()}/admin/leads/${leadId}`;
}
