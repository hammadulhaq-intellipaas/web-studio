import 'server-only';
import { randomUUID } from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { IMAGE_TYPES, MAX_IMAGE_BYTES, SHOWCASE_BUCKET, UPLOAD_PATH, type ShowcaseInput, type ShowcaseItem } from './shared';

const db = () => createSupabaseAdminClient();

const COLUMNS =
  'id, site_url, business_name, owner_name, owner_title, quote, photo_path, screenshot_path, screenshot_at, consent_at, consent_by, published, sort, updated_at, updated_by';

/**
 * Which showcase migrations have run: none (no table), only the first (the old fields), or both.
 * Before both have run, the page explains what to run instead of failing.
 */
export async function showcaseSchemaState(): Promise<'missing' | 'outdated' | 'ready'> {
  const { error } = await db().from('showcase_items').select('id, owner_title, consent_by').limit(1);
  if (error?.code === 'PGRST205' || error?.code === '42P01') return 'missing';
  if (error?.code === '42703' || error?.code === 'PGRST204') return 'outdated';
  return 'ready';
}

/** Every entry, drafts included, in the order the homepage will show them. */
export async function loadShowcase(): Promise<ShowcaseItem[]> {
  const { data, error } = await db().from('showcase_items').select(COLUMNS).order('sort').order('created_at');
  if (error) throw new Error(`Loading the showcase failed: ${error.message}`);
  return (data ?? []) as ShowcaseItem[];
}

async function removeImages(paths: (string | null | undefined)[]): Promise<void> {
  const own = paths.filter((p): p is string => !!p && UPLOAD_PATH.test(p));
  if (own.length) await db().storage.from(SHOWCASE_BUCKET).remove(own);
}

/**
 * Creates an entry (id null, added at the end of the list) or updates one. Ticking the
 * owner's agreement records who ticked it; an image that was replaced is deleted from storage.
 */
export async function saveShowcaseItem(id: string | null, value: ShowcaseInput, by: string | null): Promise<string> {
  const stamp = { updated_at: new Date().toISOString(), updated_by: by };
  if (!id) {
    const { data: last } = await db().from('showcase_items').select('sort').order('sort', { ascending: false }).limit(1).maybeSingle();
    const sort = ((last as { sort: number } | null)?.sort ?? -1) + 1;
    const { data, error } = await db()
      .from('showcase_items')
      .insert({ ...value, ...stamp, sort, consent_by: value.consent_at ? by : null })
      .select('id')
      .single();
    if (error) throw new Error(friendly(error.message));
    return (data as { id: string }).id;
  }
  const { data: before } = await db().from('showcase_items').select('photo_path, screenshot_path, consent_at, consent_by').eq('id', id).maybeSingle();
  if (!before) throw new Error('This entry no longer exists.');
  const old = before as Pick<ShowcaseItem, 'photo_path' | 'screenshot_path' | 'consent_at' | 'consent_by'>;
  const consent_by = !value.consent_at ? null : old.consent_at ? old.consent_by : by;
  const { error } = await db()
    .from('showcase_items')
    .update({ ...value, ...stamp, consent_by })
    .eq('id', id);
  if (error) throw new Error(friendly(error.message));
  await removeImages([
    old.photo_path !== value.photo_path ? old.photo_path : null,
    old.screenshot_path !== value.screenshot_path ? old.screenshot_path : null,
  ]);
  return id;
}

export async function deleteShowcaseItem(id: string): Promise<void> {
  const { data } = await db().from('showcase_items').delete().eq('id', id).select('photo_path, screenshot_path').maybeSingle();
  const row = data as Pick<ShowcaseItem, 'photo_path' | 'screenshot_path'> | null;
  if (row) await removeImages([row.photo_path, row.screenshot_path]);
}

/** Moves an entry one place up (-1) or down (1) and numbers the list 0, 1, 2… again. */
export async function moveShowcaseItem(id: string, step: -1 | 1): Promise<void> {
  const { data, error } = await db().from('showcase_items').select('id, sort').order('sort').order('created_at');
  if (error) throw new Error(`Loading the order failed: ${error.message}`);
  const rows = (data ?? []) as { id: string; sort: number }[];
  const from = rows.findIndex((r) => r.id === id);
  const to = from + step;
  if (from < 0 || to < 0 || to >= rows.length) return;
  [rows[from], rows[to]] = [rows[to]!, rows[from]!];
  const changed = rows.map((r, index) => ({ ...r, index })).filter((r) => r.sort !== r.index);
  const results = await Promise.all(changed.map((r) => db().from('showcase_items').update({ sort: r.index }).eq('id', r.id)));
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(`Saving the order failed: ${failed.error.message}`);
}

export interface ImageUploadTicket {
  bucket: string;
  path: string;
  token: string;
}

/** A signed URL the browser uploads one image to (the owner's photo, or a screenshot by hand). */
export async function createImageUpload(contentType: string, size: number): Promise<ImageUploadTicket> {
  const ext = IMAGE_TYPES[contentType];
  if (!ext) throw new Error('Please use a JPG, PNG or WebP image.');
  if (!(size > 0) || size > MAX_IMAGE_BYTES) throw new Error('The image is larger than 5 MB.');
  const { data, error } = await db().storage.from(SHOWCASE_BUCKET).createSignedUploadUrl(`uploads/${randomUUID()}.${ext}`);
  if (error || !data) throw new Error(`Preparing the upload failed: ${error?.message ?? 'unknown'}`);
  return { bucket: SHOWCASE_BUCKET, path: data.path, token: data.token };
}

/** Stores a screenshot the server took; the editor saves its path with the entry. */
export async function storeScreenshot(image: Buffer): Promise<string> {
  const path = `uploads/${randomUUID()}.jpg`;
  const { error } = await db().storage.from(SHOWCASE_BUCKET).upload(path, image, { contentType: 'image/jpeg' });
  if (error) throw new Error(`Saving the screenshot failed: ${error.message}`);
  return path;
}

/** Removes images from an editor that was closed without saving. Saved images stay. */
export async function discardUploads(paths: string[]): Promise<void> {
  const candidates = paths.filter((p) => UPLOAD_PATH.test(p));
  if (!candidates.length) return;
  const [photos, screenshots] = await Promise.all([
    db().from('showcase_items').select('photo_path').in('photo_path', candidates),
    db().from('showcase_items').select('screenshot_path').in('screenshot_path', candidates),
  ]);
  if (photos.error || screenshots.error) return; // when unsure, keep the files
  const used = new Set([
    ...(photos.data ?? []).map((r: { photo_path: string | null }) => r.photo_path),
    ...(screenshots.data ?? []).map((r: { screenshot_path: string | null }) => r.screenshot_path),
  ]);
  await removeImages(candidates.filter((p) => !used.has(p)));
}

/** The database's own publish check, in words. */
function friendly(message: string): string {
  return message.includes('showcase_items_publish_ready')
    ? "To publish, the entry needs a website, screenshot, name, title, review and the owner's agreement."
    : message;
}
