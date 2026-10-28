import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { loadLeadList } from '@/lib/quotes/admin';
import type { ConfirmedInfo } from '@/lib/onboarding/types';
import type { Lead, LeadStatus, Locale } from '@/lib/types';
import { isDeveloperClient, type DeveloperView } from './filters';

/** One card on the Developers page: a quote, and the onboarding form started from it. */
export interface DeveloperCard {
  id: string;
  name: string;
  company: string;
  email: string;
  locale: Locale;
  bundleName: string | null;
  leadStatus: LeadStatus;
  onboardingFormId: string | null;
  onboardingStatus: string | null;
  createdAt: string;
}

export interface DeveloperCardList {
  cards: DeveloperCard[];
  counts: Record<DeveloperView, number>;
}

/**
 * Cards come from the quote form, since many clients skip the onboarding form. Removed quotes
 * are already left out by the lead list.
 */
export async function loadDeveloperCards(view: DeveloperView, q: string | undefined): Promise<DeveloperCardList> {
  const { rows } = await loadLeadList('all', q);
  const all = rows.map<DeveloperCard>((r) => ({
    id: r.id,
    name: [r.vorname, r.nachname].filter(Boolean).join(' '),
    company: r.firma,
    email: r.email,
    locale: r.locale,
    bundleName: r.config?.bundleName ?? null,
    leadStatus: r.status,
    onboardingFormId: r.onboarding_form_id,
    onboardingStatus: r.onboarding_status,
    createdAt: r.created_at,
  }));
  const committed = all.filter((c) => isDeveloperClient({ status: c.leadStatus, onboarding_status: c.onboardingStatus }));
  return { cards: view === 'committed' ? committed : all, counts: { all: all.length, committed: committed.length } };
}

export interface DeveloperOnboarding {
  id: string;
  status: string;
  locale: Locale;
  current_step: string | null;
  updated_at: string;
  confirmed: ConfirmedInfo | null;
}

export interface DeveloperClient {
  lead: Lead;
  onboarding: DeveloperOnboarding | null;
}

const FORM_COLUMNS = 'id, status, locale, current_step, updated_at, confirmed, created_at';

export async function loadDeveloperClient(id: string): Promise<DeveloperClient | null> {
  const admin = createSupabaseAdminClient();
  const { data: lead } = await admin.from('leads').select('*').eq('id', id).maybeSingle();
  if (!lead || (lead as Lead).archived_at) return null;

  // Before migration 20261019000019 there is no archived_at on forms: then nothing is removed.
  const latest = (withArchive: boolean) =>
    admin
      .from('onboarding_forms')
      .select(withArchive ? `${FORM_COLUMNS}, archived_at` : FORM_COLUMNS)
      .eq('lead_id', id)
      .order('created_at', { ascending: false });
  let { data, error } = await latest(true);
  if (error) ({ data, error } = await latest(false));
  const forms = (data ?? []) as unknown as (DeveloperOnboarding & { archived_at?: string | null })[];
  const form = forms.find((f) => !f.archived_at) ?? null;

  return { lead: lead as Lead, onboarding: form };
}
