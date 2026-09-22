'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Catalog } from '@/lib/types';
import { lt } from '@/lib/types';
import { fmt, mon } from '@/lib/format';
import { calcTotals } from '@/lib/pricing/engine';
import { buildReceipt } from '@/lib/pricing/summary';
import { useFunnel } from '@/stores/funnel';
import { useAppLocale, useSelection, useSummaryLabels } from './hooks';
import { sessionShareUrl } from './useSessionSync';
import { BLUE, BODY, BORDER, GREEN, INK, MUTED, MUTED2 } from './ui';

/** The customer's permanent link, with a copy button. Shown once the quote is bound. */
function QuoteLink() {
  const t = useTranslations('done');
  const sessionId = useFunnel((s) => s.sessionId);
  const quote = useFunnel((s) => s.quote);
  const [copied, setCopied] = useState(false);
  if (!sessionId || !quote) return null;
  const link = sessionShareUrl(sessionId);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div
      data-testid="quote-link-box"
      style={{
        background: '#EEF4FF',
        border: '1px solid #D5E2FF',
        borderRadius: 16,
        padding: '16px 18px',
        textAlign: 'left',
        marginBottom: 22,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: BLUE, marginBottom: 8 }}>
        {t('linkLabel')}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          readOnly
          value={link}
          data-testid="quote-link"
          onFocus={(ev) => ev.currentTarget.select()}
          style={{
            flex: 1,
            minWidth: 220,
            fontFamily: 'inherit',
            fontSize: 12.5,
            padding: '10px 12px',
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            background: '#ffffff',
            color: INK,
          }}
        />
        <button
          type="button"
          onClick={() => void copy()}
          data-testid="quote-link-copy"
          className="hov-blue-border"
          style={{
            fontFamily: 'inherit',
            cursor: 'pointer',
            background: '#ffffff',
            border: `1.5px solid ${BORDER}`,
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 12.5,
            fontWeight: 800,
            color: copied ? GREEN : INK,
          }}
        >
          {copied ? `✓ ${t('copied')}` : t('copyLink')}
        </button>
      </div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 8, lineHeight: 1.45 }}>{t('linkHint')}</div>
    </div>
  );
}

