'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useFunnel } from '@/stores/funnel';
import { BORDER, INK, MUTED, gradButton } from './ui';

interface AcceptResult {
  ok?: boolean;
  link?: string;
  email?: string | null;
  emailed?: boolean;
}

/**
 * "Save the quote", on the customer's own link.
 *
 * Saving is the end of the quoting conversation and the start of the build: it fixes the
 * configuration, so the quote becomes read-only, and it hands them the link to their brief.
 * The link is shown here as well as emailed, because the screen they are already looking at
 * is the one place we know reaches them.
 */
export function AcceptQuote({ supportEmail }: { supportEmail: string }) {
  const t = useTranslations('acceptQuote');
  const store = useFunnel();
  const quote = store.quote;
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<AcceptResult | null>(null);
  const [copied, setCopied] = useState(false);

  const save = async () => {
    setState('sending');
    try {
      const res = await fetch(`/api/sessions/${store.sessionId}/accept`, { method: 'POST' });
      const body = (await res.json()) as AcceptResult;
      if (!res.ok || !body.ok || !body.link) throw new Error('accept failed');
      setResult(body);
      setState('done');
      // Flip the banner and stop the autosave now rather than on the next reload: the
      // quote is fixed from this moment, and the server rejects further writes anyway.
      if (quote) store.setQuote({ ...quote, status: 'accepted', locked: true });
    } catch {
      setState('error');
    }
  };

  const copy = async () => {
    if (!result?.link) return;
    try {
      await navigator.clipboard.writeText(result.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the link is on screen anyway */
    }
  };

  // The confirmation outlives the lock it just caused, so it is checked before the guard.
  if (state === 'done' && result?.link) {
    return (
      <div
        data-testid="quote-accepted"
        style={{ background: '#F1FAF5', border: '1px solid #BFE6D2', borderRadius: 16, padding: '20px 22px', marginTop: 18 }}
      >
        <div style={{ fontSize: 17, fontWeight: 800, color: '#1E6E44', marginBottom: 8 }}>✓ {t('doneTitle')}</div>
        <p style={{ fontSize: 14, color: INK, lineHeight: 1.55, margin: '0 0 12px' }}>
          {/* Only promise the email when one actually went out. */}
          {result.emailed && result.email ? t('doneBody', { email: result.email }) : t('doneBodyNoMail')}
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <a
            href={result.link}
            data-testid="quote-accepted-link"
            className="hov-lift1"
            style={{ ...gradButton, display: 'inline-block', textDecoration: 'none', borderRadius: 12, padding: '13px 26px', fontSize: 15, fontWeight: 700 }}
          >
            {t('startBrief')}
          </a>
          <button
            type="button"
            onClick={() => void copy()}
            data-testid="quote-accepted-copy"
            style={{
              fontFamily: 'inherit',
              cursor: 'pointer',
              background: '#ffffff',
              border: `1.5px solid ${BORDER}`,
              borderRadius: 12,
              padding: '12px 18px',
              fontSize: 14,
              fontWeight: 700,
              color: INK,
            }}
          >
            {copied ? t('copied') : t('copyLink')}
          </button>
        </div>
        <div
          data-testid="quote-accepted-url"
          style={{ fontSize: 12, color: MUTED, marginTop: 10, wordBreak: 'break-all' }}
        >
          {result.link}
        </div>
        {supportEmail && (
          <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.5, margin: '12px 0 0' }}>
            {t('help', { support: supportEmail })}
          </p>
        )}
      </div>
    );
  }

  // Only on a real customer's own link: not in team mode, not a draft, not once locked.
  if (!quote || store.teamMode || quote.draft || quote.locked) return null;

  return (
    <div
      data-testid="quote-accept"
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
