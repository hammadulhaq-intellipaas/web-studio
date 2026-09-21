'use client';

import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/types';
import type { FieldError } from '@/lib/onboarding/logic';
import type { OnbField, OnboardingSettings } from '@/lib/onboarding/types';
import { loc } from '@/lib/onboarding/types';
import { BLUE, BORDER, MUTED } from '@/components/funnel/ui';
import { errorStyle, helpStyle, labelStyle, pillStyle } from './styles';

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

  return (
    <div data-field={field.id} data-invalid={topErrors.length ? 'true' : undefined} style={{ minWidth: 0 }}>
      {label && (
        <label htmlFor={inputId} style={labelStyle}>
          {label}
          {required ? (
            <span style={{ color: '#D6493E' }} aria-label={t('required')}>
              {' '}*
            </span>
          ) : (
            <span style={{ color: MUTED, fontWeight: 500 }}> · {t('optional')}</span>
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
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            background: '#F5F7FB',
            border: `1px dashed ${BORDER}`,
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 13.5,
            color: '#4A5872',
          }}
        >
          <span style={{ fontWeight: 600 }}>{t('dontKnowActive')}</span>
          <button
            type="button"
            onClick={() => onDontKnow?.(false)}
            style={{ fontFamily: 'inherit', cursor: 'pointer', background: 'none', border: 'none', padding: 0, color: BLUE, fontSize: 13, fontWeight: 700 }}
          >
            {t('dontKnowUndo')}
          </button>
        </div>
      ) : (
        children
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
