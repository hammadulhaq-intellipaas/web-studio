import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const MAX_FILE = 25 * 1024 * 1024;
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx'];
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'invalid_form' }, { status: 400 });

  const kind = form.get('kind') === 'logo' ? 'logo' : 'photo';
  const files = form.getAll('files').filter((f): f is File => f instanceof File);
  if (!files.length) return NextResponse.json({ error: 'no_files' }, { status: 400 });

  const supabase = createSupabaseAdminClient();

  // The lead must exist — prevents dumping files under arbitrary IDs.
  const { data: lead } = await supabase.from('leads').select('id').eq('id', id).maybeSingle();
  if (!lead) return NextResponse.json({ error: 'lead_not_found' }, { status: 404 });

  const stored: { name: string }[] = [];
  for (const file of files.slice(0, 20)) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXT.includes(ext) || !ALLOWED_MIME.has(file.type) || file.size > MAX_FILE) {
      continue;
    }
    const safeName = file.name.replace(/[^\w.\-()\s]/g, '_').slice(0, 150);
    const path = `${id}/${kind}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from('lead-uploads')
      .upload(path, file, { contentType: file.type });
    if (uploadError) {
      console.error('[uploads] storage upload failed:', uploadError);
      continue;
    }
    await supabase.from('lead_files').insert({
      lead_id: id,
      kind,
      file_name: file.name,
      size_bytes: file.size,
      mime_type: file.type,
      storage_path: path,
    });
    stored.push({ name: file.name });
  }

  return NextResponse.json({ files: stored });
}
