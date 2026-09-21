'use client';

import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/types';
import { rankingCounts } from '@/lib/onboarding/logic';
import type { OnbField } from '@/lib/onboarding/types';
import { loc } from '@/lib/onboarding/types';
import { BORDER, INK, MUTED } from '@/components/funnel/ui';
import { inputStyle } from './styles';

/**
 * One row per option, a bucket per row (spec §02: "the validation matters more than the
 * interaction — the point is forcing one clear winner"). Live counters show how many
 * items sit in each limited bucket; the screen's validation blocks Next until the
 * "exactly one" / "at most three" rules hold.
 */
export function RankingInput({
  field,
  locale,
  invalid,
  value,
  onChange,
}: {
  field: OnbField;
  locale: Locale;
  invalid: boolean;
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  const t = useTranslations('onboarding.fields');
  const buckets = field.config.buckets ?? [];
  const counts = rankingCounts(field, value);

  return (
    <div data-testid={`f-${field.id}`}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {buckets
          .filter((b) => b.max != null || b.min != null)
          .map((b) => {
            const n = counts[b.value] ?? 0;
            const limit = b.max ?? b.min ?? 0;
            const over = b.max != null && n > b.max;
            const under = b.min != null && n < b.min;
            return (
              <span
                key={b.value}
                data-testid={`bucket-count-${field.id}-${b.value}`}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: over || (invalid && under) ? '#D6493E' : n ? '#1E4FD6' : MUTED,
                  background: '#ffffff',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 999,
                  padding: '4px 10px',
                }}
              >
                {loc(b as unknown as Record<string, unknown>, 'label', locale)} {n}/{limit}
              </span>
            );
          })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {field.options.map((o) => {
          const bucket = value[o.value] ?? '';
          const placed = bucket !== '';
          return (
            <div
              key={o.value}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1fr) minmax(150px, 200px)',
                gap: 12,
                alignItems: 'center',
                background: '#ffffff',
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: '10px 12px 10px 14px',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: INK }}>
                {loc(o as unknown as Record<string, unknown>, 'label', locale)}
              </span>
              <select
                data-testid={`rank-${field.id}-${o.value}`}
                value={bucket}
                onChange={(ev) => onChange({ ...value, [o.value]: ev.target.value })}
                style={inputStyle(invalid && !placed, { padding: '9px 10px', fontSize: 13.5, fontWeight: 600, color: placed ? INK : MUTED })}
              >
                <option value="" disabled>
                  {t('chooseBucket')}
                </option>
                {buckets.map((b) => (
                  <option key={b.value} value={b.value}>
                    {loc(b as unknown as Record<string, unknown>, 'label', locale)}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
