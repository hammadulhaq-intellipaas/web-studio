'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

/** A generated prompt: rendered for reading, copied as the raw Markdown it is pasted as. */
export function PromptView({ content, testId }: { content: string; testId?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div data-testid={testId}>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={copy}
          data-testid={testId ? `${testId}-copy` : undefined}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          {copied ? 'Copied' : 'Copy prompt'}
        </button>
      </div>
      <div className="max-h-[520px] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-relaxed text-slate-800 [&_h1]:mb-3 [&_h1]:text-lg [&_h1]:font-extrabold [&_h2]:mb-1.5 [&_h2]:mt-5 [&_h2]:text-base [&_h2]:font-bold [&_h3]:mb-1 [&_h3]:mt-4 [&_h3]:font-bold [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
