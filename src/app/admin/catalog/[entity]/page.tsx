import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ENTITIES, SETTINGS, type EntityGroup } from '@/lib/admin/entities';
import { EntityEditor, type LookupRows } from '@/components/admin/EntityEditor';
import { SettingsEditor } from '@/components/admin/SettingsEditor';
import { ExchangeRateDisplay } from '@/components/admin/ExchangeRateDisplay';

export const dynamic = 'force-dynamic';

const TABS = [...Object.keys(ENTITIES), 'settings'];

const GROUPS: EntityGroup[] = ['Catalog', 'Onboarding form'];

function groupOf(tab: string): EntityGroup {
  if (tab === 'settings') return 'Catalog';
  return ENTITIES[tab].group ?? 'Catalog';
}

export default async function CatalogEntityPage({
  params,
}: {
  params: Promise<{ entity: string }>;
}) {
  const { entity: entityKey } = await params;
  if (!TABS.includes(entityKey)) notFound();

  const supabase = await createSupabaseServerClient();
  const activeGroup = groupOf(entityKey);

  return (
    <div>
      <ExchangeRateDisplay />
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">{activeGroup}</h1>
      <div className="mb-6 flex flex-col gap-2">
        {GROUPS.map((group) => (
          <div key={group} className="flex flex-wrap items-center gap-1">
            <span className="mr-2 w-28 text-xs font-bold uppercase tracking-wide text-slate-400">{group}</span>
            {TABS.filter((tab) => groupOf(tab) === group).map((tab) => (
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
  const orderBy = Array.isArray(entity.orderBy) ? entity.orderBy : [entity.orderBy ?? 'sort'];
  let query = supabase.from(entity.table).select('*');
  for (const column of orderBy) query = query.order(column);
  const { data } = await query;
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

  // Referenced tables for `select` fields that pick from another table (e.g. a field's screen).
  const lookupTables = Array.from(
    new Set(entity.fields.flatMap((f) => (f.optionsFromTable ? [f.optionsFromTable] : []))),
  );
  const lookups: LookupRows = {};
  for (const table of lookupTables) {
    const { data: lookupData } = await supabase.from(table).select('*').order('sort');
    lookups[table] = (lookupData ?? []) as ({ id: string } & Record<string, unknown>)[];
  }

  // Rows ordered by a referenced table follow that table's own order, not the id's alphabet.
  const groupColumn = orderBy.length > 1 ? orderBy[0] : null;
  const groupLookup = groupColumn
    ? entity.fields.find((f) => f.key === groupColumn && f.optionsFromTable)?.optionsFromTable
    : undefined;
  if (groupColumn && groupLookup && lookups[groupLookup]) {
    const position = new Map(lookups[groupLookup].map((r, i) => [r.id, i]));
    rows = rows
      .slice()
      .sort(
        (a, b) =>
          (position.get(String(a[groupColumn])) ?? 0) - (position.get(String(b[groupColumn])) ?? 0) ||
          Number(a.sort ?? 0) - Number(b.sort ?? 0),
      );
  }

  return (
    <EntityEditor
      entityKey={entityKey}
      entity={entity}
      rows={rows}
      lookups={lookups}
      groupBy={groupColumn ?? undefined}
    />
  );
}

async function SettingsPanel() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('app_settings').select('*');
  const values = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  return <SettingsEditor settings={SETTINGS} values={values} />;
}
