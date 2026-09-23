'use client';

import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/types';
import type { CompletenessReport, ReportItem } from '@/lib/onboarding/types';
import { BLUE, BODY, BORDER, GREEN, INK, MUTED } from '@/components/funnel/ui';

const card = { background: '#ffffff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: '22px 24px' } as const;

/** One line per open point, in the words of the thing that found it. */
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
      return item.detail || t('reportSkipped');
    case 'vague':
      // The model's own question is more use to the client than a category name.
      return item.detail || t('reportVague');
    default:
      return '';
  }
}

/**
 * "What we still need", shown above the read-back on the closing screen. Advisory only:
 * required fields were already enforced screen by screen, so everything here is something
 * the client may reasonably leave open — they just get to see it before they confirm.
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
  onJumpToScreen: (screenId: string) => void;
}) {
  const t = useTranslations('onboarding.review');

  if (loading && !report) {
    return (
      <div style={card} data-testid="onb-report" data-state="loading">
        <div style={{ fontSize: 14, color: MUTED }}>{t('checking')}</div>
      </div>
    );
  }
  if (!report) return null;

  const items = report.items;
  return (
    <div style={card} data-testid="onb-report" data-state={items.length ? 'open' : 'clear'} data-count={items.length}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>{t('reportTitle')}</h2>
        {items.length > 0 && (
          <span style={{ fontSize: 13, fontWeight: 700, color: '#B4690E' }}>{t('reportCount', { n: items.length })}</span>
        )}
      </div>
      <p style={{ fontSize: 14, color: BODY, margin: '0 0 16px' }}>
        {report.model_checked ? t('reportHelpChecked') : t('reportHelpPlain')}
      </p>

      {items.length === 0 ? (
        <div
          style={{
            background: '#F1FAF5',
            border: `1px solid #BFE6D2`,
            borderRadius: 12,
            padding: '12px 16px',
            fontSize: 14,
            fontWeight: 600,
            color: GREEN,
          }}
        >
          ✓ {t('reportNone')}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
          {items.map((item) => (
            <li
              key={item.field}
              data-testid={`onb-report-item-${item.field}`}
              data-kind={item.kind}
              style={{
                background: '#FFF7E6',
                border: '1px solid #F1D18A',
                borderRadius: 12,
                padding: '11px 14px',
                display: 'flex',
                gap: 12,
                alignItems: 'baseline',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>
                  {(locale === 'de' ? item.label?.de : item.label?.en) || item.field}
                </div>
                <div style={{ fontSize: 13, color: '#6B5836', marginTop: 2, lineHeight: 1.45 }}>{reason(item, t)}</div>
              </div>
              {item.screen && (
                <button
                  type="button"
                  onClick={() => onJumpToScreen(item.screen!)}
                  data-testid={`onb-report-fix-${item.field}`}
                  className="hov-blue-text"
                  style={{
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: BLUE,
                    fontSize: 13,
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
  );
}
