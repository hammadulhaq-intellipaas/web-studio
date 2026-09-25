'use client';

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import type { Locale } from '@/lib/types';
import { understoodText } from '@/lib/onboarding/understood';
import { stripDashes } from '@/lib/onboarding/guardrails';
import { textFor } from '@/lib/onboarding/texts';
import type { OnboardingDefinition, OnboardingFormRecord } from '@/lib/onboarding/types';
import { BLUE, BODY, BORDER, gradButton, MUTED } from '@/components/funnel/ui';

const POLL_MS = 3000;
const POLL_MAX = 20;

/**
 * "That's everything": PDF download, the emailed-copy note, what happens next, and the
 * read-back they confirmed, repeated read-only. The PDF link works immediately (rendered on
 * demand) while the page polls for the stored copy so the emails' status can be shown.
 */
export function DoneScreen({
  definition,
  record,
  setRecord,
  locale,
}: {
  definition: OnboardingDefinition;
  record: OnboardingFormRecord;
  setRecord: Dispatch<SetStateAction<OnboardingFormRecord>>;
  locale: Locale;
}) {
  const t = useTranslations('onboarding.done');
  const done = textFor(definition.texts, 'done', locale);
  const delivered = !!record.delivery?.pdf_path;
  const polls = useRef(0);
  const [pollError, setPollError] = useState(false);

  useEffect(() => {
    if (delivered || polls.current >= POLL_MAX) return;
    const timer = setTimeout(async () => {
      polls.current += 1;
      try {
        const res = await fetch(`/api/onboarding/${record.id}`);
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { record: OnboardingFormRecord };
        setRecord(body.record);
      } catch {
        setPollError(true);
      }
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [delivered, record, setRecord]);

  const confirmedOn = record.confirmed
    ? new Date(record.confirmed.at).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <section data-screen="onb-done" className="onb-reveal" style={{ paddingBottom: 72 }}>
      <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 30px' }}>
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: '50%',
            background: 'linear-gradient(120deg,#1E4FD6,#22B8D8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 22px',
            boxShadow: '0 14px 32px -10px rgba(30,79,214,.5)',
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 13l4.5 4.5L19 8" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.9, margin: '0 0 10px' }}>{done ? stripDashes(done.title) : null}</h2>
        {done && (
          <div className="onb-markdown" style={{ fontSize: 15.5, color: BODY, lineHeight: 1.55 }}>
            <ReactMarkdown>{stripDashes(done.content_markdown)}</ReactMarkdown>
          </div>
        )}
        {record.confirmed && (
          <div data-testid="onb-confirmed-by" style={{ fontSize: 12.5, color: MUTED, marginTop: 12 }}>
            {t('confirmedBy', { name: record.confirmed.name, date: confirmedOn })}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 24 }}>
          <a
            href={`/api/onboarding/${record.id}/pdf`}
            data-testid="onb-download-pdf"
            className="hov-lift1"
            style={{ ...gradButton, display: 'inline-block', textDecoration: 'none', borderRadius: 12, padding: '14px 30px', fontSize: 15, fontWeight: 700, boxShadow: '0 10px 22px -8px rgba(30,79,214,.5)' }}
          >
            {t('downloadPdf')}
          </a>
          <a href={`/api/onboarding/${record.id}/answers-pdf`} data-testid="onb-done-answers-pdf" className="hov-blue-text" style={{ fontSize: 13.5, fontWeight: 700, color: BLUE, textDecoration: 'none' }}>
            {t('downloadAnswers')}
          </a>
          <span data-testid="onb-delivery" data-delivered={delivered ? 'true' : 'false'} style={{ fontSize: 12.5, color: MUTED }}>
            {delivered || pollError ? (record.email ? t('emailed', { email: record.email }) : '') : t('pdfPending')}
          </span>
        </div>
      </div>

      {/* What they confirmed, in their own words. The written brief goes to the team. */}
      <div data-testid="onb-done-understood" style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 26 }} className="onb-prose">
        <ReactMarkdown>{understoodText(definition, record.answers, locale)}</ReactMarkdown>
      </div>
    </section>
  );
}
