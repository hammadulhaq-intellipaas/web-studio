'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Catalog } from '@/lib/types';
import { fmt, mon } from '@/lib/format';
import { calcTotals } from '@/lib/pricing/engine';
import { buildReceipt } from '@/lib/pricing/summary';
import { useFunnel } from '@/stores/funnel';
import { useAppLocale, useSelection, useSummaryLabels } from './hooks';
import { BLUE, BORDER, GREEN, INK, LockIcon, MUTED, MUTED2, gradButton } from './ui';

export function PromoBox({ optional }: { optional?: boolean }) {
  const t = useTranslations('configurator');
  const store = useFunnel();

  const apply = async () => {
    const code = store.promoInput.trim().toUpperCase();
    if (!code) {
      store.setPromoMsg('empty');
      return;
    }
    try {
      const res = await fetch('/api/vouchers/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        store.setVoucher({ code, percent: data.percent, scope: data.scope });
      } else {
        store.setPromoMsg('invalid');
      }
    } catch {
      store.setPromoMsg('invalid');
    }
  };

  return (
    <div style={{ marginTop: optional ? 0 : 12 }}>
      <div
        style={{
          display: 'flex',
          border: `1.5px solid ${BORDER}`,
          borderRadius: 11,
          overflow: 'hidden',
        }}
      >
        <input
          value={store.promoInput}
          onChange={(ev) => store.setPromoInput(ev.target.value)}
          onKeyDown={(ev) => {
            if (ev.key === 'Enter') apply();
          }}
          placeholder={optional ? t('promoPlaceholderOptional') : t('promoPlaceholder')}
          data-testid="promo-input"
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: 'inherit',
            fontSize: 13,
            padding: '11px 12px',
            border: 'none',
            background: '#ffffff',
            color: INK,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        />
        <button
          onClick={apply}
          data-testid="promo-apply"
          className="hov-ink-bg"
          style={{
            fontFamily: 'inherit',
            cursor: 'pointer',
            border: 'none',
            background: INK,
            color: '#ffffff',
            padding: '0 18px',
            fontSize: 12.5,
            fontWeight: 800,
          }}
        >
          {t('promoApply')}
        </button>
      </div>
      {store.promoMsg && (
        <div
          data-testid="promo-error"
          style={{ fontSize: 11.5, fontWeight: 700, color: '#D6493E', marginTop: 6 }}
        >
          {store.promoMsg === 'empty' ? t('promoErrEmpty') : t('promoErrInvalid')}
        </div>
      )}
    </div>
  );
}

