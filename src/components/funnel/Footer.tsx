'use client';

import { useTranslations } from 'next-intl';
import NextLink from 'next/link';
import { Link } from '@/i18n/navigation';
import { BODY, BORDER, INK } from './ui';

const linkStyle = { color: BODY, textDecoration: 'none' } as const;

/**
 * The one site footer, shared by the configurator, the onboarding form and the legal pages:
 * brand and copyright on the left, the legal links on the right, stacked on phones
 * (`.site-footer-*` in globals.css). The admin link is for a signed-in team member only.
 */
export function Footer({ showAdminLink = false }: { showAdminLink?: boolean }) {
  const t = useTranslations('common');

  return (
    <footer style={{ borderTop: `1px solid ${BORDER}`, background: '#ffffff' }}>
      <div
        className="site-footer-row"
        style={{
          maxWidth: 1140,
          margin: '0 auto',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px 32px',
          fontSize: 13,
          color: BODY,
        }}
      >
        <div className="site-footer-brand" style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '2px 14px' }}>
          <span style={{ fontWeight: 700, color: INK }}>{t('footerBrand')}</span>
          <span>{t('footerCopyright', { year: new Date().getFullYear() })}</span>
        </div>
        <nav style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px 20px' }}>
          <Link href="/impressum" className="hov-blue-text" style={linkStyle}>
            {t('impressum')}
          </Link>
          <Link href="/datenschutz" className="hov-blue-text" style={linkStyle}>
            {t('datenschutz')}
          </Link>
          {showAdminLink && (
            <NextLink href="/admin" className="hov-blue-text" style={linkStyle} data-testid="footer-admin-link">
              {t('adminLink')}
            </NextLink>
          )}
        </nav>
      </div>
    </footer>
  );
}
