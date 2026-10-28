import type { LeadStatus } from '@/lib/types';

/** Quote statuses that mean the customer has committed to the website. */
export const COMMITTED_LEAD_STATUSES: LeadStatus[] = ['accepted', 'agreed', 'won'];

/**
 * Onboarding statuses that show the customer actually worked through the form. Every submitted
 * quote gets an `in_progress` form automatically, so that status alone says nothing.
 */
const ENGAGED_ONBOARDING_STATUSES = ['review', 'brief', 'confirmed'];

/**
 * `all` is the default: lead statuses are not always kept up to date (real client projects
 * still sit at `new`), so filtering by them by default would hide clients.
 */
export type DeveloperView = 'all' | 'committed';

export function parseView(value: string | undefined): DeveloperView {
  return value === 'committed' ? 'committed' : 'all';
}

/** A card shows under "Committed" when the quote is committed or the form is under way. */
export function isDeveloperClient(lead: { status: LeadStatus; onboarding_status: string | null }): boolean {
  if (lead.status === 'lost') return false;
  return COMMITTED_LEAD_STATUSES.includes(lead.status) || ENGAGED_ONBOARDING_STATUSES.includes(lead.onboarding_status ?? '');
}

/** Phase 1 generates prompts from the confirmed onboarding form only (the best case). */
export function promptsReady(onboardingStatus: string | null): boolean {
  return onboardingStatus === 'confirmed';
}

export const DEVELOPER_TABS = ['design', 'build', 'handover'] as const;
export type DeveloperTab = (typeof DEVELOPER_TABS)[number];

export function parseTab(value: string | undefined): DeveloperTab {
  return (DEVELOPER_TABS as readonly string[]).includes(value ?? '') ? (value as DeveloperTab) : 'design';
}
