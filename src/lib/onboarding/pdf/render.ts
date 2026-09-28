import 'server-only';
import { renderToBuffer } from '@react-pdf/renderer';
import { createElement } from 'react';
import { withOpenItems } from '../ai/brief';
import { clientValue, type FileSummary } from '../export';
import { visibility } from '../logic';
import { textFor } from '../texts';
import type { OnboardingBrief, OnboardingDefinition, OnboardingFormRecord } from '../types';
import { loc } from '../types';
import { understoodText } from '../understood';
import { AnswersPdf, type AnswersPdfSection } from './AnswersPdf';
import { BriefPdf } from './BriefPdf';

/** Every visible question with the client's answer, by step, as the client reads it. */
function answerSections(definition: OnboardingDefinition, record: OnboardingFormRecord, files: FileSummary[]): AnswersPdfSection[] {
  const locale = record.locale;
  const { visible } = visibility(definition.fields, record.answers, locale);
  return definition.screens
    .filter((s) => s.kind === 'questions')
    .map((screen) => ({
      title: loc(screen as unknown as Record<string, unknown>, 'title', locale),
      rows: visible
        .filter((f) => f.screen_id === screen.id && f.type !== 'notice')
        .map((f) => ({
          label: loc(f as unknown as Record<string, unknown>, 'label', locale),
          value: clientValue(f, record.answers[f.id], locale, files),
        })),
    }));
}

/**
 * Renders the brief PDF in the client's language; `team: true` appends the internal flags.
 * The open items are recomputed from the answers as they stand (a brief written before
 * that logic, or before a late edit, never shows a stale list), and an appendix repeats
 * every question the client answered.
 */
export async function renderBriefPdf(
  definition: OnboardingDefinition,
  record: OnboardingFormRecord,
  brief: OnboardingBrief,
  opts: { team?: boolean; files?: FileSummary[] } = {},
): Promise<Buffer> {
  const files = opts.files ?? [];
  const footer = textFor(definition.texts, 'pdf_footer', record.locale)?.content_markdown ?? '';
  const appendix = answerSections(definition, record, files)
    .map((section) => ({ ...section, rows: section.rows.filter((r) => r.value) }))
    .filter((section) => section.rows.length);
  const element = createElement(BriefPdf, {
    record,
    sections: definition.briefSections,
    content: withOpenItems(definition, record, files, brief.sections),
    footerText: footer,
    flags: opts.team ? record.flags : undefined,
    appendix,
  });
  // renderToBuffer types the element as a Document element; BriefPdf returns exactly that.
  return renderToBuffer(element as unknown as Parameters<typeof renderToBuffer>[0]);
}

/** The client's own answers, by section, with the read-back: no model involved. */
export async function renderAnswersPdf(
  definition: OnboardingDefinition,
  record: OnboardingFormRecord,
  files: FileSummary[],
): Promise<Buffer> {
  const locale = record.locale;
  const sections = answerSections(definition, record, files);
  const element = createElement(AnswersPdf, {
    record,
    understood: understoodText(definition, record.answers, locale),
    sections,
    footerText: textFor(definition.texts, 'pdf_footer', locale)?.content_markdown ?? '',
  });
  return renderToBuffer(element as unknown as Parameters<typeof renderToBuffer>[0]);
}

export function answersPdfFileName(record: OnboardingFormRecord): string {
  const company = (record.company ?? '').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  const base = record.locale === 'de' ? 'Ihre-Angaben' : 'Your-answers';
  return `${base}${company ? `-${company}` : ''}.pdf`;
}

export function pdfFileName(record: OnboardingFormRecord, version: number): string {
  const company = (record.company ?? 'briefing').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'briefing';
  return `${record.locale === 'de' ? 'Briefing' : 'Brief'}-${company}-v${version}.pdf`;
}
