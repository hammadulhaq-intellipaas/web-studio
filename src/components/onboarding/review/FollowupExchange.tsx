'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import type { Locale } from '@/lib/types';
import { clientValue } from '@/lib/onboarding/export';
import { currentQuestion, replyLabel } from '@/lib/onboarding/followups/queue';
import { stripDashes } from '@/lib/onboarding/guardrails';
import { textFor } from '@/lib/onboarding/texts';
import { cap, loc } from '@/lib/onboarding/types';
import type { OnboardingDefinition, OnboardingFormRecord, ReviewQuestion } from '@/lib/onboarding/types';
import { BLUE, BODY, BORDER, gradButton, INK, MUTED } from '@/components/funnel/ui';
import { DANGER, inputStyle, pillStyle } from '../fields/styles';

/**
 * The guided exchange (spec §06, Job 2): one question at a time, quick replies where the
 * answer is a choice, a text field where it isn't, and Skip on every question. Answers go
 * straight back into the structured record; the server rebuilds the pending questions
 * after each one, so chained follow-ups appear immediately.
 */
export function FollowupExchange({
  definition,
  record,
  setRecord,
  locale,
  onContinue,
  continuing,
}: {
  definition: OnboardingDefinition;
  record: OnboardingFormRecord;
  setRecord: Dispatch<SetStateAction<OnboardingFormRecord>>;
  locale: Locale;
  onContinue: () => void;
  continuing: boolean;
}) {
  const t = useTranslations('onboarding.review');
  const review = record.review;
  const question = currentQuestion(review);

  const reviewScreen = definition.screens.find((s) => s.kind === 'review');
  const title = reviewScreen ? loc(reviewScreen as unknown as Record<string, unknown>, 'title', locale) : t('title');
  const total = review?.queue.length ?? 0;
  const asked = review?.history.length ?? 0;
  const skipped = review?.history.filter((h) => h.skipped).length ?? 0;
  const answered = asked - skipped;

  if (!question) {
    const doneText = textFor(definition.texts, 'review_nothing', locale);
    // Honest about what happened: skipped questions are not "answered".
    const summary = !asked ? doneText?.title : skipped === 0 ? t('done') : answered === 0 ? t('doneSkipped') : t('doneMixed', { answered, skipped });
    return (
      <section data-screen="onb-review-done" className="onb-reveal" style={{ paddingBottom: 72 }}>
        <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.8, margin: '0 0 8px' }}>{title}</h2>
        <div style={{ background: '#ffffff', border: `1px solid ${BORDER}`, borderRadius: 18, padding: '26px 28px', maxWidth: 680 }}>
          <div data-testid="onb-followups-summary" style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 15, fontWeight: 700, color: skipped && !answered ? INK : '#1E6E44', marginBottom: 10, lineHeight: 1.45 }}>
            <span aria-hidden>✓</span> <span>{summary}</span>
          </div>
          {!asked && doneText && (
            <div className="onb-markdown" style={{ fontSize: 14.5, color: BODY, lineHeight: 1.55 }}>
              <ReactMarkdown>{stripDashes(doneText.content_markdown)}</ReactMarkdown>
            </div>
          )}
          <button
            type="button"
            data-testid="onb-to-brief"
            onClick={onContinue}
            disabled={continuing}
            className="hov-lift1"
            style={{ ...gradButton, marginTop: 18, borderRadius: 12, padding: '14px 30px', fontSize: 15, fontWeight: 700, opacity: continuing ? 0.7 : 1 }}
          >
            {continuing ? t('checking') : t('toBrief')}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section data-screen="onb-review" className="onb-reveal" style={{ paddingBottom: 72 }}>
      <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.8, margin: '0 0 8px' }}>{title}</h2>
      <p style={{ fontSize: 15.5, color: BODY, margin: '0 0 24px', maxWidth: 680, lineHeight: 1.55 }}>
        <strong style={{ color: INK }}>{t('title')}.</strong> {t('followupsOptional')}
      </p>

      {/* Keyed by question id so the draft answer and error reset with every new question. */}
      <QuestionCard key={question.id} question={question} definition={definition} record={record} setRecord={setRecord} locale={locale} total={total} />

      {review && review.history.length > 0 && <History review={review} locale={locale} definition={definition} />}
    </section>
  );
}

