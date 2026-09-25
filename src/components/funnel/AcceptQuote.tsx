'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useFunnel } from '@/stores/funnel';
import { BORDER, INK, MUTED, gradButton } from './ui';

/**
 * "Accept the quote", on the customer's own link.
 *
 * Accepting is the end of the quoting conversation and the start of the build: it locks the
 * configuration, starts their onboarding brief prefilled from what they bought, and emails
 * them the link. The link is shown here as well, so they can start straight away instead of
 * waiting for the mail to arrive.
 */
export function AcceptQuote() {
  const t = useTranslations('acceptQuote');
  const store = useFunnel();
  const quote = store.quote;
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [link, setLink] = useState<string | null>(null);

  // Only on a real customer's own link: not in team mode, not on a draft, not once closed.
  if (!quote || store.teamMode || quote.draft || quote.locked) return null;

  const accept = async () => {
    setState('sending');
    try {
      const res = await fetch(`/api/sessions/${store.sessionId}/accept`, { method: 'POST' });
      const body = (await res.json()) as { ok?: boolean; link?: string };
      if (!res.ok || !body.ok || !body.link) throw new Error('accept failed');
      setLink(body.link);
      setState('done');
    } catch {
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <div
        data-testid="quote-accepted"
        style={{ background: '#F1FAF5', border: '1px solid #BFE6D2', borderRadius: 16, padding: '20px 22px', marginTop: 18 }}
      >
        <div style={{ fontSize: 17, fontWeight: 800, color: '#1E6E44', marginBottom: 6 }}>✓ {t('doneTitle')}</div>
        <p style={{ fontSize: 14, color: INK, lineHeight: 1.55, margin: '0 0 14px' }}>{t('doneBody')}</p>
        {link && (
          <a
            href={link}
            data-testid="quote-accepted-link"
            className="hov-lift1"
            style={{ ...gradButton, display: 'inline-block', textDecoration: 'none', borderRadius: 12, padding: '13px 26px', fontSize: 15, fontWeight: 700 }}
          >
            {t('startBrief')}
          </a>
        )}
      </div>
    );
  }

  return (
    <div
      data-testid="quote-accept"
      style={{ background: '#ffffff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 22px', marginTop: 18 }}
    >
      <div style={{ fontSize: 17, fontWeight: 800, color: INK, marginBottom: 6 }}>{t('title')}</div>
      <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.55, margin: '0 0 6px' }}>{t('body')}</p>
      {/* Said before they press it, not after: accepting closes the quote to further edits. */}
      <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.5, margin: '0 0 14px' }}>{t('locksNote')}</p>
      <button
        type="button"
        onClick={() => void accept()}
        disabled={state === 'sending'}
        data-testid="quote-accept-cta"
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
        <div role="alert" data-testid="quote-accept-error" style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: '#D6493E' }}>
          {t('error')}
        </div>
      )}
    </div>
  );
}
