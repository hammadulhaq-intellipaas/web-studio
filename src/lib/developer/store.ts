import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { Proposal } from './messages';

export type PromptKind = 'design' | 'revision' | 'build' | 'handover';

export interface DeveloperProject {
  lead_id: string;
  internal_notes: string;
  dev_instructions: string;
  /** The client part of every draft link: /drafts/<draft_slug>/<version>. */
  draft_slug: string | null;
  approved_version_id: string | null;
  approved_at: string | null;
  approved_by: string | null;
  drafts_offline: boolean;
  live_url: string;
  cms_url: string;
  updated_at: string | null;
  updated_by: string | null;
}

const EMPTY_PROJECT: Omit<DeveloperProject, 'lead_id'> = {
  internal_notes: '',
  dev_instructions: '',
  draft_slug: null,
  approved_version_id: null,
  approved_at: null,
  approved_by: null,
  drafts_offline: false,
  live_url: '',
  cms_url: '',
  updated_at: null,
  updated_by: null,
};

export interface StoredPrompt {
  id: string;
  lead_id: string;
  form_id: string | null;
  kind: PromptKind;
  proposal: Proposal | null;
  reference_slug: string | null;
  /** The design version a revision prompt is about. */
  design_version_id: string | null;
  content: string;
  model: string;
  created_by: string | null;
  created_at: string;
}

/** Missing table or column (a migration not run yet) as PostgREST and Postgres report it. */
function missingTable(error: { code?: string } | null): boolean {
  return error?.code === 'PGRST205' || error?.code === '42P01' || error?.code === 'PGRST204' || error?.code === '42703';
}

/** Whether the Developers tables exist. Before the migration the page explains what to run. */
export async function developerSchemaReady(): Promise<boolean> {
  const { error } = await createSupabaseAdminClient().from('developer_prompts').select('id').limit(1);
  return !missingTable(error);
}

/** Whether migration 20261028000022 (design versions, build and handover) has run. */
export async function designsSchemaReady(): Promise<boolean> {
  const { error } = await createSupabaseAdminClient().from('developer_design_versions').select('id').limit(1);
  return !missingTable(error);
}

export async function loadProject(leadId: string): Promise<DeveloperProject> {
  const { data } = await createSupabaseAdminClient().from('developer_projects').select('*').eq('lead_id', leadId).maybeSingle();
  return { ...EMPTY_PROJECT, lead_id: leadId, ...((data as Partial<DeveloperProject> | null) ?? {}) };
}

export async function saveProject(
  leadId: string,
  patch: Partial<Pick<DeveloperProject, 'internal_notes' | 'dev_instructions' | 'live_url' | 'cms_url'>>,
  by: string | null,
): Promise<void> {
  const { error } = await createSupabaseAdminClient()
    .from('developer_projects')
    .upsert({ lead_id: leadId, ...patch, updated_at: new Date().toISOString(), updated_by: by }, { onConflict: 'lead_id' });
  if (error) throw new Error(`Saving the project failed: ${error.message}`);
}

/** Every generated prompt for a client, newest first. */
export async function loadPrompts(leadId: string, kind: PromptKind): Promise<StoredPrompt[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from('developer_prompts')
    .select('*')
    .eq('lead_id', leadId)
    .eq('kind', kind)
    .order('created_at', { ascending: false });
  if (error && !missingTable(error)) throw new Error(`Loading prompts failed: ${error.message}`);
  return (data ?? []) as StoredPrompt[];
}

type NewPrompt = Omit<StoredPrompt, 'id' | 'created_at' | 'design_version_id'> & { design_version_id?: string | null };

export async function insertPrompts(rows: NewPrompt[]): Promise<void> {
  // design_version_id is only sent when set, so design prompts still save before migration 022.
  const clean = rows.map(({ design_version_id, ...rest }) => (design_version_id ? { ...rest, design_version_id } : rest));
  const { error } = await createSupabaseAdminClient().from('developer_prompts').insert(clean);
  if (error) throw new Error(`Saving the prompts failed: ${error.message}`);
}
