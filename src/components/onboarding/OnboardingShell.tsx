'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@/lib/types';
import {
  clearHidden,
  isRequiredNow,
  mergePatch,
  validateScreen,
  visibility,
  type FieldError,
  type FileCounts,
} from '@/lib/onboarding/logic';
import { loc } from '@/lib/onboarding/types';
import type { Answer, Answers, OnbField, OnboardingBrief, OnboardingDefinition, OnboardingFormRecord } from '@/lib/onboarding/types';
import { useOnboardingStash } from '@/stores/onboarding';
import { BORDER, gradButton, MUTED } from '@/components/funnel/ui';
import { OnboardingFrame } from './OnboardingFrame';
import { OnboardingHeader } from './OnboardingHeader';
import { ScreenCard } from './ScreenCard';
import { Stepper } from './Stepper';
import { SaveLinkDialog } from './SaveLinkDialog';
import { ReviewFlow } from './review/ReviewFlow';
import type { PublicFile } from './fields/UploadInput';
import { useOnboardingSync, type SaveNotice } from './useOnboardingSync';

export type { PublicFile };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Client root of /onboardingform/<id>. Owns the record, the step, validation and the
 * autosave; hands each screen its visible fields. The review node (gap check → brief →
 * confirm → done) is `ReviewFlow`.
 */
