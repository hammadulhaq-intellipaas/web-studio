'use client';

import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/types';
import type { FieldError } from '@/lib/onboarding/logic';
import type { Answer, Answers, OnbField, OnbScreen, OnboardingDefinition } from '@/lib/onboarding/types';
import { loc } from '@/lib/onboarding/types';
import { BODY, BORDER, gradButton, MUTED } from '@/components/funnel/ui';
import { FieldRenderer } from './fields/FieldRenderer';
import type { PublicFile } from './fields/UploadInput';
import type { SaveStatus } from './useOnboardingSync';
import { DANGER } from './fields/styles';

/** Short answers get a capped input, but their label and help still run the full width. */
export const NARROW_INPUT = new Set(['text', 'email', 'tel', 'number', 'date', 'select', 'url']);

export function SaveStatusLine({ status }: { status: SaveStatus }) {
  const t = useTranslations('onboarding.shell');
  const text =
    status === 'saving' ? t('saving') : status === 'saved' ? t('saved') : status === 'error' ? t('saveError') : status === 'offline' ? t('offline') : t('autosave');
  return (
    <div data-testid="onb-save-status" data-status={status} style={{ fontSize: 12, color: status === 'error' || status === 'offline' ? DANGER : MUTED, textAlign: 'center' }}>
      {text}
    </div>
  );
}

/**
 * One screen of the form: title, CMS intro, the visible fields (one per row, so a label
 * and its help text always have the full width to run across), Back / Next. Next is blocked by the shell until validation passes; the
 * errors it hands down are rendered inline.
 */
export function ScreenCard({
  screen,
  fields,
  answers,
  files,
  errors,
  requiredNow,
  locale,
  definition,
  formId,
  disabled,
  onChange,
  onFiles,
  onBack,
  onNext,
  isFirst,
  isLast,
  saveStatus,
  banner,
  onSaveLink,
}: {
  screen: OnbScreen;
  fields: OnbField[];
  answers: Answers;
  files: PublicFile[];
  errors: FieldError[];
  requiredNow: (field: OnbField) => boolean;
  locale: Locale;
  definition: OnboardingDefinition;
  formId: string;
  disabled: boolean;
  onChange: (key: string, answer: Answer | null) => void;
  onFiles: (files: PublicFile[]) => void;
  onBack: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
  saveStatus: SaveStatus;
  banner?: React.ReactNode;
  onSaveLink?: () => void;
}) {
  const t = useTranslations('onboarding.shell');
  const row = screen as unknown as Record<string, unknown>;
  const title = loc(row, 'title', locale);
  const intro = loc(row, 'intro', locale);

  return (
    <section data-screen={`onb-${screen.id}`} className="onb-reveal" style={{ paddingBottom: 72 }}>
      <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.8, margin: '0 0 8px', textWrap: 'balance' }}>{title}</h2>
      {/* No max-width: the intro should run the same width as the card under it, not
          wrap early inside an invisible column. */}
      {intro && <p style={{ fontSize: 15.5, color: BODY, margin: '0 0 24px', lineHeight: 1.55 }}>{intro}</p>}
      {banner}

      <div style={{ background: '#ffffff', border: `1px solid ${BORDER}`, borderRadius: 18, padding: '26px 26px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 22 }}>
          {fields.map((field) => (
            <div
              key={field.id}
              className="onb-reveal"
              style={{ minWidth: 0 }}
            >
              <FieldRenderer
                field={field}
                answer={answers[field.id]}
                answers={answers}
                errors={errors.filter((e) => e.field === field.id)}
                required={requiredNow(field)}
                locale={locale}
                definition={definition}
                formId={formId}
                files={files}
                onChange={(answer) => onChange(field.id, answer)}
                onFiles={onFiles}
                disabled={disabled}
              />
            </div>
          ))}
        </div>
      </div>

      {errors.length > 0 && (
        <div data-testid="onb-fix-errors" role="alert" style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: DANGER }}>
          {t('fixErrors')}
        </div>
      )}

      <div className="onb-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginTop: 26 }}>
        <button
          type="button"
          data-testid="onb-back"
          onClick={onBack}
          disabled={isFirst}
          className="hov-blue-text"
          style={{
            fontFamily: 'inherit',
            cursor: isFirst ? 'default' : 'pointer',
            background: 'none',
            border: `1.5px solid ${BORDER}`,
            borderRadius: 12,
            color: MUTED,
            fontSize: 14,
            fontWeight: 700,
            padding: '13px 22px',
            opacity: isFirst ? 0.4 : 1,
          }}
        >
          {t('back')}
        </button>
        <button
          type="button"
          data-testid="onb-next"
          onClick={onNext}
          className="hov-lift1"
          style={{
            ...gradButton,
            borderRadius: 12,
            padding: '15px 34px',
            fontSize: 15.5,
            fontWeight: 700,
            boxShadow: '0 10px 22px -8px rgba(30,79,214,.5)',
          }}
        >
          {isLast ? t('toReview') : t('next')}
        </button>
      </div>
      <div style={{ marginTop: 14 }}>
        <SaveStatusLine status={saveStatus} />
        {onSaveLink && (
          <div className="onb-mobile-only" style={{ textAlign: 'center', marginTop: 10 }}>
            <button
              type="button"
              data-testid="onb-savelink-mobile"
              onClick={onSaveLink}
              style={{ fontFamily: 'inherit', cursor: 'pointer', background: 'none', border: 'none', color: '#1E5EFF', fontSize: 13, fontWeight: 700 }}
            >
              {t('saveLink')}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
