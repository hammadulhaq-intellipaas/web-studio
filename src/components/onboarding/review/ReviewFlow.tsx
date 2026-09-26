'use client';

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import type { Locale } from '@/lib/types';
import { stripDashes } from '@/lib/onboarding/guardrails';
import { textFor } from '@/lib/onboarding/texts';
import { loc } from '@/lib/onboarding/types';
import type { Answer, OnboardingBrief, OnboardingDefinition, OnboardingFormRecord } from '@/lib/onboarding/types';
import { BODY, BORDER, gradButton, MUTED } from '@/components/funnel/ui';
import type { PublicFile } from '../fields/UploadInput';
import { DANGER } from '../fields/styles';
import { FollowupExchange } from './FollowupExchange';
import { ConfirmScreen } from './ConfirmScreen';
import { UnderstoodStep } from './UnderstoodStep';
import { DoneScreen } from './DoneScreen';
import { IssueSummary, useReviewIssues, useServerFields } from './IssueSummary';

export interface ReviewFlowProps {
  definition: OnboardingDefinition;
  record: OnboardingFormRecord;
  setRecord: Dispatch<SetStateAction<OnboardingFormRecord>>;
  files: PublicFile[];
  brief: OnboardingBrief | null;
  setBrief: Dispatch<SetStateAction<OnboardingBrief | null>>;
  locale: Locale;
  onBackToForm: () => void;
  /** Opens one question's screen from the review (fix mode), scrolled to the question. */
  onJumpToScreen: (screenId: string, fieldId?: string) => void;
  onChange: (key: string, answer: Answer | null) => void;
  flush: () => Promise<void>;
}

/**
 * The closing node: gap check → follow-ups → brief → confirm → done, driven by the
 * record's status. This file holds the entry screen (are all screens complete?) and
 * dispatches to the status-specific screens.
 */
export function ReviewFlow(props: ReviewFlowProps) {
  const { record } = props;
  if (record.status === 'in_progress') return <ReadyCheck {...props} />;
  if (record.status === 'review') return <ReviewStage {...props} />;
  if (record.status === 'brief') return <BriefStage {...props} />;
  return (
    <DoneScreen definition={props.definition} record={record} setRecord={props.setRecord} locale={props.locale} />
  );
}

/**
 * Step 10: the client checks their answers and reads back what we understood, then
 * confirms. The written brief is still produced at this point (`BriefLoader`) because the
 * team works from it, but the client is never asked to read a document a model wrote.
 */
function BriefStage(props: ReviewFlowProps) {
  const { definition, record, setRecord, brief, files, locale, onJumpToScreen, onChange, flush } = props;
  const [confirming, setConfirming] = useState(false);
  if (!brief) return <BriefLoader {...props} />;
  if (confirming) {
    return (
      <ConfirmScreen
        definition={definition}
        record={record}
        setRecord={setRecord}
        files={files}
        locale={locale}
        onBack={() => setConfirming(false)}
        onJumpToScreen={onJumpToScreen}
      />
    );
  }
  return (
    <UnderstoodStep
      definition={definition}
      record={record}
      files={files}
      locale={locale}
      onJumpToScreen={onJumpToScreen}
      onChange={onChange}
      // The verdict is still sitting in the autosave queue. The confirm screen writes with
      // the revision it was handed, so that save has to land before we move on.
      onConfirm={async () => {
        await flush();
        setConfirming(true);
      }}
    />
  );
}

