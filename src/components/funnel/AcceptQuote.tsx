'use client';

import { useTranslations } from 'next-intl';
import { useFunnel } from '@/stores/funnel';
import { BORDER, INK, MUTED, gradButton } from './ui';
import { WelcomeOnboard, useSaveQuote } from './SaveQuote';

/**
 * "Save the quote" in the price sidebar, on the customer's own link.
 *
 * The same decision is offered on the save screen; this is the shortcut for someone who is
 * already happy and does not want to walk another step to say so. Both go through the same
 * endpoint, so pressing either one twice is harmless.
 */
export function AcceptQuote({ supportEmail }: { supportEmail: string }) {
  const t = useTranslations('acceptQuote');
  const store = useFunnel();
  const quote = store.quote;
  const { state, result, save } = useSaveQuote();

  // The confirmation outlives the lock it just caused, so it is checked before the guard.
  if (state === 'done' && result?.link) return <WelcomeOnboard result={result} supportEmail={supportEmail} />;

  // Only on a real customer's own link: not in team mode, not a draft, not once locked.
  if (!quote || store.teamMode || quote.draft || quote.locked) return null;

  return (
    <div
      data-testid="quote-accept-side"
      style={{ background: '#ffffff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 22px', marginTop: 18 }}
    >
      <div style={{ fontSize: 17, fontWeight: 800, color: INK, marginBottom: 6 }}>{t('title')}</div>
      <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.55, margin: '0 0 6px' }}>{t('body')}</p>
      {/* Said before they press it, not after: saving closes the quote to further edits. */}
      <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.5, margin: '0 0 14px' }}>{t('locksNote')}</p>
      <button
        type="button"
        onClick={() => void save()}
        disabled={state === 'sending'}
        data-testid="quote-accept-side-cta"
        className="hov-lift1"
        style={{
          ...gradButton,
          borderRadius: 12,
          padding: '14px 30px',
          fontSize: 15.5,
          fontWeight: 700,
          opacity: state === 'sending' ? 0.7 : 1,
        }}
      >
        {state === 'sending' ? t('sending') : t('cta')}
      </button>
      {state === 'error' && (
        <div role="alert" data-testid="quote-accept-side-error" style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: '#D6493E' }}>
          {t('error')}
        </div>
      )}
    </div>
  );
}
