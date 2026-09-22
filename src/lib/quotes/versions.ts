import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { Catalog, LeadConfig, LeadVersion, LeadVersionReason, Locale, Voucher } from '@/lib/types';
import type { SessionState } from '@/lib/funnel/state';
import { logActivity } from './activity';
import { hashSelection, priceSelection, type PricedQuote } from './price';
import { normalizeSessionState, selectionFromState } from './selection';

/** Automatic snapshots stop at this many versions per lead; submits and manual saves continue. */
export const AUTO_VERSION_CAP = 100;
const AUTO_REASONS: LeadVersionReason[] = ['idle', 'actor_change'];

export type BoundaryReason = 'idle' | 'actor_change' | null;

/**
 * Decides, on a session write, whether the state stored *before* this write closes a
 * burst of edits and should be kept as a version: the writer changed (customer ↔ team),
 * or the previous write is older than the idle window. Pure.
 */
export function shouldCaptureBoundary(
  prev: { updatedAt: string; lastActor: string | null },
  now: number,
  actor: string,
  idleMs: number,
): BoundaryReason {
  const prevActor = prev.lastActor ?? 'customer';
  if (prevActor !== actor) return 'actor_change';
  const age = now - Date.parse(prev.updatedAt);
  if (Number.isFinite(age) && age > idleMs) return 'idle';
  return null;
}

let idleCache: { ms: number; at: number } | null = null;

/** `quote_idle_minutes` app setting (default 10), cached for a minute per instance. */
export async function quoteIdleMs(): Promise<number> {
  if (idleCache && Date.now() - idleCache.at < 60_000) return idleCache.ms;
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from('app_settings').select('value').eq('key', 'quote_idle_minutes').maybeSingle();
  const minutes = Number(data?.value ?? 10);
  const ms = (Number.isFinite(minutes) && minutes > 0 ? minutes : 10) * 60_000;
  idleCache = { ms, at: Date.now() };
  return ms;
}

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

/**
 * Voucher for an automatic snapshot: the code the customer has applied is priced with the
 * values validated at the last submit when it is the same code (an expired voucher must not
 * silently rewrite history), otherwise looked up without validity checks.
 */
async function voucherForAutoCapture(stateVoucher: Voucher | null, submitted: LeadConfig['voucher']): Promise<Voucher | null> {
  if (!stateVoucher?.code) return null;
  const code = stateVoucher.code.trim().toUpperCase();
  if (submitted && submitted.code.toUpperCase() === code) return { ...submitted, code };
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from('vouchers').select('percent, scope').eq('code', code).maybeSingle();
  return data ? { code, percent: Number(data.percent), scope: data.scope } : null;
}

export interface CaptureFromStateInput {
  lead: { id: string; locale: Locale; config: LeadConfig };
  state: unknown;
  actor: string;
  reason: LeadVersionReason;
  catalog: Catalog;
}

/**
 * Reprices a raw session state server-side (never trusting the client's numbers) and
 * stores it as a version. Fails open: any error is logged and swallowed, because this runs
 * inside the anonymous session-save path where a history hiccup must never lose a save.
 */
export async function captureFromState(input: CaptureFromStateInput): Promise<InsertVersionResult | null> {
  try {
    const state = normalizeSessionState(input.state);
    const selection = selectionFromState(state, input.catalog);
    selection.voucher = await voucherForAutoCapture(selection.voucher, input.lead.config?.voucher ?? null);
    const priced = priceSelection(input.catalog, selection, input.lead.locale, { siteNotes: state.siteNotes });
    return await insertVersion({
      leadId: input.lead.id,
      locale: input.lead.locale,
      state,
      priced,
      hash: hashSelection(selection),
      actor: input.actor,
      reason: input.reason,
      eurToUsdRate: input.catalog.eurToUsdRate,
    });
  } catch (e) {
    console.error('[quotes] version capture failed:', e);
    return null;
  }
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
