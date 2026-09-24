'use client';

import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/types';
import type { FieldError } from '@/lib/onboarding/logic';
import type { OnbField, OnboardingSettings } from '@/lib/onboarding/types';
import { loc } from '@/lib/onboarding/types';
import { BLUE, BORDER, MUTED } from '@/components/funnel/ui';
import { errorStyle, helpStyle, inputStyle, labelStyle, pillStyle } from './styles';

const SETTING_LINKS: Record<string, keyof OnboardingSettings> = {
  onb_examples_url: 'examplesUrl',
  onb_folder_help_url: 'folderHelpUrl',
};

/**
 * Label, helper text, optional CMS link, the "I don't know" toggle and the error line
 * around any control. The control itself is `children`; when the client marked the
 * field as "don't know" the control is replaced by a short confirmation.
 */
export function FieldShell({
  field,
  locale,
  required,
  errors,
  dontKnow,
  onDontKnow,
  dontKnowDate,
  onDontKnowDate,
  none,
  onNone,
  settings,
  inputId,
  children,
}: {
  field: OnbField;
  locale: Locale;
  required: boolean;
  errors: FieldError[];
  dontKnow: boolean;
  onDontKnow?: (on: boolean) => void;
  dontKnowDate?: string;
  onDontKnowDate?: (date: string) => void;
  none?: boolean;
  onNone?: (on: boolean) => void;
  settings: OnboardingSettings;
  inputId: string;
  children: React.ReactNode;
}) {
  const t = useTranslations('onboarding.shell');
  const te = useTranslations('onboarding.errors');
  const row = field as unknown as Record<string, unknown>;
  const label = loc(row, 'label', locale);
  const help = loc(row, 'help', locale);
  const linkKey = field.config.link_setting ? SETTING_LINKS[field.config.link_setting] : undefined;
  const linkHref = linkKey ? String(settings[linkKey] ?? '') : '';
  const linkLabel = locale === 'de' ? field.config.link_label_de : field.config.link_label_en;
  const topErrors = errors.filter((e) => !e.row_id);
  const noneLabel = locale === 'de' ? field.config.none_label_de : field.config.none_label_en;

  return (
    <div data-field={field.id} data-invalid={topErrors.length ? 'true' : undefined} style={{ minWidth: 0 }}>
      {label && (
        <label htmlFor={inputId} style={labelStyle}>
          {label}
          {/* A non-breaking space keeps the marker on the last word's line. */}
          {required ? (
            <span style={{ color: '#D6493E' }} aria-label={t('required')}>
              {' *'}
            </span>
          ) : (
            <span style={{ color: MUTED, fontWeight: 500, whiteSpace: 'nowrap' }}>{' · '}{t('optional')}</span>
          )}
        </label>
      )}
      {help && <div style={helpStyle}>{help}</div>}
      {linkHref && linkLabel && (
        <div style={{ margin: '-2px 0 10px' }}>
          <a href={linkHref} target="_blank" rel="noreferrer" style={{ color: BLUE, fontSize: 13, fontWeight: 600 }}>
            {linkLabel} ↗
          </a>
        </div>
      )}

      {dontKnow ? (
        <div
          data-testid={`dk-active-${field.id}`}
          style={{
            background: '#F5F7FB',
            border: `1px dashed ${BORDER}`,
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 13.5,
            color: '#4A5872',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600 }}>{t('dontKnowActive')}</span>
            <button
              type="button"
              onClick={() => onDontKnow?.(false)}
              style={{ fontFamily: 'inherit', cursor: 'pointer', background: 'none', border: 'none', padding: 0, color: BLUE, fontSize: 13, fontWeight: 700 }}
            >
              {t('dontKnowUndo')}
            </button>
          </div>
          {/* Not knowing yet is fine; knowing WHEN they will know is what we plan around. */}
          <label htmlFor={`${inputId}-dkdate`} style={{ display: 'block', fontWeight: 700, margin: '12px 0 4px' }}>
            {t('dontKnowDate')}
          </label>
          <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 6 }}>{t('dontKnowDateHelp')}</div>
          <input
            id={`${inputId}-dkdate`}
            type="date"
            data-testid={`dk-date-${field.id}`}
            value={dontKnowDate ?? ''}
            onChange={(ev) => onDontKnowDate?.(ev.target.value)}
            style={inputStyle(false, { maxWidth: 220 })}
          />
        </div>
      ) : (
        children
      )}

      {noneLabel && !dontKnow && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 9, fontSize: 13.5, color: '#4A5872', cursor: 'pointer' }}>
          <input
            type="checkbox"
            data-testid={`none-${field.id}`}
            checked={!!none}
            onChange={(ev) => onNone?.(ev.target.checked)}
            style={{ width: 16, height: 16, accentColor: BLUE, flex: 'none' }}
          />
          {noneLabel}
        </label>
      )}

      {field.allow_dont_know && !dontKnow && (
        <div style={{ marginTop: 8 }}>
          <button
            type="button"
            data-testid={`dk-${field.id}`}
            onClick={() => onDontKnow?.(true)}
            className="hov-blue-border"
            style={{ ...pillStyle(false), fontSize: 12.5, padding: '7px 13px', color: MUTED }}
          >
            {t('dontKnow')}
          </button>
        </div>
      )}

      {topErrors.map((e, i) => (
        <div key={i} data-testid={`err-${field.id}`} role="alert" style={errorStyle}>
          {te(e.code, (e.params ?? {}) as Record<string, string | number>)}
        </div>
      ))}
    </div>
  );
}
