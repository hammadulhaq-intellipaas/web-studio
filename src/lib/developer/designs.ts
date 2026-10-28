import 'server-only';
import { randomUUID } from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { contentTypeFor, DESIGN_BUCKET, nextLabel, siteKey, slugify } from './drafts';
import type { Proposal } from './messages';
import { entryPage, unzip, type ZipEntry } from './unzip';

export interface DesignVersion {
  id: string;
  lead_id: string;
  proposal: Proposal;
  version: number;
  label: string;
  original_path: string;
  original_name: string;
  size_bytes: number;
  entry_path: string | null;
  file_count: number;
  /** Every unpacked file with its size in bytes. */
  manifest: Record<string, number> | null;
  status: 'uploading' | 'ready' | 'failed';
  error: string | null;
  uploaded_by: string | null;
  created_at: string;
}

/** A Claude Design export as downloaded (zip), or a single exported page. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ACCEPTED = /\.(zip|html?)$/i;
/** An upload that has not finished after this long was abandoned (tab closed, network gone). */
const STALE_MS = 15 * 60 * 1000;

const db = () => createSupabaseAdminClient();

const LIST_COLUMNS = 'id, lead_id, proposal, version, label, original_path, original_name, size_bytes, entry_path, file_count, status, error, uploaded_by, created_at';

/** A client's design versions, oldest first, without the file lists. */
export async function loadVersions(leadId: string): Promise<DesignVersion[]> {
  const { data, error } = await db().from('developer_design_versions').select(LIST_COLUMNS).eq('lead_id', leadId).order('created_at');
  if (error) throw new Error(`Loading design versions failed: ${error.message}`);
  return ((data ?? []) as Omit<DesignVersion, 'manifest'>[]).map((v) => ({ ...v, manifest: null }));
}

interface ProjectRow {
  lead_id: string;
  draft_slug: string | null;
  approved_version_id: string | null;
  drafts_offline: boolean;
}

async function projectRow(leadId: string): Promise<ProjectRow | null> {
  const { data } = await db()
    .from('developer_projects')
    .select('lead_id, draft_slug, approved_version_id, drafts_offline')
    .eq('lead_id', leadId)
    .maybeSingle();
  return (data as ProjectRow | null) ?? null;
}

/** The client part of every draft link, made once from the company name and kept unique. */
export async function ensureDraftSlug(leadId: string, name: string): Promise<string> {
  const existing = await projectRow(leadId);
  if (existing?.draft_slug) return existing.draft_slug;
  const base = slugify(name);
  for (let n = 1; n < 50; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const { data: taken } = await db().from('developer_projects').select('lead_id').eq('draft_slug', slug).maybeSingle();
    if (taken) continue;
    const { error } = await db().from('developer_projects').upsert({ lead_id: leadId, draft_slug: slug }, { onConflict: 'lead_id' });
    if (!error) return slug;
  }
  throw new Error('Could not find a free draft link name');
}

/** Removes every stored file of a version: the original upload and whatever was unpacked. */
async function removeFiles(version: Pick<DesignVersion, 'id' | 'lead_id' | 'original_path'>): Promise<void> {
  const storage = db().storage.from(DESIGN_BUCKET);
  const prefix = `${version.lead_id}/${version.id}/site`;
  for (;;) {
    const { data } = await storage.list(prefix, { limit: 1000 });
    if (!data?.length) break;
    const { error } = await storage.remove(data.map((f) => `${prefix}/${f.name}`));
    if (error) break;
  }
  await storage.remove([version.original_path]);
}

/**
 * Failed and abandoned uploads of a proposal give their label back: the next upload is v2-a
 * after a ready v1-a, not v4-a after two broken tries.
 */
async function clearBrokenUploads(leadId: string, proposal: Proposal): Promise<void> {
  const cutoff = Date.now() - STALE_MS;
  const broken = (await loadVersions(leadId)).filter(
    (v) => v.proposal === proposal && (v.status === 'failed' || (v.status === 'uploading' && Date.parse(v.created_at) < cutoff)),
  );
  for (const v of broken) {
    await removeFiles(v);
    await db().from('developer_design_versions').delete().eq('id', v.id);
  }
}

