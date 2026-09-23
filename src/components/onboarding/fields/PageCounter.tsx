'use client';

import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/types';
import type { Answers, OnbField } from '@/lib/onboarding/types';
import { loc } from '@/lib/onboarding/types';
import { linesOf } from '@/lib/onboarding/logic';
import { BLUE, MUTED } from '@/components/funnel/ui';

/** The band an option stands for, e.g. "5 to 8 pages" → { min: 5, max: 8 }. */
function band(field: OnbField | undefined, value: unknown) {
  if (!field || typeof value !== 'string') return null;
  const option = field.options.find((o) => o.value === value);
  if (!option || (option.min == null && option.max == null)) return null;
  return { label: option, min: option.min ?? 0, max: option.max ?? null };
}

/**
 * Live count of the listed pages against the band the client booked. It never blocks:
 * over the band we say we will come back to them, which is also what the flag does.
 */
export function PageCounter({
  field,
  value,
  answers,
  definition,
  locale,
}: {
  field: OnbField;
  value: string;
  answers: Answers;
  definition: { fields: OnbField[] };
  locale: Locale;
}) {
  const t = useTranslations('onboarding.shell');
  const bandFieldId = field.config.count_band;
  if (!bandFieldId) return null;

  const n = linesOf(value).length;
  if (!n) return null;

  const bandField = definition.fields.find((f) => f.id === bandFieldId);
  const picked = band(bandField, answers[bandFieldId]?.v);
  if (!picked) return <div style={{ fontSize: 12.5, color: MUTED, marginTop: 6 }}>{t('countWithin', { n, band: '—' })}</div>;

  const label = loc(picked.label as unknown as Record<string, unknown>, 'label', locale);
  const over = picked.max != null && n > picked.max ? n - picked.max : 0;
  const under = n < picked.min;
  const text = over
    ? t('countOver', { n, band: label, over })
    : under
      ? t('countUnder', { n, max: picked.max ?? picked.min })
      : t('countWithin', { n, band: label });

  return (
    <div data-testid={`count-${field.id}`} style={{ fontSize: 12.5, fontWeight: 600, color: over ? '#B45309' : BLUE, marginTop: 6 }}>
      {text}
    </div>
  );
}
