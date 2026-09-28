'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BLUE, BODY, GREEN, INK, MUTED } from '@/components/funnel/ui';

/**
 * The review's loading language, in one place. Everything the client waits for (the
 * model reading their answers, the brief being written, a PDF being drawn) shows the
 * same assistant: the gradient avatar, its typing dots, a slim moving bar, and a word
 * on what is happening. Motion stops for anyone who asked for reduced motion
 * (see `.onb-spin`, `.onb-progress` in globals.css).
 */

export function Avatar() {
  return (
    <div
      aria-hidden="true"
      style={{
        flex: 'none',
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #1E5EFF 0%, #22C3E6 100%)',
        display: 'grid',
        placeItems: 'center',
        fontSize: 16,
        boxShadow: '0 4px 12px -4px rgba(30,94,255,.5)',
      }}
    >
      ✨
    </div>
  );
}

/** Three dots while something runs, so the wait reads as the assistant at work. */
export function Typing({ label }: { label?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 14, color: MUTED }}>
      <span aria-hidden="true" style={{ display: 'inline-flex', gap: 4 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="onb-dot"
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#B6C2D6',
              display: 'inline-block',
              animation: `onbBlink 1.2s ${i * 0.18}s infinite ease-in-out`,
            }}
          />
        ))}
      </span>
      {label}
    </span>
  );
}

/** A small ring for buttons and links: brand blue, or white on the gradient buttons. */
export function Spinner({ size = 16, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="onb-spin"
      style={{
        display: 'inline-block',
        flex: 'none',
        width: size,
        height: size,
        borderRadius: '50%',
        border: `2px solid ${onDark ? 'rgba(255,255,255,.35)' : '#D8E4FB'}`,
        borderTopColor: onDark ? '#ffffff' : BLUE,
        verticalAlign: 'middle',
      }}
    />
  );
}

/** Seconds since mount, for status lines and steps that move on while the client waits. */
function useElapsed(): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  return seconds;
}

/**
 * The assistant at work, as a card: a title, then either status lines that change every
 * few seconds (`lines`) or steps that tick off in turn (`steps`, one every `stepEvery`
 * seconds, the last one stays until the work is done), and a reassurance once the wait
 * runs long. It never claims to be finished: the screen that follows replaces it.
 */
export function WorkingCard({
  title,
  lines,
  steps,
  stepEvery = 12,
  patience,
  patienceAfter = 20,
  testId,
}: {
  title: string;
  lines?: string[];
  steps?: string[];
  stepEvery?: number;
  patience?: string;
  patienceAfter?: number;
  testId?: string;
}) {
  const elapsed = useElapsed();
  const line = lines?.length ? lines[Math.floor(elapsed / 3) % lines.length] : null;
  const current = steps?.length ? Math.min(steps.length - 1, Math.floor(elapsed / stepEvery)) : -1;

  return (
    <div role="status" aria-live="polite" data-testid={testId} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', margin: '20px 0 8px', maxWidth: 680 }}>
      <Avatar />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          background: '#F3F7FF',
          border: '1px solid #D8E4FB',
          borderRadius: '4px 16px 16px 16px',
          padding: '16px 18px',
        }}
      >
        <div style={{ fontSize: 15.5, fontWeight: 800, color: INK, marginBottom: 8 }}>{title}</div>
        {line && <Typing label={line} />}
        {steps && (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 7 }}>
            {steps.map((step, i) => {
              const done = i < current;
              const active = i === current;
              return (
                <li key={step} data-state={done ? 'done' : active ? 'active' : 'todo'} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: done ? GREEN : active ? INK : MUTED, fontWeight: active ? 700 : 500 }}>
                  <span style={{ width: 16, display: 'inline-grid', placeItems: 'center', flex: 'none' }}>
                    {done ? <span aria-hidden="true">✓</span> : active ? <Spinner size={14} /> : <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: '#C3CFE2' }} />}
                  </span>
                  {step}
                </li>
              );
            })}
          </ol>
        )}
        <div aria-hidden="true" style={{ position: 'relative', height: 4, borderRadius: 999, background: '#E1E9F8', overflow: 'hidden', marginTop: 14 }}>
          <div className="onb-progress" style={{ position: 'absolute', top: 0, bottom: 0, width: '40%', borderRadius: 999, background: 'linear-gradient(90deg, #1E5EFF, #22C3E6)' }} />
        </div>
        {patience && elapsed >= patienceAfter && <div style={{ fontSize: 12.5, color: BODY, marginTop: 10, lineHeight: 1.45 }}>{patience}</div>}
      </div>
    </div>
  );
}

/**
 * The longest wait of the form (the brief is written, then the open points are checked,
 * together often 30 to 40 seconds): three steps that tick off in turn, and a word of
 * reassurance once it runs past twenty seconds.
 */
export function PreparingFinalReview() {
  const t = useTranslations('onboarding.review');
  return (
    <WorkingCard
      testId="onb-final-review-working"
      title={t('preparingTitle')}
      steps={[t('preparingStep1'), t('preparingStep2'), t('preparingStep3')]}
      patience={t('patience')}
    />
  );
}
