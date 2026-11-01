import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { loadComments, type DesignComment } from './comments';
import { loadVersions } from './designs';
import { draftPath } from './drafts';
import type { Proposal } from './messages';
import { loadProject, loadPrompts } from './store';

/** One iteration as the client's review page shows it. */
export interface ReviewVersion {
  id: string;
  proposal: Proposal;
  iteration: number;
  createdAt: string;
  draftUrl: string;
}

/** A comment as the review page and the Design tab show it. */
export interface ReviewComment {
  id: string;
  versionId: string;
  kind: 'pin' | 'general';
  page: string | null;
  pageTitle: string | null;
  device: 'laptop' | 'phone' | null;
  x: number | null;
  y: number | null;
  /** Set when the client drew a box: x and y are then its top-left corner. */
  w: number | null;
  h: number | null;
  near: string | null;
  body: string;
  author: string;
  carryOver: boolean;
  status: 'open' | 'addressed' | 'resolved';
  sent: boolean;
  createdAt: string;
}

export interface ReviewState {
  company: string;
  lang: 'de' | 'en';
  versions: ReviewVersion[];
  chosen: Proposal | null;
  approved: { versionId: string; by: string | null; at: string | null; byClient: boolean } | null;
  comments: ReviewComment[];
  /** Per iteration: the "what changed" list the improvement prompt wrote for it. */
  summaries: Record<string, string>;
}

export const toReviewComment = (c: DesignComment): ReviewComment => ({
  id: c.id,
  versionId: c.version_id,
  kind: c.kind,
  page: c.page_path,
  pageTitle: c.page_title,
  device: c.device,
  x: c.x,
  y: c.y,
  w: c.w ?? null,
  h: c.h ?? null,
  near: c.near_text,
  body: c.body,
  author: c.author_name,
  carryOver: c.carry_over,
  status: c.status,
  sent: !!c.sent_at,
  createdAt: c.created_at,
});

/**
 * Everything the client's review page needs. An iteration's "what changed" list comes from the
 * improvement prompt written about the iteration before it.
 */
export async function loadReviewState(leadId: string, slug: string): Promise<ReviewState> {
  const db = createSupabaseAdminClient();
  const [project, versions, comments, revisions, leadRes, formRes] = await Promise.all([
    loadProject(leadId),
    loadVersions(leadId),
    loadComments(leadId),
    loadPrompts(leadId, 'revision'),
    db.from('leads').select('firma, vorname, nachname, locale').eq('id', leadId).maybeSingle(),
    db.from('onboarding_forms').select('locale, company').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const lead = leadRes.data as { firma: string | null; vorname: string | null; nachname: string | null; locale: string | null } | null;
  const form = formRes.data as { locale: string | null; company: string | null } | null;
  const ready = versions.filter((v) => v.status === 'ready');

  const summaries: Record<string, string> = {};
  for (const v of ready) {
    const before = ready.find((x) => x.proposal === v.proposal && x.version === v.version - 1);
    const summary = before && revisions.find((r) => r.design_version_id === before.id && r.client_summary)?.client_summary;
    if (summary) summaries[v.id] = summary;
  }

  const lang = (form?.locale ?? lead?.locale) === 'en' ? 'en' : 'de';
  return {
    company: form?.company || lead?.firma || [lead?.vorname, lead?.nachname].filter(Boolean).join(' ') || 'Website',
    lang,
    versions: ready.map((v) => ({ id: v.id, proposal: v.proposal, iteration: v.version, createdAt: v.created_at, draftUrl: draftPath(slug, v.label) })),
    chosen: project.chosen_proposal,
    approved: project.approved_version_id
      ? { versionId: project.approved_version_id, by: project.approved_by, at: project.approved_at, byClient: project.client_approved }
      : null,
    comments: comments.filter((c) => c.status !== 'resolved').map(toReviewComment),
    summaries,
  };
}