/** A resumed form in `brief` status whose brief did not come with the page — fetch it. */
function BriefLoader({ record, setRecord, setBrief }: ReviewFlowProps) {
  const t = useTranslations('onboarding.brief');
  const [error, setError] = useState(false);
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void fetch(`/api/onboarding/${record.id}/brief`, { method: 'POST' })
      .then(async (res) => {
        const body = (await res.json()) as { record?: OnboardingFormRecord; brief?: OnboardingBrief | null };
        if (!res.ok || !body.record || !body.brief) throw new Error(String(res.status));
        setBrief(body.brief);
        setRecord(body.record);
      })
      .catch(() => setError(true));
  }, [record.id, setBrief, setRecord]);
  return (
    <section data-screen="onb-brief-loading" style={{ paddingBottom: 72 }}>
      <div style={{ background: '#ffffff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, color: error ? DANGER : MUTED, fontSize: 14, fontWeight: 600 }}>
        {error ? t('error') : t('writing')}
      </div>
    </section>
  );
}

/** Follow-ups until the queue drains, then the hand-off to the brief writer. */
function ReviewStage({ definition, record, setRecord, locale, setBrief }: ReviewFlowProps) {
  const tb = useTranslations('onboarding.brief');
  const [continuing, setContinuing] = useState(false);
  const [error, setError] = useState(false);

  const toBrief = async () => {
    setContinuing(true);
    setError(false);
    try {
      const res = await fetch(`/api/onboarding/${record.id}/brief`, { method: 'POST' });
      const body = (await res.json()) as { record?: OnboardingFormRecord; brief?: OnboardingBrief | null };
      if (!res.ok || !body.record) throw new Error(String(res.status));
      setBrief(body.brief ?? null);
      setRecord(body.record);
    } catch {
      setError(true);
    } finally {
      setContinuing(false);
    }
  };

  return (
    <>
      <FollowupExchange definition={definition} record={record} setRecord={setRecord} locale={locale} onContinue={() => void toBrief()} continuing={continuing} />
      {error && (
        <div role="alert" style={{ marginTop: -56, marginBottom: 56, fontSize: 13, fontWeight: 600, color: DANGER }}>
          {tb('error')}
        </div>
      )}
    </>
  );
}

function ReadyCheck({ definition, record, files, locale, onJumpToScreen, flush, setRecord }: ReviewFlowProps) {
  const t = useTranslations('onboarding.review');
  const ts = useTranslations('onboarding.shell');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [serverFields, setServerFields] = useServerFields(record.answers);
  const summaryRef = useRef<HTMLDivElement>(null);
  const issues = useReviewIssues(definition, record.answers, files, locale, serverFields);

  const intro = textFor(definition.texts, 'review_intro', locale);
  const reviewScreen = definition.screens.find((s) => s.kind === 'review');

  const showSummary = () => {
    setBlocked(true);
    requestAnimationFrame(() => {
      summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      summaryRef.current?.focus({ preventScroll: true });
    });
  };

  // Never a dead button: with answers still open, a click shows exactly which ones.
  const start = async () => {
    if (issues.length) return showSummary();
    setStarting(true);
    setError(false);
    try {
      await flush();
      const res = await fetch(`/api/onboarding/${record.id}/review`, { method: 'POST' });
      if (res.status === 422) {
        const body = (await res.json().catch(() => ({}))) as { fields?: string[] };
        setServerFields(body.fields ?? []);
        showSummary();
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { record: OnboardingFormRecord };
      setRecord(body.record);
    } catch {
      setError(true);
    } finally {
      setStarting(false);
    }
  };

  return (
    <section data-screen="onb-review-ready" className="onb-reveal" style={{ paddingBottom: 72 }}>
      <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.8, margin: '0 0 8px' }}>
        {reviewScreen ? loc(reviewScreen as unknown as Record<string, unknown>, 'title', locale) : t('title')}
      </h2>
      {intro && (
        <div className="onb-markdown" style={{ fontSize: 15.5, color: BODY, margin: '0 0 24px', lineHeight: 1.55 }}>
          <ReactMarkdown>{stripDashes(intro.content_markdown)}</ReactMarkdown>
        </div>
      )}

      <IssueSummary
        ref={summaryRef}
        issues={issues}
        definition={definition}
        answers={record.answers}
        locale={locale}
        onOpen={onJumpToScreen}
        blockedNote={blocked ? t('issuesButton') : null}
      />

      {error && <div role="alert" style={{ fontSize: 13, fontWeight: 600, color: DANGER, marginBottom: 14 }}>{t('startError')}</div>}

      <button
        type="button"
        data-testid="onb-start-review"
        onClick={() => void start()}
        disabled={starting}
        className="hov-lift1"
        style={{
          ...gradButton,
          borderRadius: 12,
          padding: '15px 34px',
          fontSize: 15.5,
          fontWeight: 700,
          boxShadow: '0 10px 22px -8px rgba(30,79,214,.5)',
          opacity: starting ? 0.7 : 1,
        }}
      >
        {starting ? t('checking') : ts('toReview')}
      </button>
    </section>
  );
}
