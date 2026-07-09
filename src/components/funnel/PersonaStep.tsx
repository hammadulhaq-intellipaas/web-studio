'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { Catalog, Locale } from '@/lib/types';
import { pickLocale } from '@/lib/types';
import { useFunnel } from '@/stores/funnel';
import { backButton, BLUE, BODY, BORDER } from './ui';

export function PersonaStep({ catalog }: { catalog: Catalog }) {
  const t = useTranslations('persona');
  const tc = useTranslations('common');
  const locale = useLocale() as Locale;
  const go = useFunnel((s) => s.go);
  const persona = useFunnel((s) => s.persona);
  const pickPersona = useFunnel((s) => s.pickPersona);

  return (
    <section data-screen="persona" style={{ animation: 'ipFade .4s ease both', padding: '52px 0 72px' }}>
      <button onClick={() => go('intro')} className="hov-blue-text" style={backButton}>
        {tc('back')}
      </button>
      <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.8, margin: '0 0 8px' }}>
        {t('title')}
      </h2>
      <p style={{ fontSize: 15.5, color: BODY, margin: '0 0 32px' }}>{t('sub')}</p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))',
          gap: 14,
        }}
      >
        {catalog.personas.map((p) => (
          <button
            key={p.id}
            data-testid={`persona-${p.id}`}
            onClick={() => pickPersona(catalog, p.id)}
            className="hov-card"
            style={{
              fontFamily: 'inherit',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              textAlign: 'left',
              background: '#ffffff',
              border: `1.5px solid ${persona === p.id ? BLUE : BORDER}`,
              borderRadius: 16,
              padding: '20px 18px',
              minHeight: 76,
              transition: 'border-color .15s,transform .15s,box-shadow .15s',
            }}
          >
            <span
              style={{
                flex: 'none',
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#EDF3FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
                <path
                  d={p.icon_path}
                  stroke={BLUE}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>
              {pickLocale(p as unknown as Record<string, unknown>, 'label', locale)}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
