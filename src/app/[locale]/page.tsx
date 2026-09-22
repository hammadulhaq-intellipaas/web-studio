import { setRequestLocale } from 'next-intl/server';
import { getCatalog } from '@/lib/catalog';
import { actorEmail, currentActor } from '@/lib/quotes/actor';
import { FunnelShell } from '@/components/funnel/FunnelShell';

export const dynamic = 'force-dynamic';

export default async function FunnelPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // A signed-in admin opening a customer's quote link works in team mode (the proxy
  // refreshes their session on public paths, so this read is reliable).
  const [catalog, actor] = await Promise.all([getCatalog(), currentActor()]);

  return <FunnelShell catalog={catalog} teamEmail={actorEmail(actor)} />;
}
