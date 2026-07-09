'use client';

import { useTranslations } from 'next-intl';
import type { Catalog } from '@/lib/types';
import { lt } from '@/lib/types';
import { fmt, mon } from '@/lib/format';
import { calcTotals } from '@/lib/pricing/engine';
import { buildReceipt } from '@/lib/pricing/summary';
import { useFunnel } from '@/stores/funnel';
import { useAppLocale, useSelection, useSummaryLabels } from './hooks';
import { BLUE, BODY, BORDER, GREEN, INK, MUTED2 } from './ui';

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
      <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.9, margin: '0 0 10px' }}>
        {t('title')}
      </h2>
      <p style={{ fontSize: 15.5, color: BODY, margin: '0 0 36px' }}>{t('sub')}</p>
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
            <span>−{fmt(totals.voucherSavedOneTime, locale)}</span>
          </div>
        )}
        <div style={totalRowStyle}>
          <span>{tc('sumOnce')}</span>
          <span>{fmt(totals.oneTimeEffective, locale)}</span>
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
            <span>−{mon(totals.voucherSavedMonthly, locale)}</span>
          </div>
        )}
        <div style={totalRowStyle}>
          <span>{tc('sumMonthly')}</span>
          <span>
            {mon(totals.monthlyEffective, locale)}
            {labels.perMonth}
          </span>
        </div>
        {totals.yearly > 0 && (
          <div style={{ ...totalRowStyle, fontSize: 13, fontWeight: 700 }}>
            <span>{t('yearlyLabel')}</span>
            <span>
              {mon(totals.yearlyEffective, locale)}
              {labels.perYear}
            </span>
          </div>
        )}
        <p style={{ margin: '12px 0 0', fontSize: 11.5, color: MUTED2 }}>{t('disclaimer')}</p>
      </div>
      <button
        onClick={() => store.restart()}
        data-testid="restart"
        className="hov-blue-border hov-blue-text"
        style={{
          fontFamily: 'inherit',
          cursor: 'pointer',
          marginTop: 26,
          background: 'none',
          border: `1.5px solid ${BORDER}`,
          borderRadius: 11,
          color: BODY,
          fontSize: 13.5,
          fontWeight: 700,
          padding: '11px 22px',
          transition: 'all .15s',
        }}
      >
        {t('restart')}
      </button>
    </section>
  );
}

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