export function PriceSidebar({ catalog }: { catalog: Catalog }) {
  const t = useTranslations('configurator');
  const locale = useAppLocale();
  const labels = useSummaryLabels();
  const store = useFunnel();
  const selection = useSelection();

  const totals = calcTotals(catalog, selection);
  const receipt = buildReceipt(catalog, selection, locale, labels);

  // Animated count-up (ported from the prototype's tweenTotals)
  const [disp, setDisp] = useState({ e: totals.oneTimeEffective, m: totals.monthlyEffective });
  const prev = useRef({ e: totals.oneTimeEffective, m: totals.monthlyEffective });
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const target = { e: totals.oneTimeEffective, m: totals.monthlyEffective };
    if (prev.current.e === target.e && prev.current.m === target.m) return;
    const start = { ...prev.current };
    prev.current = target;
    if (raf.current) cancelAnimationFrame(raf.current);
    const t0 = performance.now();
    const dur = 450;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const k = 1 - Math.pow(1 - p, 3);
      setDisp({
        e: start.e + (target.e - start.e) * k,
        m: start.m + (target.m - start.m) * k,
      });
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [totals.oneTimeEffective, totals.monthlyEffective]);

  const voucher = store.voucher;

  return (
    <aside
      data-cfg-side="1"
      style={{
        position: 'sticky',
        top: 86,
        background: '#ffffff',
        border: `1px solid ${BORDER}`,
        borderRadius: 18,
        padding: '20px 20px 18px',
        boxShadow: '0 14px 34px -20px rgba(15,36,64,.3)',
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          color: MUTED,
          marginBottom: 14,
        }}
      >
        {t('sidebarTitle')}
      </div>

      {/* One-time */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span style={groupLabelStyle}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: '#5B6B85' }} />
          {t('onceLabel')}
        </span>
        <span style={{ fontSize: 11, color: MUTED2 }}>{t('oncePayment')}</span>
      </div>
      {receipt.oneOff.map((line, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 10,
            fontSize: 12.5,
            padding: '4px 0',
          }}
        >
          <span style={{ minWidth: 0, ...(line.bold ? { fontWeight: 700 } : { color: '#4A5872' }) }}>
            {line.name}
          </span>
          <span
            style={{
              whiteSpace: 'nowrap',
              fontVariantNumeric: 'tabular-nums',
              ...(line.bold ? { fontWeight: 700 } : { color: '#4A5872' }),
            }}
          >
            {line.price}
          </span>
        </div>
      ))}
      {voucher && (voucher.scope === 'one_time' || voucher.scope === 'both') && (
        <div style={discLineStyle}>
          <span>{t('promoDiscountLine', { code: voucher.code, pct: voucher.percent })}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            −{fmt(totals.voucherSavedOneTime, locale)}
          </span>
        </div>
      )}
      <div style={sumRowStyle}>
        <span style={{ fontSize: 13, fontWeight: 800 }}>{t('sumOnce')}</span>
        <span
          data-testid="sum-once"
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: -0.5,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {fmt(disp.e, locale)}
        </span>
      </div>

      {/* Monthly */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
          margin: '18px 0 8px',
        }}
      >
        <span style={groupLabelStyle}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: BLUE }} />
          {t('monthlyLabel')}
        </span>
        <span style={{ fontSize: 11, color: MUTED2 }}>{t('monthlySub')}</span>
      </div>
      {receipt.monthly.map((line, i) => (
        <div key={i} style={{ padding: '4px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5 }}>
            <span style={{ minWidth: 0 }}>{line.name}</span>
            <span style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              {line.price}
            </span>
          </div>
          {line.desc && (
            <div style={{ fontSize: 10.5, color: MUTED2, lineHeight: 1.4, marginTop: 1 }}>
              {line.desc}
            </div>
          )}
        </div>
      ))}
      {voucher && (voucher.scope === 'recurring' || voucher.scope === 'both') && (
        <div style={discLineStyle}>
          <span>{t('promoDiscountLine', { code: voucher.code, pct: voucher.percent })}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            −{mon(totals.voucherSavedMonthly, locale)}
            {labels.perMonth}
          </span>
        </div>
      )}
      <div style={sumRowStyle}>
        <span style={{ fontSize: 13, fontWeight: 800 }}>{t('sumMonthly')}</span>
        <span
          data-testid="sum-monthly"
          style={{
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: -0.4,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {mon(disp.m, locale)}
          {labels.perMonth}
        </span>
      </div>

      {/* Yearly items */}
      {totals.yearly > 0 && (
        <div style={{ ...sumRowStyle, marginTop: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>{t('yearlyItemsLabel')}</span>
          <span style={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
            {mon(totals.yearlyEffective, locale)}
            {labels.perYear}
          </span>
        </div>
      )}

      {/* Payment cycle */}
      <div
        style={{ marginTop: 16, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}
      >
        <div style={{ display: 'flex' }}>
          <button
            onClick={() => store.setPayYearly(true)}
            data-testid="pay-yearly"
            style={{
              ...cycleBtnStyle,
              background: store.payYearly ? INK : '#ffffff',
              color: store.payYearly ? '#ffffff' : MUTED,
            }}
          >
            {t('payYearly')}
          </button>
          <button
            onClick={() => store.setPayYearly(false)}
            data-testid="pay-monthly"
            style={{
              ...cycleBtnStyle,
              background: store.payYearly ? '#ffffff' : INK,
              color: store.payYearly ? MUTED : '#ffffff',
            }}
          >
            {t('payMonthly')}
          </button>
        </div>
        <div
          style={{
            fontSize: 11,
            lineHeight: 1.45,
            color: '#2E7D57',
            background: '#EAF5EE',
            padding: '8px 12px',
            borderTop: '1px solid #DCEBE1',
          }}
        >
          {(() => {
            const vr =
              voucher && voucher.scope !== 'one_time' ? 1 - voucher.percent / 100 : 1;
            const pct = catalog.yearlyDiscountPct;
            return store.payYearly
              ? t('yearlyNoteActive', {
                  yearTotal: mon(totals.monthlyEffective * 12, locale),
                  savings: mon((totals.monthly - totals.monthlyDiscounted) * vr * 12, locale),
                })
              : t('yearlyNoteInactive', {
                  pct,
                  discounted: mon(totals.monthly * (1 - pct / 100) * vr, locale),
                  full: mon(totals.monthly * vr, locale),
                });
          })()}
        </div>
      </div>

      {/* Promo */}
      {!voucher ? (
        <PromoBox />
      ) : (
        <div
          data-testid="promo-active"
          style={{
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#EAF5EE',
            border: '1px solid #BFE0CC',
            borderRadius: 11,
            padding: '10px 13px',
          }}
        >
          <span
            style={{
              flex: 'none',
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: GREEN,
              color: '#fff',
              fontSize: 12,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✓
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: '#1E6E44' }}>
              {t('promoActive', { code: voucher.code, pct: voucher.percent })}
            </div>
            <div style={{ fontSize: 10.5, color: '#3C7A57' }}>
              {t('promoSavings', {
                amount: t('promoSavingsAmount', {
                  once: fmt(totals.voucherSavedOneTime, locale),
                  monthly: mon(totals.voucherSavedMonthly, locale),
                }),
              })}
            </div>
          </div>
          <button
            onClick={() => store.setVoucher(null)}
            className="hov-ink-text"
            style={{
              fontFamily: 'inherit',
              cursor: 'pointer',
              flex: 'none',
              background: 'none',
              border: 'none',
              color: '#3C7A57',
              fontSize: 16,
              fontWeight: 700,
              padding: '0 2px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}

      <p style={{ margin: '14px 0 14px', fontSize: 11, lineHeight: 1.5, color: MUTED2 }}>
        {t('disclaimer')}
      </p>
      <button
        onClick={() => store.go('lead')}
        data-testid="to-lead"
        className="hov-lift1"
        style={{
          ...gradButton,
          width: '100%',
          borderRadius: 12,
          padding: 15,
          fontSize: 15.5,
          fontWeight: 700,
          boxShadow: '0 10px 22px -8px rgba(30,79,214,.5)',
        }}
      >
        {t('ctaLead')}
      </button>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
          marginTop: 11,
        }}
      >
        <LockIcon />
        <span style={{ fontSize: 10.5, fontWeight: 600, color: MUTED }}>{t('sslShort')}</span>
      </div>
    </aside>
  );
}

const groupLabelStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0.6,
  textTransform: 'uppercase',
  color: INK,
};

const discLineStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 10,
  fontSize: 12.5,
  fontWeight: 700,
  color: GREEN,
  padding: '4px 0',
};

const sumRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  padding: '8px 0 2px',
  borderTop: '1px solid #EEF1F7',
  marginTop: 6,
};

const cycleBtnStyle: React.CSSProperties = {
  flex: 1,
  fontFamily: 'inherit',
  cursor: 'pointer',
  border: 'none',
  padding: '11px 8px',
  fontSize: 12.5,
  fontWeight: 700,
  transition: 'all .15s',
};
