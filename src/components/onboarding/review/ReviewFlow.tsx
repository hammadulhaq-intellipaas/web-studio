'use client';

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import type { Locale } from '@/lib/types';
import { validateAll } from '@/lib/onboarding/logic';
import { textFor } from '@/lib/onboarding/texts';
import { loc } from '@/lib/onboarding/types';
import type { OnboardingBrief, OnboardingDefinition, OnboardingFormRecord } from '@/lib/onboarding/types';
import { BLUE, BODY, BORDER, gradButton, INK, MUTED } from '@/components/funnel/ui';
import type { PublicFile } from '../fields/UploadInput';
import { DANGER } from '../fields/styles';
import { FollowupExchange } from './FollowupExchange';
import { BriefEditor } from '../brief/BriefEditor';
import { ConfirmScreen } from './ConfirmScreen';
import { DoneScreen } from './DoneScreen';

export interface ReviewFlowProps {
  definition: OnboardingDefinition;
  record: OnboardingFormRecord;
  setRecord: Dispatch<SetStateAction<OnboardingFormRecord>>;
  files: PublicFile[];
  brief: OnboardingBrief | null;
  setBrief: Dispatch<SetStateAction<OnboardingBrief | null>>;
  locale: Locale;
  onBackToForm: () => void;
  onJumpToScreen: (screenId: string) => void;
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
    <DoneScreen
      definition={props.definition}
      record={record}
      setRecord={props.setRecord}
      brief={props.brief}
      setBrief={props.setBrief}
      locale={props.locale}
    />
  );
}

/** The brief, then (client-side sub-step) the confirmation. */
function BriefStage(props: ReviewFlowProps) {
  const { definition, record, setRecord, brief, setBrief, locale } = props;
  const [confirming, setConfirming] = useState(false);
  if (!brief) return <BriefLoader {...props} />;
  if (confirming) {
    return <ConfirmScreen definition={definition} record={record} setRecord={setRecord} locale={locale} onBack={() => setConfirming(false)} />;
  }
  return (
    <BriefEditor
      definition={definition}
      record={record}
      setRecord={setRecord}
      brief={brief}
      setBrief={setBrief}
      locale={locale}
      onConfirm={() => setConfirming(true)}
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

  const fileCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of files) if (f.field_key) counts[f.field_key] = (counts[f.field_key] ?? 0) + 1;
    return counts;
  }, [files]);

  const incompleteScreens = useMemo(() => {
    const errors = validateAll(definition, record.answers, fileCounts, new Date().toISOString().slice(0, 10), locale);
    const byScreen = new Map<string, number>();
    for (const e of errors) {
      const field = definition.fields.find((f) => f.id === e.field);
      if (field) byScreen.set(field.screen_id, (byScreen.get(field.screen_id) ?? 0) + 1);
    }
    return definition.screens.filter((s) => byScreen.has(s.id)).map((s) => ({ screen: s, count: byScreen.get(s.id)! }));
  }, [definition, record.answers, fileCounts, locale]);

  const intro = textFor(definition.texts, 'review_intro', locale);
  const reviewScreen = definition.screens.find((s) => s.kind === 'review');

  const start = async () => {
    setStarting(true);
    setError(false);
    try {
      await flush();
      const res = await fetch(`/api/onboarding/${record.id}/review`, { method: 'POST' });
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
        <div className="onb-markdown" style={{ fontSize: 15.5, color: BODY, margin: '0 0 24px', maxWidth: 640, lineHeight: 1.55 }}>
          <ReactMarkdown>{intro.content_markdown}</ReactMarkdown>
        </div>
      )}

      {incompleteScreens.length > 0 ? (
        <div data-testid="onb-incomplete" style={{ background: '#ffffff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: '20px 22px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: DANGER, marginBottom: 10 }}>{ts('fixErrors')}</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {incompleteScreens.map(({ screen, count }) => (
              <li key={screen.id}>
                <button
                  type="button"
                  data-testid={`onb-incomplete-${screen.id}`}
                  onClick={() => onJumpToScreen(screen.id)}
                  className="hov-blue-text"
                  style={{ fontFamily: 'inherit', cursor: 'pointer', background: 'none', border: 'none', padding: 0, color: INK, fontSize: 14.5, fontWeight: 700, display: 'flex', gap: 10, alignItems: 'center' }}
                >
                  <span style={{ color: BLUE }}>→</span>
                  {loc(screen as unknown as Record<string, unknown>, 'title', locale)}
                  <span style={{ fontSize: 12, fontWeight: 600, color: MUTED }}>({count})</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error && <div role="alert" style={{ fontSize: 13, fontWeight: 600, color: DANGER, marginBottom: 14 }}>{t('startError')}</div>}

      <button
        type="button"
        data-testid="onb-start-review"
        onClick={() => void start()}
        disabled={starting || incompleteScreens.length > 0}
        className="hov-lift1"
        style={{
          ...gradButton,
          borderRadius: 12,
          padding: '15px 34px',
          fontSize: 15.5,
          fontWeight: 700,
          boxShadow: '0 10px 22px -8px rgba(30,79,214,.5)',
          opacity: starting || incompleteScreens.length > 0 ? 0.6 : 1,
          cursor: incompleteScreens.length > 0 ? 'default' : 'pointer',
        }}
      >
        {starting ? t('checking') : ts('toReview')}
      </button>
    </section>
  );
}