function QuestionCard({
  question,
  definition,
  record,
  setRecord,
  locale,
  total,
}: {
  question: ReviewQuestion;
  definition: OnboardingDefinition;
  record: OnboardingFormRecord;
  setRecord: Dispatch<SetStateAction<OnboardingFormRecord>>;
  locale: Locale;
  total: number;
}) {
  const t = useTranslations('onboarding.review');
  const review = record.review;
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const send = async (answer: string | null) => {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/onboarding/${record.id}/followups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: question.id, answer }),
      });
      const body = (await res.json()) as { record?: OnboardingFormRecord };
      if (!res.ok || !body.record) throw new Error(String(res.status));
      setRecord(body.record);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const targetField = question.target ? definition.fields.find((f) => f.id === question.target!.field) : undefined;
  const subField = question.target?.sub ? (targetField?.config.fields ?? []).find((s) => s.key === question.target!.sub) : undefined;
  const choiceOnly =
    question.mode === 'acknowledge' ||
    (question.target ? (subField ? subField.type === 'select' : targetField?.type === 'radio' || targetField?.type === 'select') : question.quick_replies.length > 0);
  const contextLabel = targetField ? (subField ? (locale === 'de' ? subField.label_de : subField.label_en) : loc(targetField as unknown as Record<string, unknown>, 'label', locale)) : null;
  // What they wrote, so the question is never asked about an answer they cannot see.
  const current = targetField && !subField ? clientValue(targetField, record.answers[targetField.id], locale) : '';

  return (
      <div
        data-testid="onb-followup"
        data-question-id={question.id}
        style={{ background: '#ffffff', border: `1px solid ${BORDER}`, borderRadius: 18, padding: '26px 28px', maxWidth: 680 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span data-testid="onb-followup-progress" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: MUTED }}>
            {t('questionOf', { num: (review?.cursor ?? 0) + 1, total })}
          </span>
        </div>
        {contextLabel && (
          <div data-testid="onb-followup-context" style={{ background: '#F5F7FB', borderRadius: 12, padding: '10px 13px', marginBottom: 16, fontSize: 13, lineHeight: 1.5, color: BODY }}>
            <div>
              {t('aboutAnswer')} <strong style={{ color: BLUE }}>{stripDashes(contextLabel)}</strong>
            </div>
            {current && (
              <div style={{ marginTop: 4, color: MUTED, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                {t('youWrote')}: {locale === 'de' ? '„' : '“'}
                {stripDashes(current).slice(0, 280)}
                {locale === 'de' ? '“' : '”'}
              </div>
            )}
          </div>
        )}
        <p data-testid="onb-followup-question" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.4, color: INK, margin: '0 0 18px' }}>
          {stripDashes(cap(question.question, locale))}
        </p>

        {question.quick_replies.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: choiceOnly ? 0 : 14 }}>
            {question.quick_replies.map((reply) => (
              <button
                key={reply.value}
                type="button"
                data-testid={`onb-reply-${reply.value}`}
                disabled={busy}
                onClick={() => void send(reply.value)}
                className="hov-blue-border"
                style={pillStyle(false)}
              >
                {stripDashes(replyLabel(question, reply.value, locale, targetField))}
              </button>
            ))}
          </div>
        )}

        {!choiceOnly && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <textarea
              autoFocus
              data-testid="onb-followup-answer"
              value={text}
              rows={3}
              placeholder={t('answerPlaceholder')}
              onChange={(ev) => setText(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey) && text.trim()) void send(text.trim());
              }}
              style={inputStyle(false, { resize: 'vertical', lineHeight: 1.5 })}
            />
            <div>
              <button
                type="button"
                data-testid="onb-followup-send"
                disabled={busy || !text.trim()}
                onClick={() => void send(text.trim())}
                className="hov-lift1"
                style={{ ...gradButton, borderRadius: 11, padding: '12px 22px', fontSize: 14.5, fontWeight: 700, opacity: busy || !text.trim() ? 0.6 : 1 }}
              >
                {t('send')}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div role="alert" style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: DANGER }}>
            {t('error')}
          </div>
        )}

        {question.mode !== 'acknowledge' && (
          <div style={{ marginTop: 16, borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
            <button
              type="button"
              data-testid="onb-followup-skip"
              disabled={busy}
              onClick={() => void send(null)}
              className="hov-blue-text"
              style={{ fontFamily: 'inherit', cursor: 'pointer', background: 'none', border: 'none', padding: 0, color: MUTED, fontSize: 13.5, fontWeight: 600 }}
            >
              {t('skip')} →
            </button>
          </div>
        )}
      </div>
  );
}

function History({ review, locale, definition }: { review: NonNullable<OnboardingFormRecord['review']>; locale: Locale; definition: OnboardingDefinition }) {
  const t = useTranslations('onboarding.review');
  return (
    <ol style={{ listStyle: 'none', margin: '18px 0 0', padding: 0, maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {review.history
        .slice()
        .reverse()
        .slice(0, 5)
        .map((h) => {
          const q = review.queue.find((x) => x.id === h.question_id) as ReviewQuestion | undefined;
          const field = h.target ? definition.fields.find((f) => f.id === h.target!.field) : undefined;
          const shown = h.skipped ? t('skip') : q && h.answer ? replyLabel(q, h.answer, locale, field) : h.answer;
          return (
            <li key={h.question_id} style={{ fontSize: 12.5, color: MUTED, background: '#F5F7FB', borderRadius: 10, padding: '8px 12px', display: 'flex', gap: 10 }}>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stripDashes(cap(h.question, locale))}</span>
              <span style={{ fontWeight: 700, color: h.skipped ? MUTED : INK, flex: 'none', maxWidth: '40%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shown}</span>
            </li>
          );
        })}
    </ol>
  );
}
