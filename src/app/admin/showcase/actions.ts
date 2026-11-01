'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { parseShowcaseInput } from '@/lib/showcase/shared';
import { createImageUpload, deleteShowcaseItem, discardUploads, saveShowcaseItem, type ImageUploadTicket } from '@/lib/showcase/store';

type Result = { ok: boolean; error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** The signed-in admin's email, or an error for anyone else. */
async function requireAdmin(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return user.email ?? null;
}

/** Saves an entry; `id` null creates one. Returns the entry's id. */
export async function saveShowcase(id: string | null, input: Record<string, unknown>): Promise<Result & { id?: string }> {
  const by = await requireAdmin();
  if (id !== null && !UUID.test(id)) return { ok: false, error: 'Unknown entry.' };
  const parsed = parseShowcaseInput(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  try {
    const savedId = await saveShowcaseItem(id, parsed.value, by);
    revalidatePath('/admin/showcase');
    return { ok: true, id: savedId };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

export async function deleteShowcase(id: string): Promise<Result> {
  await requireAdmin();
  if (!UUID.test(id)) return { ok: false, error: 'Unknown entry.' };
  try {
    await deleteShowcaseItem(id);
    revalidatePath('/admin/showcase');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

/** A signed URL for one image; the browser uploads straight to storage. */
export async function startShowcaseUpload(contentType: string, size: number): Promise<Result & { ticket?: ImageUploadTicket }> {
  await requireAdmin();
  try {
    return { ok: true, ticket: await createImageUpload(contentType, size) };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

/** Images uploaded in an editor that was closed without saving. */
export async function discardShowcaseUploads(paths: string[]): Promise<Result> {
  await requireAdmin();
  try {
    await discardUploads(Array.isArray(paths) ? paths.slice(0, 20) : []);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}
