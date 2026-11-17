'use client';

import { useState, useTransition } from 'react';
import { readCurrentSite } from '@/app/admin/developer/[id]/actions';

export interface CurrentSiteView {
  url: string;
  status: 'reading' | 'ready' | 'failed';
  step: string | null;
  pages: number;
  images: number;
  photosDescribed: number;
  fonts: number;
  pdfs: number;
  facts: number;
  openPoints: number;
  notes: string[];
  error: string | null;
  spec: string | null;
  updatedAt: string;
}

const STEP_NAMES: Record<string, string> = {
  pages: 'reading the pages',
  assets: 'downloading photos, fonts and PDFs',
  content: 'sorting the content',
  photos: 'describing the photos',
  design: 'measuring the design',
};

/**
 * Form B: the client's current website as the design prompts use it. Read automatically when the
 * client confirms; the team can read it again (it never touches existing prompts).
 */
export function CurrentSitePanel({ leadId, site, existingUrl }: { leadId: string; site: CurrentSiteView | null; existingUrl: string | null }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const read = () =>
    start(async () => {
      setError(null);
      const result = await readCurrentSite(leadId);
      if (!result.ok) setError(result.error ?? 'Could not start.');
    });

  return (
    <div className="space-y-3 text-sm" data-testid="dev-current-site">
      {!site ? (
        <p className="text-slate-600">
          {existingUrl ? `Not read yet: ${existingUrl}.` : 'The client gave no website address.'} It is read automatically when the client confirms the
          form.
        </p>
      ) : (
        <>
          <p>
            <a href={site.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 hover:underline">
              {site.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
            </a>{' '}
            {site.status === 'reading' ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">Reading: {STEP_NAMES[site.step ?? ''] ?? site.step ?? 'starting'}…</span>
            ) : site.status === 'failed' ? (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">Could not be read</span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Read</span>
            )}
          </p>
          {site.error && <p className="text-red-600">{site.error}</p>}
          <p className="text-slate-600">
            {site.pages} pages · {site.images} photos ({site.photosDescribed} described) · {site.fonts} font files · {site.pdfs} PDFs · {site.facts}{' '}
            content parts checked against the pages
            {site.openPoints ? ` · ${site.openPoints} open points` : ''}
          </p>
          {site.status === 'ready' && (
            <p>
              <a href={`/admin/developer/${leadId}/site-assets`} className="font-semibold text-blue-700 hover:underline" data-testid="dev-site-assets">
                Download the photos, logo and fonts (zip)
              </a>
              <span className="text-slate-500"> for Claude Design: the design prompt names them as assets/current-site/…</span>
            </p>
          )}
          {site.spec && (
            <details>
              <summary className="cursor-pointer font-semibold text-slate-700">The spec of the current website</summary>
              <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{site.spec}</pre>
            </details>
          )}
          {site.notes.length > 0 && (
            <details>
              <summary className="cursor-pointer text-slate-500">{site.notes.length} things could not be read</summary>
              <ul className="mt-1 list-disc pl-5 text-xs text-slate-500">
                {site.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
      {existingUrl && (
        <button
          type="button"
          onClick={read}
          disabled={pending || site?.status === 'reading'}
          data-testid="dev-read-site"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {pending ? 'Starting…' : site ? 'Read the website again' : 'Read the website now'}
        </button>
      )}
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
