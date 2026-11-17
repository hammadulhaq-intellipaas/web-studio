'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { BORDER, INK } from '@/components/funnel/ui';
import type { Locale } from '@/lib/types';
import type { FieldError } from '@/lib/onboarding/logic';
import { pickedSites, rowsFromPicks } from '@/lib/onboarding/examples';
import type { Answers, OnbField, RepeaterRow } from '@/lib/onboarding/types';
import { loc } from '@/lib/onboarding/types';
import { SubInput } from './RepeaterInput';
import { errorStyle, labelStyle } from './styles';

/**
 * "What do you like about it?" for every website ticked in the gallery: one block per pick, in
 * the order ticked, with its screenshot and name, then the row's other columns (the likes ticks
 * and what they don't like). A `rows_from` repeater: the first column holds the pick and is not
 * shown; picks come and go with the gallery ticks.
 */
export function PickedSiteLikes({
  field,
  source,
  locale,
  stored,
  answers,
  errors,
  disabled,
  onChange,
}: {
  field: OnbField;
  /** The gallery field the rows follow. */
  source: OnbField | undefined;
  locale: Locale;
  stored: RepeaterRow[];
  answers: Answers;
  errors: FieldError[];
  disabled?: boolean;
  onChange: (rows: RepeaterRow[]) => void;
}) {
  const te = useTranslations('onboarding.errors');
  const [column, ...subs] = field.config.fields ?? [];
  const rows = rowsFromPicks(field, stored, answers);
  const picks = field.config.rows_from ? pickedSites(answers, field.config.rows_from) : [];

  // A site unticked in the gallery takes its likes with it, so the brief never names a site the
  // client no longer picked.
  const stale = column ? stored.some((r) => !picks.includes(String(r[column.key] ?? ''))) : false;
  useEffect(() => {
    if (stale && !disabled) onChange(rows.filter((r) => stored.includes(r)));
  }, [stale, disabled, onChange, rows, stored]);

  if (!column || !rows.length) return null;
  const update = (row: RepeaterRow, key: string, value: string) =>
    onChange(rows.map((r) => (r._id === row._id ? { ...r, [key]: value } : r)));

  return (
    <div data-testid={`f-${field.id}`} style={{ display: 'grid', gap: 12 }}>
      {rows.map((row) => {
        const value = String(row[column.key] ?? '');
        const option = source?.options.find((o) => o.value === value);
        const name = option ? loc(option as unknown as Record<string, unknown>, 'label', locale) : value;
        const rowErrors = errors.filter((e) => e.row_id === row._id);
        return (
          <div
            key={row._id}
            data-testid={`row-${field.id}-${value}`}
            style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: '#F8FAFE', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, flexWrap: 'wrap' }}
          >
            {option?.image && (
              <Image
                src={option.image}
                alt=""
                width={240}
                height={150}
                sizes="120px"
                style={{ flex: 'none', width: 120, height: 75, objectFit: 'cover', objectPosition: 'top', borderRadius: 8, border: `1px solid ${BORDER}` }}
              />
            )}
            <div style={{ flex: '1 1 260px', minWidth: 0, display: 'grid', gap: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: INK }}>{name}</div>
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
                      onChange={(v) => update(row, sub.key, v)}
                      testId={`f-${field.id}-${value}-${sub.key}`}
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
          </div>
        );
      })}
    </div>
  );
}
