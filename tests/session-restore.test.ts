import { beforeEach, describe, expect, it } from 'vitest';
import { useFunnel } from '@/stores/funnel';
import type { QuoteMeta } from '@/lib/funnel/state';

/**
 * Reopening a customer's `?c=` link. The quote is the whole point of that link, so it has
 * to land on the configurator whatever step the session happened to be left on. Julian's
 * link was stored on `intro` and dropped visitors at the landing page, with no banner and
 * no notice: it simply looked broken.
 */
const QUOTE: QuoteMeta = {
  leadId: 'lead-1',
  status: 'contacted',
  locked: false,
  draft: false,
  submittedAt: '2026-09-20T15:38:00Z',
  hasConsent: true,
  oneTime: 2703,
  monthly: 27.06,
  submitted: null,
  locale: 'de',
};

beforeEach(() => {
  useFunnel.setState({ step: 'intro', quote: null, bundle: null });
});

describe('restoring a shared session', () => {
  for (const step of ['intro', 'persona', 'questions', 'lead', 'done'] as const) {
    it(`lands on the configurator when the session was left on "${step}"`, () => {
      useFunnel.getState().hydrateFromSession({ step, bundle: 'gold', sessionId: 'Pbzdv6Pd8133UYQON3OTu' }, QUOTE);
      expect(useFunnel.getState().step).toBe('config');
      expect(useFunnel.getState().quote?.leadId).toBe('lead-1');
    });
  }

  it('leaves the configurator alone when that is where it was', () => {
    useFunnel.getState().hydrateFromSession({ step: 'config', bundle: 'gold' }, QUOTE);
    expect(useFunnel.getState().step).toBe('config');
  });

  // An unbound session is somebody mid-questionnaire, not a quote: it resumes where it was.
  it('does not move a session that has no quote behind it', () => {
    useFunnel.getState().hydrateFromSession({ step: 'questions', bundle: null }, null);
    expect(useFunnel.getState().step).toBe('questions');
  });
});
