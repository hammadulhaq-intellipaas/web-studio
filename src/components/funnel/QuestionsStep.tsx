'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { Catalog, Locale } from '@/lib/types';
import { buildQuestions } from '@/lib/questions';
import { isByow } from '@/lib/pricing/engine';
import { useFunnel } from '@/stores/funnel';
import { UploadZone } from './UploadZone';
import { backButton, BLUE, BODY, BORDER, gradButton, INK, MUTED } from './ui';

export function QuestionsStep({ catalog }: { catalog: Catalog }) {
  const t = useTranslations('questions');
  const tc = useTranslations('common');
  const locale = useLocale() as Locale;
  void locale;
  const go = useFunnel((s) => s.go);
  const answers = useFunnel((s) => s.answers);
  const url = useFunnel((s) => s.url);
  const setUrl = useFunnel((s) => s.setUrl);
  const siteNotes = useFunnel((s) => s.siteNotes);
  const setSiteNotes = useFunnel((s) => s.setSiteNotes);
  const answer = useFunnel((s) => s.answer);
  const toConfig = useFunnel((s) => s.toConfig);

  const questions = buildQuestions(answers);
  const byow = isByow(answers);

  const linkPhKey = (['website', 'social', 'concept'] as const).find((k) => k === answers.hasSite);
  // An existing site or a draft concept can be described further and backed by a file.
  const siteKind =
    answers.hasSite === 'website' ? 'website' : answers.hasSite === 'concept' ? 'concept' : null;

  return (
    <section
      data-screen="questions"
      style={{ animation: 'ipFade .4s ease both', padding: '52px 0 72px', maxWidth: 720 }}
    >
      <button onClick={() => go('persona')} className="hov-blue-text" style={backButton}>
        {tc('back')}
      </button>
      <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.8, margin: '0 0 8px' }}>
        {t('title')}
      </h2>
      <p style={{ fontSize: 15.5, color: BODY, margin: '0 0 34px' }}>{t('sub')}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {questions.map((q, qi) => {
          const title =
            q.id === 'langs'
              ? t(byow ? 'langs.titleByow' : 'langs.title')
              : t(`${q.id}.title`);
          const showLink = !!q.link && !!answers.hasSite && answers.hasSite !== 'none';
          return (
            <div
              key={q.id}
              data-testid={`question-${q.id}`}
              style={{
                background: '#ffffff',
                border: `1px solid ${BORDER}`,
                borderRadius: 16,
                padding: '22px 24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
                <span
                  style={{
                    flex: 'none',
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    background: '#EDF3FF',
                    color: BLUE,
                    fontSize: 12,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {qi + 1}
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.35 }}>{title}</span>
                {q.multi && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      flex: 'none',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 0.4,
                      textTransform: 'uppercase',
                      color: MUTED,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 999,
                      padding: '2px 8px',
                    }}
                  >
                    {t('multi')}
                  </span>
                )}
              </div>
              {q.hasHint && (
                <div
                  style={{
                    fontSize: 12.5,
                    color: MUTED,
                    lineHeight: 1.5,
                    margin: '-4px 0 12px 34px',
                  }}
                >
                  {t(`${q.id}.hint`)}
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginLeft: 34 }}>
                {q.opts.map((val) => {
                  const cur = answers[q.id];
                  const selected = q.multi
                    ? Array.isArray(cur) && cur.includes(val)
                    : cur === val;
                  return (
                    <button
                      key={val}
                      data-testid={`opt-${q.id}-${val}`}
                      onClick={() => answer(q, val)}
                      className="hov-blue-border"
                      style={{
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                        fontSize: 14,
                        fontWeight: 600,
                        padding: '11px 18px',
                        borderRadius: 999,
                        border: `1.5px solid ${selected ? BLUE : BORDER}`,
                        background: selected ? BLUE : '#ffffff',
                        color: selected ? '#ffffff' : INK,
                        transition: 'all .15s',
                      }}
                    >
                      {q.multi && selected && <span style={{ fontWeight: 800 }}>✓</span>}
                      {t(`${q.id}.opts.${val}`)}
                    </button>
                  );
                })}
              </div>
              {showLink && q.link && (
                <div
                  style={{
                    margin: '16px 0 0 34px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <input
                    value={url}
                    onChange={(ev) => setUrl(ev.target.value)}
                    placeholder={t(`linkPh.${linkPhKey ?? 'default'}`)}
                    style={{
                      width: '100%',
                      fontFamily: 'inherit',
                      fontSize: 14,
                      padding: '12px 14px',
                      border: '1.5px solid #CBD9EE',
                      borderRadius: 11,
                      background: '#F8FAFE',
                      color: INK,
                    }}
                  />
                  {/* An existing website can be described beyond its URL. */}
                  {siteKind === 'website' && (
                    <textarea
                      value={siteNotes}
                      onChange={(ev) => setSiteNotes(ev.target.value)}
                      data-testid="site-notes"
                      rows={3}
                      placeholder={t('siteNotesPh')}
                      style={{
                        width: '100%',
                        fontFamily: 'inherit',
                        fontSize: 14,
                        padding: '12px 14px',
                        border: '1.5px solid #CBD9EE',
                        borderRadius: 11,
                        background: '#F8FAFE',
                        color: INK,
                        resize: 'vertical',
                      }}
                    />
                  )}
                  {siteKind && (
                    <UploadZone
                      storeKind="site"
                      serverKind={siteKind}
                      label={t('siteUploadLabel')}
                      compact
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button
        onClick={() => toConfig(catalog)}
        data-testid="to-config"
        className="hov-lift"
        style={{
          ...gradButton,
          marginTop: 34,
          borderRadius: 13,
          padding: '16px 38px',
          fontSize: 16,
          fontWeight: 700,
          boxShadow: '0 10px 24px -8px rgba(30,79,214,.5)',
        }}
      >
        {t('cta')}
      </button>
    </section>
  );
}
