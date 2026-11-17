import type { Locale } from '@/lib/types';
import type { Answers, OnbField, ProposalExamplesRule, RepeaterRow } from './types';

/**
 * The client's design examples: the proposals are based on them. They come from the questions on
 * the design screen, counted in this order: the sites ticked in our gallery (in the order they
 * were ticked), then their own website links (in the order typed), then their pictures, which
 * together count as one example. When they chose more than the form's `count`, they pick their
 * favourites, and those come first: Proposal 1 starts on the first, Proposal 2 on the second.
 * The form, its validation and the Developers page all read the examples through here, so
 * "Proposal 1 is based on …" means the same thing everywhere.
 */
export type ChosenExample = { key: string } & (
  | { kind: 'library'; value: string }
  /** `index` counts only rows that have a link, like the Developers page does. */
  | { kind: 'link'; index: number; url: string }
  | { kind: 'pictures'; count: number }
);

/** Files a form has uploaded, counted per upload field. */
type FileCounts = Record<string, number>;

/**
 * An example's key, as the favourites store it: stable while the client edits other rows.
 * A link is keyed by its address, so deleting the row above it does not change it.
 */
export const exampleKey = {
  library: (slug: string) => `site:${slug}`,
  link: (url: string) => `link:${url}`,
  pictures: 'pictures',
};

/** The field that carries the rule, if the form has one. */
export function examplesRule(fields: OnbField[]): { field: OnbField; rule: ProposalExamplesRule } | null {
  const field = fields.find((f) => f.active !== false && f.config.proposal_examples);
  return field ? { field, rule: field.config.proposal_examples! } : null;
}

/** The ticked gallery sites, as stored (a list of option values). */
export function pickedSites(answers: Answers, key: string): string[] {
  const v = answers[key]?.v;
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/** The client's own link rows that have a link, in the order typed. */
export function linkRows(answers: Answers, key: string): RepeaterRow[] {
  const v = answers[key]?.v;
  if (!Array.isArray(v)) return [];
  return (v as unknown[]).filter(
    (row): row is RepeaterRow => !!row && typeof row === 'object' && String((row as RepeaterRow).url ?? '').trim() !== '',
  );
}

/** The client's own links, rows without a link left out. */
export function linkedSites(answers: Answers, key: string): string[] {
  return linkRows(answers, key).map((row) => String(row.url).trim());
}

/** Every example in the form's order, before the favourites are applied. */
export function allExamples(rule: ProposalExamplesRule, answers: Answers, files: FileCounts): ChosenExample[] {
  const out: ChosenExample[] = pickedSites(answers, rule.picks).map((value) => ({ kind: 'library' as const, value, key: exampleKey.library(value) }));
  linkedSites(answers, rule.links).forEach((url, index) => out.push({ kind: 'link', index, url, key: exampleKey.link(url) }));
  const pictures = files[rule.pictures] ?? 0;
  if (pictures > 0) out.push({ kind: 'pictures', count: pictures, key: exampleKey.pictures });
  return out;
}

/**
 * The favourites the client picked that are still among their examples, in the order picked, at
 * most `count`. A favourite whose example was removed since simply drops out.
 */
export function favouriteKeys(rule: ProposalExamplesRule, answers: Answers, files: FileCounts): string[] {
  if (!rule.favourites) return [];
  const stored = answers[rule.favourites]?.v;
  if (!Array.isArray(stored)) return [];
  const present = new Set(allExamples(rule, answers, files).map((e) => e.key));
  const out: string[] = [];
  for (const key of stored) {
    if (typeof key === 'string' && present.has(key) && !out.includes(key)) out.push(key);
  }
  return out.slice(0, rule.count);
}

/** Every example, the favourites first (in the order picked), then the rest in the form's order. */
export function chosenExamples(rule: ProposalExamplesRule, answers: Answers, files: FileCounts): ChosenExample[] {
  const all = allExamples(rule, answers, files);
  const favourites = favouriteKeys(rule, answers, files);
  if (!favourites.length) return all;
  const first = favourites.map((key) => all.find((e) => e.key === key)!);
  return [...first, ...all.filter((e) => !favourites.includes(e.key))];
}

/** A stored favourite as plain text, for the brief and the PDF: "Graza (gallery)", the link, "Own pictures". */
export function exampleKeyText(key: string, locale: Locale, siteName: (slug: string) => string = (s) => s): string {
  if (key.startsWith('site:')) return `${siteName(key.slice(5))} (${locale === 'de' ? 'Galerie' : 'gallery'})`;
  if (key.startsWith('link:')) return key.slice(5);
  if (key === exampleKey.pictures) return locale === 'de' ? 'Eigene Bilder' : 'Own pictures';
  return key;
}

/** The values of a `ticks` sub-field ("layout,colours" → ["layout", "colours"]). */
export function tickValues(raw: unknown): string[] {
  if (raw == null) return [];
  return String(raw)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * The rows of a `rows_from` repeater: one per value ticked in the source field, in that order.
 * A ticked value without a stored row gets a fresh one with a fixed id, so its errors and its
 * inputs line up before anything is typed; rows for values no longer ticked are left out.
 */
export function rowsFromPicks(field: OnbField, stored: RepeaterRow[], answers: Answers): RepeaterRow[] {
  const source = field.config.rows_from;
  const column = field.config.fields?.[0]?.key;
  if (!source || !column) return stored;
  return pickedSites(answers, source).map((value) => stored.find((r) => r[column] === value) ?? { _id: `pick-${value}`, [column]: value });
}
