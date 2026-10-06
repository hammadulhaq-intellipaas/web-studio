'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useFunnel } from '@/stores/funnel';
import { useSaveChanges, useUnsavedChanges } from './useSaveChanges';

/**
 * The save bar: pinned to the bottom of the screen the moment a quote has unsaved changes.
 *
 * A quote no longer saves on its own, so the one thing that must never be missed is that
 * there is something to save. It is deliberately loud: full width, dark, a pulsing marker
 * and the brightest button on the page. Discard puts the quote back to how it was last
 * saved, which is the one-click undo for an accidental edit. Leaving the page with changes
 * still unsaved asks first.
 */
export function UnsavedChangesBar() {
  const t = useTranslations('quote');
  const step = useFunnel((s) => s.step);
  const discardChanges = useFunnel((s) => s.discardChanges);
  const { dirty } = useUnsavedChanges();
  const { state, save } = useSaveChanges();

  // Closing the tab, reloading or following a link away would lose the edits.
  useEffect(() => {
    if (!dirty) return;
    const warn = (ev: BeforeUnloadEvent) => {
      ev.preventDefault();
      ev.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // Makes room for the bar so it never covers the price sidebar's own button.
  useEffect(() => {
    const el = document.documentElement;
    if (dirty) el.setAttribute('data-unsaved', '');
    else el.removeAttribute('data-unsaved');
    return () => el.removeAttribute('data-unsaved');
  }, [dirty]);

  if (!dirty || (step !== 'config' && step !== 'lead')) return null;

  return (
    <div
      role="region"
      aria-label={t('unsavedTitle')}
      data-testid="unsaved-bar"
      className="unsaved-bar"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        background: '#0F2440',
        color: '#ffffff',
        borderTop: '3px solid #F5A524',
        boxShadow: '0 -12px 32px -8px rgba(15,36,64,.45)',
      }}
    >
      <div
        style={{
          maxWidth: 1140,
          margin: '0 auto',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span className="unsaved-dot" aria-hidden />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.2 }}>{t('unsavedTitle')}</div>
            <div style={{ fontSize: 12.5, color: state === 'error' ? '#FFB4A8' : '#C7D4EA', marginTop: 2 }} role={state === 'error' ? 'alert' : undefined}>
              {state === 'error' ? t('saveError') : t('unsavedHint')}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={discardChanges}
            disabled={state === 'saving'}
            data-testid="unsaved-discard"
            style={{
              fontFamily: 'inherit',
              cursor: 'pointer',
              background: 'transparent',
              border: '1.5px solid rgba(255,255,255,.35)',
              color: '#ffffff',
              borderRadius: 12,
              padding: '12px 18px',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {t('discard')}
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={state === 'saving'}
            data-testid="unsaved-save"
            className="unsaved-save"
            style={{
              fontFamily: 'inherit',
              cursor: 'pointer',
              border: 'none',
              background: 'linear-gradient(100deg,#F5A524,#FFC75F)',
              color: '#1B1405',
              borderRadius: 12,
              padding: '13px 30px',
              fontSize: 15.5,
              fontWeight: 800,
              opacity: state === 'saving' ? 0.75 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {state === 'saving' ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
