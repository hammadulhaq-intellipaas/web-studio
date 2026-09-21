'use client';

import { useId } from 'react';
import type { Locale } from '@/lib/types';
import type { FieldError } from '@/lib/onboarding/logic';
import { rowsOf, textOf } from '@/lib/onboarding/logic';
import type { Answer, OnbField, OnboardingDefinition, RepeaterRow } from '@/lib/onboarding/types';
import { CheckboxPills, RadioPills, SelectInput, TextAreaInput, TextInput } from './BasicInputs';
import { FieldShell } from './FieldShell';
import { Notice } from './Notice';
import { RankingInput } from './RankingInput';
import { initialRows, RepeaterInput } from './RepeaterInput';
import { SliderInput } from './SliderInput';
import { UploadInput, type PublicFile } from './UploadInput';

export interface FieldRendererProps {
  field: OnbField;
  answer: Answer | undefined;
  errors: FieldError[];
  required: boolean;
  locale: Locale;
  definition: OnboardingDefinition;
  formId: string;
  files: PublicFile[];
  onChange: (answer: Answer | null) => void;
  onFiles: (files: PublicFile[]) => void;
  disabled?: boolean;
}

/** Picks the control for a field type and adapts its value to the `Answer` envelope. */
export function FieldRenderer(props: FieldRendererProps) {
  const { field, answer, errors, required, locale, definition, formId, files, onChange, onFiles, disabled } = props;
  const inputId = useId();

  if (field.type === 'notice') return <Notice field={field} texts={definition.texts} locale={locale} />;

  const invalid = errors.length > 0;
  const dk = !!answer?.dk;
  const set = (v: Answer['v']) => onChange({ v });

  const control = (() => {
    switch (field.type) {
      case 'text':
      case 'url':
      case 'email':
      case 'tel':
      case 'number':
      case 'date': {
        const value = answer?.v == null ? null : (answer.v as string | number);
        return (
          <TextInput
            field={field}
            locale={locale}
            invalid={invalid}
            inputId={inputId}
            value={value}
            onChange={(v) => (v === null || v === '' ? onChange(null) : set(v))}
          />
        );
      }
      case 'textarea':
        return (
          <TextAreaInput
            field={field}
            locale={locale}
            invalid={invalid}
            inputId={inputId}
            value={textOf(answer)}
            onChange={(v) => (v === '' ? onChange(null) : set(v))}
          />
        );
      case 'radio':
        return <RadioPills field={field} locale={locale} invalid={invalid} value={typeof answer?.v === 'string' ? answer.v : null} onChange={set} />;
      case 'select':
        return (
          <SelectInput field={field} locale={locale} invalid={invalid} inputId={inputId} value={typeof answer?.v === 'string' ? answer.v : null} onChange={set} />
        );
      case 'checkboxes':
        return (
          <CheckboxPills
            field={field}
            locale={locale}
            invalid={invalid}
            value={Array.isArray(answer?.v) && typeof answer.v[0] !== 'object' ? (answer.v as string[]) : []}
            onChange={(v) => (v.length ? set(v) : onChange(null))}
          />
        );
      case 'slider':
        return <SliderInput field={field} locale={locale} inputId={inputId} value={typeof answer?.v === 'number' ? answer.v : null} onChange={set} />;
      case 'ranking':
        return (
          <RankingInput
            field={field}
            locale={locale}
            invalid={invalid}
            value={answer?.v && typeof answer.v === 'object' && !Array.isArray(answer.v) ? (answer.v as Record<string, string>) : {}}
            onChange={set}
          />
        );
      case 'repeater': {
        const rows: RepeaterRow[] = rowsOf(answer).length ? rowsOf(answer) : initialRows(field);
        return <RepeaterInput field={field} locale={locale} rows={rows} errors={errors} onChange={set} />;
      }
      case 'upload':
        return <UploadInput field={field} formId={formId} files={files} onFiles={onFiles} disabled={disabled} />;
      default:
        return null;
    }
  })();

  return (
    <FieldShell
      field={field}
      locale={locale}
      required={required}
      errors={errors}
      dontKnow={dk}
      onDontKnow={(on) => onChange(on ? { v: null, dk: true } : null)}
      settings={definition.settings}
      inputId={inputId}
    >
      <div style={disabled ? { pointerEvents: 'none', opacity: 0.7 } : undefined}>{control}</div>
    </FieldShell>
  );
}