export function OnboardingShell({
  definition,
  initialRecord,
  initialFiles,
  initialBrief,
}: {
  definition: OnboardingDefinition;
  initialRecord: OnboardingFormRecord;
  initialFiles: PublicFile[];
  initialBrief: OnboardingBrief | null;
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations('onboarding.shell');
  const tf = useTranslations('onboarding.fields');

  const [record, setRecord] = useState(initialRecord);
  const [files, setFiles] = useState(initialFiles);
  const [brief, setBrief] = useState(initialBrief);
  const [notice, setNotice] = useState<'redacted' | 'restored' | null>(null);
  const [saveLinkOpen, setSaveLinkOpen] = useState(false);
  const stash = useOnboardingStash();

  const onSaved = useCallback((n: SaveNotice) => {
    if (n.redactions > 0) setNotice('redacted');
  }, []);
  const { status, queue, flush } = useOnboardingSync(record.id, record, setRecord, onSaved);

  /* ---------------------------------------------------------------- steps */

  const steps = useMemo(() => {
    const questions = definition.screens.filter((s) => s.kind === 'questions');
    const review = definition.screens.find((s) => s.kind === 'review');
    return review ? [...questions, review] : questions;
  }, [definition.screens]);

  const reviewIndex = steps.findIndex((s) => s.kind === 'review');

  const [stepIndex, setStepIndex] = useState(() => {
    if (record.status !== 'in_progress' && reviewIndex >= 0) return reviewIndex;
    const saved = steps.findIndex((s) => s.id === record.current_step);
    return saved >= 0 ? saved : 0;
  });
  const [maxReached, setMaxReached] = useState(stepIndex);
  const [showErrors, setShowErrors] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const step = steps[stepIndex];
  const confirmed = record.status === 'confirmed';

  useEffect(() => {
    window.history.replaceState({ onbStep: step?.id }, '');
    const onPop = (ev: PopStateEvent) => {
      const id = (ev.state as { onbStep?: string } | null)?.onbStep;
      const i = steps.findIndex((s) => s.id === id);
      if (i >= 0) setStepIndex(i);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const target = steps[index];
      if (!target) return;
      setStepIndex(index);
      setMaxReached((m) => Math.max(m, index));
      setShowErrors(false);
      queue({ changes: {}, current_step: target.id });
      window.history.pushState({ onbStep: target.id }, '');
      window.scrollTo({ top: 0, behavior: 'instant' });
    },
    [queue, steps],
  );

  /* ---------------------------------------------------------------- answers */

  const fileCounts = useMemo<FileCounts>(() => {
    const counts: FileCounts = {};
    for (const f of files) if (f.field_key) counts[f.field_key] = (counts[f.field_key] ?? 0) + 1;
    return counts;
  }, [files]);

  const { visible } = useMemo(() => visibility(definition.fields, record.answers), [definition.fields, record.answers]);
  const screenFields = useMemo(() => (step ? visible.filter((f) => f.screen_id === step.id) : []), [visible, step]);

  const requiredNow = useCallback(
    (field: OnbField) => isRequiredNow(field, { answers: record.answers, files: fileCounts, fields: definition.fields }),
    [record.answers, fileCounts, definition.fields],
  );

  const setAnswer = useCallback(
    (key: string, answer: Answer | null) => {
      if (confirmed) return;
      const merged = mergePatch(record.answers, { [key]: answer });
      const { answers: cleared, removed } = clearHidden(definition.fields, merged);
      stash.add(record.id, removed);

      // A field that just reappeared gets its stashed value back (up to three levels of reveals).
      const restored: Answers = {};
      let answers = cleared;
      for (let round = 0; round < 3; round++) {
        const { hidden } = visibility(definition.fields, answers);
        let changed = false;
        for (const f of definition.fields) {
          if (hidden.has(f.id) || f.id in answers) continue;
          const back = stash.take(record.id, f.id);
          if (back) {
            restored[f.id] = back;
            answers = { ...answers, [f.id]: back };
            changed = true;
          }
        }
        if (!changed) break;
      }
      if (Object.keys(restored).length) setNotice('restored');

      const changes: Record<string, Answer | null> = { [key]: answer, ...restored };
      for (const removedKey of Object.keys(removed)) if (!(removedKey in restored)) changes[removedKey] = null;

      setRecord((prev) => ({ ...prev, answers }));
      queue({ changes });
    },
    [confirmed, record.answers, record.id, definition, stash, queue],
  );

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Errors are derived, not stored: they follow every edit and every upload while shown.
  const screenErrors = useMemo<FieldError[]>(
    () => (step && step.kind === 'questions' ? validateScreen(definition, step.id, record.answers, fileCounts, todayIso(), locale) : []),
    [definition, step, record.answers, fileCounts, locale],
  );

  const next = () => {
    if (!step) return;
    if (screenErrors.length) {
      setShowErrors(true);
      const first = document.querySelector(`[data-field="${screenErrors[0].field}"]`);
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    void flush();
    goTo(stepIndex + 1);
  };

  const back = () => goTo(Math.max(0, stepIndex - 1));

  /** One click: get the pending answers to the server, then send the link. */
  const saveAndEmailLink = async () => {
    await flush();
    setSaveLinkOpen(true);
  };

  /* ---------------------------------------------------------------- render */

  const progress = steps.length > 1 ? Math.round((stepIndex / (steps.length - 1)) * 100) : 0;
  const stepLabel = step ? `${t('stepOf', { num: stepIndex + 1, total: steps.length })} · ${loc(step as unknown as Record<string, unknown>, 'short', locale) || loc(step as unknown as Record<string, unknown>, 'title', locale)}` : undefined;

  const header = (
    <OnboardingHeader
      progress={confirmed ? 100 : progress}
      stepLabel={stepLabel}
      onLocaleChange={(l) => queue({ changes: {}, locale: l })}
      actions={
        !confirmed ? (
          <button
            type="button"
            data-testid="onb-savelink"
            onClick={() => void saveAndEmailLink()}
            className="hov-lift1 onb-desktop-only"
            style={{
              ...gradButton,
              borderRadius: 999,
              padding: '9px 16px',
              fontSize: 12.5,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <span aria-hidden="true">✉</span>
            {t('saveLink')}
          </button>
        ) : null
      }
    />
  );

  const banner = notice ? (
    <div
      data-testid={`onb-notice-${notice}`}
      role="status"
      style={{
        marginBottom: 16,
        fontSize: 13,
        fontWeight: 600,
        color: notice === 'redacted' ? '#7A4B0F' : '#1E4FD6',
        background: notice === 'redacted' ? '#FFF7E6' : '#EDF3FF',
        border: `1px solid ${notice === 'redacted' ? '#F1D18A' : '#CBD9EE'}`,
        borderRadius: 10,
        padding: '10px 14px',
      }}
    >
      {notice === 'redacted' ? tf('redacted') : t('restored')}
    </div>
  ) : null;

  return (
    <OnboardingFrame header={header}>
      <div ref={topRef} style={{ maxWidth: 800, margin: '0 auto', padding: '32px 0 0' }}>
        <Stepper steps={steps} activeIndex={stepIndex} maxReached={maxReached} locale={locale} onSelect={goTo} />
        {confirmed && step?.kind !== 'review' && (
          <div style={{ marginBottom: 16, fontSize: 13, fontWeight: 600, color: MUTED }}>{t('confirmedNotice')}</div>
        )}
        {step?.kind === 'review' ? (
          <ReviewFlow
            definition={definition}
            record={record}
            setRecord={setRecord}
            files={files}
            brief={brief}
            setBrief={setBrief}
            locale={locale}
            onBackToForm={() => goTo(Math.max(0, reviewIndex - 1))}
            onJumpToScreen={(screenId) => {
              const i = steps.findIndex((s) => s.id === screenId);
              if (i >= 0) goTo(i);
            }}
            onChange={setAnswer}
            flush={flush}
          />
        ) : step ? (
          <ScreenCard
            screen={step}
            fields={screenFields}
            answers={record.answers}
            files={files}
            errors={showErrors ? screenErrors : []}
            requiredNow={requiredNow}
            locale={locale}
            definition={definition}
            formId={record.id}
            disabled={confirmed}
            onChange={setAnswer}
            onFiles={setFiles}
            onBack={back}
            onNext={next}
            isFirst={stepIndex === 0}
            isLast={stepIndex === reviewIndex - 1}
            saveStatus={status}
            banner={banner}
            onSaveLink={() => void saveAndEmailLink()}
          />
        ) : null}
      </div>
      {saveLinkOpen && <SaveLinkDialog formId={record.id} email={record.email} onClose={() => setSaveLinkOpen(false)} />}
    </OnboardingFrame>
  );
}
