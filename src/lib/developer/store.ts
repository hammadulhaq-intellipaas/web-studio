import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { Proposal } from './messages';

export type PromptKind = 'design' | 'revision' | 'build' | 'handover';

export interface DeveloperProject {
  lead_id: string;
  internal_notes: string;
  dev_instructions: string;
  updated_at: string | null;
  updated_by: string | null;
}

export interface StoredPrompt {
  id: string;
  lead_id: string;
  form_id: string | null;
  kind: PromptKind;
  proposal: Proposal | null;
  reference_slug: string | null;
  content: string;
  model: string;
  created_by: string | null;
  created_at: string;
}

/** Missing table (migration 20261028000021 not run yet) as PostgREST and Postgres report it. */
function missingTable(error: { code?: string } | null): boolean {
  return error?.code === 'PGRST205' || error?.code === '42P01';
}

/** Whether the Developers tables exist. Before the migration the page explains what to run. */
export async function developerSchemaReady(): Promise<boolean> {
  const { error } = await createSupabaseAdminClient().from('developer_prompts').select('id').limit(1);
  return !missingTable(error);
}

export async function loadProject(leadId: string): Promise<DeveloperProject> {
  const { data } = await createSupabaseAdminClient().from('developer_projects').select('*').eq('lead_id', leadId).maybeSingle();
  return (data as DeveloperProject | null) ?? { lead_id: leadId, internal_notes: '', dev_instructions: '', updated_at: null, updated_by: null };
}

export async function saveProject(
  leadId: string,
  patch: Partial<Pick<DeveloperProject, 'internal_notes' | 'dev_instructions'>>,
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

export async function insertPrompts(rows: Omit<StoredPrompt, 'id' | 'created_at'>[]): Promise<void> {
  const { error } = await createSupabaseAdminClient().from('developer_prompts').insert(rows);
  if (error) throw new Error(`Saving the prompts failed: ${error.message}`);
}
