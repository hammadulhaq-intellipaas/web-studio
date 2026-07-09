'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { BORDER, INK, MUTED } from './ui';
import { LockIcon } from './ui';

export function Footer() {
  const t = useTranslations('common');

  return (
    <footer style={{ borderTop: `1px solid ${BORDER}`, background: '#ffffff' }}>
      <div
        style={{
          maxWidth: 1140,
          margin: '0 auto',
          padding: '18px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 18,
          fontSize: 12.5,
          color: MUTED,
        }}
      >
        <span style={{ fontWeight: 700, color: INK }}>{t('footerBrand')}</span>
        <Link href="/impressum" className="hov-blue-text" style={{ color: MUTED, textDecoration: 'none' }}>
          {t('impressum')}
        </Link>
        <Link href="/datenschutz" className="hov-blue-text" style={{ color: MUTED, textDecoration: 'none' }}>
          {t('datenschutz')}
        </Link>
        <a
          href="/admin"
          className="hov-blue-text"
          style={{ color: '#B9C6DB', fontSize: 11.5, fontWeight: 600, textDecoration: 'none' }}
        >
          {t('adminLink')}
        </a>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <LockIcon color={MUTED} />
          {t('footerBadges')}
        </span>
      </div>
    </footer>
  );
}
