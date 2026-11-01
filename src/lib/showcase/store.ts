import 'server-only';
import { randomUUID } from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { IMAGE_TYPES, MAX_IMAGE_BYTES, SHOWCASE_BUCKET, UPLOAD_PATH, type ShowcaseInput, type ShowcaseItem } from './shared';

const db = () => createSupabaseAdminClient();

const COLUMNS =
  'id, owner_name, owner_title_de, owner_title_en, business_name, about_de, about_en, quote_de, quote_en, site_url, photo_path, screenshot_path, consent_at, consent_note, published, sort, updated_at, updated_by';

/** Missing table (the migration not run yet) as PostgREST and Postgres report it. */
function missingTable(error: { code?: string } | null): boolean {
  return error?.code === 'PGRST205' || error?.code === '42P01';
}

/** Whether migration 20261101000026 has run. Before that the page explains what to run. */
export async function showcaseSchemaReady(): Promise<boolean> {
  const { error } = await db().from('showcase_items').select('id').limit(1);
  return !missingTable(error);
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

/** Creates an entry (id null) or updates one; an image that was replaced is deleted from storage. */
export async function saveShowcaseItem(id: string | null, value: ShowcaseInput, by: string | null): Promise<string> {
  const row = { ...value, updated_at: new Date().toISOString(), updated_by: by };
  if (!id) {
    const { data, error } = await db().from('showcase_items').insert(row).select('id').single();
    if (error) throw new Error(friendly(error.message));
    return (data as { id: string }).id;
  }
  const { data: before } = await db().from('showcase_items').select('photo_path, screenshot_path').eq('id', id).maybeSingle();
  if (!before) throw new Error('This entry no longer exists.');
  const { error } = await db().from('showcase_items').update(row).eq('id', id);
  if (error) throw new Error(friendly(error.message));
  const old = before as Pick<ShowcaseItem, 'photo_path' | 'screenshot_path'>;
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

export interface ImageUploadTicket {
  bucket: string;
  path: string;
  token: string;
}

/** A signed URL the browser uploads one image to, so large screenshots skip the server. */
export async function createImageUpload(contentType: string, size: number): Promise<ImageUploadTicket> {
  const ext = IMAGE_TYPES[contentType];
  if (!ext) throw new Error('Please use a JPG, PNG or WebP image.');
  if (!(size > 0) || size > MAX_IMAGE_BYTES) throw new Error('The image is larger than 5 MB.');
  const { data, error } = await db().storage.from(SHOWCASE_BUCKET).createSignedUploadUrl(`uploads/${randomUUID()}.${ext}`);
  if (error || !data) throw new Error(`Preparing the upload failed: ${error?.message ?? 'unknown'}`);
  return { bucket: SHOWCASE_BUCKET, path: data.path, token: data.token };
}

/** Removes images uploaded in an editor that was closed without saving. Saved images stay. */
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
    ? 'To publish, the entry needs a website, name, title, review, photo, screenshot and consent date.'
    : message;
}
