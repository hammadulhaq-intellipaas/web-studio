'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { InlineWidget, useCalendlyEventListener } from 'react-calendly';
import ReactMarkdown from 'react-markdown';
import type { Catalog } from '@/lib/types';
import { fmt, mon } from '@/lib/format';
import { calcTotals } from '@/lib/pricing/engine';
import { buildReceipt } from '@/lib/pricing/summary';
import { Link } from '@/i18n/navigation';
import { useFunnel, type LeadForm } from '@/stores/funnel';
import { useAppLocale, useSelection, useSummaryLabels } from './hooks';
import { IntakeSections } from './IntakeSections';
import { PromoBox } from './PriceSidebar';
import { backButton, BLUE, BODY, BORDER, GREEN, gradButton, INK, LockIcon, MUTED, MUTED2 } from './ui';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function CalendlyPanel({ catalog }: { catalog: Catalog }) {
  const t = useTranslations('lead');
  const store = useFunnel();
  const locale = useAppLocale();

  useCalendlyEventListener({
    onEventScheduled: () => store.setCalendlyBooked(true),
  });

  if (!catalog.calendlyEventUrl) return null;

  return (
    <div style={{ marginTop: 22 }}>
      <h3 style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.4, margin: '0 0 6px' }}>
        {t('calendlyTitle')}
      </h3>
      <p style={{ fontSize: 14, color: BODY, margin: '0 0 12px' }}>{t('calendlySub')}</p>
      {store.calendlyBooked && (
        <div
          data-testid="calendly-booked"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#EAF5EE',
            border: '1px solid #BFE0CC',
            borderRadius: 11,
            padding: '10px 13px',
            marginBottom: 12,
            fontSize: 13,
            fontWeight: 700,
            color: '#1E6E44',
          }}
        >
          ✓ {t('calendlyBooked')}
        </div>
      )}
      <div style={{ background: '#ffffff', border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden' }}>
        <InlineWidget
          url={catalog.calendlyEventUrl}
          prefill={{
            name: `${store.lead.vorname} ${store.lead.nachname}`.trim(),
            email: store.lead.email,
          }}
          utm={{ utmSource: 'web-studio', utmContent: store.leadId ?? undefined }}
          pageSettings={{ hideGdprBanner: true, primaryColor: '1E5EFF' }}
          styles={{ height: '640px' }}
          // Calendly picks the display language from the event settings; locale shown for context
          key={locale}
        />
      </div>
    </div>
  );
}

/**
 * GDPR consent line. The wording is CMS-managed (legal_pages/consent) and rendered as
 * markdown so its link to the privacy policy stays editable; the i18n key is the fallback.
 */
function ConsentText({ catalog }: { catalog: Catalog }) {
  const t = useTranslations('lead');
  const locale = useAppLocale();
  const consent = catalog.legalPages.find(
    (p) => p.page_key === 'consent' && p.locale === locale,
  );

  const policyLink = (chunks: React.ReactNode) => (
    <Link href="/datenschutz" style={{ color: BLUE, fontWeight: 600 }} target="_blank">
      {chunks}
    </Link>
  );

  if (!consent) return <>{t.rich('consent', { link: policyLink })}</>;

  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <>{children}</>,
        a: ({ children }) => policyLink(children),
      }}
    >
      {consent.content_markdown}
    </ReactMarkdown>
  );
}

