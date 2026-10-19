'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isValidSessionId } from '@/lib/session-id';

export type ArchiveResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Take onboarding forms out of the admin list, or put them back. Like "Remove" on leads,
 * nothing is deleted: the form, its briefs, files and the client's link all stay, the row
 * just carries `archived_at`. Needs migration 20261019000019.
 */
export async function archiveOnboardingForms(ids: string[], archived: boolean): Promise<ArchiveResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Unauthorized' };

  const clean = ids.filter((id) => isValidSessionId(id));
  if (!clean.length) return { ok: false, error: 'Nothing selected' };

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from('onboarding_forms')
    .update({ archived_at: archived ? new Date().toISOString() : null, archived_by: archived ? (user.email ?? user.id) : null })
    .in('id', clean);
  if (error) {
    // The columns arrive with migration 20261019000019; say so rather than fail vaguely.
    if (error.code === '42703' || error.code === 'PGRST204') return { ok: false, error: 'Apply migration 20261019000019_onboarding_archive.sql first.' };
    return { ok: false, error: error.message };
  }
  revalidatePath('/admin/onboarding');
  revalidatePath('/admin');
  return { ok: true, message: `${clean.length} ${archived ? 'removed' : 'restored'}` };
}
