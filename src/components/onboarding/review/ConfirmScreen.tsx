'use client';

import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import type { Locale } from '@/lib/types';
import { stripDashes } from '@/lib/onboarding/guardrails';
import { listItems, textFor } from '@/lib/onboarding/texts';
import type { OnboardingDefinition, OnboardingFormRecord } from '@/lib/onboarding/types';
import { BLUE, BODY, BORDER, gradButton, INK, MUTED } from '@/components/funnel/ui';
import { DANGER, inputStyle, labelStyle } from '../fields/styles';
import type { PublicFile } from '../fields/UploadInput';
import { IssueSummary, useReviewIssues, useServerFields } from './IssueSummary';

const HEADING = /^\*\*(.+?)\*\*\s*$/;

/**
 * The CMS terms split at their bold headings: what comes before the first heading is the
 * declaration and stays open; each headed part folds away. The wording is untouched.
 */
function splitTerms(markdown: string): { intro: string; parts: { title: string; body: string }[] } {
  const paragraphs = markdown.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const intro: string[] = [];
  const parts: { title: string; body: string[] }[] = [];
  for (const p of paragraphs) {
    const heading = HEADING.exec(p);
    if (heading) parts.push({ title: heading[1], body: [] });
    else if (parts.length) parts[parts.length - 1].body.push(p);
    else intro.push(p);
  }
  return { intro: intro.join('\n\n'), parts: parts.map((part) => ({ title: part.title, body: part.body.join('\n\n') })) };
}

/**
 * Terms (CMS markdown, folded by section), the confirmation checkboxes (one per CMS list
 * line), name and date. Submitting flips the record to confirmed. Nothing is ever a dead
 * end: open confirmations are marked, and answers that still need attention are listed
 * with a way straight to each.
 */
