import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/** One comment from the client's review link (or one the team added there). */
export interface DesignComment {
  id: string;
  lead_id: string;
  version_id: string;
  kind: 'pin' | 'general';
  /** The design page the pin sits on (its file in the export), and its title as the client saw it. */
  page_path: string | null;
  page_title: string | null;
  device: 'laptop' | 'phone' | null;
  /**
   * x as a percentage of the page width, y in px from the top, at that device's width. With w
   * (percentage of the width) and h (px) they are the top-left corner of a box the client drew.
   */
  x: number | null;
  y: number | null;
  w?: number | null;
  h?: number | null;
  /** The heading and the text closest to the pin, so the model knows where it is. */
  near_text: string | null;
  body: string;
  author_name: string;
  /** Left on the other proposal, about something the client wants in theirs. */
  carry_over: boolean;
  status: 'open' | 'addressed' | 'resolved';
  /** The improvement prompt that took the comment in. */
  prompt_id: string | null;
  sent_at: string | null;
  created_at: string;
}

export type NewComment = Pick<
  DesignComment,
  'lead_id' | 'version_id' | 'kind' | 'page_path' | 'page_title' | 'device' | 'x' | 'y' | 'w' | 'h' | 'near_text' | 'body' | 'author_name' | 'carry_over'
>;

/** A column a migration adds, not there yet. */
const missingColumn = (error: { code?: string } | null) => error?.code === 'PGRST204' || error?.code === '42703';

const db = () => createSupabaseAdminClient();

export const COMMENT_MAX = 2000;
export const NAME_MAX = 80;
/** A guard against a runaway script on a public link: comments per client per hour. */
const HOURLY_LIMIT = 120;

export async function loadComments(leadId: string): Promise<DesignComment[]> {
  const { data, error } = await db().from('design_comments').select('*').eq('lead_id', leadId).order('created_at');
  if (error) throw new Error(`Loading comments failed: ${error.message}`);
  return (data ?? []) as DesignComment[];
}

export async function addComment(row: NewComment): Promise<DesignComment> {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db().from('design_comments').select('id', { count: 'exact', head: true }).eq('lead_id', row.lead_id).gte('created_at', since);
  if ((count ?? 0) >= HOURLY_LIMIT) throw new Error('Too many comments in a short time. Please try again later.');
  const { w, h, ...spot } = row;
  const insert = (values: Record<string, unknown>) => db().from('design_comments').insert(values).select('*').single();
  const area = w != null && h != null && spot.x != null && spot.y != null;
  let { data, error } = await insert(area ? { ...spot, w, h } : spot);
  // Before migration 20261101000025 there is no w/h: keep the box as a spot at its centre.
  if (area && missingColumn(error)) ({ data, error } = await insert({ ...spot, x: spot.x! + w / 2, y: spot.y! + h / 2 }));
  if (error || !data) throw new Error(`Saving the comment failed: ${error?.message ?? 'unknown'}`);
  return data as DesignComment;
}

export async function setCommentStatus(leadId: string, id: string, status: DesignComment['status']): Promise<void> {
  const { error } = await db().from('design_comments').update({ status }).eq('id', id).eq('lead_id', leadId);
  if (error) throw new Error(`Updating the comment failed: ${error.message}`);
}

/** The comments an improvement prompt took in are done from the client's point of view. */
export async function markAddressed(leadId: string, ids: string[], promptId: string): Promise<void> {
  if (!ids.length) return;
  const { error } = await db().from('design_comments').update({ status: 'addressed', prompt_id: promptId }).eq('lead_id', leadId).in('id', ids);
  if (error) throw new Error(`Updating the comments failed: ${error.message}`);
}

/** Marks every not-yet-sent comment as sent and returns them, for the one email to the team. */
export async function takeUnsent(leadId: string): Promise<DesignComment[]> {
  const { data, error } = await db().from('design_comments').select('*').eq('lead_id', leadId).is('sent_at', null).order('created_at');
  if (error) throw new Error(`Loading comments failed: ${error.message}`);
  const rows = (data ?? []) as DesignComment[];
  if (rows.length) await db().from('design_comments').update({ sent_at: new Date().toISOString() }).in('id', rows.map((r) => r.id));
  return rows;
}
