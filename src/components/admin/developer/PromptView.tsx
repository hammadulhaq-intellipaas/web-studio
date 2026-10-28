'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { LocalTime } from '@/components/admin/LocalTime';

/** A generated prompt: rendered for reading, copied as the raw Markdown it is pasted as. */
export function PromptView({
  content,
  testId,
  copyLabel = 'Copy prompt',
  downloadName,
}: {
  content: string;
  testId?: string;
  copyLabel?: string;
  /** Offers the Markdown as a file download too, under this name. */
  downloadName?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName!;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div data-testid={testId}>
      <div className="mb-2 flex justify-end gap-2">
        {downloadName && (
          <button
            type="button"
            onClick={download}
            data-testid={testId ? `${testId}-download` : undefined}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Download .md
          </button>
        )}
        <button
          type="button"
          onClick={copy}
          data-testid={testId ? `${testId}-copy` : undefined}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          {copied ? 'Copied' : copyLabel}
        </button>
      </div>
      <div className="max-h-[520px] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-relaxed text-slate-800 [&_h1]:mb-3 [&_h1]:text-lg [&_h1]:font-extrabold [&_h2]:mb-1.5 [&_h2]:mt-5 [&_h2]:text-base [&_h2]:font-bold [&_h3]:mb-1 [&_h3]:mt-4 [&_h3]:font-bold [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_table]:my-3 [&_td]:border [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-slate-200 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_ul]:list-disc [&_ul]:pl-5">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}

export interface GeneratedRow {
  id: string;
  content: string;
  model: string;
  created_by: string | null;
  created_at: string;
}

/** The newest generated text in full, earlier versions folded away below it. */
export function PromptHistory({
  rows,
  testId,
  copyLabel,
  downloadName,
}: {
  rows: GeneratedRow[];
  testId: string;
  copyLabel?: string;
  downloadName?: string;
}) {
  if (!rows.length) return null;
  const [latest, ...older] = rows;
  return (
    <div className="mt-5 border-t border-slate-100 pt-5" data-testid={testId}>
      <div className="mb-2 text-xs text-slate-400">
        Version {rows.length} · <LocalTime iso={latest.created_at} /> · {latest.model}
        {latest.created_by ? ` · ${latest.created_by}` : ''}
      </div>
      <PromptView content={latest.content} testId={`${testId}-latest`} copyLabel={copyLabel} downloadName={downloadName} />
      {older.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-semibold text-slate-500">Earlier versions ({older.length})</summary>
          <div className="mt-2 space-y-4">
            {older.map((v, i) => (
              <div key={v.id}>
                <div className="mb-1 text-xs text-slate-400">
                  Version {older.length - i} · <LocalTime iso={v.created_at} />
                </div>
                <PromptView content={v.content} copyLabel={copyLabel} />
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
