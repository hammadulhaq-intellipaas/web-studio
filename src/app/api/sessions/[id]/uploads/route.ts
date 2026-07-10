import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isValidSessionId } from '@/lib/session-id';

const MAX_FILE = 25 * 1024 * 1024;

/**
 * The extension is the decisive check. `file.type` is only advisory: browsers report an
 * empty MIME for plenty of real files (drag-and-drop from some file managers, downloads
 * from cloud drives), and rejecting those silently drops perfectly valid uploads.
 */
const ALLOWED_EXT = new Map<string, string>([
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
]);

/** `kind` maps 1:1 to lead_files.kind. 'concept'/'website' come from the first question. */
const KINDS = new Set(['logo', 'photo', 'concept', 'website']);

export type RejectionReason = 'unsupported_type' | 'too_large' | 'upload_failed';

export interface RejectedFile {
  name: string;
  reason: RejectionReason;
}

/**
 * Uploads attached to a funnel session, before any lead exists. On lead submission the
 * rows are re-parented to the created lead (see POST /api/leads).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidSessionId(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'invalid_form' }, { status: 400 });

  const rawKind = String(form.get('kind') ?? '');
  if (!KINDS.has(rawKind)) return NextResponse.json({ error: 'invalid_kind' }, { status: 400 });

  const files = form.getAll('files').filter((f): f is File => f instanceof File);
  if (!files.length) return NextResponse.json({ error: 'no_files' }, { status: 400 });

  const supabase = createSupabaseAdminClient();

  // The session must exist — prevents dumping files under arbitrary IDs.
  const { data: session } = await supabase
    .from('funnel_sessions')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: 'session_not_found' }, { status: 404 });

  const stored: { name: string }[] = [];
  const rejected: RejectedFile[] = [];

  for (const file of files.slice(0, 20)) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const knownType = ALLOWED_EXT.get(ext);

    if (!knownType) {
      rejected.push({ name: file.name, reason: 'unsupported_type' });
      continue;
    }
    if (file.size > MAX_FILE) {
      rejected.push({ name: file.name, reason: 'too_large' });
      continue;
    }

    // Trust the extension's type over a browser-reported one (which may be blank or wrong).
    const contentType = knownType;
    const safeName = file.name.replace(/[^\w.\-()\s]/g, '_').slice(0, 150);
    const path = `sessions/${id}/${rawKind}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from('lead-uploads')
      .upload(path, file, { contentType });
    if (uploadError) {
      console.error('[session-uploads] storage upload failed:', uploadError);
      rejected.push({ name: file.name, reason: 'upload_failed' });
      continue;
    }

    const { error: insertError } = await supabase.from('lead_files').insert({
      lead_id: null,
      session_id: id,
      kind: rawKind,
      file_name: file.name,
      size_bytes: file.size,
      mime_type: contentType,
      storage_path: path,
    });
    if (insertError) {
      console.error('[session-uploads] lead_files insert failed:', insertError);
      rejected.push({ name: file.name, reason: 'upload_failed' });
      continue;
    }

    stored.push({ name: file.name });
  }

  return NextResponse.json({ files: stored, rejected });
}
