'use client';

import { useRef, useState, useTransition } from 'react';
import {
  approveDesign,
  finishDesignUpload,
  generateRevisionPrompt,
  reopenDesign,
  startDesignUpload,
} from '@/app/admin/developer/[id]/actions';
import { LocalTime } from '@/components/admin/LocalTime';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { PromptHistory, type GeneratedRow } from './PromptView';

export interface VersionRow {
  id: string;
  proposal: 'A' | 'B';
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
}

const MAX_BYTES = 50 * 1024 * 1024;

function formatSize(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function Uploader({ leadId, disabled }: { leadId: string; disabled: boolean }) {
  const [proposal, setProposal] = useState<'A' | 'B'>('A');
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'idle' | 'uploading' | 'unpacking'>('idle');
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const upload = async () => {
    if (!file) return;
    setError(null);
    if (file.size > MAX_BYTES) return setError('The file is larger than 50 MB.');
    setStep('uploading');
    try {
      const started = await startDesignUpload(leadId, proposal, file.name, file.size);
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
        Download the design from Claude Design as a zip and upload it here. Each upload becomes a new version with its
        own link to send to the client.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-500">Proposal</span>
          <select
            value={proposal}
            onChange={(e) => setProposal(e.target.value as 'A' | 'B')}
            disabled={disabled || busy}
            data-testid="dev-upload-proposal"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="A">Proposal A</option>
            <option value="B">Proposal B</option>
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
          {step === 'uploading' ? 'Uploading…' : step === 'unpacking' ? 'Unpacking…' : 'Upload version'}
        </button>
      </div>
      {error && (
        <p className="mt-3 text-sm font-semibold text-red-600" data-testid="dev-upload-error">
          {error}
        </p>
      )}
    </div>
  );
}

function CopyLink({ url, testId }: { url: string; testId: string }) {
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
      {copied ? 'Copied' : 'Copy link'}
    </button>
  );
}

function RevisionForm({ leadId, versions, disabled }: { leadId: string; versions: VersionRow[]; disabled: boolean }) {
  const ready = versions.filter((v) => v.status === 'ready');
  const [versionId, setVersionId] = useState(ready[ready.length - 1]?.id ?? '');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!ready.length) return null;
  const selected = ready.some((v) => v.id === versionId) ? versionId : ready[ready.length - 1].id;

  const generate = () =>
    start(async () => {
      setError(null);
      const r = await generateRevisionPrompt(leadId, selected, feedback);
      if (r.ok) setFeedback('');
      else setError(r.error ?? 'Generating failed');
    });

  return (
    <div className="mt-6 border-t border-slate-100 pt-5" data-testid="dev-revision">
      <h3 className="mb-1 text-base font-bold">Client feedback</h3>
      <p className="mb-3 text-sm text-slate-600">
        Paste what the client wrote (WhatsApp, email, a call note) and pick the version it is about. The revision prompt goes into the same
        Claude Design project; upload the result as the next version.
      </p>
      <label className="mb-3 block max-w-xs">
        <span className="mb-1 block text-xs font-semibold text-slate-500">Feedback on</span>
        <select
          value={selected}
          onChange={(e) => setVersionId(e.target.value)}
          disabled={disabled || pending}
          data-testid="dev-revision-version"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {[...ready].reverse().map((v) => (
            <option key={v.id} value={v.id}>
              {v.label} (Proposal {v.proposal})
            </option>
          ))}
        </select>
      </label>
      <textarea
        rows={5}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        disabled={disabled || pending}
        data-testid="dev-revision-feedback"
        placeholder="e.g. Das Grün ist zu dunkel, und auf der Startseite fehlen unsere Öffnungszeiten."
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={generate}
          disabled={disabled || pending || !feedback.trim()}
          data-testid="dev-revision-generate"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {pending ? 'Generating…' : 'Generate the revision prompt'}
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

export function DesignVersionsPanel({ leadId, schemaReady, formReady, draftBase, versions, approved, offline, revisions }: Props) {
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
    if (!window.confirm(`Approve ${v.label}? This locks the design: no more uploads or revision prompts until it is reopened.`)) return;
    start(async () => {
      setError(null);
      const r = await approveDesign(leadId, v.id);
      if (!r.ok) setError(r.error ?? 'Approving failed');
    });
  };
  const reopen = () => {
    if (
      !window.confirm(
        'Reopen the design? The approval is removed, uploads and revisions start again, and the build prompt has to be generated again once a version is approved.',
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
            <strong>Approved: {approvedVersion?.label ?? 'a version'}</strong>
            {approved.at ? (
              <>
                {' '}on <LocalTime iso={approved.at} />
              </>
            ) : null}
            {approved.by ? ` by ${approved.by}` : ''}. The design is locked; the Build tab is open.
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

      {!locked && <Uploader leadId={leadId} disabled={!formReady} />}
      {!formReady && <p className="mt-2 text-xs text-slate-500">Available once the client has confirmed the onboarding form.</p>}

      {versions.length > 0 && (
        <div className="mt-5 space-y-5">
          {(['A', 'B'] as const).map((p) => {
            const list = versions.filter((v) => v.proposal === p);
            if (!list.length) return null;
            return (
              <div key={p}>
                <h3 className="mb-2 text-sm font-bold">Proposal {p}</h3>
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {[...list].reverse().map((v) => {
                    const url = draftBase ? `${draftBase}/${v.label}` : null;
                    const isApproved = approved?.id === v.id;
                    return (
                      <li key={v.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm" data-testid={`dev-version-${v.label}`}>
                        <span className="w-12 font-bold">{v.label}</span>
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
                        {isApproved && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Approved</span>}
                        {v.status === 'ready' && url && <CopyLink url={url} testId={`dev-version-${v.label}-copy`} />}
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

      {!locked && <RevisionForm leadId={leadId} versions={versions} disabled={!formReady} />}
      {versions
        .filter((v) => revisions.some((r) => r.design_version_id === v.id))
        .reverse()
        .map((v) => (
          <div key={v.id} className="mt-4">
            <h4 className="text-sm font-bold">Revision prompts for {v.label}</h4>
            <PromptHistory rows={revisions.filter((r) => r.design_version_id === v.id)} testId={`dev-revisions-${v.label}`} />
          </div>
        ))}
    </div>
  );
}
