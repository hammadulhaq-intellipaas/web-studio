'use client';

import { useState } from 'react';
import { useFunnel } from '@/stores/funnel';
import type { QuoteMeta } from '@/lib/funnel/state';
import { useAppLocale, useSelection } from './hooks';

/**
 * Sending the customer's edits from the quote banner.
 *
 * It used to walk them to the contact form to press a second button, but by this point we
 * already hold every detail that form asked for. So the banner sends the configuration
 * straight away, which is also what triggers the "here is your updated quote" email; the
 * separate decision to *save* the quote lives on its own screen.
 */
export function useSendChanges() {
  const store = useFunnel();
  const selection = useSelection();
  const locale = useAppLocale();
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const send = async () => {
    setState('sending');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          // Consent was given on the first submit; this is the same person on their own link.
          lead: { ...store.lead, consent: true },
          selection,
          sessionId: store.sessionId,
          siteNotes: store.siteNotes,
          stage2: { fields: store.s2, goal: store.goal, driveLink: store.drive },
          team: false,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; quote?: QuoteMeta };
      // A quote that closed while they had the page open: fall back to read-only.
      if (res.status === 403 && store.quote) {
        store.setQuote({ ...store.quote, locked: true });
        setState('idle');
        return;
      }
      if (!res.ok || !data.id) throw new Error('send failed');
      // The fresh fingerprint is what greys the button out again.
      if (data.quote) store.setQuote(data.quote);
      setState('sent');
      setTimeout(() => setState('idle'), 6000);
    } catch {
      setState('error');
    }
  };

  return { state, send };
}
