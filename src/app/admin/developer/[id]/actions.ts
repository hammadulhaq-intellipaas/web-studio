'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadDeveloperClient } from '@/lib/developer/clients';
import { approveVersion, finishUpload, reopenDesign as reopen, setDraftsOffline, startUpload, type UploadTicket } from '@/lib/developer/designs';
import { generateBuild, generateDesignProposals, generateHandover, generateRevision } from '@/lib/developer/generate';
import type { Proposal } from '@/lib/developer/messages';
import { saveProject } from '@/lib/developer/store';

type Result = { ok: boolean; error?: string };

const SLUG = /^[a-z0-9-]+$/;
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

/** Step 1 of a design upload: a version label and a signed URL the browser uploads the export to. */
export async function startDesignUpload(
  leadId: string,
  proposal: Proposal,
  fileName: string,
  size: number,
): Promise<Result & { ticket?: UploadTicket }> {
  const by = await requireAdmin();
  if (proposal !== 'A' && proposal !== 'B') return { ok: false, error: 'Choose Proposal A or B.' };
  const client = await loadDeveloperClient(leadId);
  if (!client) return { ok: false, error: 'Client not found.' };
  const { lead } = client;
  const name = lead.firma || [lead.vorname, lead.nachname].filter(Boolean).join(' ') || 'client';
  try {
    return { ok: true, ticket: await startUpload(leadId, name, proposal, fileName, size, by) };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

/** Step 2: the file is in storage; unpack it so the draft link works. */
export async function finishDesignUpload(leadId: string, versionId: string): Promise<Result> {
  await requireAdmin();
  if (!UUID.test(versionId)) return { ok: false, error: 'Unknown version.' };
  try {
    await finishUpload(leadId, versionId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: message(err) };
  } finally {
    revalidatePath(`/admin/developer/${leadId}`);
  }
}

/** The client approved this version: the design is locked and the build can start. */
export async function approveDesign(leadId: string, versionId: string): Promise<Result> {
  const by = await requireAdmin();
  if (!UUID.test(versionId)) return { ok: false, error: 'Unknown version.' };
  try {
    await approveVersion(leadId, versionId, by);
    revalidatePath(`/admin/developer/${leadId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

export async function reopenDesign(leadId: string): Promise<Result> {
  await requireAdmin();
  try {
    await reopen(leadId);
    revalidatePath(`/admin/developer/${leadId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

/** The client's feedback on one version, turned into the prompt for the next one. */
export async function generateRevisionPrompt(leadId: string, versionId: string, feedback: string): Promise<Result> {
  const by = await requireAdmin();
  if (!UUID.test(versionId)) return { ok: false, error: 'Choose an uploaded design version.' };
  const result = await generateRevision(leadId, versionId, feedback, by);
  revalidatePath(`/admin/developer/${leadId}`);
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

/** Tech stack and anything else Claude Code should know; goes into the build prompt. */
export async function saveDevInstructions(leadId: string, text: string): Promise<Result> {
  const by = await requireAdmin();
  try {
    await saveProject(leadId, { dev_instructions: text.slice(0, 5000) }, by);
    revalidatePath(`/admin/developer/${leadId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

export async function generateBuildPrompt(leadId: string): Promise<Result> {
  const by = await requireAdmin();
  const result = await generateBuild(leadId, by);
  revalidatePath(`/admin/developer/${leadId}`);
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

const isLink = (value: string) => {
  if (!value) return true;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

/** The live website and CMS links the handover document points the client to. */
export async function saveHandoverLinks(leadId: string, liveUrl: string, cmsUrl: string): Promise<Result> {
  const by = await requireAdmin();
  const live = liveUrl.trim();
  const cms = cmsUrl.trim();
  if (!isLink(live) || !isLink(cms)) return { ok: false, error: 'Links start with https://' };
  try {
    await saveProject(leadId, { live_url: live.slice(0, 500), cms_url: cms.slice(0, 500) }, by);
    revalidatePath(`/admin/developer/${leadId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

export async function generateHandoverDoc(leadId: string): Promise<Result> {
  const by = await requireAdmin();
  const result = await generateHandover(leadId, by);
  revalidatePath(`/admin/developer/${leadId}`);
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

/** At the end of a project the draft links go offline; they can be switched back on. */
export async function setDraftLinksOffline(leadId: string, offline: boolean): Promise<Result> {
  await requireAdmin();
  try {
    await setDraftsOffline(leadId, offline);
    revalidatePath(`/admin/developer/${leadId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}
