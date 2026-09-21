'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LanguageToggle } from '@/components/funnel/Header';
import { BLUE, BORDER, INK, MUTED } from '@/components/funnel/ui';

/**
 * Same chrome as the configurator header (logo, Web Studio badge, DE/EN) with an optional
 * progress bar and a "save and come back later" control supplied by the shell.
 */
export function OnboardingHeader({
  progress,
  stepLabel,
  onLocaleChange,
  actions,
}: {
  /** 0–100, or undefined for pages without a progress bar. */
  progress?: number;
  stepLabel?: string;
  onLocaleChange?: (locale: 'de' | 'en') => void;
  actions?: React.ReactNode;
}) {
  const t = useTranslations('common');

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
          flexWrap: 'wrap',
        }}
      >
        <Link
          href="/onboardingform"
          title={t('logoAlt')}
          className="hov-fade"
          style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none' }}
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
        </Link>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {progress !== undefined && (
            <>
              {stepLabel && (
                <span
                  data-testid="onb-step-label"
                  className="onb-desktop-only"
                  style={{ fontSize: 12.5, fontWeight: 600, color: MUTED, whiteSpace: 'nowrap' }}
                >
                  {stepLabel}
                </span>
              )}
              <div
                aria-hidden
                style={{ width: 140, height: 6, borderRadius: 999, background: BORDER, overflow: 'hidden' }}
              >
                <div
                  data-testid="onb-progress"
                  style={{
                    height: '100%',
                    borderRadius: 999,
                    background: 'linear-gradient(90deg,#1E4FD6,#22B8D8)',
                    width: `${Math.max(0, Math.min(100, progress))}%`,
                    transition: 'width .45s cubic-bezier(.4,0,.2,1)',
                  }}
                />
              </div>
            </>
          )}
          {actions}
          <LanguageToggle onChange={onLocaleChange} />
        </div>
      </div>
    </header>
  );
}
