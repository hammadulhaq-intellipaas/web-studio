'use client';

import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/types';
import type { OnbField } from '@/lib/onboarding/types';
import { loc } from '@/lib/onboarding/types';
import { DEFAULT_MAX_CHARS } from '@/lib/onboarding/limits';
import { inputStyle, pillStyle } from './styles';

interface Common {
  field: OnbField;
  locale: Locale;
  invalid: boolean;
  inputId: string;
}

const INPUT_TYPES: Record<string, string> = { text: 'text', url: 'url', email: 'email', tel: 'tel', number: 'number', date: 'date' };

export function TextInput({
  field,
  locale,
  invalid,
  inputId,
  value,
  onChange,
}: Common & { value: string | number | null; onChange: (v: string | number | null) => void }) {
  const isNumber = field.type === 'number';
  const placeholder = loc(field as unknown as Record<string, unknown>, 'placeholder', locale);
  return (
    <input
      id={inputId}
      data-testid={`f-${field.id}`}
      type={INPUT_TYPES[field.type] ?? 'text'}
      inputMode={isNumber ? 'numeric' : field.type === 'tel' ? 'tel' : undefined}
      value={value == null ? '' : String(value)}
      min={isNumber ? field.config.min : undefined}
      max={isNumber ? field.config.max : undefined}
      maxLength={!isNumber && field.type !== 'date' ? field.config.max_chars ?? DEFAULT_MAX_CHARS[field.type] : undefined}
      placeholder={placeholder || undefined}
      onChange={(ev) => {
        const raw = ev.target.value;
        if (isNumber) {
          if (raw === '') return onChange(null);
          const n = Number(raw);
          return onChange(Number.isFinite(n) ? n : raw);
        }
        onChange(raw);
      }}
      aria-invalid={invalid || undefined}
      style={inputStyle(invalid)}
    />
  );
}

export function TextAreaInput({
  field,
  locale,
  invalid,
  inputId,
  value,
  onChange,
}: Common & { value: string; onChange: (v: string) => void }) {
  const t = useTranslations('onboarding.fields');
  const max = field.config.max_chars ?? DEFAULT_MAX_CHARS.textarea!;
  const placeholder = loc(field as unknown as Record<string, unknown>, 'placeholder', locale);
  const left = max - value.length;
  return (
    <div>
      <textarea
        id={inputId}
        data-testid={`f-${field.id}`}
        value={value}
        rows={field.config.rows ?? 3}
        maxLength={max}
        placeholder={placeholder || undefined}
        onChange={(ev) => onChange(ev.target.value)}
        aria-invalid={invalid || undefined}
        style={inputStyle(invalid, { resize: 'vertical', lineHeight: 1.5 })}
      />
      {left < 200 && (
        <div style={{ fontSize: 11.5, color: left < 0 ? '#D6493E' : '#9AA7BC', textAlign: 'right', marginTop: 3 }}>
          {t('charsLeft', { n: Math.max(0, left) })}
        </div>
      )}
    </div>
  );
}

export function RadioPills({
  field,
  locale,
  invalid,
  value,
  onChange,
}: Omit<Common, 'inputId'> & { value: string | null; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" data-testid={`f-${field.id}`} style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {field.options.map((o) => {
        const selected = value === o.value;
        const hint = loc(o as unknown as Record<string, unknown>, 'hint', locale);
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            data-testid={`opt-${field.id}-${o.value}`}
            onClick={() => onChange(o.value)}
            className="hov-blue-border"
            style={pillStyle(selected, invalid)}
          >
            <span>
              {loc(o as unknown as Record<string, unknown>, 'label', locale)}
              {hint && (
                <span style={{ display: 'block', fontSize: 11.5, fontWeight: 500, opacity: 0.8 }}>{hint}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function CheckboxPills({
  field,
  locale,
  invalid,
  value,
  onChange,
}: Omit<Common, 'inputId'> & { value: string[]; onChange: (v: string[]) => void }) {
  const exclusive = new Set(field.config.exclusive ?? []);
  const toggle = (v: string) => {
    if (value.includes(v)) return onChange(value.filter((x) => x !== v));
    // An exclusive option ("none of these") clears the rest, and picking anything else clears it.
    if (exclusive.has(v)) return onChange([v]);
    onChange([...value.filter((x) => !exclusive.has(x)), v]);
  };
  return (
    <div role="group" data-testid={`f-${field.id}`} style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {field.options.map((o) => {
        const selected = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            role="checkbox"
            aria-checked={selected}
            data-testid={`opt-${field.id}-${o.value}`}
            onClick={() => toggle(o.value)}
            className="hov-blue-border"
            style={pillStyle(selected, invalid)}
          >
            {selected && <span style={{ fontWeight: 800 }}>✓</span>}
            {loc(o as unknown as Record<string, unknown>, 'label', locale)}
          </button>
        );
      })}
    </div>
  );
}

export function SelectInput({
  field,
  locale,
  invalid,
  inputId,
  value,
  onChange,
}: Common & { value: string | null; onChange: (v: string) => void }) {
  const t = useTranslations('onboarding.fields');
  return (
    <select
      id={inputId}
      data-testid={`f-${field.id}`}
      value={value ?? ''}
      onChange={(ev) => onChange(ev.target.value)}
      aria-invalid={invalid || undefined}
      style={inputStyle(invalid)}
    >
      <option value="" disabled>
        {t('selectPlaceholder')}
      </option>
      {field.options.map((o) => (
        <option key={o.value} value={o.value}>
          {loc(o as unknown as Record<string, unknown>, 'label', locale)}
        </option>
      ))}
    </select>
  );
}
