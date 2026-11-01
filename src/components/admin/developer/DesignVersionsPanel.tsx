'use client';

import { useRef, useState, useTransition } from 'react';
import {
  approveDesign,
  finishDesignUpload,
  generateRevisionPrompt,
  reopenDesign,
  resolveComment,
  startDesignUpload,
} from '@/app/admin/developer/[id]/actions';
import { LocalTime } from '@/components/admin/LocalTime';
import type { ReviewComment } from '@/lib/developer/review';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { PromptHistory, type GeneratedRow } from './PromptView';

export interface VersionRow {
  id: string;
  proposal: 'A' | 'B';
  /** The iteration number within the proposal. */
  version: number;
  label: string;
  status: 'uploading' | 'ready' | 'failed';
  error: string | null;
  file_count: number;
  size_bytes: number;
  original_name: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface RevisionRow extends GeneratedRow {
  design_version_id: string | null;
  client_summary: string | null;
}

/** The client's review link and what the client did on it. */
export interface ReviewInfo {
  /** Migration 20261101000024 has run. */
  ready: boolean;
  url: string | null;
  chosen: 'A' | 'B' | null;
  chosenAt: string | null;
  chosenBy: string | null;
  clientApproved: boolean;
}

interface Props {
  leadId: string;
  /** Migration 20261028000022 has run. */
  schemaReady: boolean;
  formReady: boolean;
  /** The full draft link without the version, e.g. https://web-studio.intellipaas.io/drafts/mueller; null before the first upload. */
  draftBase: string | null;
  versions: VersionRow[];
  approved: { id: string; at: string | null; by: string | null } | null;
  offline: boolean;
  revisions: RevisionRow[];
  review: ReviewInfo;
  comments: ReviewComment[];
}

const MAX_BYTES = 50 * 1024 * 1024;
const num = (p: 'A' | 'B') => (p === 'A' ? 1 : 2);
const name = (v: Pick<VersionRow, 'proposal' | 'version'>) => `Proposal ${num(v.proposal)} · Iteration ${v.version}`;

function formatSize(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function Uploader({ leadId, disabled, chosen }: { leadId: string; disabled: boolean; chosen: 'A' | 'B' | null }) {
  const [proposal, setProposal] = useState<'A' | 'B'>(chosen ?? 'A');
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'idle' | 'uploading' | 'unpacking'>('idle');
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const target = chosen ?? proposal;

  const upload = async () => {
    if (!file) return;
    setError(null);
    if (file.size > MAX_BYTES) return setError('The file is larger than 50 MB.');
    setStep('uploading');
    try {
      const started = await startDesignUpload(leadId, target, file.name, file.size);
      if (!started.ok || !started.ticket) throw new Error(started.error ?? 'Starting the upload failed');
      const { ticket } = started;
      const { error: uploadError } = await createSupabaseBrowserClient()
        .storage.from(ticket.bucket)
        .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type || 'application/octet-stream' });
      if (uploadError) throw new Error(`Uploading failed: ${uploadError.message}`);
      setStep('unpacking');
      const finished = await finishDesignUpload(leadId, ticket.versionId);
      if (!finished.ok) throw new Error(finished.error ?? 'Unpacking failed');
      setFile(null);
      if (input.current) input.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setStep('idle');
    }
  };

  const busy = step !== 'idle';
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4" data-testid="dev-upload">
      <p className="mb-3 text-sm text-slate-600">
        Download the design from Claude Design as a zip and upload it here. Each upload becomes the next iteration of its proposal and
        appears on the client&apos;s review link.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-500">Proposal</span>
          <select
            value={target}
            onChange={(e) => setProposal(e.target.value as 'A' | 'B')}
            disabled={disabled || busy || !!chosen}
            data-testid="dev-upload-proposal"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="A">Proposal 1{chosen === 'A' ? ' (chosen by the client)' : ''}</option>
            <option value="B">Proposal 2{chosen === 'B' ? ' (chosen by the client)' : ''}</option>
          </select>
        </label>
        <label className="block min-w-0 flex-1">
          <span className="mb-1 block text-xs font-semibold text-slate-500">Claude Design export (.zip, or a single .html)</span>
          <input
            ref={input}
            type="file"
            accept=".zip,.html,.htm"
            disabled={disabled || busy}
            data-testid="dev-upload-file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"
          />
        </label>
        <button
          type="button"
          onClick={upload}
          disabled={disabled || busy || !file}
          data-testid="dev-upload-submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {step === 'uploading' ? 'Uploading…' : step === 'unpacking' ? 'Unpacking…' : 'Upload iteration'}
        </button>
      </div>
      {chosen && <p className="mt-2 text-xs text-slate-500">The client chose Proposal {num(chosen)}, so new iterations go to it.</p>}
      {error && (
        <p className="mt-3 text-sm font-semibold text-red-600" data-testid="dev-upload-error">
          {error}
        </p>
      )}
    </div>
  );
}

