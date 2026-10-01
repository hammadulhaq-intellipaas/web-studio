import type { Answers, RuleCondition } from '../types';
import { isByow } from './engine';

/**
 * Resolves a condition key against the answers.
 * Derived keys (`byow`, `url`, `bundle`) are not stored on `Answers` but computed alongside.
 * `bundle` is the package in front of the customer, so an add-on rule can depend on it
 * ("Silver gets CMS setup as an add-on"). Bundle rules choose the package, so for them it
 * is unknown and a `bundle` clause never matches.
 */
function resolve(key: string, answers: Answers, sourceUrl: string, bundleId: string | null): string | string[] | null {
  if (key === 'byow') return isByow(answers) ? 'true' : 'false';
  if (key === 'url') return sourceUrl ? '__set' : null;
  if (key === 'bundle') return bundleId;
  const value = (answers as unknown as Record<string, unknown>)[key];
  if (Array.isArray(value)) return value as string[];
  return value == null ? null : String(value);
}

function clauseMatches(clause: RuleCondition, answers: Answers, sourceUrl: string, bundleId: string | null): boolean {
  const actual = resolve(clause.key, answers, sourceUrl, bundleId);
  const hit = Array.isArray(actual)
    ? actual.some((v) => clause.values.includes(v)) // multi-select: intersection
    : actual != null && clause.values.includes(actual);
  return clause.negate ? !hit : hit;
}

/** A rule fires when every one of its clauses matches. No clauses = always fires. */
export function ruleMatches(
  conditions: RuleCondition[],
  answers: Answers,
  sourceUrl: string,
  bundleId: string | null = null,
): boolean {
  return conditions.every((clause) => clauseMatches(clause, answers, sourceUrl, bundleId));
}
