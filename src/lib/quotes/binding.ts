import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { LOCKED_LEAD_STATUSES, type Lead } from '@/lib/types';
import type { QuoteMeta } from '@/lib/funnel/state';
import { quotesSchemaReady } from './schema';

export type BoundLead = Pick<
  Lead,
  | 'id'
  | 'status'
  | 'archived_at'
  | 'consent_at'
  | 'submitted_at'
  | 'config'
  | 'locale'
  | 'source'
  | 'total_one_time'
  | 'total_monthly'
  | 'vorname'
  | 'nachname'
  | 'firma'
  | 'email'
>;

const COLUMNS =
  'id, status, archived_at, consent_at, submitted_at, config, locale, source, total_one_time, total_monthly, vorname, nachname, firma, email';

/** The lead a funnel session belongs to, or null (unbound session / migration pending). */
export async function loadBoundLead(sessionId: string): Promise<BoundLead | null> {
  if (!(await quotesSchemaReady())) return null;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from('leads').select(COLUMNS).eq('session_id', sessionId).maybeSingle();
  if (error) {
    console.error('[quotes] bound lead lookup failed:', error.message);
    return null;
  }
  return (data as BoundLead | null) ?? null;
}

/** `won` / `lost` quotes no longer accept customer edits. */
export function isLocked(lead: Pick<Lead, 'status'>): boolean {
  return LOCKED_LEAD_STATUSES.includes(lead.status);
}

/** What the customer's browser may know about the quote behind their link. */
export function quoteMeta(lead: BoundLead): QuoteMeta {
  return {
    leadId: lead.id,
    status: lead.status,
    locked: isLocked(lead),
    draft: lead.status === 'draft',
    submittedAt: lead.submitted_at,
    hasConsent: !!lead.consent_at,
    oneTime: Number(lead.total_one_time),
    monthly: Number(lead.total_monthly),
    locale: lead.locale,
  };
}