export function LeadStep({ catalog }: { catalog: Catalog }) {
  const t = useTranslations('lead');
  const tc = useTranslations('configurator');
  const locale = useAppLocale();
  const labels = useSummaryLabels();
  const store = useFunnel();
  const selection = useSelection();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const totals = calcTotals(catalog, selection);
  const receipt = buildReceipt(catalog, selection, locale, labels);
  const voucher = store.voucher;
  const submitted = !!store.leadId;

  const submit = async () => {
    const l = store.lead;
    const errs: Partial<Record<keyof LeadForm, string>> = {};
    if (!EMAIL_RE.test(l.email)) errs.email = t('errEmail');
    if (!l.tel || l.tel.replace(/\D/g, '').length < 6) errs.tel = t('errTel');
    if (!l.consent) errs.consent = t('errConsent');
    if (Object.keys(errs).length) {
      store.setLeadErr(errs);
      return;
    }
    setSubmitting(true);
    setSubmitError(false);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          lead: l,
          selection,
          sessionId: store.sessionId,
          siteNotes: store.siteNotes,
          // Optional intake, collected in the collapsed sections of this same form.
          stage2: { fields: store.s2, goal: store.goal, driveLink: store.drive },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.id) throw new Error('submit failed');
      store.setLeadId(data.id);
      // Booking is the last step; without Calendly the inquiry is already complete.
      if (!catalog.calendlyEventUrl) store.go('done');
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const fields: {
    key: 'vorname' | 'nachname' | 'firma' | 'email' | 'tel';
    span: string;
    type: string;
    ph?: string;
    required: boolean;
  }[] = [
    { key: 'vorname', span: 'auto', type: 'text', required: false },
    { key: 'nachname', span: 'auto', type: 'text', required: false },
    { key: 'firma', span: '1 / -1', type: 'text', required: false },
    { key: 'email', span: 'auto', type: 'email', ph: t('phEmail'), required: true },
    { key: 'tel', span: 'auto', type: 'tel', ph: t('phTel'), required: true },
  ];

  return (
    <section
      data-screen="lead"
      style={{ animation: 'ipFade .4s ease both', padding: '52px 0 80px', maxWidth: 680 }}
    >
      <button onClick={() => store.go('config')} className="hov-blue-text" style={backButton}>
        {t('back')}
      </button>
      <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.8, margin: '0 0 8px' }}>
        {t('title')}
      </h2>
      <p style={{ fontSize: 15.5, color: BODY, margin: '0 0 24px' }}>{t('sub')}</p>

      {/* Summary */}
      <div
        style={{
          background: '#ffffff',
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          padding: '20px 22px',
          marginBottom: 22,
        }}
      >
        <div style={{ ...capsStyle, color: '#5B6B85', marginBottom: 10 }}>{t('onceHeader')}</div>
        {receipt.oneOff.map((line, i) => (
          <div key={i} style={{ ...lineStyle, ...(line.bold ? { fontWeight: 700 } : {}) }}>
            <span>{line.name}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{line.price}</span>
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
        <div style={{ ...capsStyle, color: '#1E4FD6', margin: '18px 0 10px' }}>
          {t('monthlyHeader')}
        </div>
        {receipt.monthly.map((line, i) => (
          <div key={i} style={{ padding: '3px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }}>
              <span>{line.name}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{line.price}</span>
            </div>
            {line.desc && (
              <div style={{ fontSize: 10.5, color: MUTED2, marginTop: 1 }}>{line.desc}</div>
            )}
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
      </div>

      {!voucher && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, maxWidth: 360 }}>
          <div style={{ flex: 1 }}>
            <PromoBox optional />
          </div>
        </div>
      )}

      {!submitted ? (
        <div
          style={{ background: '#ffffff', border: `1px solid ${BORDER}`, borderRadius: 18, padding: 26 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {fields.map((f) => (
              <div key={f.key} style={{ gridColumn: f.span, minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  {t(`fields.${f.key}`)}
                  {f.required && <span style={{ color: '#D6493E' }}> *</span>}
                </label>
                <input
                  type={f.type}
                  data-testid={`lead-${f.key}`}
                  value={store.lead[f.key]}
                  onChange={(ev) => store.setLeadField(f.key, ev.target.value)}
                  placeholder={f.ph ?? ''}
                  style={{
                    width: '100%',
                    fontFamily: 'inherit',
                    fontSize: 14.5,
                    padding: '12px 13px',
                    border: `1.5px solid ${store.leadErr[f.key] ? '#D6493E' : BORDER}`,
                    borderRadius: 10,
                    background: '#ffffff',
                    color: INK,
                  }}
                />
                {store.leadErr[f.key] && (
                  <div
                    data-testid={`lead-err-${f.key}`}
                    style={{ fontSize: 12, fontWeight: 600, color: '#D6493E', marginTop: 5 }}
                  >
                    {store.leadErr[f.key]}
                  </div>
                )}
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                {t('zielLabel')}{' '}
                <span style={{ color: MUTED, fontWeight: 500 }}>{t('zielOptional')}</span>
              </label>
              <textarea
                value={store.lead.ziel}
                data-testid="lead-ziel"
                onChange={(ev) => store.setLeadField('ziel', ev.target.value)}
                rows={2}
                placeholder={t('zielPh')}
                style={{
                  width: '100%',
                  fontFamily: 'inherit',
                  fontSize: 14.5,
                  padding: '12px 13px',
                  border: `1.5px solid ${BORDER}`,
                  borderRadius: 10,
                  background: '#ffffff',
                  color: INK,
                  resize: 'vertical',
                }}
              />
            </div>
            {/* Optional intake — collapsed; speeds up the build if filled in now. */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {t('optionalIntakeTitle')}{' '}
                  <span style={{ color: MUTED, fontWeight: 500 }}>{t('zielOptional')}</span>
                </div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 3, lineHeight: 1.45 }}>
                  {t('optionalIntakeSub')}
                </div>
              </div>
              <IntakeSections />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', gap: 11, alignItems: 'flex-start', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  data-testid="lead-consent"
                  checked={store.lead.consent}
                  onChange={(ev) => store.setLeadField('consent', ev.target.checked)}
                  style={{ marginTop: 3, width: 17, height: 17, accentColor: BLUE, flex: 'none' }}
                />
                <span style={{ fontSize: 13, lineHeight: 1.5, color: BODY }}>
                  <ConsentText catalog={catalog} />
                  <span style={{ color: '#D6493E' }}> *</span>
                </span>
              </label>
              {store.leadErr.consent && (
                <div
                  data-testid="lead-err-consent"
                  style={{ fontSize: 12, fontWeight: 600, color: '#D6493E', marginTop: 5 }}
                >
                  {store.leadErr.consent}
                </div>
              )}
            </div>
          </div>
          {submitError && (
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#D6493E', marginTop: 14 }}>
              {t('errSubmit')}
            </div>
          )}
          <button
            onClick={submit}
            disabled={submitting}
            data-testid="lead-submit"
            className="hov-lift1"
            style={{
              ...gradButton,
              width: '100%',
              marginTop: 22,
              borderRadius: 12,
              padding: 16,
              fontSize: 15.5,
              fontWeight: 700,
              boxShadow: '0 10px 22px -8px rgba(30,79,214,.5)',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? t('submitting') : t('cta')}
          </button>
          <p style={{ margin: '12px 0 0', textAlign: 'center', fontSize: 12, color: MUTED }}>
            {t('noRisk')}
          </p>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 7,
              marginTop: 14,
              flexWrap: 'wrap',
              borderTop: `1px solid ${BORDER}`,
              paddingTop: 14,
            }}
          >
            <LockIcon size={13} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: GREEN }}>{t('dataSafe')}</span>
            <span style={{ fontSize: 11.5, color: MUTED }}>{t('sslLong')}</span>
          </div>
        </div>
      ) : (
        <div>
          <CalendlyPanel catalog={catalog} />
          <div style={{ display: 'flex', gap: 14, marginTop: 22, alignItems: 'center' }}>
            <button
              onClick={() => store.go('done')}
              data-testid="calendly-continue"
              className="hov-lift1"
              style={{
                ...gradButton,
                borderRadius: 12,
                padding: '14px 30px',
                fontSize: 15,
                fontWeight: 700,
                boxShadow: '0 10px 22px -8px rgba(30,79,214,.5)',
              }}
            >
              {t('calendlyContinue')}
            </button>
            {!store.calendlyBooked && (
              <button
                onClick={() => store.go('done')}
                className="hov-blue-text"
                style={{
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  color: MUTED,
                  fontSize: 13.5,
                  fontWeight: 600,
                }}
              >
                {t('calendlySkip')}
              </button>
            )}
          </div>
        </div>
      )}
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
  gap: 10,
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
  paddingTop: 8,
  marginTop: 4,
  borderTop: '1px solid #EEF1F7',
  fontSize: 14,
  fontWeight: 800,
};
