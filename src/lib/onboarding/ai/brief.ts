import 'server-only';
import { z } from 'zod';
import type { Locale } from '@/lib/types';
import { displayValue, type FileSummary } from '../export';
import { buildCorpus, findForbidden, findUngrounded, stripDashes, type Corpus } from '../guardrails';
import { computeGaps, fieldLabel, sliderLabel, visibility } from '../logic';
import type {
  BriefSectionContent,
  Gap,
  OnbBriefSection,
  OnbField,
  OnboardingDefinition,
  OnboardingFormRecord,
  OnboardingSecrets,
} from '../types';
import { loc } from '../types';
import { callModel, modelConfigured, promptText, reserveAiCall } from './client';
import { clientHeader, localeName, renderAnswers } from './context';

export interface BriefDraft {
  sections: Record<string, BriefSectionContent>;
  source: 'llm' | 'fallback';
  model: string | null;
  attempts: number;
}

/* ------------------------------------------------------------------ schema */

function sectionSchema(fieldKeys: [string, ...string[]]) {
  return z.object({
    content_markdown: z.string().min(1).max(6000),
    still_needed: z.array(z.string().max(200)).max(20),
    sources: z.array(z.enum(fieldKeys)).max(60),
  });
}

/** Fixed keys, `.nullable()` never `.optional()` — OpenAI structured outputs reject optional properties. */
export function briefSchema(sections: OnbBriefSection[], fieldKeys: [string, ...string[]]) {
  const shape = Object.fromEntries(sections.map((s) => [s.id, sectionSchema(fieldKeys)]));
  return z.object({ sections: z.object(shape) });
}

/* ------------------------------------------------------------------ prompt */

