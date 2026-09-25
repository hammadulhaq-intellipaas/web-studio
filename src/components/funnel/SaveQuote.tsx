'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useFunnel } from '@/stores/funnel';
import { BORDER, INK, MUTED, gradButton } from './ui';

export interface AcceptResult {
  ok?: boolean;
  link?: string;
  email?: string | null;
  emailed?: boolean;
}

/**
 * Saving the quote, shared by the sidebar panel and the save screen.
 *
 * Saving is the end of the quoting conversation and the start of the build: it fixes the
 * configuration, so the quote goes read-only, and it hands over the link to the brief.
 */
export function useSaveQuote() {
  const store = useFunnel();
  const quote = store.quote;
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<AcceptResult | null>(null);

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

  return { state, result, save };
}

/**
 * What they see the moment the quote is saved: the brief, first.
 *
 * The quote is settled by this point, so the only thing left to do is the brief — it leads,
 * and the prices sit underneath for reference. The link is on screen as well as in their
 * inbox, because the screen they are already looking at is the one place we know reaches
 * them.
 */
export function WelcomeOnboard({ result, supportEmail }: { result: AcceptResult; supportEmail: string }) {
  const t = useTranslations('acceptQuote');
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!result.link) return;
    try {
      await navigator.clipboard.writeText(result.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the link is on screen anyway */
    }
  };

  return (
    <div
      data-testid="quote-accepted"
      style={{
        background: '#F1FAF5',
        border: '1px solid #BFE6D2',
        borderRadius: 18,
        padding: '24px 26px',
        marginBottom: 22,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800, color: '#1E6E44', letterSpacing: -0.4, marginBottom: 8 }} data-testid="welcome-title">
        {t('welcomeTitle')}
      </div>
      <p style={{ fontSize: 14.5, color: INK, lineHeight: 1.55, margin: '0 0 6px' }}>{t('welcomeBody')}</p>
      <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.55, margin: '0 0 16px' }}>
        {/* Only promise the inbox when a mail actually went out. */}
        {result.emailed && result.email ? t('welcomeMailed', { email: result.email }) : t('welcomeNoMail')}
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <a
          href={result.link}
          data-testid="quote-accepted-link"
          className="hov-lift1"
          style={{
            ...gradButton,
            display: 'inline-block',
            textDecoration: 'none',
            borderRadius: 12,
            padding: '14px 28px',
            fontSize: 15.5,
            fontWeight: 700,
          }}
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
            padding: '13px 18px',
            fontSize: 14,
            fontWeight: 700,
            color: INK,
          }}
        >
          {copied ? t('copied') : t('copyLink')}
        </button>
      </div>

      <div data-testid="quote-accepted-url" style={{ fontSize: 12, color: MUTED, marginTop: 12, wordBreak: 'break-all' }}>
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

/**
 * The save screen's only control. Everything it would otherwise ask for — name, company,
 * address, consent — we already hold from the enquiry, so all that is left is the decision
 * and a plain warning about what it does.
 */
export function SaveQuotePanel({
  email,
  state,
  onSave,
}: {
  email: string | null;
  state: 'idle' | 'sending' | 'done' | 'error';
  onSave: () => void;
}) {
  const t = useTranslations('acceptQuote');
  return (
    <div
      data-testid="quote-accept"
      style={{ background: '#ffffff', border: `1px solid ${BORDER}`, borderRadius: 18, padding: 26 }}
    >
      <div style={{ fontSize: 19, fontWeight: 800, color: INK, marginBottom: 8 }}>{t('title')}</div>
      <p style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.55, margin: '0 0 18px' }}>{t('body')}</p>
      <button
        type="button"
        onClick={onSave}
        disabled={state === 'sending'}
        data-testid="quote-accept-cta"
        className="hov-lift1"
        style={{
          ...gradButton,
          width: '100%',
          borderRadius: 12,
          padding: 16,
          fontSize: 15.5,
          fontWeight: 700,
          boxShadow: '0 10px 22px -8px rgba(30,79,214,.5)',
          opacity: state === 'sending' ? 0.7 : 1,
        }}
      >
        {state === 'sending' ? t('sending') : t('cta')}
      </button>
      {/* Said before they press it, not after. */}
      <p style={{ margin: '12px 0 0', textAlign: 'center', fontSize: 12.5, color: MUTED, lineHeight: 1.5 }} data-testid="quote-accept-warning">
        {t('locksNote')}
      </p>
      {email && (
        <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: 12, color: MUTED }} data-testid="quote-accept-recipient">
          {t('willSendTo', { email })}
        </p>
      )}
      {state === 'error' && (
        <div role="alert" data-testid="quote-accept-error" style={{ marginTop: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#D6493E' }}>
          {t('error')}
        </div>
      )}
    </div>
  );
}
