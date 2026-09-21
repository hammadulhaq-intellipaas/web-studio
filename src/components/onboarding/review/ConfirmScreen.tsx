'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import type { Locale } from '@/lib/types';
import { listItems, textFor } from '@/lib/onboarding/texts';
import type { OnboardingDefinition, OnboardingFormRecord } from '@/lib/onboarding/types';
import { BLUE, BODY, BORDER, gradButton, INK, MUTED } from '@/components/funnel/ui';
import { DANGER, inputStyle, labelStyle } from '../fields/styles';

/**
 * Terms (CMS markdown, with the 16 Sep corrections), the confirmation checkboxes (one per
 * CMS list line), name and date. Submitting flips the record to confirmed.
 */
export function ConfirmScreen({
  definition,
  record,
  setRecord,
  locale,
  onBack,
}: {
  definition: OnboardingDefinition;
  record: OnboardingFormRecord;
  setRecord: Dispatch<SetStateAction<OnboardingFormRecord>>;
  locale: Locale;
  onBack: () => void;
}) {
  const t = useTranslations('onboarding.confirm');
  const ts = useTranslations('onboarding.shell');
  const terms = textFor(definition.texts, 'terms', locale);
  const checksText = textFor(definition.texts, 'confirm_checks', locale);
  const checks = listItems(checksText?.content_markdown ?? '');
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const [name, setName] = useState(record.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

  const submit = async () => {
    if (checks.some((_, i) => !ticked.has(i))) return setError(t('checkAll'));
    if (name.trim().length < 2) return setError(t('nameRequired'));
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/onboarding/${record.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), checks: Array.from(ticked) }),
      });
      const body = (await res.json()) as { record?: OnboardingFormRecord };
      if (!res.ok || !body.record) throw new Error(String(res.status));
      setRecord(body.record);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch {
      setError(t('error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-screen="onb-confirm" className="onb-reveal" style={{ paddingBottom: 72 }}>
      <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.8, margin: '0 0 20px' }}>{t('title')}</h2>

      {terms && (
        <div style={{ background: '#ffffff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: '22px 24px', maxWidth: 780, marginBottom: 16 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', color: MUTED, marginBottom: 10 }}>{terms.title}</div>
          <div className="onb-markdown" data-testid="onb-terms" style={{ fontSize: 14.5, lineHeight: 1.6, color: BODY }}>
            <ReactMarkdown>{terms.content_markdown}</ReactMarkdown>
          </div>
        </div>
      )}

      <div style={{ background: '#ffffff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: '22px 24px', maxWidth: 780 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {checks.map((label, i) => (
            <label key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', cursor: 'pointer' }}>
              <input
                type="checkbox"
                data-testid={`onb-check-${i}`}
                checked={ticked.has(i)}
                onChange={(ev) => {
                  const next = new Set(ticked);
                  if (ev.target.checked) next.add(i);
                  else next.delete(i);
                  setTicked(next);
                }}
                style={{ marginTop: 3, width: 17, height: 17, accentColor: BLUE, flex: 'none' }}
              />
              <span style={{ fontSize: 14, lineHeight: 1.5, color: INK }}>{label}</span>
            </label>
          ))}
        </div>
        <div className="onb-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>
              {t('nameLabel')} <span style={{ color: DANGER }}>*</span>
            </label>
            <input data-testid="onb-confirm-name" value={name} onChange={(ev) => setName(ev.target.value)} placeholder={t('namePlaceholder')} style={inputStyle(false)} />
          </div>
          <div>
            <label style={labelStyle}>{t('dateLabel')}</label>
            <div style={{ ...inputStyle(false), background: '#F5F7FB', color: BODY }}>{today}</div>
          </div>
        </div>
        {error && (
          <div role="alert" data-testid="onb-confirm-error" style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: DANGER }}>
            {error}
          </div>
        )}
        <div className="onb-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginTop: 22 }}>
          <button
            type="button"
            onClick={onBack}
            className="hov-blue-text"
            style={{ fontFamily: 'inherit', cursor: 'pointer', background: 'none', border: `1.5px solid ${BORDER}`, borderRadius: 12, color: MUTED, fontSize: 14, fontWeight: 700, padding: '13px 22px' }}
          >
            {ts('back')}
          </button>
          <button
            type="button"
            data-testid="onb-confirm-submit"
            onClick={() => void submit()}
            disabled={busy}
            className="hov-lift1"
            style={{ ...gradButton, borderRadius: 12, padding: '15px 34px', fontSize: 15.5, fontWeight: 700, boxShadow: '0 10px 22px -8px rgba(30,79,214,.5)', opacity: busy ? 0.7 : 1 }}
          >
            {busy ? t('submitting') : t('cta')}
          </button>
        </div>
      </div>
    </section>
  );
}
