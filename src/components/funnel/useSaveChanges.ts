'use client';

import { useFunnel, quoteContent, toSessionState } from '@/stores/funnel';
import type { QuoteMeta } from '@/lib/funnel/state';
import { useAppLocale, useSelection } from './hooks';

/**
 * Whether the quote on screen has changes nobody has saved yet.
 *
 * Only a quote can be unsaved: before someone enquires, their run is still kept as they go.
 * A closed quote cannot be changed by the customer, and a team draft the customer has not
 * enquired on yet goes through the enquiry form instead, so neither counts.
 */
export function useUnsavedChanges(): { saveable: boolean; dirty: boolean } {
  const state = useFunnel();
  const quote = state.quote;
  const saveable = !!quote && (state.teamMode || (!quote.locked && !quote.draft));
  const dirty = saveable && !!state.savedSnapshot && quoteContent(state) !== state.savedSnapshot;
  return { saveable, dirty };
}

/**
 * "Save changes": the only way an existing quote changes.
 *
 * One request updates the lead, adds a version and moves the customer's link to exactly
 * what is on screen, so the three can never disagree again. A customer's save also sends
 * them the updated quote; a team member's does not.
 */
export function useSaveChanges() {
  const store = useFunnel();
  const selection = useSelection();
  const locale = useAppLocale();
  const state = useFunnel((s) => s.saveStatus);
  const setState = useFunnel((s) => s.setSaveStatus);

  const save = async (): Promise<boolean> => {
    setState('saving');
    try {
      const current = useFunnel.getState();
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          // Consent was given on the first submit; this is the same person on their own link.
          lead: { ...current.lead, consent: true },
          selection,
          sessionId: current.sessionId,
          siteNotes: current.siteNotes,
          stage2: { fields: current.s2, goal: current.goal, driveLink: current.drive },
          team: current.teamMode,
          sessionState: toSessionState(current),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; quote?: QuoteMeta };
      // A quote that closed while they had the page open: fall back to read-only.
      if (res.status === 403 && current.quote) {
        current.setQuote({ ...current.quote, locked: true });
        setState('error');
        return false;
      }
      if (!res.ok || !data.id) throw new Error('save failed');
      if (data.quote) store.setQuote(data.quote);
      store.markSaved();
      setState('saved');
      setTimeout(() => {
        if (useFunnel.getState().saveStatus === 'saved') setState('idle');
      }, 6000);
      return true;
    } catch {
      setState('error');
      return false;
    }
  };

  return { state, save };
}
