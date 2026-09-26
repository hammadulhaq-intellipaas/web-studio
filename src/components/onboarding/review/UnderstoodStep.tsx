'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import type { Locale } from '@/lib/types';
import { clientValue } from '@/lib/onboarding/export';
import { stripDashes } from '@/lib/onboarding/guardrails';
import { isRequiredNow, visibility, type FileCounts } from '@/lib/onboarding/logic';
import { understoodText } from '@/lib/onboarding/understood';
import { loc, type Answer, type CompletenessReport, type OnboardingDefinition, type OnboardingFormRecord } from '@/lib/onboarding/types';
import { BLUE, BODY, BORDER, gradButton, INK, MUTED } from '@/components/funnel/ui';
import { DANGER, inputStyle, pillStyle } from '../fields/styles';
import type { PublicFile } from '../fields/UploadInput';
import { errorText } from '../fields/errorText';
import { IssueSummary, useReviewIssues } from './IssueSummary';
import { ReportCard } from './ReportCard';

const card = { background: '#ffffff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: '22px 24px' } as const;

const linkButton = {
  fontFamily: 'inherit',
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  padding: 0,
  fontSize: 12.5,
  fontWeight: 700,
} as const;

/**
 * The final review (spec step 10, blocks 1 and 2): anything that must be corrected first,
 * then what would make the brief stronger, every answer by section with a Change link on
 * each, and the read-back of what we understood. Every link opens that exact question and
 * the screen offers the way straight back here. The read-back is assembled from the
 * client's own words (`understoodText`), never written by a model.
 */
export function UnderstoodStep({
  definition,
  record,
  files,
  locale,
  onJumpToScreen,
  onChange,
  onConfirm,
}: {
  definition: OnboardingDefinition;
  record: OnboardingFormRecord;
  files: PublicFile[];
  locale: Locale;
  onJumpToScreen: (screenId: string, fieldId?: string) => void;
  onChange: (key: string, answer: Answer | null) => void;
  onConfirm: () => void | Promise<void>;
}) {
  const t = useTranslations('onboarding.review');
  const te = useTranslations('onboarding.errors');
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [report, setReport] = useState<CompletenessReport | null>(record.review?.report ?? null);
  const [reportLoading, setReportLoading] = useState(false);
  const askedFor = useRef<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const verdictRef = useRef<HTMLDivElement>(null);

  // Fetched once per visit to this screen, not per revision: the read-back writes answers
  // of its own and must not trigger a rebuild. Going back to a screen unmounts this step,
  // so returning re-asks and picks up any edit. A failure is silent: the report tells the
  // client what is still open, it does not gate anything.
  useEffect(() => {
    if (askedFor.current === record.id) return;
    askedFor.current = record.id;
    setReportLoading(true);
    void fetch(`/api/onboarding/${record.id}/report`, { method: 'POST' })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { report?: CompletenessReport } | null) => {
        if (body?.report) setReport(body.report);
      })
      .catch(() => undefined)
      .finally(() => setReportLoading(false));
  }, [record.id, record.rev]);

  const issues = useReviewIssues(definition, record.answers, files, locale);
  const issueByField = useMemo(() => new Map(issues.map((i) => [i.field.id, i])), [issues]);
  // Required gaps are listed in the summary above, so the report keeps to what is optional.
  const optionalReport = useMemo(
    () => (report ? { ...report, items: report.items.filter((item) => !issueByField.has(item.field)) } : null),
    [report, issueByField],
  );

  const verdict = typeof record.answers.understood_ok?.v === 'string' ? record.answers.understood_ok.v : null;
  const corrections = typeof record.answers.understood_corrections?.v === 'string' ? record.answers.understood_corrections.v : '';

  const counts = useMemo<FileCounts>(() => {
    const c: FileCounts = {};
    for (const f of files) if (f.field_key) c[f.field_key] = (c[f.field_key] ?? 0) + 1;
    return c;
  }, [files]);

  const sections = useMemo(() => {
    const { visible } = visibility(definition.fields, record.answers, locale);
    const ctx = { answers: record.answers, files: counts, fields: definition.fields };
    return definition.screens
      .filter((s) => s.kind === 'questions')
      .map((screen) => ({
        screen,
        rows: visible
          .filter((f) => f.screen_id === screen.id && f.type !== 'notice')
          .map((f) => ({
            field: f,
            label: stripDashes(loc(f as unknown as Record<string, unknown>, 'label', locale)),
            value: stripDashes(clientValue(f, record.answers[f.id], locale, files)),
            required: isRequiredNow(f, ctx),
          })),
      }));
  }, [definition, record.answers, files, counts, locale]);

  const readBack = useMemo(() => understoodText(definition, record.answers, locale), [definition, record.answers, locale]);

  const focus = (el: HTMLElement | null) =>
    requestAnimationFrame(() => {
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el?.focus({ preventScroll: true });
    });

  const submit = async () => {
    if (issues.length) {
      setBlocked(true);
      focus(summaryRef.current);
      return;
    }
    if (!verdict || (verdict !== 'yes' && !corrections.trim())) {
      setError(true);
      focus(verdictRef.current);
      return;
    }
    setSaving(true);
    try {
      await onConfirm();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section data-screen="onb-understood" style={{ paddingBottom: 72, display: 'grid', gap: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.8, margin: '0 0 6px' }}>{t('answersTitle')}</h2>
          <p style={{ fontSize: 15, color: BODY, margin: 0, lineHeight: 1.5 }}>{t('answersHelp')}</p>
        </div>
        <a
          href={`/api/onboarding/${record.id}/answers-pdf`}
          data-testid="onb-answers-pdf"
          className="hov-blue-border"
          style={{ fontSize: 13.5, fontWeight: 700, color: BLUE, textDecoration: 'none', border: `1.5px solid ${BORDER}`, background: '#ffffff', borderRadius: 11, padding: '10px 16px', whiteSpace: 'nowrap' }}
        >
          ⤓ {t('downloadAnswers')}
        </a>
      </div>

      <IssueSummary
        ref={summaryRef}
        issues={issues}
        definition={definition}
        answers={record.answers}
        locale={locale}
        onOpen={onJumpToScreen}
        blockedNote={blocked ? t('issuesButton') : null}
      />

      <ReportCard report={optionalReport} loading={reportLoading} locale={locale} onJumpToScreen={onJumpToScreen} />

      <div style={card} data-testid="onb-answer-check">
        {sections.map(({ screen, rows }) =>
          rows.length === 0 ? null : (
            <div key={screen.id} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 8, borderBottom: `1px solid ${BORDER}`, paddingBottom: 6 }}>
                <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: MUTED, margin: 0 }}>
                  {loc(screen as unknown as Record<string, unknown>, 'title', locale)}
                </h3>
                <button type="button" onClick={() => onJumpToScreen(screen.id)} data-testid={`onb-edit-${screen.id}`} className="hov-blue-text" style={{ ...linkButton, color: BLUE }}>
                  {t('answersEdit')}
                </button>
              </div>
              <dl style={{ margin: 0, display: 'grid', gap: 8 }}>
                {rows.map((row) => {
                  const issue = issueByField.get(row.field.id);
                  const empty = !row.value;
                  return (
                    <div key={row.field.id} className="onb-kv" data-testid={`onb-row-${row.field.id}`} data-state={issue ? 'error' : empty ? 'empty' : 'ok'} style={{ fontSize: 13.5 }}>
                      <dt style={{ color: MUTED }}>{row.label}</dt>
                      <dd style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: issue ? DANGER : empty ? MUTED : INK }}>
                        {issue
                          ? issue.error
                            ? errorText(te, issue.error, record.answers, locale)
                            : te('required')
                          : empty
                            ? row.required
                              ? te('required')
                              : t('answersNotProvided')
                            : row.value}
                      </dd>
                      <dd style={{ margin: 0, textAlign: 'right' }}>
                        <button
                          type="button"
                          data-testid={`onb-change-${row.field.id}`}
                          onClick={() => onJumpToScreen(row.field.screen_id, row.field.id)}
                          className="hov-blue-text"
                          style={{ ...linkButton, color: issue ? DANGER : BLUE }}
                        >
                          {issue ? t('answersFix') : empty ? t('answersAdd') : t('answersEditOne')}
                        </button>
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ),
        )}
      </div>

      <div style={card} data-testid="onb-understood" ref={verdictRef} tabIndex={-1}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, margin: '0 0 10px' }}>{t('understoodTitle')}</h2>
        <div className="onb-prose" style={{ fontSize: 15, lineHeight: 1.65, color: INK }}>
          <ReactMarkdown>{readBack}</ReactMarkdown>
        </div>

        <div style={{ marginTop: 20, borderTop: `1px solid ${BORDER}`, paddingTop: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
            {t('understoodRight')}
            <span style={{ color: DANGER }}> *</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(['yes', 'mostly', 'no'] as const).map((value) => (
              <button
                key={value}
                type="button"
                data-testid={`onb-understood-${value}`}
                onClick={() => {
                  setError(false);
                  onChange('understood_ok', { v: value });
                }}
                style={pillStyle(verdict === value)}
              >
                {t(value === 'yes' ? 'understoodYes' : value === 'mostly' ? 'understoodMostly' : 'understoodNo')}
              </button>
            ))}
          </div>

          {verdict && verdict !== 'yes' && (
            <div style={{ marginTop: 16 }}>
              <label htmlFor="onb-corrections" style={{ display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                {t('understoodCorrections')}
                <span style={{ color: DANGER }}> *</span>
              </label>
              <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 8 }}>{t('understoodCorrectionsHelp')}</div>
              <textarea
                id="onb-corrections"
                data-testid="onb-corrections"
                rows={4}
                value={corrections}
                placeholder={t('understoodCorrectionsPlaceholder')}
                onChange={(ev) => {
                  setError(false);
                  onChange('understood_corrections', ev.target.value ? { v: ev.target.value } : null);
                }}
                style={inputStyle(false, { resize: 'vertical' })}
              />
            </div>
          )}

          {error && (
            <div role="alert" data-testid="onb-understood-error" style={{ fontSize: 12.5, fontWeight: 600, color: DANGER, marginTop: 10 }}>
              {verdict ? t('understoodRequired') : t('understoodRight')}
            </div>
          )}
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving}
          data-testid="onb-to-confirm"
          className="hov-lift1"
          style={{ ...gradButton, borderRadius: 12, padding: '14px 28px', fontSize: 15, fontWeight: 700, opacity: saving ? 0.7 : 1 }}
        >
          {t('toConfirm')}
        </button>
      </div>
    </section>
  );
}
