'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BORDER, BODY, gradButton, INK, MUTED } from '@/components/funnel/ui';
import { DANGER } from './fields/styles';

/**
 * "Save and come back later": the link itself is the resume mechanism, so this emails it
 * to the contact address from Screen 1 and offers a copy button as a fallback.
 */
export function SaveLinkDialog({
  formId,
  email,
  onClose,
}: {
  formId: string;
  email: string | null;
  onClose: () => void;
}) {
  const t = useTranslations('onboarding.shell');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => ev.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const send = async () => {
    setState('sending');
    try {
      const res = await fetch(`/api/onboarding/${formId}/save-link`, { method: 'POST' });
      setState(res.ok ? 'sent' : 'error');
    } catch {
      setState('error');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href.split('#')[0]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the address bar still has it */
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onb-savelink-title"
      data-testid="onb-savelink-dialog"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,36,64,.45)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 100 }}
    >
      <div
        onClick={(ev) => ev.stopPropagation()}
        style={{ background: '#ffffff', border: `1px solid ${BORDER}`, borderRadius: 18, padding: '26px 28px', width: '100%', maxWidth: 460, boxShadow: '0 24px 60px -20px rgba(15,36,64,.45)' }}
      >
        <h3 id="onb-savelink-title" style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.4, margin: '0 0 8px', color: INK }}>
          {t('saveLinkTitle')}
        </h3>
        <p style={{ fontSize: 14.5, color: BODY, lineHeight: 1.55, margin: '0 0 18px' }}>
          {email ? t('saveLinkBody', { email }) : t('saveLinkNoEmail')}
        </p>
        {state === 'sent' && (
          <div data-testid="onb-savelink-sent" style={{ fontSize: 13.5, fontWeight: 700, color: '#1E6E44', background: '#EAF5EE', border: '1px solid #BFE0CC', borderRadius: 10, padding: '10px 13px', marginBottom: 14 }}>
            ✓ {t('saveLinkSent')}
          </div>
        )}
        {state === 'error' && (
          <div style={{ fontSize: 13, fontWeight: 600, color: DANGER, marginBottom: 14 }}>{t('saveLinkError')}</div>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {email && state !== 'sent' && (
            <button
              type="button"
              data-testid="onb-savelink-send"
              onClick={() => void send()}
              disabled={state === 'sending'}
              style={{ ...gradButton, borderRadius: 11, padding: '12px 20px', fontSize: 14, fontWeight: 700, opacity: state === 'sending' ? 0.7 : 1 }}
            >
              {t('saveLinkSend')}
            </button>
          )}
          <button
            type="button"
            data-testid="onb-savelink-copy"
            onClick={() => void copy()}
            className="hov-blue-border hov-blue-text"
            style={{ fontFamily: 'inherit', cursor: 'pointer', background: '#ffffff', border: `1.5px solid ${BORDER}`, borderRadius: 11, padding: '11px 18px', fontSize: 14, fontWeight: 700, color: INK }}
          >
            {copied ? t('copied') : t('copyLink')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="hov-blue-text"
            style={{ fontFamily: 'inherit', cursor: 'pointer', background: 'none', border: 'none', color: MUTED, fontSize: 13.5, fontWeight: 600, marginLeft: 'auto' }}
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
