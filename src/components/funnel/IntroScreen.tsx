'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { Catalog, Locale } from '@/lib/types';
import { lt } from '@/lib/types';
import { useFunnel } from '@/stores/funnel';
import { BODY, CheckIcon, gradButton } from './ui';

export function IntroScreen({ catalog }: { catalog: Catalog }) {
  const t = useTranslations('intro');
  const tq = useTranslations('quote');
  const locale = useLocale() as Locale;
  const startSession = useFunnel((s) => s.startSession);
  const notice = useFunnel((s) => s.notice);

  return (
    <section
      data-screen="intro"
      style={{
        animation: 'ipFade .5s ease both',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: 'clamp(56px,9vw,104px) 0 clamp(64px,9vw,104px)',
      }}
    >
      {notice === 'link_dead' && (
        <div
          data-testid="notice-link-dead"
          role="status"
          style={{
            background: '#FFF7ED',
            border: '1px solid #FED7AA',
            color: '#9A3412',
            borderRadius: 12,
            padding: '10px 16px',
            fontSize: 13.5,
            fontWeight: 600,
            marginBottom: 22,
          }}
        >
          {tq('linkDead')}
        </div>
      )}
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
      {/* The trust points as one quiet line under the button, not a row of pills. Each point
          keeps its check mark when the line wraps on a phone. */}
      {catalog.trustItems.length > 0 && (
        <ul
          data-testid="intro-trust"
          style={{
            listStyle: 'none',
            margin: '26px 0 0',
            padding: 0,
            maxWidth: 880,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '8px 22px',
          }}
        >
          {catalog.trustItems.map((item) => (
            <li
              key={item.de}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 500, color: BODY, whiteSpace: 'nowrap' }}
            >
              <CheckIcon />
              {lt(item, locale)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
