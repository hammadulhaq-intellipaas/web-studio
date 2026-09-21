'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import type { Locale } from '@/lib/types';
import { textFor } from '@/lib/onboarding/texts';
import { loc } from '@/lib/onboarding/types';
import type { BriefSectionContent, OnbBriefSection, OnboardingBrief, OnboardingDefinition, OnboardingFormRecord } from '@/lib/onboarding/types';
import { BLUE, BODY, BORDER, gradButton, INK, MUTED } from '@/components/funnel/ui';
import { DANGER, inputStyle, subtleButton } from '../fields/styles';

interface Props {
  definition: OnboardingDefinition;
  record: OnboardingFormRecord;
  setRecord: Dispatch<SetStateAction<OnboardingFormRecord>>;
  brief: OnboardingBrief;
  setBrief: Dispatch<SetStateAction<OnboardingBrief | null>>;
  locale: Locale;
  onConfirm: () => void;
  readOnly?: boolean;
}

type Update = { record: OnboardingFormRecord; brief: OnboardingBrief };

/**
 * "This is our understanding of what you want" (spec §06, Job 3). Nine fixed sections;
 * the client edits any section inline or says what is wrong and has that section
 * rewritten. What we still need is listed last. Then they confirm — or they don't.
 */
export function BriefEditor({ definition, record, setRecord, brief, setBrief, locale, onConfirm, readOnly }: Props) {
  const t = useTranslations('onboarding.brief');
  const intro = textFor(definition.texts, 'brief_intro', locale);
  const reviewScreen = definition.screens.find((s) => s.kind === 'review');
  const title = reviewScreen ? loc(reviewScreen as unknown as Record<string, unknown>, 'title', locale) : t('title');

  const apply = (u: Update) => {
    setRecord(u.record);
    setBrief(u.brief);
  };

  return (
    <section data-screen="onb-brief" className="onb-reveal" style={{ paddingBottom: 72 }}>
      <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.8, margin: '0 0 8px' }}>{title}</h2>
      <div style={{ fontSize: 15.5, color: BODY, margin: '0 0 6px', fontWeight: 700 }}>{intro?.title}</div>
      {intro && (
        <div className="onb-markdown" style={{ fontSize: 15, color: BODY, margin: '0 0 22px', maxWidth: 680, lineHeight: 1.55 }}>
          <ReactMarkdown>{intro.content_markdown}</ReactMarkdown>
        </div>
      )}
      {brief.source === 'fallback' && (
        <div data-testid="onb-brief-fallback" role="note" style={{ marginBottom: 16, fontSize: 13.5, color: '#7A4B0F', background: '#FFF7E6', border: '1px solid #F1D18A', borderRadius: 12, padding: '12px 16px', maxWidth: 780 }}>
          {t('fallbackNote')}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 780 }}>
        {definition.briefSections.map((section, i) => {
          const content = brief.sections[section.id];
          if (!content) return null;
          return (
            <SectionCard
              key={section.id}
              index={i + 1}
              section={section}
              content={content}
              locale={locale}
              formId={record.id}
              readOnly={!!readOnly || section.generated_by === 'system'}
              onUpdate={apply}
            />
          );
        })}
      </div>

      {!readOnly && (
        <button
          type="button"
          data-testid="onb-to-confirm"
          onClick={onConfirm}
          className="hov-lift1"
          style={{ ...gradButton, marginTop: 26, borderRadius: 12, padding: '15px 34px', fontSize: 15.5, fontWeight: 700, boxShadow: '0 10px 22px -8px rgba(30,79,214,.5)' }}
        >
          {t('toConfirm')}
        </button>
      )}
    </section>
  );
}

