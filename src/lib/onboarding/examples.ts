import type { Answers, OnbField, ProposalExamplesRule } from './types';

/**
 * The client's design examples: each proposal is based on one of them. They come from three
 * questions on the design screen, counted in this order: the sites ticked in our gallery (in
 * the order they were ticked), then their own website links (in the order typed), then their
 * pictures, which together count as one example. The form, its validation and the Developers
 * page all read the examples through here, so "Proposal 1 is based on …" means the same
 * thing everywhere.
 */
export type ChosenExample =
  | { kind: 'library'; value: string }
  /** `index` counts only rows that have a link, like the Developers page does. */
  | { kind: 'link'; index: number; url: string }
  | { kind: 'pictures'; count: number };

/** Files a form has uploaded, counted per upload field. */
type FileCounts = Record<string, number>;

/** The notice that carries the rule, if the form has one. */
export function examplesRule(fields: OnbField[]): { field: OnbField; rule: ProposalExamplesRule } | null {
  const field = fields.find((f) => f.type === 'notice' && f.active !== false && f.config.proposal_examples);
  return field ? { field, rule: field.config.proposal_examples! } : null;
}

/** The ticked gallery sites, as stored (a list of option values). */
export function pickedSites(answers: Answers, key: string): string[] {
  const v = answers[key]?.v;
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/** The client's own links, rows without a link left out. */
export function linkedSites(answers: Answers, key: string): string[] {
  const v = answers[key]?.v;
  if (!Array.isArray(v)) return [];
  return v
    .map((row) => (row && typeof row === 'object' ? String((row as Record<string, unknown>).url ?? '').trim() : ''))
    .filter(Boolean);
}

export function chosenExamples(rule: ProposalExamplesRule, answers: Answers, files: FileCounts): ChosenExample[] {
  const out: ChosenExample[] = pickedSites(answers, rule.picks).map((value) => ({ kind: 'library' as const, value }));
  linkedSites(answers, rule.links).forEach((url, index) => out.push({ kind: 'link', index, url }));
  const pictures = files[rule.pictures] ?? 0;
  if (pictures > 0) out.push({ kind: 'pictures', count: pictures });
  return out;
}
