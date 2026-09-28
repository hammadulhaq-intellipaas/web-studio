'use client';

import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/types';
import type { CompletenessReport, ReportItem } from '@/lib/onboarding/types';
import { stripDashes } from '@/lib/onboarding/guardrails';
import { Avatar, Typing } from './Loaders';
import { BLUE, BODY, BORDER, GREEN, INK, MUTED } from '@/components/funnel/ui';

/** One line per open point, in the words of whatever found it. */
function reason(item: ReportItem, t: ReturnType<typeof useTranslations>): string {
  switch (item.kind) {
    case 'empty':
      return t('reportEmpty');
    case 'thin':
      return t('reportThin');
    case 'no_files':
      return t('reportNoFiles');
    case 'dont_know':
      return item.detail ? t('reportDontKnowBy', { date: item.detail }) : t('reportDontKnow');
    case 'skipped':
      return item.detail ? stripDashes(item.detail) : t('reportSkipped');
    case 'vague':
      // The model's own question is more use to the client than a category name.
      return item.detail ? stripDashes(item.detail) : t('reportVague');
    default:
      return '';
  }
}

const bubble = {
  position: 'relative',
  background: '#F3F7FF',
  border: '1px solid #D8E4FB',
  borderRadius: '4px 16px 16px 16px',
  padding: '16px 18px',
  minWidth: 0,
  flex: 1,
} as const;

/**
 * The completeness check, shown as a message from the assistant rather than a form panel:
 * it is the one place on the form where something speaks to the client about their answers.
 * It is deliberately one-way (there is no reply box, and the line under it says so), so
 * nobody types a question expecting an answer.
 *
 * Advisory only. Required fields are enforced screen by screen, so everything listed here
 * is something the client may reasonably leave open; they just get to see it before they
 * confirm. Test ids are unchanged from the card this replaced.
 */
export function ReportCard({
  report,
  loading,
  locale,
  onJumpToScreen,
}: {
  report: CompletenessReport | null;
  loading: boolean;
  locale: Locale;
  onJumpToScreen: (screenId: string, fieldId?: string) => void;
}) {
  const t = useTranslations('onboarding.review');

  if (loading && !report) {
    return (
      <div data-testid="onb-report" data-state="loading" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Avatar />
        <div style={bubble}>
          <Typing label={t('reportThinking')} />
        </div>
      </div>
    );
  }
  if (!report) return null;

  const items = report.items;
  const clear = items.length === 0;

  return (
    <div data-testid="onb-report" data-state={clear ? 'clear' : 'open'} data-count={items.length}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Avatar />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: MUTED, margin: '2px 0 6px' }}>{t('reportAssistant')}</div>

          <div style={bubble}>
            <h2 style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.2, margin: '0 0 6px', color: clear ? GREEN : INK }}>
              {clear ? '✓ ' : ''}
              {clear ? t('reportClearTitle') : t('reportTitle')}
            </h2>
            <p style={{ fontSize: 14, color: BODY, lineHeight: 1.55, margin: 0 }}>
              {clear
                ? report.model_checked
                  ? t('reportClearChecked')
                  : t('reportClearPlain')
                : report.model_checked
                  ? t('reportHelpChecked')
                  : t('reportHelpPlain')}
            </p>

            {clear ? null : (
              <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'grid', gap: 8 }}>
                {items.map((item) => (
                  <li
                    key={item.field}
                    data-testid={`onb-report-item-${item.field}`}
                    data-kind={item.kind}
                    style={{
                      background: '#ffffff',
                      border: `1px solid ${BORDER}`,
                      borderRadius: 12,
                      padding: '10px 13px',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'baseline',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: INK }}>
                        {stripDashes((locale === 'de' ? item.label?.de : item.label?.en) || item.field)}
                      </div>
                      <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2, lineHeight: 1.45 }}>{reason(item, t)}</div>
                    </div>
                    {item.screen && (
                      <button
                        type="button"
                        onClick={() => onJumpToScreen(item.screen!, item.field)}
                        data-testid={`onb-report-fix-${item.field}`}
                        className="hov-blue-text"
                        style={{
                          fontFamily: 'inherit',
                          cursor: 'pointer',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: BLUE,
                          fontSize: 12.5,
                          fontWeight: 700,
                          flex: 'none',
                        }}
                      >
                        {t('reportFix')} →
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Says plainly that this one does not take replies. */}
          <div data-testid="onb-report-noreply" style={{ fontSize: 12, color: MUTED, margin: '8px 0 0 2px', lineHeight: 1.45 }}>
            {t('reportNoReply')}
          </div>
        </div>
      </div>
    </div>
  );
}
