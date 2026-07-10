'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ENTITIES, SETTINGS } from '@/lib/admin/entities';

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return supabase;
}

/** Coerce a submitted string to the column's type based on the entity field def. */
function coerce(type: string, raw: string): unknown {
  const trimmed = raw.trim();
  switch (type) {
    case 'number':
      return trimmed === '' ? null : Number(trimmed);
    case 'boolean':
      return trimmed === 'true' || trimmed === 'on';
    case 'json':
      return trimmed === '' ? null : JSON.parse(trimmed);
    default:
      return trimmed === '' ? null : raw;
  }
}

export async function saveEntityRow(
  entityKey: string,
  id: string,
  values: Record<string, string>,
): Promise<{ ok: boolean; error?: string }> {
  const entity = ENTITIES[entityKey];
  if (!entity) return { ok: false, error: 'Unknown entity' };
  const supabase = await requireAdmin();

  const update: Record<string, unknown> = {};
  try {
    for (const field of entity.fields) {
      if (field.key in values) update[field.key] = coerce(field.type, values[field.key]);
    }
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${e instanceof Error ? e.message : e}` };
  }

  const { error } = await supabase.from(entity.table).update(update).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/catalog/${entityKey}`);
  return { ok: true };
}

export async function createEntityRow(
  entityKey: string,
  id: string,
  values: Record<string, string>,
): Promise<{ ok: boolean; error?: string }> {
  const entity = ENTITIES[entityKey];
  if (!entity || !entity.canCreate) return { ok: false, error: 'Cannot create' };
  if (!/^[a-z0-9_-]{2,40}$/.test(id)) {
    return { ok: false, error: 'Id must be 2–40 chars of a-z, 0-9, -, _' };
  }
  const supabase = await requireAdmin();

  const insert: Record<string, unknown> = { id };
  try {
    for (const field of entity.fields) {
      if (field.key in values && values[field.key].trim() !== '') {
        insert[field.key] = coerce(field.type, values[field.key]);
      }
    }
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${e instanceof Error ? e.message : e}` };
  }

  const { error } = await supabase.from(entity.table).insert(insert);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/catalog/${entityKey}`);
  return { ok: true };
}

export async function deleteEntityRow(
  entityKey: string,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const entity = ENTITIES[entityKey];
  if (!entity || !entity.canDelete) return { ok: false, error: 'Cannot delete' };
  const supabase = await requireAdmin();

  const { error } = await supabase.from(entity.table).delete().eq('id', id);
  if (error) {
    // 23503 = foreign key violation, e.g. an add-on category that still has add-ons.
    if (error.code === '23503') {
      return { ok: false, error: 'Still in use by other rows — remove those first.' };
    }
    return { ok: false, error: error.message };
  }
  revalidatePath(`/admin/catalog/${entityKey}`);
  return { ok: true };
}

export async function saveSetting(key: string, raw: string): Promise<{ ok: boolean; error?: string }> {
  const def = SETTINGS.find((s) => s.key === key);
  if (!def) return { ok: false, error: 'Unknown setting' };
  const supabase = await requireAdmin();

  let value: unknown;
  try {
    if (def.type === 'number') value = Number(raw);
    else if (def.type === 'json') value = JSON.parse(raw);
    else value = raw;
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${e instanceof Error ? e.message : e}` };
  }

  const { error } = await supabase
    .from('app_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/catalog/settings');
  return { ok: true };
}
