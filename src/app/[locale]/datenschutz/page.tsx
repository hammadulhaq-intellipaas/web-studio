import { getTranslations, setRequestLocale } from 'next-intl/server';
import ReactMarkdown from 'react-markdown';
import { Link } from '@/i18n/navigation';
import { getCatalog } from '@/lib/catalog';
import type { Locale } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DatenschutzPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('legal');
  const tc = await getTranslations('common');

  // Policy text is CMS-managed (legal_pages); the i18n keys remain the fallback.
  const catalog = await getCatalog();
  const page = catalog.legalPages.find(
    (p) => p.page_key === 'privacy' && p.locale === (locale as Locale),
  );

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px' }}>
      <Link href="/" style={{ color: '#7A879B', fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}>
        {tc('back')}
      </Link>
      <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.8, margin: '22px 0 16px' }}>
        {page?.title || t('datenschutzTitle')}
      </h1>
      {page ? (
        <div className="legal-markdown" data-testid="privacy-content">
          <ReactMarkdown>{page.content_markdown}</ReactMarkdown>
        </div>
      ) : (
        <p style={{ fontSize: 15, lineHeight: 1.6, color: '#4A5872', whiteSpace: 'pre-line' }}>
          {t('datenschutzBody')}
        </p>
      )}
    </main>
  );
}
