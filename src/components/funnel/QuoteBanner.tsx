'use client';

import { useTranslations } from 'next-intl';
import type { Catalog } from '@/lib/types';
import { fmt, mon } from '@/lib/format';
import { useFunnel } from '@/stores/funnel';
import { useAppLocale } from './hooks';
import { BLUE, BORDER, BODY, GREEN, INK, MUTED } from './tokens';

/**
 * Shown above the funnel while the session is bound to a quote: what was submitted and
 * when, that edits are saved for the team, and the way to send them. Team members see the
 * team-mode variant; a closed quote (won / lost) shows that changes are no longer saved.
 */
export function QuoteBanner({ catalog }: { catalog: Catalog }) {
  const t = useTranslations('quote');
  const locale = useAppLocale();
  const quote = useFunnel((s) => s.quote);
  const teamMode = useFunnel((s) => s.teamMode);
  const step = useFunnel((s) => s.step);
  const lead = useFunnel((s) => s.lead);
  const go = useFunnel((s) => s.go);
  const restart = useFunnel((s) => s.restart);
  const bundle = useFunnel((s) => s.bundle);

  if (!quote || step === 'intro' || step === 'done') return null;

  const date = quote.submittedAt
    ? new Date(quote.submittedAt).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';
  const totals = t('bannerTotals', {
    once: fmt(quote.oneTime, quote.locale, catalog),
    monthly: mon(quote.monthly, quote.locale, catalog),
  });
  const name = [lead.vorname, lead.nachname].filter(Boolean).join(' ') || lead.firma || lead.email;

  const pill = (text: string, color: string, bg: string) => (
    <span
      style={{
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color,
        background: bg,
        borderRadius: 999,
        padding: '3px 9px',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  );

  const linkButton = (label: string, onClick: () => void, primary = false, testId?: string) => (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={primary ? 'hov-lift1' : 'hov-blue-text'}
      style={{
        fontFamily: 'inherit',
        cursor: 'pointer',
        border: primary ? 'none' : `1.5px solid ${BORDER}`,
        background: primary ? 'linear-gradient(100deg,#1E4FD6,#22B8D8)' : '#ffffff',
        color: primary ? '#ffffff' : INK,
        borderRadius: 10,
        padding: '9px 16px',
        fontSize: 13,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );

  const teamBar = teamMode;
  const locked = quote.locked && !teamMode;
  // A quote the customer saved themselves is locked for a happier reason than a closed
  // one, and the banner says so rather than reading like the deal fell through.
  const accepted = quote.status === 'accepted';
  const lockedTitle = accepted ? t('acceptedTitle') : t('locked');
  const lockedSub = accepted ? t('acceptedSub') : t('lockedSub');

  return (
    <div
      data-testid="quote-banner"
      style={{
        flex: 'none',
        background: teamBar ? '#0F2440' : locked ? (accepted ? '#F1FAF5' : '#FFF7ED') : '#EEF4FF',
        borderBottom: `1px solid ${teamBar ? '#1E4FD6' : locked ? (accepted ? '#BFE6D2' : '#FED7AA') : '#D5E2FF'}`,
        color: teamBar ? '#ffffff' : INK,
      }}
    >
      <div
        style={{
          maxWidth: 1140,
          margin: '0 auto',
          padding: '12px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            {teamBar
              ? pill(t('teamBadge'), '#0F2440', '#8FD8EA')
              : locked
                ? pill(lockedTitle, accepted ? '#1E6E44' : '#9A3412', accepted ? '#DCF3E6' : '#FFEDD5')
                : pill(quote.draft ? t('bannerDraft') : t('bannerTitle', { date }), BLUE, '#DCE7FF')}
            <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: -0.2 }}>
              {teamBar ? t('teamFor', { name }) : totals}
            </span>
            {teamBar && <span style={{ fontSize: 13, color: '#8FD8EA', fontWeight: 600 }}>{totals}</span>}
          </div>
          <div style={{ fontSize: 12.5, color: teamBar ? '#C7D4EA' : locked ? (accepted ? '#1E6E44' : '#9A3412') : BODY, marginTop: 4, lineHeight: 1.45 }}>
            {locked ? lockedSub : teamBar ? t('teamSaveHint') : quote.draft ? t('bannerDraftSub') : t('bannerSub')}
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {teamBar && (
            <a
              href={`/admin/leads/${quote.leadId}`}
              data-testid="quote-back-to-admin"
              style={{ color: '#8FD8EA', fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              ← {t('backToAdmin')}
            </a>
          )}
          {step !== 'config' && step !== 'lead' && (bundle || teamBar) && linkButton(t('toConfig'), () => go('config'))}
          {!locked &&
            step === 'config' &&
            // In team mode nothing goes to the customer: the next screen saves a version.
            linkButton(teamBar ? t('teamSave') : quote.draft ? t('sendDraft') : t('send'), () => go('lead'), true, 'quote-send')}
          {!teamBar && step === 'config' && (
            <button
              type="button"
              onClick={() => restart()}
              className="hov-blue-text"
              style={{ fontFamily: 'inherit', cursor: 'pointer', background: 'none', border: 'none', color: MUTED, fontSize: 12.5, fontWeight: 600 }}
            >
              {t('newConfig')}
            </button>
          )}
        </div>
      </div>
      {teamBar && quote.locked && (
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 24px 10px', fontSize: 12, color: GREEN }}>
          {lockedTitle} {lockedSub}
        </div>
      )}
    </div>
  );
}
