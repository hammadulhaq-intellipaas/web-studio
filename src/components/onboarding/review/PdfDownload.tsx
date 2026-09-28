'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { BLUE, BORDER, gradButton } from '@/components/funnel/ui';
import { DANGER } from '../fields/styles';
import { Spinner } from './Loaders';

/**
 * A PDF the server draws on demand, which takes a few seconds. As a plain link nothing
 * happened on click until the file arrived; this fetches it with a spinner and "Preparing
 * your PDF…", then hands it to the browser as a download, and says so if it failed.
 */
export function PdfDownload({
  href,
  label,
  fallbackName,
  variant,
  testId,
}: {
  href: string;
  label: string;
  fallbackName: string;
  variant: 'primary' | 'outline' | 'link';
  testId: string;
}) {
  const t = useTranslations('onboarding.review');
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');

  const download = async () => {
    if (state === 'busy') return;
    setState('busy');
    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? fallbackName;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setState('idle');
    } catch {
      setState('error');
    }
  };

  const busy = state === 'busy';
  const base = {
    fontFamily: 'inherit',
    cursor: busy ? 'progress' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 9,
    whiteSpace: 'nowrap',
  } as const;
  const style =
    variant === 'primary'
      ? { ...base, ...gradButton, borderRadius: 12, padding: '14px 30px', fontSize: 15, fontWeight: 700, boxShadow: '0 10px 22px -8px rgba(30,79,214,.5)', opacity: busy ? 0.85 : 1 }
      : variant === 'outline'
        ? { ...base, fontSize: 13.5, fontWeight: 700, color: BLUE, border: `1.5px solid ${BORDER}`, background: '#ffffff', borderRadius: 11, padding: '10px 16px' }
        : { ...base, fontSize: 13.5, fontWeight: 700, color: BLUE, border: 'none', background: 'none', padding: 0 };

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: variant === 'primary' ? 'center' : 'flex-start', gap: 6 }}>
      <button
        type="button"
        data-testid={testId}
        data-state={state}
        onClick={() => void download()}
        aria-busy={busy}
        className={variant === 'primary' ? 'hov-lift1' : variant === 'outline' ? 'hov-blue-border' : 'hov-blue-text'}
        style={style}
      >
        {busy ? <Spinner size={15} onDark={variant === 'primary'} /> : variant !== 'primary' ? <span aria-hidden="true">⤓</span> : null}
        {busy ? t('pdfPreparing') : label}
      </button>
      {state === 'error' && (
        <span role="alert" style={{ fontSize: 12.5, fontWeight: 600, color: DANGER }}>
          {t('pdfError')}
        </span>
      )}
    </span>
  );
}
