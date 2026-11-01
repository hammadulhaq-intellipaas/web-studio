import { NextResponse, type NextRequest } from 'next/server';
import { addComment, COMMENT_MAX, NAME_MAX, takeUnsent } from '@/lib/developer/comments';
import { clientApprove, clientChoose, loadVersions, resolveReview } from '@/lib/developer/designs';
import { versionName } from '@/lib/developer/drafts';
import type { Proposal } from '@/lib/developer/messages';
import { mailTeam } from '@/lib/developer/notify';
import { loadReviewState } from '@/lib/developer/review';
import { loadProject, reviewSchemaReady } from '@/lib/developer/store';

export const dynamic = 'force-dynamic';

/**
 * The client's review link, as an API: read the state, leave a comment, choose a proposal,
 * approve the design, send the feedback to the team. No login: the secret code in the link is
 * the key, and every call checks it.
 */
const HEADERS = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: HEADERS });

type Params = { params: Promise<{ slug: string; token: string }> };

async function open(params: Params['params']) {
  const { slug, token } = await params;
  if (!(await reviewSchemaReady())) return null;
  const hit = await resolveReview(slug, token);
  return hit ? { slug, leadId: hit.leadId } : null;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const review = await open(params);
  if (!review) return json({ error: 'not_found' }, 404);
  return json(await loadReviewState(review.leadId, review.slug));
}

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max) : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export async function POST(request: NextRequest, { params }: Params) {
  const review = await open(params);
  if (!review) return json({ error: 'not_found' }, 404);
  const { leadId, slug } = review;
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; } catch { return json({ error: 'bad_request' }, 400); }
  const author = text(body.author, NAME_MAX);
  if (!author) return json({ error: 'name_required' }, 400);

  try {
    const [project, versions] = await Promise.all([loadProject(leadId), loadVersions(leadId)]);
    const company = async () => (await loadReviewState(leadId, slug)).company;

    if (body.action === 'comment') {
      if (project.approved_version_id) return json({ error: 'approved' }, 409);
      const version = versions.find((v) => v.id === body.versionId && v.status === 'ready');
      const comment = text(body.body, COMMENT_MAX);
      if (!version || !comment) return json({ error: 'bad_request' }, 400);
      const pin = body.kind === 'pin';
      await addComment({
        lead_id: leadId,
        version_id: version.id,
        kind: pin ? 'pin' : 'general',
        page_path: pin ? text(body.page, 300) || null : null,
        page_title: pin ? text(body.pageTitle, 200) || null : null,
        device: pin ? (body.device === 'phone' ? 'phone' : 'laptop') : null,
        x: pin ? num(body.x) : null,
        y: pin ? num(body.y) : null,
        near_text: pin ? text(body.near, 400) || null : null,
        body: comment,
        author_name: author,
        carry_over: !!project.chosen_proposal && version.proposal !== project.chosen_proposal,
      });
      return json(await loadReviewState(leadId, slug));
    }

    if (body.action === 'choose') {
      const proposal = body.proposal === 'A' || body.proposal === 'B' ? (body.proposal as Proposal) : null;
      if (!proposal) return json({ error: 'bad_request' }, 400);
      await clientChoose(leadId, proposal, author);
      await mailTeam(`${await company()}: Entwurf ${proposal === 'A' ? 1 : 2} gewählt`, `${author} chose Proposal ${proposal === 'A' ? 1 : 2} on the review link.`, [], leadId);
      return json(await loadReviewState(leadId, slug));
    }

    if (body.action === 'approve') {
      const version = await clientApprove(leadId, String(body.versionId ?? ''), author);
      await mailTeam(`${await company()}: Design freigegeben`, `${author} approved ${versionName(version.proposal, version.version)} on the review link. The design is locked; the Build tab is open.`, [], leadId);
      return json(await loadReviewState(leadId, slug));
    }

    if (body.action === 'send') {
      const unsent = await takeUnsent(leadId);
      if (unsent.length) {
        const name = (id: string) => { const v = versions.find((x) => x.id === id); return v ? versionName(v.proposal, v.version) : ''; };
        await mailTeam(
          `${await company()}: ${unsent.length} ${unsent.length === 1 ? 'Kommentar' : 'Kommentare'} zum Design`,
          `${author} sent feedback on the design.`,
          unsent.map((c) => ({
            label: [name(c.version_id), c.kind === 'pin' ? c.page_title || c.page_path : 'General', c.carry_over ? 'carry over' : '', c.author_name].filter(Boolean).join(' · '),
            text: c.near_text ? `${c.body}\n(near: ${c.near_text})` : c.body,
          })),
          leadId,
        );
      }
      return json({ sent: unsent.length, state: await loadReviewState(leadId, slug) });
    }

    return json({ error: 'bad_request' }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
}