function SectionCard({
  index,
  section,
  content,
  locale,
  formId,
  readOnly,
  onUpdate,
}: {
  index: number;
  section: OnbBriefSection;
  content: BriefSectionContent;
  locale: Locale;
  formId: string;
  readOnly: boolean;
  onUpdate: (u: Update) => void;
}) {
  const t = useTranslations('onboarding.brief');
  const [mode, setMode] = useState<'view' | 'edit' | 'rewrite'>('view');
  const [draft, setDraft] = useState(content.content_markdown);
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const title = loc(section as unknown as Record<string, unknown>, 'title', locale);
  const isSystem = section.generated_by === 'system';

  const call = async (path: string, method: 'PATCH' | 'POST', body: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/onboarding/${formId}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as Partial<Update> & { error?: string };
      if (res.status === 429) {
        setError(t('rewriteLimit'));
        return;
      }
      if (!res.ok || !data.record || !data.brief) throw new Error(data.error ?? String(res.status));
      onUpdate({ record: data.record, brief: data.brief });
      setMode('view');
      setInstruction('');
    } catch {
      setError(t('error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      data-testid={`onb-brief-section-${section.id}`}
      style={{
        background: isSystem ? '#FFF7E6' : '#ffffff',
        border: `1px solid ${isSystem ? '#F1D18A' : BORDER}`,
        borderRadius: 16,
        padding: '20px 22px',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ flex: 'none', width: 24, height: 24, borderRadius: 7, background: isSystem ? '#F1D18A' : '#EDF3FF', color: isSystem ? '#7A4B0F' : BLUE, fontSize: 12, fontWeight: 800, display: 'grid', placeItems: 'center' }}>
          {index}
        </span>
        <h3 style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.2, color: INK, margin: 0, flex: 1, minWidth: 200 }}>{title}</h3>
        {content.edited && (
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 999, padding: '2px 8px' }}>
            {t('edited')}
          </span>
        )}
      </header>

      {mode === 'edit' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            data-testid={`onb-brief-edit-${section.id}`}
            value={draft}
            rows={Math.min(18, Math.max(6, draft.split('\n').length + 2))}
            onChange={(ev) => setDraft(ev.target.value)}
            style={inputStyle(false, { resize: 'vertical', lineHeight: 1.55, fontSize: 14 })}
          />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              type="button"
              data-testid={`onb-brief-save-${section.id}`}
              disabled={busy || !draft.trim()}
              onClick={() => void call('/brief', 'PATCH', { section_id: section.id, content_markdown: draft.trim() })}
              style={{ ...gradButton, borderRadius: 10, padding: '10px 18px', fontSize: 13.5, fontWeight: 700, opacity: busy ? 0.7 : 1 }}
            >
              {t('save')}
            </button>
            <button type="button" onClick={() => { setMode('view'); setDraft(content.content_markdown); }} style={{ ...subtleButton, color: MUTED }}>
              {t('cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div className="onb-markdown" data-testid={`onb-brief-content-${section.id}`} style={{ fontSize: 14.5, lineHeight: 1.6, color: '#2A3A52' }}>
          <ReactMarkdown>{content.content_markdown}</ReactMarkdown>
        </div>
      )}

      {!isSystem && content.still_needed.length > 0 && mode !== 'edit' && (
        <div style={{ marginTop: 12, fontSize: 12.5, color: '#7A4B0F', background: '#FFF7E6', border: '1px solid #F1D18A', borderRadius: 10, padding: '8px 12px' }}>
          <strong>{t('stillNeeded')}:</strong> {content.still_needed.join(' · ')}
        </div>
      )}

      {mode === 'rewrite' && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            data-testid={`onb-brief-instruction-${section.id}`}
            value={instruction}
            rows={3}
            placeholder={t('rewritePlaceholder')}
            onChange={(ev) => setInstruction(ev.target.value)}
            style={inputStyle(false, { resize: 'vertical', lineHeight: 1.5 })}
          />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              type="button"
              data-testid={`onb-brief-rewrite-send-${section.id}`}
              disabled={busy || instruction.trim().length < 3}
              onClick={() => void call('/brief/rewrite', 'POST', { section_id: section.id, instruction: instruction.trim() })}
              style={{ ...gradButton, borderRadius: 10, padding: '10px 18px', fontSize: 13.5, fontWeight: 700, opacity: busy || instruction.trim().length < 3 ? 0.7 : 1 }}
            >
              {busy ? t('rewriting') : t('rewriteSend')}
            </button>
            <button type="button" onClick={() => setMode('view')} style={{ ...subtleButton, color: MUTED }}>
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" style={{ marginTop: 10, fontSize: 12.5, fontWeight: 600, color: DANGER }}>
          {error}
        </div>
      )}

      {!readOnly && mode === 'view' && (
        <div style={{ display: 'flex', gap: 16, marginTop: 14, borderTop: `1px solid ${BORDER}`, paddingTop: 10 }}>
          <button type="button" data-testid={`onb-brief-edit-btn-${section.id}`} onClick={() => { setDraft(content.content_markdown); setMode('edit'); }} style={subtleButton}>
            {t('edit')}
          </button>
          <button type="button" data-testid={`onb-brief-rewrite-btn-${section.id}`} onClick={() => setMode('rewrite')} style={subtleButton}>
            {t('rewrite')}
          </button>
        </div>
      )}
    </article>
  );
}