export interface UploadTicket {
  versionId: string;
  label: string;
  bucket: string;
  path: string;
  token: string;
}

/** Step 1 of an upload: a version row and a signed URL the browser uploads the file to. */
export async function startUpload(
  leadId: string,
  clientName: string,
  proposal: Proposal,
  fileName: string,
  size: number,
  by: string | null,
): Promise<UploadTicket> {
  if (!ACCEPTED.test(fileName)) throw new Error('Upload the Claude Design export as a .zip (or a single .html page).');
  if (size > MAX_UPLOAD_BYTES) throw new Error('The file is larger than 50 MB.');
  if ((await projectRow(leadId))?.approved_version_id) throw new Error('The design is approved and locked. Reopen it first.');
  await ensureDraftSlug(leadId, clientName);
  await clearBrokenUploads(leadId, proposal);

  const { version, label } = nextLabel(proposal, await loadVersions(leadId));
  const id = randomUUID();
  const ext = fileName.toLowerCase().endsWith('.zip') ? 'zip' : 'html';
  const path = `${leadId}/${id}/original.${ext}`;
  const { error } = await db().from('developer_design_versions').insert({
    id,
    lead_id: leadId,
    proposal,
    version,
    label,
    original_path: path,
    original_name: fileName.slice(0, 200),
    size_bytes: size,
    status: 'uploading',
    uploaded_by: by,
  });
  if (error) throw new Error(`Creating the version failed: ${error.message}`);
  const { data, error: signError } = await db().storage.from(DESIGN_BUCKET).createSignedUploadUrl(path);
  if (signError || !data) throw new Error(`Signing the upload failed: ${signError?.message ?? 'unknown'}`);
  return { versionId: id, label, bucket: DESIGN_BUCKET, path: data.path, token: data.token };
}

async function fail(versionId: string, message: string): Promise<never> {
  await db().from('developer_design_versions').update({ status: 'failed', error: message.slice(0, 500) }).eq('id', versionId);
  throw new Error(message);
}

