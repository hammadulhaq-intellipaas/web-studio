'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useFunnel, type FunnelStep } from '@/stores/funnel';
import { BLUE, BORDER, INK, MUTED } from './ui';

const STEP_NUMS: Partial<Record<FunnelStep, number>> = {
  persona: 1,
  questions: 2,
  config: 3,
  lead: 4,
};

const TOTAL_STEPS = 4;

function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const pill = (target: 'de' | 'en') => {
    const active = locale === target;
    return (
      <button
        key={target}
        onClick={() => router.replace(pathname, { locale: target })}
        aria-label={target === 'de' ? 'Deutsch' : 'English'}
        style={{
          fontFamily: 'inherit',
          cursor: 'pointer',
          border: 'none',
          padding: '5px 10px',
          fontSize: 11.5,
          fontWeight: 800,
          letterSpacing: 0.5,
          background: active ? INK : 'transparent',
          color: active ? '#ffffff' : MUTED,
          transition: 'all .15s',
        }}
      >
        {target.toUpperCase()}
      </button>
    );
  };

  return (
    <span
      data-testid="language-toggle"
      style={{
        display: 'inline-flex',
        border: `1px solid ${BORDER}`,
        borderRadius: 999,
        overflow: 'hidden',
        flex: 'none',
      }}
    >
      {pill('de')}
      {pill('en')}
    </span>
  );
}

export function Header() {
  const t = useTranslations('common');
  const step = useFunnel((s) => s.step);
  const go = useFunnel((s) => s.go);
  const stepNum = STEP_NUMS[step];

  return (
    <header
      style={{
        background: '#ffffff',
        borderBottom: `1px solid ${BORDER}`,
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 1140,
          margin: '0 auto',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <button
          onClick={() => go('intro')}
          title={t('logoAlt')}
          className="hov-fade"
          style={{
            fontFamily: 'inherit',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <Image
            src="/intellipaas-logo.png"
            alt={t('logoAlt')}
            width={44}
            height={44}
            style={{ height: 44, width: 44, objectFit: 'cover', objectPosition: 'center 38%' }}
          />
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: -0.2, color: INK }}>
              IntelliPaaS<span style={{ color: BLUE }}>.io</span>
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                color: MUTED,
                border: `1px solid ${BORDER}`,
                borderRadius: 999,
                padding: '3px 9px',
              }}
            >
              {t('webStudio')}
            </span>
          </span>
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {stepNum ? (
            <>
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: MUTED,
                  whiteSpace: 'nowrap',
                }}
              >
                {t('stepOf', { num: stepNum, total: TOTAL_STEPS })}
              </span>
              <div
                style={{
                  width: 140,
                  height: 6,
                  borderRadius: 999,
                  background: BORDER,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    borderRadius: 999,
                    background: 'linear-gradient(90deg,#1E4FD6,#22B8D8)',
                    width: `${(stepNum / TOTAL_STEPS) * 100}%`,
                    transition: 'width .45s cubic-bezier(.4,0,.2,1)',
                  }}
                />
              </div>
            </>
          ) : null}
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
