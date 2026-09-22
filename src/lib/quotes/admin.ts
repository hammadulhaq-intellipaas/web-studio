import 'server-only';
import { getCatalog } from '@/lib/catalog';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { Appointment, Catalog, Lead, LeadActivity, LeadVersion } from '@/lib/types';
import type { PlanRow } from '@/components/admin/PlanPanel';
import { latestActivityFor, loadActivity } from './activity';
import { diffConfigs, type QuoteChange } from './diff';
import { hashSelection, priceSelection, type PricedQuote } from './price';
import { quotesSchemaReady } from './schema';
import { normalizeSessionState, selectionFromLeadConfig, selectionFromState } from './selection';
import { loadVersions } from './versions';

/* ------------------------------------------------------------------ list */

export type LeadListFilter = 'open' | 'all' | Lead['status'];

export interface LeadListRow extends Lead {
  /** Last customer/team edit on the live configuration (from the bound session). */
  session_updated_at: string | null;
  session_last_actor: string | null;
  last_activity: LeadActivity | null;
}

export interface LeadListResult {
  ready: boolean;
  rows: LeadListRow[];
  counts: Record<string, number>;
}

const OPEN: Lead['status'][] = ['draft', 'new', 'contacted', 'agreed'];

/**
 * Leads for the admin list. A removed lead is gone from the CMS — it keeps its row in the
 * database (and its versions, notes and files), but no view here lists it again. Every count
 * the tab bar shows comes from the same load, so the numbers always agree with the tabs.
 * Before the migration the legacy columns are used as they are.
 */
export async function loadLeadList(filter: LeadListFilter, q: string | undefined): Promise<LeadListResult> {
  const admin = createSupabaseAdminClient();
  const ready = await quotesSchemaReady();

  const term = q ? q.replace(/[%,()]/g, ' ').trim() : '';
  const load = (columns: string) => {
    let query = admin.from('leads').select(columns).order('created_at', { ascending: false }).limit(500);
    if (term) query = query.or(`email.ilike.%${term}%,firma.ilike.%${term}%,vorname.ilike.%${term}%,nachname.ilike.%${term}%`);
    return query;
  };
  // The session embed needs PostgREST to know the new FK; right after the migration its
  // schema cache may lag, so fall back to the plain columns rather than an empty list.
  let { data, error } = ready ? await load('*, funnel_sessions(updated_at, last_actor)') : await load('*');
  if (error && ready) ({ data, error } = await load('*'));
  if (error) console.error('[quotes] lead list failed:', error.message);

  type Raw = Lead & { funnel_sessions?: { updated_at: string; last_actor: string | null } | null };
  const all = ((data ?? []) as unknown as Raw[]).map<LeadListRow>((row) => {
    const { funnel_sessions, ...lead } = row;
    return {
      ...lead,
      status: lead.status ?? 'new',
      source: lead.source ?? 'customer',
      archived_at: lead.archived_at ?? null,
      session_id: lead.session_id ?? null,
      owner_email: lead.owner_email ?? null,
      session_updated_at: funnel_sessions?.updated_at ?? null,
      session_last_actor: funnel_sessions?.last_actor ?? null,
      last_activity: null,
    };
  });

  const visible = all.filter((l) => !l.archived_at);
  const counts: Record<string, number> = { open: 0, all: visible.length };
  for (const l of visible) {
    counts[l.status] = (counts[l.status] ?? 0) + 1;
    if (OPEN.includes(l.status)) counts.open++;
  }

  let rows = visible;
  if (filter === 'open') rows = rows.filter((l) => OPEN.includes(l.status));
  else if (filter !== 'all') rows = rows.filter((l) => l.status === filter);

  if (ready && rows.length) {
    const latest = await latestActivityFor(rows.map((r) => r.id));
    rows = rows.map((r) => ({ ...r, last_activity: latest.get(r.id) ?? null }));
  }

  return { ready, rows, counts };
}

/* ------------------------------------------------------------------ detail */

export interface LiveQuote {
  priced: PricedQuote;
  hash: string;
  updatedAt: string;
  lastActor: string | null;
  /** True when the live configuration differs from the latest submitted snapshot. */
  differs: boolean;
  changes: QuoteChange[];
}

export interface LinkedOnboardingForm {
  id: string;
  status: string;
  locale: string;
  company: string | null;
  created_at: string;
}