export function ConfirmScreen({
  definition,
  record,
  setRecord,
  files,
  locale,
  onBack,
  onJumpToScreen,
}: {
  definition: OnboardingDefinition;
  record: OnboardingFormRecord;
  setRecord: Dispatch<SetStateAction<OnboardingFormRecord>>;
  files: PublicFile[];
  locale: Locale;
  onBack: () => void;
  onJumpToScreen: (screenId: string, fieldId?: string) => void;
}) {
  const t = useTranslations('onboarding.confirm');
  const ts = useTranslations('onboarding.shell');
  const terms = textFor(definition.texts, 'terms', locale);
  const checksText = textFor(definition.texts, 'confirm_checks', locale);
  const checks = listItems(checksText?.content_markdown ?? '').map(stripDashes);
  const { intro, parts } = splitTerms(stripDashes(terms?.content_markdown ?? ''));
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const [name, setName] = useState(record.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [serverFields, setServerFields] = useServerFields(record.answers);
  const issuesRef = useRef<HTMLDivElement>(null);
  const issues = useReviewIssues(definition, record.answers, files, locale, serverFields);
  const today = new Date().toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  const open = checks.filter((_, i) => !ticked.has(i)).length;

  const showIssues = () =>
    requestAnimationFrame(() => {
      issuesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      issuesRef.current?.focus({ preventScroll: true });
    });

  const submit = async () => {
    setTried(true);
    if (issues.length) {
      setError(t('incomplete'));
      return showIssues();
    }
    if (open) return setError(t('checksOpen', { n: open }));
    if (name.trim().length < 2) return setError(t('nameRequired'));
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/onboarding/${record.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), checks: Array.from(ticked) }),
      });
      const body = (await res.json()) as { record?: OnboardingFormRecord; error?: string; fields?: string[] };
      if (res.status === 422 && body.error === 'incomplete') {
        setServerFields(body.fields ?? []);
        setError(t('incomplete'));
        showIssues();
        return;
      }
      if (!res.ok || !body.record) throw new Error(String(res.status));
      setRecord(body.record);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch {
      setError(t('error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-screen="onb-confirm" className="onb-reveal" style={{ paddingBottom: 72 }}>
      <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.8, margin: '0 0 20px' }}>{t('title')}</h2>

      <IssueSummary ref={issuesRef} issues={issues} definition={definition} answers={record.answers} locale={locale} onOpen={onJumpToScreen} />

      {terms && (
        <div style={{ background: '#ffffff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: '22px 24px', maxWidth: 780, marginBottom: 16 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', color: MUTED, marginBottom: 10 }}>{stripDashes(terms.title)}</div>
          <div className="onb-markdown" data-testid="onb-terms" style={{ fontSize: 14.5, lineHeight: 1.6, color: BODY }}>
            <ReactMarkdown>{intro}</ReactMarkdown>
          </div>
          {parts.length > 0 && (
            <>
              <div style={{ fontSize: 13, color: MUTED, margin: '14px 0 8px' }}>{t('termsLead')}</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {parts.map((part, i) => (
                  <details key={i} data-testid={`onb-terms-part-${i}`} style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: '11px 14px', background: '#FAFBFE' }}>
                    <summary style={{ cursor: 'pointer', fontSize: 14.5, fontWeight: 700, color: INK }}>{part.title}</summary>
                    <div className="onb-markdown" style={{ fontSize: 14, lineHeight: 1.6, color: BODY, marginTop: 8 }}>
                      <ReactMarkdown>{part.body}</ReactMarkdown>
                    </div>
                  </details>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ background: '#ffffff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: '22px 24px', maxWidth: 780 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {checks.map((label, i) => {
            const missing = tried && !ticked.has(i);
            return (
              <label
                key={i}
                data-missing={missing ? 'true' : undefined}
                style={{
                  display: 'flex',
                  gap: 11,
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                  borderRadius: 10,
                  padding: '6px 8px',
                  margin: '0 -8px',
                  background: missing ? '#FFF6F5' : 'transparent',
                  outline: missing ? `1px solid #F4D2CE` : 'none',
                }}
              >
                <input
                  type="checkbox"
                  data-testid={`onb-check-${i}`}
                  checked={ticked.has(i)}
                  onChange={(ev) => {
                    const next = new Set(ticked);
                    if (ev.target.checked) next.add(i);
                    else next.delete(i);
                    setTicked(next);
                    setError(null);
                  }}
                  style={{ marginTop: 3, width: 17, height: 17, accentColor: BLUE, flex: 'none' }}
                />
                <span style={{ fontSize: 14, lineHeight: 1.5, color: INK }}>{label}</span>
              </label>
            );
          })}
        </div>
        <div className="onb-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>
              {t('nameLabel')} <span style={{ color: DANGER }}>*</span>
            </label>
            <input data-testid="onb-confirm-name" value={name} onChange={(ev) => setName(ev.target.value)} placeholder={t('namePlaceholder')} style={inputStyle(tried && name.trim().length < 2)} />
          </div>
          <div>
            <label style={labelStyle}>{t('dateLabel')}</label>
            <div style={{ ...inputStyle(false), background: '#F5F7FB', color: BODY }}>{today}</div>
          </div>
        </div>
        {error && (
          <div role="alert" data-testid="onb-confirm-error" style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: DANGER }}>
            {error}
          </div>
        )}
        <div className="onb-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginTop: 22 }}>
          <button
            type="button"
            onClick={onBack}
            className="hov-blue-text"
            style={{ fontFamily: 'inherit', cursor: 'pointer', background: 'none', border: `1.5px solid ${BORDER}`, borderRadius: 12, color: MUTED, fontSize: 14, fontWeight: 700, padding: '13px 22px' }}
          >
            {ts('back')}
          </button>
          <button
            type="button"
            data-testid="onb-confirm-submit"
            onClick={() => void submit()}
            disabled={busy}
            className="hov-lift1"
            style={{ ...gradButton, borderRadius: 12, padding: '15px 34px', fontSize: 15.5, fontWeight: 700, boxShadow: '0 10px 22px -8px rgba(30,79,214,.5)', opacity: busy ? 0.7 : 1 }}
          >
            {busy ? t('submitting') : t('cta')}
          </button>
        </div>
      </div>
    </section>
  );
}
