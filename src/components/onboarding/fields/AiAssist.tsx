'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { BLUE, BORDER, GREEN, MUTED } from '@/components/funnel/ui';
import { DANGER } from './styles';

/**
 * "Help me say this better": one model pass over the client's own words, shown as a
 * suggestion they accept or reject. Nothing is written until they press "Use this", so a
 * bad rewrite can never quietly replace what they typed.
 */
export function AiAssist({
  formId,
  fieldKey,
  value,
  onUse,
}: {
  formId: string;
  fieldKey: string;
  value: string;
  onUse: (text: string) => void;
}) {
  const t = useTranslations('onboarding.shell');
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const ask = async () => {
    setBusy(true);
    setFailed(false);
    setSuggestion(null);
    try {
      const res = await fetch(`/api/onboarding/${formId}/assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field_key: fieldKey, text: value }),
      });
      const data = (await res.json()) as { text?: string };
      if (!res.ok || !data.text) throw new Error('assist failed');
      setSuggestion(data.text);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  // Nothing to improve yet: the model rewrites the client's words, it does not invent them.
  if (!value.trim()) return null;

  return (
    <div style={{ marginTop: 8 }}>
      {!suggestion && (
        <button
          type="button"
          onClick={() => void ask()}
          disabled={busy}
          data-testid={`assist-${fieldKey}`}
          className="hov-blue-text"
          style={{
            fontFamily: 'inherit',
            cursor: busy ? 'default' : 'pointer',
            background: 'none',
            border: `1.5px solid ${BORDER}`,
            borderRadius: 999,
            padding: '7px 14px',
            fontSize: 12.5,
            fontWeight: 700,
            color: busy ? MUTED : BLUE,
          }}
        >
          {busy ? t('aiAssistBusy') : `✨ ${t('aiAssist')}`}
        </button>
      )}
      {failed && (
        <div role="alert" style={{ fontSize: 12, fontWeight: 600, color: DANGER, marginTop: 6 }}>
          {t('aiAssistError')}
        </div>
      )}
      {suggestion && (
        <div
          data-testid={`assist-result-${fieldKey}`}
          style={{ background: '#F5F7FB', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 14px' }}
        >
          <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 8 }}>{t('aiAssistResult')}</div>
          <div style={{ fontSize: 14.5, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{suggestion}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              data-testid={`assist-use-${fieldKey}`}
              onClick={() => {
                onUse(suggestion);
                setSuggestion(null);
              }}
              style={{
                fontFamily: 'inherit',
                cursor: 'pointer',
                border: 'none',
                borderRadius: 10,
                padding: '8px 14px',
                fontSize: 12.5,
                fontWeight: 700,
                background: GREEN,
                color: '#ffffff',
              }}
            >
              {t('aiAssistUse')}
            </button>
            <button
              type="button"
              data-testid={`assist-keep-${fieldKey}`}
              onClick={() => setSuggestion(null)}
              style={{
                fontFamily: 'inherit',
                cursor: 'pointer',
                background: '#ffffff',
                border: `1.5px solid ${BORDER}`,
                borderRadius: 10,
                padding: '8px 14px',
                fontSize: 12.5,
                fontWeight: 700,
                color: MUTED,
              }}
            >
              {t('aiAssistKeep')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
