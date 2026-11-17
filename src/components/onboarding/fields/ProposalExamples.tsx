'use client';

import { useTranslations } from 'next-intl';
import { BLUE, BORDER, INK, MUTED } from '@/components/funnel/ui';
import type { Locale } from '@/lib/types';
import type { FieldError } from '@/lib/onboarding/logic';
import { allExamples, chosenExamples, favouriteKeys, type ChosenExample } from '@/lib/onboarding/examples';
import type { Answers, OnbField } from '@/lib/onboarding/types';
import { loc } from '@/lib/onboarding/types';
import { errorText } from './errorText';
import { errorStyle } from './styles';

const domainOf = (url: string) => {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const badge = (on: boolean): React.CSSProperties => ({
  flex: 'none',
  width: 22,
  height: 22,
  borderRadius: 999,
  border: `1.5px solid ${on ? BLUE : BORDER}`,
  background: on ? BLUE : '#ffffff',
  color: on ? '#ffffff' : MUTED,
  fontSize: 12,
  fontWeight: 800,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
});

/**
 * Below the design examples: which example each proposal is based on. When the client chose more
 * examples than there are proposals, they first click their favourites here (the first click is
 * Proposal 1); the favourites are this field's answer.
 */
export function ProposalExamples({
  field,
  fields,
  answers,
  fileCounts,
  errors,
  locale,
  disabled,
  onChange,
}: {
  field: OnbField;
  fields: OnbField[];
  answers: Answers;
  fileCounts: Record<string, number>;
  errors: FieldError[];
  locale: Locale;
  disabled?: boolean;
  onChange: (favourites: string[] | null) => void;
}) {
  const t = useTranslations('onboarding.fields.examples');
  const te = useTranslations('onboarding.errors');
  const rule = field.config.proposal_examples!;
  const all = allExamples(rule, answers, fileCounts);
  const chosen = chosenExamples(rule, answers, fileCounts);
  const favourites = favouriteKeys(rule, answers, fileCounts);
  const picker = fields.find((f) => f.id === rule.picks);
  const title = loc(field as unknown as Record<string, unknown>, 'label', locale) || t('title');
  const choosing = !!rule.favourites && all.length > rule.count;
  // Until both favourites are clicked, the proposals are not settled: show them as open.
  const settled = !choosing || favourites.length >= rule.count;

  const name = (example: ChosenExample) => {
    if (example.kind === 'library') {
      const option = picker?.options.find((o) => o.value === example.value);
      return option ? loc(option as unknown as Record<string, unknown>, 'label', locale) : example.value;
    }
    if (example.kind === 'link') return t('link', { site: domainOf(example.url) });
    return t('pictures', { n: example.count });
  };

  const toggle = (key: string) => {
    if (disabled) return;
    if (favourites.includes(key)) {
      const next = favourites.filter((k) => k !== key);
      onChange(next.length ? next : null);
    } else if (favourites.length < rule.count) {
      onChange([...favourites, key]);
    }
  };

  return (
    <div
      data-field={field.id}
      data-testid="proposal-examples"
      data-invalid={errors.length ? 'true' : undefined}
      style={{ background: '#F5F7FB', border: `1px solid ${errors.length ? '#F3B8B2' : '#E4E9F2'}`, borderRadius: 12, padding: '14px 16px' }}
    >
      {choosing && (
        <div data-testid="favourites" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: INK }}>{t('favouritesTitle', { count: rule.count })}</div>
          <div style={{ fontSize: 13, color: '#4A5872', lineHeight: 1.45, margin: '4px 0 10px' }}>
            {t('favouritesHelp', { n: all.length, count: rule.count })}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {all.map((example) => {
              const rank = favourites.indexOf(example.key);
              const on = rank >= 0;
              const full = !on && favourites.length >= rule.count;
              return (
                <button
                  key={example.key}
                  type="button"
                  aria-pressed={on}
                  aria-disabled={full || disabled || undefined}
                  data-testid={`favourite-${example.key}`}
                  onClick={() => toggle(example.key)}
                  className={on || full ? undefined : 'hov-blue-border'}
                  style={{
                    fontFamily: 'inherit',
                    cursor: full || disabled ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 12px 7px 8px',
                    borderRadius: 10,
                    border: `1.5px solid ${on ? BLUE : BORDER}`,
                    background: on ? '#EEF3FF' : '#ffffff',
                    color: INK,
                    fontSize: 13.5,
                    fontWeight: 600,
                    opacity: full ? 0.55 : 1,
                  }}
                >
                  <span aria-hidden style={badge(on)}>
                    {on ? rank + 1 : ''}
                  </span>
                  {name(example)}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginBottom: 8 }}>{title}</div>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
        {Array.from({ length: rule.count }, (_, i) => {
          const example = settled || i < favourites.length ? chosen[i] : undefined;
          return (
            <li key={i} data-testid={`proposal-example-${i + 1}`} style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontSize: 14, lineHeight: 1.45 }}>
              <span aria-hidden style={{ ...badge(!!example), alignSelf: 'center' }}>
                {i + 1}
              </span>
              <span style={{ color: '#4A5872' }}>
                {t('proposal', { n: i + 1 })}:{' '}
                <strong style={{ color: example ? INK : MUTED, fontWeight: example ? 700 : 600 }}>{example ? name(example) : t('notChosen')}</strong>
              </span>
            </li>
          );
        })}
      </ol>
      {errors.map((e, i) => (
        <div key={i} role="alert" data-testid={`err-${field.id}`} style={errorStyle}>
          {errorText(te, e, answers, locale)}
        </div>
      ))}
    </div>
  );
}
