'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import type { Locale } from '@/lib/types';
import { displayValue } from '@/lib/onboarding/export';
import { visibility } from '@/lib/onboarding/logic';
import { understoodText } from '@/lib/onboarding/understood';
import { loc, type Answer, type OnboardingDefinition, type OnboardingFormRecord } from '@/lib/onboarding/types';
import { BLUE, BODY, BORDER, gradButton, INK, MUTED } from '@/components/funnel/ui';
import { DANGER, inputStyle, pillStyle } from '../fields/styles';
import type { PublicFile } from '../fields/UploadInput';

const card = { background: '#ffffff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: '22px 24px' } as const;

/**
 * Step 10, blocks 1 and 2: every answer grouped by section with a way back to it, then the
 * read-back of what we understood. The read-back is assembled from the client's own words
 * (see `understoodText`), never written by a model, and they can correct it in one field.
 */
export function UnderstoodStep({
  definition,
  record,
  files,
  locale,
  onJumpToScreen,
  onChange,
  onConfirm,
}: {
  definition: OnboardingDefinition;
  record: OnboardingFormRecord;
  files: PublicFile[];
  locale: Locale;
  onJumpToScreen: (screenId: string) => void;
  onChange: (key: string, answer: Answer | null) => void;
  onConfirm: () => void | Promise<void>;
}) {
  const t = useTranslations('onboarding.review');
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  const verdict = typeof record.answers.understood_ok?.v === 'string' ? record.answers.understood_ok.v : null;
  const corrections = typeof record.answers.understood_corrections?.v === 'string' ? record.answers.understood_corrections.v : '';

  const sections = useMemo(() => {
    const { visible } = visibility(definition.fields, record.answers);
    return definition.screens
      .filter((s) => s.kind === 'questions')
      .map((screen) => ({
        screen,
        rows: visible
          .filter((f) => f.screen_id === screen.id && f.type !== 'notice')
          .map((f) => ({
            id: f.id,
            label: loc(f as unknown as Record<string, unknown>, 'label', locale),
            value: displayValue(f, record.answers[f.id], locale, files),
          })),
      }));
  }, [definition, record.answers, files, locale]);

  const readBack = useMemo(() => understoodText(definition, record.answers, locale), [definition, record.answers, locale]);

  const submit = async () => {
    if (!verdict || (verdict !== 'yes' && !corrections.trim())) {
      setError(true);
      return;
    }
    setSaving(true);
    try {
      await onConfirm();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section data-screen="onb-understood" style={{ paddingBottom: 72, display: 'grid', gap: 22 }}>
      <div style={card} data-testid="onb-answer-check">
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, margin: '0 0 4px' }}>{t('answersTitle')}</h2>
        <p style={{ fontSize: 14, color: BODY, margin: '0 0 18px' }}>{t('answersHelp')}</p>
        {sections.map(({ screen, rows }) =>
          rows.length === 0 ? null : (
            <div key={screen.id} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: MUTED, margin: 0 }}>
                  {loc(screen as unknown as Record<string, unknown>, 'title', locale)}
                </h3>
                <button
                  type="button"
                  onClick={() => onJumpToScreen(screen.id)}
                  data-testid={`onb-edit-${screen.id}`}
                  className="hov-blue-text"
                  style={{ fontFamily: 'inherit', cursor: 'pointer', background: 'none', border: 'none', padding: 0, color: BLUE, fontSize: 12.5, fontWeight: 700 }}
                >
                  {t('answersEdit')}
                </button>
              </div>
              <dl style={{ margin: 0, display: 'grid', gap: 4 }}>
                {rows.map((row) => (
                  <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12, fontSize: 13.5, alignItems: 'baseline' }}>
                    <dt style={{ color: MUTED }}>{row.label}</dt>
                    <dd style={{ margin: 0, whiteSpace: 'pre-wrap', color: row.value ? INK : MUTED }}>{row.value || t('answersEmpty')}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ),
        )}
      </div>

      <div style={card} data-testid="onb-understood">
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, margin: '0 0 10px' }}>{t('understoodTitle')}</h2>
        <div className="onb-prose" style={{ fontSize: 15, lineHeight: 1.65, color: INK }}>
          <ReactMarkdown>{readBack}</ReactMarkdown>
        </div>

        <div style={{ marginTop: 20, borderTop: `1px solid ${BORDER}`, paddingTop: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
            {t('understoodRight')}
            <span style={{ color: DANGER }}> *</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(['yes', 'mostly', 'no'] as const).map((value) => (
              <button
                key={value}
                type="button"
                data-testid={`onb-understood-${value}`}
                onClick={() => {
                  setError(false);
                  onChange('understood_ok', { v: value });
                }}
                style={pillStyle(verdict === value)}
              >
                {t(value === 'yes' ? 'understoodYes' : value === 'mostly' ? 'understoodMostly' : 'understoodNo')}
              </button>
            ))}
          </div>

          {verdict && verdict !== 'yes' && (
            <div style={{ marginTop: 16 }}>
              <label htmlFor="onb-corrections" style={{ display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                {t('understoodCorrections')}
                <span style={{ color: DANGER }}> *</span>
              </label>
              <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 8 }}>{t('understoodCorrectionsHelp')}</div>
              <textarea
                id="onb-corrections"
                data-testid="onb-corrections"
                rows={4}
                value={corrections}
                placeholder={t('understoodCorrectionsPlaceholder')}
                onChange={(ev) => {
                  setError(false);
                  onChange('understood_corrections', ev.target.value ? { v: ev.target.value } : null);
                }}
                style={inputStyle(false, { resize: 'vertical' })}
              />
            </div>
          )}

          {error && (
            <div role="alert" data-testid="onb-understood-error" style={{ fontSize: 12.5, fontWeight: 600, color: DANGER, marginTop: 10 }}>
              {verdict ? t('understoodRequired') : t('understoodRight')}
            </div>
          )}
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving}
          data-testid="onb-to-confirm"
          className="hov-lift1"
          style={{ ...gradButton, borderRadius: 12, padding: '14px 28px', fontSize: 15, fontWeight: 700, opacity: saving ? 0.7 : 1 }}
        >
          {t('toConfirm')}
        </button>
      </div>
    </section>
  );
}
