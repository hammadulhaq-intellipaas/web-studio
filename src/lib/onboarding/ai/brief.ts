import 'server-only';
import { z } from 'zod';
import type { Locale } from '@/lib/types';
import { displayValue, type FileSummary } from '../export';
import { buildCorpus, findForbidden, findUngrounded, normalizeText, type Corpus } from '../guardrails';
import { computeGaps, fieldLabel, sliderLabel, visibility } from '../logic';
import type {
  BriefSectionContent,
  Gap,
  OnbBriefSection,
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
    `### ${section.id} — "${loc(section as unknown as Record<string, unknown>, 'title', locale)}"`,
    section.instructions ?? '',
    `Source fields: ${section.source_fields.join(', ') || '(none)'}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function skippedItems(record: OnboardingFormRecord, definition: OnboardingDefinition, locale: Locale): string[] {
  const history = record.review?.history ?? [];
  return history
    .filter((h) => h.skipped)
    .map((h) => {
      const field = h.target ? definition.fields.find((f) => f.id === h.target!.field) : undefined;
      return field ? fieldLabel(field, locale) : h.question[locale] ?? h.question.de;
    });
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
  const skipped = skippedItems(record, definition, locale);
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
    skipped.length ? `\nFollow-up questions the client skipped (still open): ${skipped.join('; ')}` : '',
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
  const { hidden } = visibility(definition.fields, record.answers);
  const out: Record<string, BriefSectionContent> = {};
  for (const section of sections) {
    const lines: string[] = [];
    const missing: string[] = [];
    const sources: string[] = [];
    for (const key of section.source_fields) {
      const field = definition.fields.find((f) => f.id === key);
      if (!field || hidden.has(key) || field.type === 'notice') continue;
      const answer = record.answers[key];
      const text = displayValue(field, answer, locale, files);
      const label = fieldLabel(field, locale);
      if (answer?.dk) missing.push(label);
      else if (text) {
        // Question-style labels read better without a colon after the question mark.
        const head = `**${label}${/[?!.]$/.test(label) ? '' : ':'}**`;
        lines.push(text.includes('\n') ? `${head}\n${text.split('\n').map((l) => `- ${l}`).join('\n')}` : `${head} ${text}`);
        sources.push(key);
      } else if (field.required) missing.push(label);
    }
    out[section.id] = { content_markdown: lines.join('\n\n') || '—', still_needed: missing, sources };
  }
  return out;
}

/** Section 9: every unanswered, "don't know" or skipped item, named — composed by code, never by the model. */
export function stillNeededSection(
  definition: OnboardingDefinition,
  record: OnboardingFormRecord,
  files: FileSummary[],
  llmSections: Record<string, BriefSectionContent>,
): BriefSectionContent {
  const locale = record.locale;
  const counts: Record<string, number> = {};
  for (const f of files) if (f.field_key) counts[f.field_key] = (counts[f.field_key] ?? 0) + 1;
  const gaps = computeGaps(definition, record.answers, counts);
  const items: string[] = [];
  const push = (s: string) => {
    const t = s.trim();
    if (t && !items.some((x) => x.toLowerCase() === t.toLowerCase())) items.push(t);
  };
  for (const gap of gaps) {
    const field = definition.fields.find((f) => f.id === gap.field);
    if (!field) continue;
    const label = fieldLabel(field, locale);
    if (gap.kind === 'dont_know' || gap.kind === 'empty' || gap.kind === 'no_files') push(label);
    else if (gap.kind === 'thin') push(locale === 'de' ? `${label} – mehr Details` : `${label} – more detail`);
  }
  for (const s of skippedItems(record, definition, locale)) push(s);
  for (const section of Object.values(llmSections)) for (const s of section.still_needed) push(s);
  const nothing = locale === 'de' ? 'Nichts – alle Angaben liegen vor.' : 'Nothing — everything is there.';
  return {
    content_markdown: items.length ? items.map((i) => `- ${i}`).join('\n') : nothing,
    still_needed: items,
    sources: [],
  };
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
  const systemSections = definition.briefSections.filter((s) => s.generated_by === 'system');
  const fieldKeys = definition.fields.map((f) => f.id) as [string, ...string[]];
  const counts: Record<string, number> = {};
  for (const f of files) if (f.field_key) counts[f.field_key] = (counts[f.field_key] ?? 0) + 1;
  const gaps = computeGaps(definition, record.answers, counts);

  const finish = (sections: Record<string, BriefSectionContent>, source: 'llm' | 'fallback', model: string | null, attempts: number): BriefDraft => {
    const withSystem = { ...sections };
    for (const s of systemSections) withSystem[s.id] = stillNeededSection(definition, record, files, sections);
    // Keep the CMS order.
    const ordered: Record<string, BriefSectionContent> = {};
    for (const s of definition.briefSections) if (withSystem[s.id]) ordered[s.id] = withSystem[s.id];
    return { sections: ordered, source, model, attempts };
  };

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

/* ------------------------------------------------------------------ rewrite */

export interface RewriteResult {
  ok: boolean;
  section: BriefSectionContent | null;
  model: string | null;
  violations: string[];
}

/** Rewrites ONE section after the client said what is wrong; same guardrails, no fallback (the client can edit instead). */
export async function rewriteSection(input: {
  definition: OnboardingDefinition;
  secrets: OnboardingSecrets;
  record: OnboardingFormRecord;
  files: FileSummary[];
  current: Record<string, BriefSectionContent>;
  sectionId: string;
  instruction: string;
}): Promise<RewriteResult> {
  const { definition, secrets, record, files, current, sectionId, instruction } = input;
  const section = definition.briefSections.find((s) => s.id === sectionId && s.generated_by === 'llm');
  if (!section) return { ok: false, section: null, model: null, violations: ['unknown section'] };
  if (!modelConfigured() || !(await reserveAiCall(record.id, record.ai_calls, definition.settings))) {
    return { ok: false, section: null, model: null, violations: ['model unavailable'] };
  }

  const fieldKeys = definition.fields.map((f) => f.id) as [string, ...string[]];
  const schema = z.object({ section: sectionSchema(fieldKeys) });
  // The client's own instruction may be echoed, so it counts as grounded.
  const base = briefCorpus(definition, record, files);
  const corpus: Corpus = { text: `${base.text} ${normalizeText(instruction)}`, digits: base.digits + instruction.replace(/\D/g, '') };
  const locale = record.locale;
  const prompt = [
    promptText(secrets.prompts, 'rewrite'),
    '',
    `Write in ${localeName(locale)}.`,
    clientHeader(record),
    '',
    `SECTION TO REWRITE: ${sectionSpec(section, definition, locale)}`,
    `CLIENT'S INSTRUCTION: ${instruction}`,
    '',
    'CURRENT BRIEF (for context; rewrite only the section above):',
    JSON.stringify(current),
    '',
    "THE CLIENT'S ANSWERS:",
    renderAnswers(definition, record.answers, files, locale),
  ].join('\n');

  const result = await callModel({
    formId: record.id,
    job: 'rewrite',
    attempt: 1,
    settings: definition.settings,
    system: promptText(secrets.prompts, 'system'),
    prompt,
    schema,
    fixture: () => ({
      section: {
        content_markdown: `${current[sectionId]?.content_markdown ?? ''}\n\n${locale === 'de' ? 'Ergänzt nach Ihrer Anmerkung' : 'Amended after your note'}: ${instruction}`,
        still_needed: current[sectionId]?.still_needed ?? [],
        sources: current[sectionId]?.sources ?? [],
      },
    }),
  });
  if (!result.ok) return { ok: false, section: null, model: result.model, violations: [result.error] };
  const violations = checkSections({ [sectionId]: result.object.section as BriefSectionContent }, corpus);
  if (violations.length) return { ok: false, section: null, model: result.model, violations };
  return { ok: true, section: result.object.section as BriefSectionContent, model: result.model, violations: [] };
}
