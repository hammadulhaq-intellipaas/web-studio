import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { LeadVersion, LeadVersionReason, Locale } from '@/lib/types';
import type { SessionState } from '@/lib/funnel/state';
import { logActivity } from './activity';
import type { PricedQuote } from './price';

/** Automatic snapshots stop at this many versions per lead; submits and manual saves continue. */
export const AUTO_VERSION_CAP = 100;
const AUTO_REASONS: LeadVersionReason[] = ['idle', 'actor_change'];

export interface InsertVersionInput {
  leadId: string;
  locale: Locale;
  state: SessionState | null;
  priced: PricedQuote;
  hash: string | null;
  actor: string;
  reason: LeadVersionReason;
  eurToUsdRate?: number | null;
}

export interface InsertVersionResult {
  version: number;
  inserted: boolean;
}

/**
 * Stores a snapshot as the next version of the lead. Deduplicates on the selection hash
 * (nothing is stored twice in a row), numbers `max + 1`, and ignores the duplicate-key race
 * of two writes landing at once. Automatic reasons stop at `AUTO_VERSION_CAP`.
 */
export async function insertVersion(input: InsertVersionInput): Promise<InsertVersionResult | null> {
  const admin = createSupabaseAdminClient();
  const { data: latest } = await admin
    .from('lead_versions')
    .select('version, state_hash')
    .eq('lead_id', input.leadId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (input.hash && latest?.state_hash && latest.state_hash === input.hash) {
    return { version: latest.version, inserted: false };
  }
  if (AUTO_REASONS.includes(input.reason) && (latest?.version ?? 0) >= AUTO_VERSION_CAP) return null;

  const version = (latest?.version ?? 0) + 1;
  const { data, error } = await admin
    .from('lead_versions')
    .upsert(
      {
        lead_id: input.leadId,
        version,
        actor: input.actor,
        reason: input.reason,
        state: input.state,
        config: input.priced.config,
        totals: input.priced.totals,
        locale: input.locale,
        eur_to_usd_rate: input.eurToUsdRate ?? null,
        state_hash: input.hash,
      },
      { onConflict: 'lead_id,version', ignoreDuplicates: true },
    )
    .select('version');
  if (error) {
    console.error('[quotes] version insert failed:', error.message);
    return null;
  }
  if (!data?.length) return { version, inserted: false };

  const who = input.actor === 'customer' ? 'customer' : input.actor.startsWith('team:') ? input.actor.slice(5) : input.actor;
  const verb =
    input.reason === 'submit'
      ? version === 1
        ? 'Submitted'
        : input.actor === 'customer'
          ? 'Resubmitted'
          : 'Saved'
      : input.reason === 'manual'
        ? 'Saved'
        : input.reason === 'restore'
          ? 'Link restored with'
          : 'Auto-saved';
  await logActivity(input.leadId, 'version', input.actor, `${verb} v${version} (${who})`, {
    version,
    reason: input.reason,
    oneTime: input.priced.totals.oneTimeEffective,
    monthly: input.priced.totals.monthlyEffective,
  });
  return { version, inserted: true };
}

export async function loadVersions(leadId: string): Promise<LeadVersion[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('lead_versions')
    .select('*')
    .eq('lead_id', leadId)
    .order('version', { ascending: false });
  if (error) {
    console.error('[quotes] versions read failed:', error.message);
    return [];
  }
  return (data ?? []) as LeadVersion[];
}
