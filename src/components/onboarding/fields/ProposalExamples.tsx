'use client';

import { useTranslations } from 'next-intl';
import { BLUE, BORDER, INK, MUTED } from '@/components/funnel/ui';
import type { Locale } from '@/lib/types';
import type { FieldError } from '@/lib/onboarding/logic';
import { chosenExamples, type ChosenExample } from '@/lib/onboarding/examples';
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

/**
 * Under the three example questions: which example each proposal is based on, in the order the
 * team will use them, and what is still missing. The form asks for exactly `count` examples.
 */
export function ProposalExamples({
  field,
  fields,
  answers,
  fileCounts,
  errors,
  locale,
}: {
  field: OnbField;
  fields: OnbField[];
  answers: Answers;
  fileCounts: Record<string, number>;
  errors: FieldError[];
  locale: Locale;
}) {
  const t = useTranslations('onboarding.fields.examples');
  const te = useTranslations('onboarding.errors');
  const rule = field.config.proposal_examples!;
  const chosen = chosenExamples(rule, answers, fileCounts);
  const picker = fields.find((f) => f.id === rule.picks);
  const title = loc(field as unknown as Record<string, unknown>, 'label', locale) || t('title');

  const name = (example: ChosenExample) => {
    if (example.kind === 'library') {
      const option = picker?.options.find((o) => o.value === example.value);
      return option ? loc(option as unknown as Record<string, unknown>, 'label', locale) : example.value;
    }
    if (example.kind === 'link') return t('link', { site: domainOf(example.url) });
    return t('pictures', { n: example.count });
  };

  return (
    <div
      data-field={field.id}
      data-testid="proposal-examples"
      data-invalid={errors.length ? 'true' : undefined}
      style={{ background: '#F5F7FB', border: `1px solid ${errors.length ? '#F3B8B2' : '#E4E9F2'}`, borderRadius: 12, padding: '14px 16px' }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginBottom: 8 }}>{title}</div>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
        {Array.from({ length: rule.count }, (_, i) => {
          const example = chosen[i];
          return (
            <li key={i} data-testid={`proposal-example-${i + 1}`} style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontSize: 14, lineHeight: 1.45 }}>
              <span
                aria-hidden
                style={{
                  flex: 'none',
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  border: `1.5px solid ${example ? BLUE : BORDER}`,
                  background: example ? BLUE : '#ffffff',
                  color: example ? '#ffffff' : MUTED,
                  fontSize: 12,
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  alignSelf: 'center',
                }}
              >
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
