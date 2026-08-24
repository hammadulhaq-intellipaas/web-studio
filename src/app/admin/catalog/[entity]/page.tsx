import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ENTITIES, SETTINGS } from '@/lib/admin/entities';
import { EntityEditor } from '@/components/admin/EntityEditor';
import { SettingsEditor } from '@/components/admin/SettingsEditor';
import { ExchangeRateDisplay } from '@/components/admin/ExchangeRateDisplay';

export const dynamic = 'force-dynamic';

const TABS = [...Object.keys(ENTITIES), 'settings'];

export default async function CatalogEntityPage({
  params,
}: {
  params: Promise<{ entity: string }>;
}) {
  const { entity: entityKey } = await params;
  if (!TABS.includes(entityKey)) notFound();

  const supabase = await createSupabaseServerClient();

  return (
    <div>
      <ExchangeRateDisplay />
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Catalog</h1>
      <div className="mb-6 flex flex-wrap gap-1">
        {TABS.map((tab) => (
          <Link
            key={tab}
            href={`/admin/catalog/${tab}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              tab === entityKey ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab === 'settings' ? 'Settings' : ENTITIES[tab].label}
          </Link>
        ))}
      </div>

      {entityKey === 'settings' ? (
        <SettingsPanel />
      ) : (
        <EntityPanel entityKey={entityKey} supabase={supabase} />
      )}
    </div>
  );
}

async function EntityPanel({
  entityKey,
  supabase,
}: {
  entityKey: string;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
}) {
  const entity = ENTITIES[entityKey];
  const { data } = await supabase.from(entity.table).select('*').order(entity.orderBy ?? 'sort');
  let rows = (data ?? []) as ({ id: string } & Record<string, unknown>)[];

  // Categories form a 2-level tree: list each parent immediately followed by its children,
  // both sorted by `sort`, so the hierarchy reads top-to-bottom.
  if (entity.table === 'addon_categories') {
    const bySort = (a: (typeof rows)[number], b: (typeof rows)[number]) =>
      Number(a.sort ?? 0) - Number(b.sort ?? 0);
    const tops = rows.filter((r) => r.parent_id == null).sort(bySort);
    rows = tops.flatMap((top) => [
      top,
      ...rows.filter((r) => r.parent_id === top.id).sort(bySort),
    ]);
  }

  return (
    <EntityEditor
      entityKey={entityKey}
      entity={entity}
      rows={rows}
    />
  );
}

async function SettingsPanel() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('app_settings').select('*');
  const values = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  return <SettingsEditor settings={SETTINGS} values={values} />;
}