function CopyLink({ url, testId, label = 'Copy link' }: { url: string; testId: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

function ReviewLink({ review }: { review: ReviewInfo }) {
  if (!review.ready) {
    return (
      <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" data-testid="dev-review-migration-notice">
        The client review link needs migration <code>20261101000024_developer_prompts_v2.sql</code> to be run in Supabase first.
      </p>
    );
  }
  if (!review.url) return null;
  return (
    <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm" data-testid="dev-review-link">
      <div className="mb-1 font-bold text-blue-900">Link for the client</div>
      <p className="mb-2 text-blue-900">
        One link shows both proposals. The client comments anywhere on the design, chooses a proposal and approves the final iteration.
        Send it on WhatsApp.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <a href={review.url} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-blue-700 hover:underline">
          {review.url.replace(/^https?:\/\//, '')}
        </a>
        <CopyLink url={review.url} testId="dev-review-copy" />
      </div>
      {review.chosen && (
        <p className="mt-2 text-blue-900" data-testid="dev-review-chosen">
          {review.chosenBy ?? 'The client'} chose <strong>Proposal {num(review.chosen)}</strong>
          {review.chosenAt ? (
            <>
              {' '}on <LocalTime iso={review.chosenAt} />
            </>
          ) : null}
          .
        </p>
      )}
    </div>
  );
}

function CommentsList({ leadId, versions, comments }: { leadId: string; versions: VersionRow[]; comments: ReviewComment[] }) {
  const [pending, start] = useTransition();
  const ready = [...versions].filter((v) => v.status === 'ready').reverse();
  const withComments = ready.filter((v) => comments.some((c) => c.versionId === v.id));
  if (!withComments.length) return null;
  return (
    <div className="mt-6 border-t border-slate-100 pt-5" data-testid="dev-comments">
      <h3 className="mb-1 text-base font-bold">Client comments</h3>
      <p className="mb-3 text-sm text-slate-600">From the review link. Open comments go into the next improvement prompt; resolve the ones you have handled yourself.</p>
      <div className="space-y-4">
        {withComments.map((v) => {
          const list = comments.filter((c) => c.versionId === v.id);
          let pin = 0;
          return (
            <div key={v.id}>
              <h4 className="mb-1.5 text-sm font-bold">{name(v)}</h4>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {list.map((c) => (
                  <li key={c.id} className="flex gap-3 px-3 py-2.5 text-sm">
                    <span className={`mt-0.5 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold text-white ${c.kind === 'pin' ? 'bg-blue-600' : 'bg-slate-500'}`}>
                      {c.kind === 'pin' ? ++pin : '·'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-slate-500">
                        <strong className="text-slate-700">{c.author}</strong> · {c.kind === 'pin' ? c.pageTitle || c.page || 'Pin' : 'General'}
                        {c.device === 'phone' ? ' · phone' : ''} · <LocalTime iso={c.createdAt} />
                      </div>
                      {c.near && <div className="text-xs text-slate-400">Near: {c.near}</div>}
                      <p className="mt-0.5 whitespace-pre-wrap text-slate-800">{c.body}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {c.carryOver && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">Carry over to the chosen proposal</span>}
                        {c.status === 'addressed' && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">In an improvement prompt</span>}
                        {!c.sent && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">Not sent yet</span>}
                      </div>
                    </div>
                    {c.status === 'open' && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => start(async () => { await resolveComment(leadId, c.id); })}
                        className="h-fit rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Resolve
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RevisionForm({ leadId, versions, comments, chosen, disabled }: { leadId: string; versions: VersionRow[]; comments: ReviewComment[]; chosen: 'A' | 'B' | null; disabled: boolean }) {
  const ready = versions.filter((v) => v.status === 'ready' && (!chosen || v.proposal === chosen));
  const [versionId, setVersionId] = useState(ready[ready.length - 1]?.id ?? '');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!ready.length) return null;
  const selected = ready.find((v) => v.id === versionId) ?? ready[ready.length - 1];
  const open = comments.filter((c) => c.status === 'open');
  const onThis = open.filter((c) => c.versionId === selected.id).length;
  const otherIds = new Set(versions.filter((v) => v.proposal !== selected.proposal).map((v) => v.id));
  const carry = open.filter((c) => c.carryOver && otherIds.has(c.versionId)).length;

  const generate = () =>
    start(async () => {
      setError(null);
      const r = await generateRevisionPrompt(leadId, selected.id, feedback);
      if (r.ok) setFeedback('');
      else setError(r.error ?? 'Generating failed');
    });

  return (
    <div className="mt-6 border-t border-slate-100 pt-5" data-testid="dev-revision">
      <h3 className="mb-1 text-base font-bold">Improvement prompt</h3>
      <p className="mb-3 text-sm text-slate-600">
        Turns the client&apos;s comments into the prompt for the next iteration. Paste it into the same Claude Design project, then upload
        the result above. It also writes the short &quot;what changed&quot; list the client sees on the next iteration.
      </p>
      <label className="mb-3 block max-w-sm">
        <span className="mb-1 block text-xs font-semibold text-slate-500">Comments on</span>
        <select
          value={selected.id}
          onChange={(e) => setVersionId(e.target.value)}
          disabled={disabled || pending}
          data-testid="dev-revision-version"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {[...ready].reverse().map((v) => (
            <option key={v.id} value={v.id}>
              {name(v)}
            </option>
          ))}
        </select>
      </label>
      <p className="mb-3 text-sm text-slate-700" data-testid="dev-revision-counts">
        Takes in <strong>{onThis}</strong> open {onThis === 1 ? 'comment' : 'comments'} on this iteration
        {carry ? (
          <>
            {' '}and <strong>{carry}</strong> to carry over from Proposal {num(selected.proposal === 'A' ? 'B' : 'A')}
          </>
        ) : null}
        .
      </p>
      <textarea
        rows={3}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        disabled={disabled || pending}
        data-testid="dev-revision-feedback"
        placeholder="Optional: feedback that came in another way (WhatsApp, a call), pasted as it is."
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={generate}
          disabled={disabled || pending || (!onThis && !carry && !feedback.trim())}
          data-testid="dev-revision-generate"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {pending ? 'Generating…' : 'Generate the improvement prompt'}
        </button>
        {pending && <span className="text-xs text-slate-500">This takes about a minute.</span>}
      </div>
      {error && (
        <p className="mt-3 text-sm font-semibold text-red-600" data-testid="dev-revision-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function DesignVersionsPanel({ leadId, schemaReady, formReady, draftBase, versions, approved, offline, revisions, review, comments }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const locked = Boolean(approved);
  const approvedVersion = versions.find((v) => v.id === approved?.id);

  if (!schemaReady) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" data-testid="dev-designs-migration-notice">
        Design uploads need migration <code>20261028000022_developer_designs.sql</code> to be run in Supabase first.
      </p>
    );
  }

  const approve = (v: VersionRow) => {
    if (!window.confirm(`Approve ${name(v)} on the client's behalf? This locks the design: no more uploads or improvement prompts until it is reopened.`)) return;
    start(async () => {
      setError(null);
      const r = await approveDesign(leadId, v.id);
      if (!r.ok) setError(r.error ?? 'Approving failed');
    });
  };
  const reopen = () => {
    if (
      !window.confirm(
        'Reopen the design? The approval is removed, uploads and improvements start again, and the build prompt has to be generated again once an iteration is approved.',
      )
    )
      return;
    start(async () => {
      setError(null);
      const r = await reopenDesign(leadId);
      if (!r.ok) setError(r.error ?? 'Reopening failed');
    });
  };

  return (
    <div data-testid="dev-design-versions">
      {approved && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900" data-testid="dev-approved">
          <span className="min-w-0 flex-1">
            <strong>Approved: {approvedVersion ? name(approvedVersion) : 'an iteration'}</strong>
            {approved.at ? (
              <>
                {' '}on <LocalTime iso={approved.at} />
              </>
            ) : null}
            {approved.by ? ` by ${approved.by}` : ''}
            {review.clientApproved ? ' on the review link' : ''}. The design is locked; the Build tab is open.
          </span>
          <button
            type="button"
            onClick={reopen}
            disabled={pending}
            data-testid="dev-reopen"
            className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
          >
            Reopen
          </button>
        </div>
      )}
      {offline && (
        <p className="mb-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600" data-testid="dev-drafts-offline">
          The draft links are offline. Switch them back on in the Handover tab.
        </p>
      )}
      <ReviewLink review={review} />

      {!locked && <Uploader leadId={leadId} disabled={!formReady} chosen={review.chosen} />}
      {!formReady && <p className="mt-2 text-xs text-slate-500">Available once the client has confirmed the onboarding form.</p>}

      {versions.length > 0 && (
        <div className="mt-5 space-y-5">
          {(['A', 'B'] as const).map((p) => {
            const list = versions.filter((v) => v.proposal === p);
            if (!list.length) return null;
            return (
              <div key={p}>
                <h3 className="mb-2 text-sm font-bold">
                  Proposal {num(p)}
                  {review.chosen && <span className="ml-2 font-normal text-slate-500">{review.chosen === p ? '· chosen by the client' : '· not chosen'}</span>}
                </h3>
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {[...list].reverse().map((v) => {
                    const url = draftBase ? `${draftBase}/${v.label}` : null;
                    const isApproved = approved?.id === v.id;
                    const count = comments.filter((c) => c.versionId === v.id);
                    const openCount = count.filter((c) => c.status === 'open').length;
                    return (
                      <li key={v.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm" data-testid={`dev-version-${v.label}`}>
                        <span className="w-24 font-bold">Iteration {v.version}</span>
                        <span className="min-w-0 flex-1">
                          {v.status === 'ready' && url ? (
                            <a href={url} target="_blank" rel="noopener noreferrer" className="break-all text-blue-700 hover:underline">
                              {url.replace(/^https?:\/\//, '')}
                            </a>
                          ) : v.status === 'failed' ? (
                            <span className="text-red-600">Failed: {v.error ?? 'unknown error'}. Upload it again.</span>
                          ) : v.status === 'uploading' ? (
                            <span className="text-slate-500">Upload not finished. If it was interrupted, upload it again.</span>
                          ) : null}
                          <span className="block text-xs text-slate-400">
                            {v.original_name} · {formatSize(v.size_bytes)}
                            {v.status === 'ready' ? ` · ${v.file_count} files` : ''} · <LocalTime iso={v.created_at} />
                            {v.uploaded_by ? ` · ${v.uploaded_by}` : ''}
                          </span>
                        </span>
                        {count.length > 0 && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                            {count.length} {count.length === 1 ? 'comment' : 'comments'}
                            {openCount ? ` · ${openCount} open` : ''}
                          </span>
                        )}
                        {isApproved && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Approved</span>}
                        {v.status === 'ready' && url && <CopyLink url={url} testId={`dev-version-${v.label}-copy`} label="Copy draft link" />}
                        {v.status === 'ready' && !locked && (
                          <button
                            type="button"
                            onClick={() => approve(v)}
                            disabled={pending}
                            data-testid={`dev-version-${v.label}-approve`}
                            className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white hover:bg-slate-700 disabled:bg-slate-300"
                          >
                            Approve
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
      {error && (
        <p className="mt-3 text-sm font-semibold text-red-600" data-testid="dev-versions-error">
          {error}
        </p>
      )}

      <CommentsList leadId={leadId} versions={versions} comments={comments} />
      {!locked && <RevisionForm leadId={leadId} versions={versions} comments={comments} chosen={review.chosen} disabled={!formReady} />}
      {versions
        .filter((v) => revisions.some((r) => r.design_version_id === v.id))
        .reverse()
        .map((v) => {
          const rows = revisions.filter((r) => r.design_version_id === v.id);
          return (
            <div key={v.id} className="mt-4">
              <h4 className="text-sm font-bold">Improvement prompts from {name(v)}</h4>
              {rows[0]?.client_summary && (
                <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <div className="mb-1 text-xs font-bold text-slate-500">The client sees this as &quot;What changed&quot; on Iteration {v.version + 1}:</div>
                  <p className="whitespace-pre-wrap">{rows[0].client_summary}</p>
                </div>
              )}
              <PromptHistory rows={rows} testId={`dev-revisions-${v.label}`} />
            </div>
          );
        })}
    </div>
  );
}
