'use client';

import ReactMarkdown from 'react-markdown';
import type { Locale } from '@/lib/types';
import { textFor } from '@/lib/onboarding/texts';
import type { OnbField, OnbText } from '@/lib/onboarding/types';
import { INK } from '@/components/funnel/ui';

/** CMS notice revealed by a condition (proofreading, logo redraw, legal placeholder, BFSG). */
export function Notice({ field, texts, locale }: { field: OnbField; texts: OnbText[]; locale: Locale }) {
  const text = field.config.text_key ? textFor(texts, field.config.text_key, locale) : undefined;
  if (!text) return null;
  const warn = field.config.tone === 'warn';
  return (
    <div
      data-field={field.id}
      data-testid={`notice-${field.id}`}
      role="note"
      className="onb-reveal"
      style={{
        background: warn ? '#FFF7E6' : '#F5F7FB',
        border: `1px solid ${warn ? '#F1D18A' : '#E4E9F2'}`,
        borderRadius: 12,
        padding: '12px 16px',
        fontSize: 13.5,
        lineHeight: 1.55,
        color: '#4A5872',
      }}
    >
      {text.title && <div style={{ fontWeight: 700, color: INK, marginBottom: 4 }}>{text.title}</div>}
      <div className="onb-markdown">
        <ReactMarkdown>{text.content_markdown}</ReactMarkdown>
      </div>
    </div>
  );
}
