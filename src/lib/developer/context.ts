import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getOnboardingDefinition } from '@/lib/onboarding/definition';
import { exportRecord } from '@/lib/onboarding/export';
import { loadFiles, loadForm, publicFiles } from '@/lib/onboarding/records';
import type { Locale } from '@/lib/types';
import type { Lead } from '@/lib/types';
import { chosenExamples, examplesRule } from '@/lib/onboarding/examples';
import { exampleChoices, type ClientReference, type ClientShot } from './reference-sources';

/** The onboarding field holding the client's picks from our reference websites. */
export const REFERENCE_FIELD = 'reference_sites';
/** The client's own reference links (up to 3, with likes and dislikes) and pictures. */
export const CLIENT_REFERENCES_FIELD = 'references';
export const REFERENCE_SHOTS_FIELD = 'reference_screenshots';

const SLUG = /^[a-z0-9-]+$/;

/**
 * A reference website's layout spec, from docs/reference-specs/<slug>.md. The folder ships
 * with the Developers routes (outputFileTracingIncludes in next.config.ts).
 */
export async function loadReferenceSpec(slug: string): Promise<string | null> {
  if (!SLUG.test(slug)) return null;
  try {
    return await readFile(join(process.cwd(), 'docs', 'reference-specs', `${slug}.md`), 'utf8');
  } catch {
    return null;
  }
}

export interface ContextAnswer {
  key: string;
  question: string;
  answer: string;
}

export interface ContextSection {
  screen: string;
  title: string;
  answers: ContextAnswer[];
}

export interface ContextReference {
  slug: string;
  name: string;
  url: string | null;
  /** The full layout spec, or null when no spec file exists for this site. */
  spec: string | null;
}

/** Everything the design and build prompts are generated from, built in code (no model). */
export interface PromptContext {
  client: { company: string | null; contact: string | null; email: string | null; formLanguage: Locale };
  quote: { package: string | null; addons: string[] };
  sections: ContextSection[];
  referenceSites: ContextReference[];
  files: { question: string; name: string; type: string }[];
  /** The client's own reference links, as they typed them, with what they like and dislike. */
  clientReferences: ClientReference[];
  /** The pictures the client uploaded as references (screenshots, a brochure, anything). */
  referenceShots: ClientShot[];
  /**
   * The client's design examples as Design tab choices, in the form's order: Proposal 1 starts
   * on the first, Proposal 2 on the second (see exampleChoices).
   */
  examples: string[];
  status: string;
  confirmedAt: string | null;
}

/**
 * Turns an onboarding form and its quote into the prompt context. Questions use their
 * English labels and choices their English option labels; anything the client typed stays
 * exactly as they wrote it. Each picked reference website carries its full layout spec.
 */
export async function buildPromptContext(lead: Lead, formId: string): Promise<PromptContext | null> {
  const record = await loadForm(formId);
  if (!record) return null;
  const [definition, stored] = await Promise.all([getOnboardingDefinition(), loadFiles(formId)]);
  const files = publicFiles(stored);
  const exported = exportRecord(definition, record, null, files);

  const titles = new Map(definition.screens.map((s) => [s.id, s.title_en]));
  const sections: ContextSection[] = [];
  for (const [key, a] of Object.entries(exported.answers)) {
    const answer = a.display.en.trim();
    if (!answer) continue;
    let section = sections[sections.length - 1];
    if (!section || section.screen !== a.screen) {
      section = { screen: a.screen, title: titles.get(a.screen) ?? a.screen, answers: [] };
      sections.push(section);
    }
    section.answers.push({ key, question: a.label.en, answer });
  }

  const picked = record.answers[REFERENCE_FIELD]?.v;
  const pickerField = definition.fields.find((f) => f.id === REFERENCE_FIELD);
  const referenceSites = await Promise.all(
    (Array.isArray(picked) ? (picked as string[]) : []).map(async (slug) => {
      const option = pickerField?.options.find((o) => o.value === slug);
      return { slug, name: option?.label_en ?? slug, url: option?.url ?? null, spec: await loadReferenceSpec(slug) };
    }),
  );

  const rows = record.answers[CLIENT_REFERENCES_FIELD]?.v;
  const clientReferences: ClientReference[] = (Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [])
    .map((r) => ({ url: String(r?.url ?? '').trim(), likes: String(r?.likes ?? '').trim(), dislikes: String(r?.dislikes ?? '').trim() }))
    .filter((r) => r.url);
  const referenceShots: ClientShot[] = stored
    .filter((f) => f.field_key === REFERENCE_SHOTS_FIELD)
    .map((f) => ({ id: f.id, name: f.file_name, type: f.mime_type ?? '', bucket: f.bucket, path: f.storage_path }));

  // Before the examples rule existed the same three questions held the references; read them
  // in the same order, so an older form still gets sensible defaults.
  const rule = examplesRule(definition.fields)?.rule ?? { count: 2, picks: REFERENCE_FIELD, links: CLIENT_REFERENCES_FIELD, pictures: REFERENCE_SHOTS_FIELD };
  const counts: Record<string, number> = {};
  for (const f of stored) if (f.field_key) counts[f.field_key] = (counts[f.field_key] ?? 0) + 1;
  const examples = exampleChoices(chosenExamples(rule, record.answers, counts));

  const labelOf = (key: string | null) => definition.fields.find((f) => f.id === key)?.label_en ?? key ?? 'Upload';
  return {
    client: {
      company: exported.client.company,
      contact: exported.client.contact_name,
      email: exported.client.email,
      formLanguage: record.locale,
    },
    quote: {
      package: lead.config?.bundleName ?? null,
      addons: (lead.config?.addons ?? []).map((a) => (a.qty ? `${a.name} (${a.qty})` : a.name)),
    },
    sections,
    referenceSites,
    files: files.map((f) => ({ question: labelOf(f.field_key), name: f.file_name, type: f.mime_type })),
    clientReferences,
    referenceShots,
    examples,
    status: record.status,
    confirmedAt: record.confirmed?.at ?? null,
  };
}
