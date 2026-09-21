import 'server-only';
import { renderToBuffer } from '@react-pdf/renderer';
import { createElement } from 'react';
import { textFor } from '../texts';
import type { OnboardingBrief, OnboardingDefinition, OnboardingFormRecord } from '../types';
import { BriefPdf } from './BriefPdf';

/** Renders the brief PDF in the client's language; `team: true` appends the internal flags. */
export async function renderBriefPdf(
  definition: OnboardingDefinition,
  record: OnboardingFormRecord,
  brief: OnboardingBrief,
  opts: { team?: boolean } = {},
): Promise<Buffer> {
  const footer = textFor(definition.texts, 'pdf_footer', record.locale)?.content_markdown ?? '';
  const element = createElement(BriefPdf, {
    record,
    sections: definition.briefSections,
    content: brief.sections,
    footerText: footer,
    flags: opts.team ? record.flags : undefined,
  });
  // renderToBuffer types the element as a Document element; BriefPdf returns exactly that.
  return renderToBuffer(element as unknown as Parameters<typeof renderToBuffer>[0]);
}

export function pdfFileName(record: OnboardingFormRecord, version: number): string {
  const company = (record.company ?? 'briefing').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'briefing';
  return `${record.locale === 'de' ? 'Briefing' : 'Brief'}-${company}-v${version}.pdf`;
}
