import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isValidSessionId } from '@/lib/session-id';
import { getOnboardingDefinition } from '@/lib/onboarding/definition';
import { loadFiles, loadForm, publicFiles, type StoredFile } from '@/lib/onboarding/records';
import { FIELD_KEY_RE } from '@/lib/onboarding/schemas';
import { checkFile, ONB_BUCKET, ownsPath, uploadLimits, uploadPath, type RejectionReason } from '@/lib/onboarding/uploads';

export const dynamic = 'force-dynamic';

export type { RejectionReason };

/*
 * Uploads belong to a form and one of its upload fields. No sign-in: the unguessable form
 * id (plus the Basic-auth gate in front of /api/onboarding) is the credential.
 *
 * The file itself never passes through here — Vercel refuses request bodies over 4.5 MB.
 * POST checks the file against the field's limits and hands out a one-time signed upload
 * URL; the browser sends the file straight to storage; PUT then confirms it, checks the
 * stored size again and records it in onboarding_files.
 */

const signSchema = z.object({
  field_key: z.string().regex(FIELD_KEY_RE),
  files: z
    .array(z.object({ name: z.string().min(1).max(300), size: z.number().int().nonnegative() }))
    .min(1)
    .max(20),
});

const confirmSchema = z.object({
  field_key: z.string().regex(FIELD_KEY_RE),
  path: z.string().min(1).max(500),
  name: z.string().min(1).max(300),
});

async function loadUploadContext(id: string, fieldKey: string) {
  const [record, definition, existing] = await Promise.all([loadForm(id), getOnboardingDefinition(), loadFiles(id)]);
  if (!record) return { error: NextResponse.json({ error: 'not_found' }, { status: 404 }) };
  if (record.status === 'confirmed') return { error: NextResponse.json({ error: 'confirmed' }, { status: 409 }) };
  const field = definition.fields.find((f) => f.id === fieldKey && f.type === 'upload');
  if (!field) return { error: NextResponse.json({ error: 'invalid_field' }, { status: 400 }) };
  const mine = existing.filter((f) => f.field_key === fieldKey);
  return { field, existing, mine };
}

const usageOf = (files: StoredFile[]) => ({ count: files.length, bytes: files.reduce((sum, f) => sum + (f.size_bytes ?? 0), 0) });

/** Step 1: one signed upload URL per acceptable file. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidSessionId(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  const parsed = signSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  const { field_key: fieldKey, files } = parsed.data;

  const ctx = await loadUploadContext(id, fieldKey);
  if ('error' in ctx) return ctx.error;

  const limits = uploadLimits(ctx.field);
  const used = usageOf(ctx.mine);
  const supabase = createSupabaseAdminClient();
  const tickets: { name: string; path: string; token: string; content_type: string }[] = [];
  const rejected: { name: string; reason: RejectionReason }[] = [];

  for (const file of files) {
    const check = checkFile(file, limits, used);
    if (!check.ok) {
      rejected.push({ name: file.name, reason: check.reason });
      continue;
    }
    const path = uploadPath(id, fieldKey, file.name);
    const { data, error } = await supabase.storage.from(ONB_BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      console.error('[onboarding-uploads] signing failed:', error);
      rejected.push({ name: file.name, reason: 'upload_failed' });
      continue;
    }
    tickets.push({ name: file.name, path: data.path, token: data.token, content_type: check.contentType });
    // The batch shares the field's budget, so the next file is checked against this one too.
    used.count += 1;
    used.bytes += file.size;
  }

  return NextResponse.json({ bucket: ONB_BUCKET, tickets, rejected });
}

/** Step 2: the browser has uploaded; record the file if it is really there and still fits. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidSessionId(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  const parsed = confirmSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  const { field_key: fieldKey, path, name } = parsed.data;
  if (!ownsPath(id, fieldKey, path)) return NextResponse.json({ error: 'invalid_path' }, { status: 400 });

  const ctx = await loadUploadContext(id, fieldKey);
  if ('error' in ctx) return ctx.error;
  if (ctx.existing.some((f) => f.storage_path === path)) {
    return NextResponse.json({ rejected: [], files: publicFiles(ctx.existing) });
  }

  const supabase = createSupabaseAdminClient();
  const folder = path.slice(0, path.lastIndexOf('/'));
  const objectName = path.slice(path.lastIndexOf('/') + 1);
  const { data: listed } = await supabase.storage.from(ONB_BUCKET).list(folder, { search: objectName, limit: 10 });
  const object = listed?.find((o) => o.name === objectName);
  const size = Number(object?.metadata?.size ?? NaN);
  if (!object || !Number.isFinite(size)) {
    return NextResponse.json({ rejected: [{ name, reason: 'upload_failed' }], files: publicFiles(ctx.existing) });
  }

  // Checked again with the size storage actually holds, not the one the browser claimed.
  const check = checkFile({ name, size }, uploadLimits(ctx.field), usageOf(ctx.mine));
  if (!check.ok) {
    await supabase.storage.from(ONB_BUCKET).remove([path]);
    return NextResponse.json({ rejected: [{ name, reason: check.reason }], files: publicFiles(ctx.existing) });
  }

  const { error } = await supabase.from('onboarding_files').insert({
    form_id: id,
    field_key: fieldKey,
    bucket: ONB_BUCKET,
    storage_path: path,
    file_name: name,
    size_bytes: size,
    mime_type: check.contentType,
  });
  if (error) {
    console.error('[onboarding-uploads] onboarding_files insert failed:', error);
    await supabase.storage.from(ONB_BUCKET).remove([path]);
    return NextResponse.json({ rejected: [{ name, reason: 'upload_failed' }], files: publicFiles(ctx.existing) });
  }

  return NextResponse.json({ rejected: [], files: publicFiles(await loadFiles(id)) });
}

/** Remove one of the form's own files: `?file=<uuid>`. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidSessionId(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  const fileId = new URL(request.url).searchParams.get('file') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(fileId)) return NextResponse.json({ error: 'invalid_file' }, { status: 400 });

  const record = await loadForm(id);
  if (!record) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (record.status === 'confirmed') return NextResponse.json({ error: 'confirmed' }, { status: 409 });

  const files = await loadFiles(id);
  const target = files.find((f) => f.id === fileId);
  if (!target) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const supabase = createSupabaseAdminClient();
  await supabase.storage.from(target.bucket).remove([target.storage_path]);
  const { error } = await supabase.from('onboarding_files').delete().eq('id', fileId).eq('form_id', id);
  if (error) return NextResponse.json({ error: 'delete_failed' }, { status: 500 });

  return NextResponse.json({ files: publicFiles(files.filter((f) => f.id !== fileId)) });
}
