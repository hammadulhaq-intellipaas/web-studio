import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function ImpressumPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('legal');
  const tc = await getTranslations('common');

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px' }}>
      <Link href="/" style={{ color: '#7A879B', fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}>
        {tc('back')}
      </Link>
      <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.8, margin: '22px 0 16px' }}>
        {t('impressumTitle')}
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: '#4A5872', whiteSpace: 'pre-line' }}>
        {t('impressumBody')}
      </p>
    </main>
  );
}
