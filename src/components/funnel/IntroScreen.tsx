'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import type { Catalog, Locale } from '@/lib/types';
import { lt } from '@/lib/types';
import { useFunnel } from '@/stores/funnel';
import { BODY, BORDER, CheckIcon, gradButton, INK } from './ui';

export function IntroScreen({ catalog }: { catalog: Catalog }) {
  const t = useTranslations('intro');
  const locale = useLocale() as Locale;
  const startSession = useFunnel((s) => s.startSession);

  return (
    <section
      data-screen="intro"
      style={{
        animation: 'ipFade .5s ease both',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '72px 0 80px',
      }}
    >
      <Image
        src="/intellipaas-logo.png"
        alt=""
        width={110}
        height={110}
        priority
        style={{ height: 110, width: 'auto', marginBottom: 8 }}
      />
      <h1
        style={{
          fontSize: 'clamp(30px,4.5vw,46px)',
          fontWeight: 800,
          letterSpacing: -1.2,
          lineHeight: 1.12,
          margin: '0 0 16px',
          maxWidth: 720,
          textWrap: 'balance',
        }}
      >
        {t('headline')}
      </h1>
      <p
        style={{
          fontSize: 18,
          lineHeight: 1.55,
          color: BODY,
          margin: '0 0 28px',
          maxWidth: 560,
          textWrap: 'pretty',
        }}
      >
        {t('sub')}
      </p>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 10,
          marginBottom: 36,
          maxWidth: 660,
        }}
      >
        {catalog.trustItems.map((item) => (
          <span
            key={item.de}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              fontSize: 13,
              fontWeight: 600,
              color: INK,
              background: '#ffffff',
              border: `1px solid ${BORDER}`,
              borderRadius: 999,
              padding: '8px 14px',
            }}
          >
            <CheckIcon />
            {lt(item, locale)}
          </span>
        ))}
      </div>
      <button
        onClick={() => startSession()}
        className="hov-cta"
        style={{
          ...gradButton,
          borderRadius: 14,
          padding: '17px 44px',
          fontSize: 17,
          fontWeight: 700,
          boxShadow: '0 10px 26px -8px rgba(30,79,214,.55)',
        }}
      >
        {t('cta')}
      </button>
    </section>
  );
}
