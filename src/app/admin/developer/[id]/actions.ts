'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { generateDesignProposals } from '@/lib/developer/generate';
import { saveProject } from '@/lib/developer/store';

type Result = { ok: boolean; error?: string };

const SLUG = /^[a-z0-9-]+$/;

/** The signed-in admin's email, or an error for anyone else. */
async function requireAdmin(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return user.email ?? null;
}

/** Internal notes from Thorsten, Matt or Angelica that go into every design prompt. */
export async function saveInternalNotes(leadId: string, notes: string): Promise<Result> {
  const by = await requireAdmin();
  try {
    await saveProject(leadId, { internal_notes: notes.slice(0, 5000) }, by);
    revalidatePath(`/admin/developer/${leadId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Generates Proposal A and B for Claude Design, each from the reference website chosen for it. */
export async function generateDesign(leadId: string, referenceA: string | null, referenceB: string | null): Promise<Result> {
  const by = await requireAdmin();
  for (const slug of [referenceA, referenceB]) {
    if (slug !== null && !SLUG.test(slug)) return { ok: false, error: 'Unknown reference website.' };
  }
  const result = await generateDesignProposals(leadId, { A: referenceA, B: referenceB }, by);
  revalidatePath(`/admin/developer/${leadId}`);
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