export function DoneScreen({ catalog }: { catalog: Catalog }) {
  const t = useTranslations('done');
  const tc = useTranslations('configurator');
  const locale = useAppLocale();
  const labels = useSummaryLabels();
  const store = useFunnel();
  const selection = useSelection();

  const totals = calcTotals(catalog, selection);
  const receipt = buildReceipt(catalog, selection, locale, labels);
  const voucher = store.voucher;
  const variant = store.doneVariant;
  const title = variant === 'team' ? t('teamSavedTitle') : variant === 'updated' ? t('updatedTitle') : t('title');
  const sub = variant === 'team' ? t('teamSavedSub') : variant === 'updated' ? t('updatedSub') : t('sub');

  return (
    <section
      data-screen="done"
      style={{
        animation: 'ipFade .5s ease both',
        padding: '64px 0 90px',
        maxWidth: 680,
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
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
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 13l4.5 4.5L19 8"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.9, margin: '0 0 10px' }} data-testid="done-title">
        {title}
      </h2>
      <p style={{ fontSize: 15.5, color: BODY, margin: '0 0 28px' }}>{sub}</p>
      {variant !== 'team' && <QuoteLink />}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3,1fr)',
          gap: 12,
          textAlign: 'left',
          marginBottom: 28,
        }}
      >
        {catalog.nextSteps.map((step, i) => (
          <div
            key={i}
            style={{
              background: '#ffffff',
              border: `1px solid ${BORDER}`,
              borderRadius: 15,
              padding: 18,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#EDF3FF',
                color: BLUE,
                fontSize: 13,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 10,
              }}
            >
              {i + 1}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5, color: INK }}>
              {lt(step, locale)}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          background: '#ffffff',
          border: `1px solid ${BORDER}`,
          borderRadius: 18,
          padding: 24,
          textAlign: 'left',
        }}
      >
        <div style={{ ...capsStyle, color: '#5B6B85', marginBottom: 10 }}>{t('onceLabel')}</div>
        {receipt.oneOff.map((line, i) => (
          <div key={i} style={{ ...lineStyle, ...(line.bold ? { fontWeight: 700 } : {}) }}>
            <span>{line.name}</span>
            <span>{line.price}</span>
          </div>
        ))}
        {voucher && (voucher.scope === 'one_time' || voucher.scope === 'both') && (
          <div style={discStyle}>
            <span>{tc('promoDiscountLine', { code: voucher.code, pct: voucher.percent })}</span>
            <span>−{fmt(totals.voucherSavedOneTime, locale, catalog)}</span>
          </div>
        )}
        <div style={totalRowStyle}>
          <span>{tc('sumOnce')}</span>
          <span>{fmt(totals.oneTimeEffective, locale, catalog)}</span>
        </div>
        <div style={{ ...capsStyle, color: '#1E4FD6', margin: '16px 0 10px' }}>
          {t('monthlyLabel')}
        </div>
        {receipt.monthly.map((line, i) => (
          <div key={i} style={lineStyle}>
            <span>{line.name}</span>
            <span>{line.price}</span>
          </div>
        ))}
        {voucher && (voucher.scope === 'recurring' || voucher.scope === 'both') && (
          <div style={discStyle}>
            <span>{tc('promoDiscountLine', { code: voucher.code, pct: voucher.percent })}</span>
            <span>−{mon(totals.voucherSavedMonthly, locale, catalog)}</span>
          </div>
        )}
        <div style={totalRowStyle}>
          <span>{tc('sumMonthly')}</span>
          <span>
            {mon(totals.monthlyEffective, locale, catalog)}
            {labels.perMonth}
          </span>
        </div>
        {totals.yearly > 0 && (
          <div style={{ ...totalRowStyle, fontSize: 13, fontWeight: 700 }}>
            <span>{t('yearlyLabel')}</span>
            <span>
              {mon(totals.yearlyEffective, locale, catalog)}
              {labels.perYear}
            </span>
          </div>
        )}
        <p style={{ margin: '12px 0 0', fontSize: 11.5, color: MUTED2 }}>{t('disclaimer')}</p>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 26 }}>
        {variant === 'team' && store.quote ? (
          <a
            href={`/admin/leads/${store.quote.leadId}`}
            data-testid="done-back-to-admin"
            className="hov-lift1"
            style={{
              textDecoration: 'none',
              background: 'linear-gradient(100deg,#1E4FD6,#22B8D8)',
              color: '#ffffff',
              borderRadius: 11,
              fontSize: 13.5,
              fontWeight: 700,
              padding: '11px 22px',
            }}
          >
            {t('backToAdmin')}
          </a>
        ) : null}
        {store.quote && (
          <button
            onClick={() => store.go('config')}
            data-testid="done-adjust"
            className="hov-blue-border hov-blue-text"
            style={secondaryButton}
          >
            {t('adjust')}
          </button>
        )}
        {variant !== 'team' && (
          <button onClick={() => store.restart()} data-testid="restart" className="hov-blue-border hov-blue-text" style={secondaryButton}>
            {t('restart')}
          </button>
        )}
      </div>
    </section>
  );
}

const secondaryButton: React.CSSProperties = {
  fontFamily: 'inherit',
  cursor: 'pointer',
  background: 'none',
  border: `1.5px solid ${BORDER}`,
  borderRadius: 11,
  color: BODY,
  fontSize: 13.5,
  fontWeight: 700,
  padding: '11px 22px',
  transition: 'all .15s',
};

const capsStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
};

const lineStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 13,
  padding: '3px 0',
};

const discStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 12.5,
  fontWeight: 700,
  color: GREEN,
  padding: '3px 0',
};

const totalRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 14,
  fontWeight: 800,
  paddingTop: 8,
  marginTop: 4,
  borderTop: '1px solid #EEF1F7',
};
