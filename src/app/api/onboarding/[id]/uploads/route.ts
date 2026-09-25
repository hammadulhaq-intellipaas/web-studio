import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isValidSessionId } from '@/lib/session-id';
import { getOnboardingDefinition } from '@/lib/onboarding/definition';
import { loadFiles, loadForm, publicFiles } from '@/lib/onboarding/records';
import { FIELD_KEY_RE } from '@/lib/onboarding/schemas';

export const dynamic = 'force-dynamic';

const DEFAULT_MAX_MB = 25;
const DEFAULT_MAX_FILES = 10;

/**
 * Same rule as the session uploads: the extension decides, the browser-reported MIME is
 * only advisory. A field's `config.accept` narrows this list, never widens it.
 */
const KNOWN_EXT = new Map<string, string>([
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['png', 'image/png'],
  ['webp', 'image/webp'],
  ['gif', 'image/gif'],
  ['avif', 'image/avif'],
  ['heic', 'image/heic'],
  ['heif', 'image/heif'],
  ['svg', 'image/svg+xml'],
  ['pdf', 'application/pdf'],
  ['doc', 'application/msword'],
  ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['eps', 'application/postscript'],
  ['ai', 'application/postscript'],
  ['zip', 'application/zip'],
]);

export type RejectionReason = 'unsupported_type' | 'too_large' | 'over_total' | 'too_many' | 'upload_failed';

/**
 * Uploads belong to a form and one of its upload fields. No sign-in: the unguessable form
 * id (plus the Basic-auth gate in front of /api/onboarding) is the credential.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidSessionId(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'invalid_form' }, { status: 400 });

  const fieldKey = String(form.get('field_key') ?? '');
  if (!FIELD_KEY_RE.test(fieldKey)) return NextResponse.json({ error: 'invalid_field' }, { status: 400 });

  const files = form.getAll('files').filter((f): f is File => f instanceof File);
  if (!files.length) return NextResponse.json({ error: 'no_files' }, { status: 400 });

  const [record, definition, existing] = await Promise.all([loadForm(id), getOnboardingDefinition(), loadFiles(id)]);
  if (!record) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (record.status === 'confirmed') return NextResponse.json({ error: 'confirmed' }, { status: 409 });

  const field = definition.fields.find((f) => f.id === fieldKey && f.type === 'upload');
  if (!field) return NextResponse.json({ error: 'invalid_field' }, { status: 400 });

  const accept = new Set((field.config.accept ?? Array.from(KNOWN_EXT.keys())).map((e) => e.toLowerCase()));
  const totalBytes = field.config.max_total_mb != null ? field.config.max_total_mb * 1024 * 1024 : null;
  const maxBytes = (field.config.max_mb ?? field.config.max_total_mb ?? DEFAULT_MAX_MB) * 1024 * 1024;
  const maxFiles = field.config.max_files ?? DEFAULT_MAX_FILES;
  const mine = existing.filter((f) => f.field_key === fieldKey);
  let count = mine.length;
  let used = mine.reduce((sum, f) => sum + (f.size_bytes ?? 0), 0);

  const supabase = createSupabaseAdminClient();
  const stored: { id: string; name: string }[] = [];
  const rejected: { name: string; reason: RejectionReason }[] = [];

  for (const file of files.slice(0, 20)) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const contentType = KNOWN_EXT.get(ext);
    if (!contentType || !accept.has(ext)) {
      rejected.push({ name: file.name, reason: 'unsupported_type' });
      continue;
    }
    if (file.size > maxBytes) {
      rejected.push({ name: file.name, reason: totalBytes != null ? 'over_total' : 'too_large' });
      continue;
    }
    if (totalBytes != null && used + file.size > totalBytes) {
      rejected.push({ name: file.name, reason: 'over_total' });
      continue;
    }
    if (count >= maxFiles) {
      rejected.push({ name: file.name, reason: 'too_many' });
      continue;
    }

    const safeName = file.name.replace(/[^\w.\-()\s]/g, '_').slice(0, 150);
    const path = `onboarding/${id}/${fieldKey}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('lead-uploads').upload(path, file, { contentType });
    if (uploadError) {
      console.error('[onboarding-uploads] storage upload failed:', uploadError);
      rejected.push({ name: file.name, reason: 'upload_failed' });
      continue;
    }

    const { data: row, error: insertError } = await supabase
      .from('lead_files')
      .insert({
        lead_id: null,
        session_id: null,
        onboarding_form_id: id,
        field_key: fieldKey,
        kind: 'onboarding',
        file_name: file.name,
        size_bytes: file.size,
        mime_type: contentType,
        storage_path: path,
      })
      .select('id')
      .single();
    if (insertError || !row) {
      console.error('[onboarding-uploads] lead_files insert failed:', insertError);
      await supabase.storage.from('lead-uploads').remove([path]);
      rejected.push({ name: file.name, reason: 'upload_failed' });
      continue;
    }

    stored.push({ id: row.id, name: file.name });
    count += 1;
    used += file.size;
  }

  const all = await loadFiles(id);
  return NextResponse.json({ stored, rejected, files: publicFiles(all) });
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
  await supabase.storage.from('lead-uploads').remove([target.storage_path]);
  const { error } = await supabase.from('lead_files').delete().eq('id', fileId).eq('onboarding_form_id', id);
  if (error) return NextResponse.json({ error: 'delete_failed' }, { status: 500 });

  return NextResponse.json({ files: publicFiles(files.filter((f) => f.id !== fileId)) });
}