export interface LeadDetail {
  ready: boolean;
  lead: Lead;
  catalog: Catalog;
  files: { id: string; kind: string; file_name: string; size_bytes: number; mime_type: string; storage_path: string; url: string | null }[];
  appointments: Appointment[];
  plans: PlanRow[];
  versions: LeadVersion[];
  activity: LeadActivity[];
  live: LiveQuote | null;
  onboardingForms: LinkedOnboardingForm[];
  adminUsers: string[];
}

export async function loadLeadDetail(id: string): Promise<LeadDetail | null> {
  const admin = createSupabaseAdminClient();
  const ready = await quotesSchemaReady();

  const { data: leadData } = await admin.from('leads').select('*').eq('id', id).maybeSingle();
  if (!leadData) return null;
  const raw = leadData as Lead;
  const lead: Lead = {
    ...raw,
    status: raw.status ?? 'new',
    source: raw.source ?? 'customer',
    archived_at: raw.archived_at ?? null,
    session_id: raw.session_id ?? null,
    owner_email: raw.owner_email ?? null,
    submitted_at: raw.submitted_at ?? null,
  };

  const filesQuery = lead.session_id
    ? admin.from('lead_files').select('*').or(`lead_id.eq.${id},session_id.eq.${lead.session_id}`).order('created_at')
    : admin.from('lead_files').select('*').eq('lead_id', id).order('created_at');

  const [catalog, { data: filesData }, { data: apptsData }, { data: plansData }, versions, activity, { data: onbData }, session] =
    await Promise.all([
      getCatalog(),
      filesQuery,
      admin.from('appointments').select('*').eq('lead_id', id).order('start_time'),
      admin.from('suggested_plans').select('*').eq('lead_id', id).order('version', { ascending: false }),
      ready ? loadVersions(id) : Promise.resolve([] as LeadVersion[]),
      ready ? loadActivity(id) : Promise.resolve([] as LeadActivity[]),
      admin.from('onboarding_forms').select('id, status, locale, company, created_at').eq('lead_id', id).order('created_at', { ascending: false }),
      lead.session_id
        ? admin.from('funnel_sessions').select('state, updated_at, last_actor').eq('id', lead.session_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  // Signed URLs for the private bucket (1 hour). A customer-supplied SVG can carry script,
  // so it is served as a download rather than rendered in the browser.
  const files = await Promise.all(
    (filesData ?? []).map(async (f) => {
      const isSvg = f.mime_type === 'image/svg+xml';
      const { data } = await admin.storage
        .from('lead-uploads')
        .createSignedUrl(f.storage_path, 3600, isSvg ? { download: true } : undefined);
      return { ...f, url: data?.signedUrl ?? null };
    }),
  );

  let live: LiveQuote | null = null;
  if (session?.data?.state) {
    try {
      const state = normalizeSessionState(session.data.state);
      const selection = selectionFromState(state, catalog);
      // Price with the voucher as validated at the last submit (same code), never the client's numbers.
      if (selection.voucher && lead.config?.voucher && selection.voucher.code.toUpperCase() === lead.config.voucher.code.toUpperCase()) {
        selection.voucher = lead.config.voucher;
      } else if (selection.voucher) {
        selection.voucher = null;
      }
      const priced = priceSelection(catalog, selection, lead.locale, { siteNotes: state.siteNotes });
      const hash = hashSelection(selection);
      const submittedHash = hashSelection(selectionFromLeadConfig(lead.config, lead, catalog));
      const differs = hash !== submittedHash;
      live = {
        priced,
        hash,
        updatedAt: session.data.updated_at,
        lastActor: session.data.last_actor ?? null,
        differs,
        changes: differs ? diffConfigs(lead.config, priced.config) : [],
      };
    } catch (e) {
      console.error('[quotes] live quote pricing failed:', e);
    }
  }

  let adminUsers: string[] = [];
  try {
    const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
    adminUsers = (data?.users ?? []).map((u) => u.email ?? '').filter(Boolean).sort();
  } catch (e) {
    console.error('[quotes] listUsers failed:', e);
  }

  return {
    ready,
    lead,
    catalog,
    files,
    appointments: (apptsData ?? []) as Appointment[],
    plans: (plansData ?? []) as PlanRow[],
    versions,
    activity,
    live,
    onboardingForms: (onbData ?? []) as LinkedOnboardingForm[],
    adminUsers,
  };
}