function sectionSpec(section: OnbBriefSection, definition: OnboardingDefinition, locale: Locale): string {
  return [
    `### ${section.id}: "${loc(section as unknown as Record<string, unknown>, 'title', locale)}"`,
    section.instructions ?? '',
    `Source fields: ${section.source_fields.join(', ') || '(none)'}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function examplesBlock(secrets: OnboardingSecrets): string {
  if (!secrets.examples.length) return '';
  return [
    '',
    'Worked examples (answers in → brief out). Match their level of detail and restraint:',
    ...secrets.examples.map((ex) => `EXAMPLE "${ex.title}"\nANSWERS: ${JSON.stringify(ex.answers)}\nBRIEF: ${JSON.stringify(ex.brief)}`),
  ].join('\n');
}

export function buildBriefPrompt(input: {
  definition: OnboardingDefinition;
  secrets: OnboardingSecrets;
  record: OnboardingFormRecord;
  files: FileSummary[];
  sections: OnbBriefSection[];
  gaps: Gap[];
  violations?: string[];
}): string {
  const { definition, secrets, record, files, sections, gaps, violations } = input;
  const locale = record.locale;
  return [
    promptText(secrets.prompts, 'brief'),
    '',
    `Write in ${localeName(locale)}.`,
    clientHeader(record),
    '',
    'SECTIONS (write exactly these, keyed by id):',
    ...sections.map((s) => sectionSpec(s, definition, locale)),
    '',
    'THE CLIENT\'S ANSWERS (field key · label: answer; [DONT_KNOW]/[UNANSWERED]/[THIN] mark gaps):',
    renderAnswers(definition, record.answers, files, locale, { markGaps: gaps }),
    examplesBlock(secrets),
    violations?.length
      ? `\nYOUR PREVIOUS ATTEMPT WAS REJECTED. It contained content that is not in the answers or is forbidden: ${violations.join(' | ')}. Remove every such item; where a fact is missing, list it under still_needed instead.`
      : '',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

/* ------------------------------------------------------------------ guardrails */

/** Caption text the model may legitimately echo (slider labels, option labels) joins the corpus. */
export function briefCorpus(definition: OnboardingDefinition, record: OnboardingFormRecord, files: FileSummary[]): Corpus {
  const extra: string[] = [];
  const { visible } = visibility(definition.fields, record.answers);
  for (const field of visible) {
    const answer = record.answers[field.id];
    if (!answer) continue;
    extra.push(displayValue(field, answer, 'de', files), displayValue(field, answer, 'en', files));
    if (field.type === 'slider' && typeof answer.v === 'number') extra.push(sliderLabel(field, answer.v, 'de'), sliderLabel(field, answer.v, 'en'));
  }
  // Company / contact from the record header, and dates as the model may reformat them.
  extra.push(record.company ?? '', record.name ?? '', record.email ?? '');
  return buildCorpus(record.answers, extra);
}

export function checkSections(sections: Record<string, BriefSectionContent>, corpus: Corpus): string[] {
  const violations: string[] = [];
  for (const [id, section] of Object.entries(sections)) {
    for (const hit of findForbidden(section.content_markdown, corpus)) violations.push(`${id}: forbidden "${hit}"`);
    for (const hit of findUngrounded(section.content_markdown, corpus)) violations.push(`${id}: not in the answers "${hit}"`);
  }
  return violations;
}

/* ------------------------------------------------------------------ fallback + system section */

/** Plain rendering of the answers — what reaches the client when the model can't be trusted or used. */
export function fallbackSections(
  definition: OnboardingDefinition,
  record: OnboardingFormRecord,
  files: FileSummary[],
  sections: OnbBriefSection[],
): Record<string, BriefSectionContent> {
  const locale = record.locale;
  const { hidden } = visibility(definition.fields, record.answers, locale);
  const out: Record<string, BriefSectionContent> = {};
  for (const section of sections) {
    const lines: string[] = [];
    const sources: string[] = [];
    for (const key of section.source_fields) {
      const field = definition.fields.find((f) => f.id === key);
      if (!field || hidden.has(key) || field.type === 'notice') continue;
      const answer = record.answers[key];
      const text = displayValue(field, answer, locale, files);
      const label = fieldLabel(field, locale);
      if (answer?.dk) continue;
      if (text) {
        // Question-style labels read better without a colon after the question mark.
        const head = `**${label}${/[?!.]$/.test(label) ? '' : ':'}**`;
        lines.push(text.includes('\n') ? `${head}\n${text.split('\n').map((l) => `- ${l}`).join('\n')}` : `${head} ${text}`);
        sources.push(key);
      }
    }
    const missing = openItems(definition, record, files, new Set(section.source_fields)).map((i) => i.text);
    out[section.id] = { content_markdown: lines.join('\n\n') || (locale === 'de' ? 'Keine Angaben.' : 'Nothing provided.'), still_needed: missing, sources };
  }
  return out;
}

function readableDate(iso: string, locale: Locale): string {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export interface OpenItem {
  field: OnbField;
  text: string;
}

/**
 * What the brief lists as still open, and nothing else: questions the client had to answer
 * and left empty, answered "I don't know" (with the date they expect to know), or uploads
 * a required step is still waiting for. Composed by code from the answers. Optional
 * questions left blank, short answers, skipped follow-ups and the model's own ideas of
 * what might be nice are not open items: they read as a wall of demands, and most of them
 * had been answered. `only` narrows it to one section's fields.
 */
export function openItems(
  definition: OnboardingDefinition,
  record: OnboardingFormRecord,
  files: FileSummary[],
  only?: Set<string>,
): OpenItem[] {
  const locale = record.locale;
  const counts: Record<string, number> = {};
  for (const f of files) if (f.field_key) counts[f.field_key] = (counts[f.field_key] ?? 0) + 1;
  const items: OpenItem[] = [];
  const seen = new Set<string>();
  for (const gap of computeGaps(definition, record.answers, counts, locale)) {
    if (gap.kind === 'thin' || seen.has(gap.field) || (only && !only.has(gap.field))) continue;
    const field = definition.fields.find((f) => f.id === gap.field);
    if (!field) continue;
    seen.add(gap.field);
    const label = stripDashes(fieldLabel(field, locale));
    const by = gap.kind === 'dont_know' ? record.answers[gap.field]?.dk_date : null;
    let text = label;
    if (gap.kind === 'dont_know') {
      if (by) text = locale === 'de' ? `${label} (Sie erwarten die Angabe bis ${readableDate(by, locale)})` : `${label} (you expect to know by ${readableDate(by, locale)})`;
      else text = locale === 'de' ? `${label} (noch nicht bekannt)` : `${label} (not known yet)`;
    } else if (gap.kind === 'no_files') {
      text = locale === 'de' ? `${label} (Dateien folgen noch)` : `${label} (files still to come)`;
    }
    items.push({ field, text });
  }
  return items;
}

/** Section 9: the open items above, grouped by the step they belong to. Composed by code. */
export function stillNeededSection(definition: OnboardingDefinition, record: OnboardingFormRecord, files: FileSummary[]): BriefSectionContent {
  const locale = record.locale;
  const items = openItems(definition, record, files);
  if (!items.length) {
    const nothing = locale === 'de' ? 'Es fehlt nichts. Wir haben alles, was wir für den Start brauchen.' : 'Nothing is missing. We have everything we need to start.';
    return { content_markdown: nothing, still_needed: [], sources: [] };
  }
  const intro =
    locale === 'de'
      ? 'Alles andere liegt vor. Nur diese Angaben sind noch offen, und wir kommen dazu gern auf Sie zu.'
      : 'Everything else is in place. Only these details are still open, and we will gladly follow up on them with you.';
  const blocks: string[] = [intro];
  for (const screen of definition.screens) {
    const mine = items.filter((i) => i.field.screen_id === screen.id);
    if (!mine.length) continue;
    blocks.push(`**${stripDashes(loc(screen as unknown as Record<string, unknown>, 'title', locale))}**\n${mine.map((i) => `- ${i.text}`).join('\n')}`);
  }
  return { content_markdown: blocks.join('\n\n'), still_needed: items.map((i) => i.text), sources: [] };
}

/**
 * The brief's open items, recomputed from the answers as they stand: each section's list
 * from its own fields, and section 9 from all of them. Used when the brief is written and
 * again whenever it is rendered, so an older brief never shows a stale or invented list.
 */
export function withOpenItems(
  definition: OnboardingDefinition,
  record: OnboardingFormRecord,
  files: FileSummary[],
  sections: Record<string, BriefSectionContent>,
): Record<string, BriefSectionContent> {
  const out: Record<string, BriefSectionContent> = {};
  for (const section of definition.briefSections) {
    const current = sections[section.id];
    if (section.generated_by === 'system') out[section.id] = stillNeededSection(definition, record, files);
    else if (current) out[section.id] = { ...current, still_needed: openItems(definition, record, files, new Set(section.source_fields)).map((i) => i.text) };
  }
  for (const [id, content] of Object.entries(sections)) if (!(id in out)) out[id] = content;
  return out;
}

/* ------------------------------------------------------------------ generation */

/**
 * Job 3 (spec §06): the model composes the prose of the fixed sections; the code checks
 * it for prices, durations and facts that are not in the answers, retries once with the
 * violations named, and otherwise falls back to a plain rendering. Section 9 is always
 * composed by code. Every attempt is logged.
 */
export async function generateBrief(input: {
  definition: OnboardingDefinition;
  secrets: OnboardingSecrets;
  record: OnboardingFormRecord;
  files: FileSummary[];
}): Promise<BriefDraft> {
  const { definition, secrets, record, files } = input;
  const llmSections = definition.briefSections.filter((s) => s.generated_by === 'llm');
  const fieldKeys = definition.fields.map((f) => f.id) as [string, ...string[]];
  const counts: Record<string, number> = {};
  for (const f of files) if (f.field_key) counts[f.field_key] = (counts[f.field_key] ?? 0) + 1;
  const gaps = computeGaps(definition, record.answers, counts, record.locale);

  // The open items are the code's, in CMS order; the model only writes the prose.
  const finish = (sections: Record<string, BriefSectionContent>, source: 'llm' | 'fallback', model: string | null, attempts: number): BriefDraft => ({
    sections: withOpenItems(definition, record, files, sections),
    source,
    model,
    attempts,
  });

  if (!llmSections.length || !modelConfigured() || !(await reserveAiCall(record.id, record.ai_calls, definition.settings))) {
    return finish(fallbackSections(definition, record, files, llmSections), 'fallback', null, 0);
  }

  const schema = briefSchema(llmSections, fieldKeys);
  const corpus = briefCorpus(definition, record, files);
  const system = promptText(secrets.prompts, 'system');
  let violations: string[] = [];
  let model: string | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const result = await callModel({
      formId: record.id,
      job: 'brief',
      attempt,
      settings: definition.settings,
      system,
      prompt: buildBriefPrompt({ definition, secrets, record, files, sections: llmSections, gaps, violations }),
      schema,
      fixture: () => ({ sections: fixtureSections(definition, record, files, llmSections) }),
    });
    model = result.model;
    if (!result.ok) {
      violations = [`schema: ${result.error}`];
      continue;
    }
    const sections = result.object.sections as Record<string, BriefSectionContent>;
    violations = checkSections(sections, corpus);
    if (!violations.length) return finish(sections, 'llm', model, attempt);
    // Second attempt: the violations are appended to the prompt. Logged as its own row.
    if (attempt === 2) break;
  }
  return finish(fallbackSections(definition, record, files, llmSections), 'fallback', model, 2);
}

/** Fixture brief for e2e: the fallback rendering wrapped in one sentence per section. */
function fixtureSections(
  definition: OnboardingDefinition,
  record: OnboardingFormRecord,
  files: FileSummary[],
  sections: OnbBriefSection[],
): Record<string, BriefSectionContent> {
  const base = fallbackSections(definition, record, files, sections);
  const company = record.company ?? '';
  for (const [id, section] of Object.entries(base)) {
    const lead = record.locale === 'de' ? `Für ${company} halten wir fest:` : `For ${company} we note:`;
    base[id] = { ...section, content_markdown: `${lead}\n\n${section.content_markdown}` };
  }
  return base;
}
