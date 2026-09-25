'use client';

import { forwardRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/types';
import { fieldLabel, validateAll, type FieldError, type FileCounts } from '@/lib/onboarding/logic';
import { stripDashes } from '@/lib/onboarding/guardrails';
import { loc, type Answers, type OnbField, type OnboardingDefinition } from '@/lib/onboarding/types';
import { BLUE, BODY, INK, MUTED } from '@/components/funnel/ui';
import { DANGER } from '../fields/styles';
import { errorText } from '../fields/errorText';

export interface ReviewIssue {
  field: OnbField;
  screenId: string;
  error: FieldError | null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Every answer that would stop the review, one per question, in form order. `extra` adds
 * questions the server named that the browser did not flag itself (a definition changed
 * underneath an open tab), so the client is never told "something is wrong" without what.
 */
export function useReviewIssues(
  definition: OnboardingDefinition,
  answers: Answers,
  files: { field_key: string | null }[],
  locale: Locale,
  extra: string[] = [],
): ReviewIssue[] {
  return useMemo(() => {
    const counts: FileCounts = {};
    for (const f of files) if (f.field_key) counts[f.field_key] = (counts[f.field_key] ?? 0) + 1;
    const errors = validateAll(definition, answers, counts, todayIso(), locale);
    const byField = new Map<string, FieldError | null>();
    for (const e of errors) if (!byField.has(e.field)) byField.set(e.field, e);
    for (const key of extra) if (!byField.has(key)) byField.set(key, null);
    return definition.fields
      .filter((f) => byField.has(f.id))
      .map((f) => ({ field: f, screenId: f.screen_id, error: byField.get(f.id) ?? null }));
  }, [definition, answers, files, locale, extra]);
}

/**
 * "3 answers need your attention": the error summary at the top of the review (GOV.UK
 * pattern). Grouped by step, each line names the question and what is wrong, in the same
 * words as the message beside the question, and opens that exact question. It takes
 * focus when shown after a click, so keyboard and screen-reader users land on it too.
 */
export const IssueSummary = forwardRef<HTMLDivElement, {
  issues: ReviewIssue[];
  definition: OnboardingDefinition;
  answers: Answers;
  locale: Locale;
  onOpen: (screenId: string, fieldId: string) => void;
  /** Shown under the list after the client tried to continue. */
  blockedNote?: string | null;
}>(function IssueSummary({ issues, definition, answers, locale, onOpen, blockedNote }, ref) {
  const t = useTranslations('onboarding.review');
  const te = useTranslations('onboarding.errors');
  if (!issues.length) return null;

  const screens = definition.screens.filter((s) => issues.some((i) => i.screenId === s.id));

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      data-testid="onb-issues"
      data-count={issues.length}
      style={{
        background: '#ffffff',
        border: `2px solid ${DANGER}`,
        borderRadius: 16,
        padding: '20px 22px',
        marginBottom: 22,
        outline: 'none',
      }}
    >
      <h3 style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3, color: INK, margin: '0 0 4px' }}>{t('issuesTitle', { n: issues.length })}</h3>
      <p style={{ fontSize: 14, color: BODY, margin: '0 0 14px', lineHeight: 1.5 }}>{t('issuesHelp')}</p>
      <div style={{ display: 'grid', gap: 14 }}>
        {screens.map((screen) => (
          <div key={screen.id}>
            <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: MUTED, marginBottom: 6 }}>
              {loc(screen as unknown as Record<string, unknown>, 'title', locale)}
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
              {issues
                .filter((i) => i.screenId === screen.id)
                .map((issue) => (
                  <li key={issue.field.id}>
                    <button
                      type="button"
                      data-testid={`onb-issue-${issue.field.id}`}
                      onClick={() => onOpen(issue.screenId, issue.field.id)}
                      className="hov-blue-text"
                      style={{
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        background: '#FFF6F5',
                        border: '1px solid #F4D2CE',
                        borderRadius: 10,
                        padding: '9px 12px',
                        display: 'flex',
                        gap: 12,
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: INK }}>{stripDashes(fieldLabel(issue.field, locale))}</span>
                        <span style={{ display: 'block', fontSize: 13, color: DANGER, marginTop: 2, lineHeight: 1.4 }}>
                          {issue.error ? errorText(te, issue.error, answers, locale) : te('required')}
                        </span>
                      </span>
                      <span style={{ flex: 'none', fontSize: 13, fontWeight: 700, color: BLUE }}>{t('answersFix')} →</span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
      {blockedNote && (
        <div data-testid="onb-issues-blocked" style={{ marginTop: 14, fontSize: 13, fontWeight: 700, color: DANGER }}>
          {blockedNote}
        </div>
      )}
    </div>
  );
});
