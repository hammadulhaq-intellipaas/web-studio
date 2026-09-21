'use client';

import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/types';
import type { FieldError } from '@/lib/onboarding/logic';
import { HARD_MAX_ROWS } from '@/lib/onboarding/limits';
import type { OnbField, RepeaterRow, RepeaterSubField } from '@/lib/onboarding/types';
import { loc } from '@/lib/onboarding/types';
import { BLUE, BORDER, MUTED } from '@/components/funnel/ui';
import { errorStyle, inputStyle, labelStyle, subtleButton } from './styles';

export function newRowId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Blank rows the client starts with (`initial_rows`), so the shape is visible at once. */
export function initialRows(field: OnbField): RepeaterRow[] {
  const n = Math.max(1, field.config.initial_rows ?? 1);
  return Array.from({ length: n }, () => ({ _id: newRowId() }));
}

function SubInput({
  sub,
  locale,
  value,
  invalid,
  onChange,
  testId,
}: {
  sub: RepeaterSubField;
  locale: Locale;
  value: string;
  invalid: boolean;
  onChange: (v: string) => void;
  testId: string;
}) {
  const t = useTranslations('onboarding.fields');
  const placeholder = loc(sub as unknown as Record<string, unknown>, 'placeholder', locale) || undefined;
  if (sub.type === 'select') {
    return (
      <select data-testid={testId} value={value} onChange={(ev) => onChange(ev.target.value)} style={inputStyle(invalid)}>
        <option value="" disabled>
          {t('selectPlaceholder')}
        </option>
        {(sub.options ?? []).map((o) => (
          <option key={o.value} value={o.value}>
            {loc(o as unknown as Record<string, unknown>, 'label', locale)}
          </option>
        ))}
      </select>
    );
  }
  if (sub.type === 'textarea') {
    return (
      <textarea
        data-testid={testId}
        value={value}
        rows={2}
        maxLength={sub.max_chars ?? 600}
        placeholder={placeholder}
        onChange={(ev) => onChange(ev.target.value)}
        style={inputStyle(invalid, { resize: 'vertical', lineHeight: 1.5 })}
      />
    );
  }
  return (
    <input
      data-testid={testId}
      type={sub.type === 'number' ? 'number' : sub.type === 'url' ? 'url' : sub.type === 'email' ? 'email' : sub.type === 'tel' ? 'tel' : 'text'}
      value={value}
      maxLength={sub.max_chars ?? 600}
      placeholder={placeholder}
      onChange={(ev) => onChange(ev.target.value)}
      style={inputStyle(invalid)}
    />
  );
}

/**
 * Rows of primitive sub-fields ("add another" beneath). Notification routing is
 * trigger → address; references are link / likes / dislikes.
 */
export function RepeaterInput({
  field,
  locale,
  rows,
  errors,
  onChange,
}: {
  field: OnbField;
  locale: Locale;
  rows: RepeaterRow[];
  errors: FieldError[];
  onChange: (rows: RepeaterRow[]) => void;
}) {
  const t = useTranslations('onboarding.fields');
  const te = useTranslations('onboarding.errors');
  const subs = field.config.fields ?? [];
  const maxRows = Math.min(field.config.max_rows ?? HARD_MAX_ROWS, HARD_MAX_ROWS);
  const minRows = Math.max(1, field.config.min_rows ?? 1);
  const addLabel = (locale === 'de' ? field.config.add_label_de : field.config.add_label_en) || t('addRow');
  const wide = subs.some((s) => s.type === 'textarea');

  const update = (rowId: string, key: string, value: string) =>
    onChange(rows.map((r) => (r._id === rowId ? { ...r, [key]: value } : r)));
  const remove = (rowId: string) => onChange(rows.filter((r) => r._id !== rowId));
  const add = () => onChange([...rows, { _id: newRowId() }]);

  return (
    <div data-testid={`f-${field.id}`} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((row, index) => {
        const rowErrors = errors.filter((e) => e.row_id === row._id);
        return (
          <div
            key={row._id}
            data-testid={`row-${field.id}-${index}`}
            style={{ background: '#F8FAFE', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 14px' }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: wide ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 10,
              }}
            >
              {subs.map((sub) => {
                const subErrors = rowErrors.filter((e) => e.sub === sub.key);
                return (
                  <div key={sub.key}>
                    <label style={{ ...labelStyle, fontSize: 12.5, marginBottom: 4 }}>
                      {loc(sub as unknown as Record<string, unknown>, 'label', locale)}
                      {sub.required && <span style={{ color: '#D6493E' }}> *</span>}
                    </label>
                    <SubInput
                      sub={sub}
                      locale={locale}
                      value={row[sub.key] == null ? '' : String(row[sub.key])}
                      invalid={subErrors.length > 0}
                      onChange={(v) => update(row._id, sub.key, v)}
                      testId={`f-${field.id}-${index}-${sub.key}`}
                    />
                    {subErrors.map((e, i) => (
                      <div key={i} style={errorStyle}>
                        {te(e.code, (e.params ?? {}) as Record<string, string | number>)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            {rows.length > minRows && (
              <div style={{ marginTop: 8, textAlign: 'right' }}>
                <button type="button" onClick={() => remove(row._id)} style={{ ...subtleButton, color: MUTED, fontSize: 12.5 }}>
                  {t('removeRow')}
                </button>
              </div>
            )}
          </div>
        );
      })}
      {rows.length < maxRows && (
        <button
          type="button"
          data-testid={`add-${field.id}`}
          onClick={add}
          className="hov-blue-border"
          style={{
            fontFamily: 'inherit',
            cursor: 'pointer',
            alignSelf: 'flex-start',
            background: '#ffffff',
            border: `1.5px dashed ${BORDER}`,
            borderRadius: 10,
            padding: '9px 14px',
            fontSize: 13,
            fontWeight: 700,
            color: BLUE,
          }}
        >
          + {addLabel}
        </button>
      )}
    </div>
  );
}
