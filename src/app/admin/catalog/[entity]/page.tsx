import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ENTITIES, SETTINGS } from '@/lib/admin/entities';
import { EntityEditor } from '@/components/admin/EntityEditor';
import { SettingsEditor } from '@/components/admin/SettingsEditor';

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
  const { data } = await supabase.from(entity.table).select('*').order('sort');
  return (
    <EntityEditor
      entityKey={entityKey}
      entity={entity}
      rows={(data ?? []) as ({ id: string } & Record<string, unknown>)[]}
    />
  );
}

async function SettingsPanel() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('app_settings').select('*');
  const values = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  return <SettingsEditor settings={SETTINGS} values={values} />;
}
