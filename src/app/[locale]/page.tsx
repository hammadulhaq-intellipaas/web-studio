import { setRequestLocale } from 'next-intl/server';
import { getCatalog } from '@/lib/catalog';
import { FunnelShell } from '@/components/funnel/FunnelShell';

export const dynamic = 'force-dynamic';

export default async function FunnelPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const catalog = await getCatalog();

  return <FunnelShell catalog={catalog} />;
}