/** Step 2: the browser has uploaded; unpack the export and store every file for /drafts. */
export async function finishUpload(leadId: string, versionId: string): Promise<void> {
  const { data: row } = await db().from('developer_design_versions').select(LIST_COLUMNS).eq('id', versionId).eq('lead_id', leadId).maybeSingle();
  const version = row as DesignVersion | null;
  if (!version) throw new Error('Version not found');
  if (version.status !== 'uploading') throw new Error('This version has already been processed.');

  const { data: blob, error } = await db().storage.from(DESIGN_BUCKET).download(version.original_path);
  if (error || !blob) return fail(versionId, 'The upload did not arrive. Please try again.');
  const buffer = Buffer.from(await blob.arrayBuffer());

  let files: ZipEntry[];
  try {
    files = version.original_path.endsWith('.zip') ? unzip(buffer) : [{ path: version.original_name, data: buffer }];
  } catch (err) {
    return fail(versionId, err instanceof Error ? err.message : String(err));
  }
  const entry = entryPage(files.map((f) => f.path));
  if (!entry) return fail(versionId, 'No .html page found in the upload.');

  // A few files at a time: quick enough, and well under the storage rate limit.
  for (let i = 0; i < files.length; i += 8) {
    const results = await Promise.all(
      files
        .slice(i, i + 8)
        .map((f) =>
          db().storage.from(DESIGN_BUCKET).upload(siteKey(leadId, versionId, f.path), f.data, { contentType: contentTypeFor(f.path), upsert: true }),
        ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) return fail(versionId, `Storing the files failed: ${failed.error.message}`);
  }

  const manifest = Object.fromEntries(files.map((f) => [f.path, f.data.length]));
  const { error: saveError } = await db()
    .from('developer_design_versions')
    .update({ status: 'ready', entry_path: entry, file_count: files.length, manifest, error: null })
    .eq('id', versionId);
  if (saveError) return fail(versionId, `Saving the version failed: ${saveError.message}`);
}

/**
 * Ready versions never change, so a server instance keeps the ones it has served: a page with
 * sixty assets then costs one small query per asset (is the link still online) instead of two.
 */
const readyCache = new Map<string, DesignVersion>();

/** The design version behind a public draft link, unless the links are offline. */
export async function resolveDraft(slug: string, label: string): Promise<DesignVersion | null> {
  const { data: project } = await db().from('developer_projects').select('lead_id, drafts_offline').eq('draft_slug', slug).maybeSingle();
  if (!project || project.drafts_offline) return null;
  const key = `${project.lead_id}/${label}`;
  const cached = readyCache.get(key);
  if (cached) return cached;
  const { data } = await db()
    .from('developer_design_versions')
    .select('*')
    .eq('lead_id', project.lead_id)
    .eq('label', label)
    .eq('status', 'ready')
    .maybeSingle();
  const version = (data as DesignVersion | null) ?? null;
  if (version) {
    if (readyCache.size > 200) readyCache.clear();
    readyCache.set(key, version);
  }
  return version;
}

export async function readDraftFile(version: DesignVersion, path: string): Promise<Buffer | null> {
  const { data, error } = await db().storage.from(DESIGN_BUCKET).download(siteKey(version.lead_id, version.id, path));
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

/** A short-lived direct link to one draft file, for files too large to pass through a function. */
export async function signedDraftFileUrl(version: DesignVersion, path: string): Promise<string | null> {
  const { data } = await db().storage.from(DESIGN_BUCKET).createSignedUrl(siteKey(version.lead_id, version.id, path), 3600);
  return data?.signedUrl ?? null;
}

/** Approving locks the design: no more uploads or revisions until it is reopened. */
export async function approveVersion(leadId: string, versionId: string, by: string | null): Promise<void> {
  const { data } = await db().from('developer_design_versions').select('id, status').eq('id', versionId).eq('lead_id', leadId).maybeSingle();
  if (!data || data.status !== 'ready') throw new Error('Only an uploaded, ready version can be approved.');
  const { error } = await db()
    .from('developer_projects')
    .upsert({ lead_id: leadId, approved_version_id: versionId, approved_at: new Date().toISOString(), approved_by: by }, { onConflict: 'lead_id' });
  if (error) throw new Error(`Approving failed: ${error.message}`);
}

export async function reopenDesign(leadId: string): Promise<void> {
  const { error } = await db()
    .from('developer_projects')
    .update({ approved_version_id: null, approved_at: null, approved_by: null })
    .eq('lead_id', leadId);
  if (error) throw new Error(`Reopening failed: ${error.message}`);
}

export async function setDraftsOffline(leadId: string, offline: boolean): Promise<void> {
  const { error } = await db().from('developer_projects').upsert({ lead_id: leadId, drafts_offline: offline }, { onConflict: 'lead_id' });
  if (error) throw new Error(`Changing the draft links failed: ${error.message}`);
}

/**
 * A signed link that downloads the approved version's original upload, as design.zip for
 * the build folder. A redirect, because the file can be larger than a function may return.
 */
export async function approvedDownloadUrl(leadId: string): Promise<string | null> {
  const project = await projectRow(leadId);
  if (!project?.approved_version_id) return null;
  const { data: row } = await db().from('developer_design_versions').select(LIST_COLUMNS).eq('id', project.approved_version_id).maybeSingle();
  const version = row as DesignVersion | null;
  if (!version) return null;
  const name = version.original_path.endsWith('.zip') ? 'design.zip' : version.original_name;
  const { data } = await db().storage.from(DESIGN_BUCKET).createSignedUrl(version.original_path, 300, { download: name });
  return data?.signedUrl ?? null;
}
