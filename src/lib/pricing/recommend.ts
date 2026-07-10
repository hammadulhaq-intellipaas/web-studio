import type { Answers, Catalog } from '../types';
import { isAddonIncluded, isAddonVisible } from './engine';
import { ruleMatches } from './rules';

export interface Recommendation {
  bundle: string;
  /** i18n key under `configurator.reasons.*` for the base sentence. */
  baseKey: string;
  /** i18n keys under `configurator.reasons.why.*`, joined as "Gewählt, weil: …". */
  whyKeys: string[];
}

/** Position of a bundle in the tier order; unknown/inactive bundles rank lowest. */
function rank(catalog: Catalog, bundleId: string): number {
  const bundle = catalog.bundles.find((b) => b.id === bundleId);
  return bundle ? bundle.sort : -1;
}

const bundleExists = (catalog: Catalog, bundleId: string) =>
  catalog.bundles.some((b) => b.id === bundleId);

/**
 * Bundle recommendation, driven entirely by the `bundle_rules` CMS table.
 *
 * The highest-priority matching `base` rule sets the starting bundle; each matching
 * `upgrade` rule then escalates it, but only to a higher tier (`bundles.sort`), which
 * is what keeps an upgrade from downgrading an already-larger bundle.
 */
export function recommend(catalog: Catalog, answers: Answers, sourceUrl = ''): Recommendation {
  const rules = [...catalog.bundleRules]
    // A rule pointing at a bundle that was deleted or deactivated in the CMS is ignored.
    .filter((r) => r.active && bundleExists(catalog, r.result_bundle))
    .sort((a, b) => b.priority - a.priority);

  const base = rules.find(
    (r) => r.rule_kind === 'base' && ruleMatches(r.conditions, answers, sourceUrl),
  );

  let bundle = base?.result_bundle ?? catalog.defaultBundle;
  const whyKeys: string[] = [];

  for (const rule of rules) {
    if (rule.rule_kind !== 'upgrade') continue;
    if (!ruleMatches(rule.conditions, answers, sourceUrl)) continue;
    if (rank(catalog, rule.result_bundle) <= rank(catalog, bundle)) continue;
    bundle = rule.result_bundle;
    if (rule.reason_key) whyKeys.push(rule.reason_key);
  }

  // The base rule may name its own i18n sentence (the BYOW paths do); otherwise the
  // sentence is keyed on the bundle the customer actually ends up with.
  const baseKey = base?.reason_key ?? bundle;

  return { bundle, baseKey, whyKeys };
}

/**
 * Recommended add-on pre-selection, driven entirely by the `addon_rules` CMS table.
 *
 * Additive rules (plus the persona's `preselect_addons`) run first, then every matching
 * rule's `remove_addon_ids` is applied. Suppression last is what lets a rule such as
 * "customer already has logo & imagery" override a persona preselect.
 */
export function recSet(
  catalog: Catalog,
  answers: Answers,
  personaId: string | null,
  bundleId: string,
  sourceUrl: string,
): Record<string, boolean> {
  const s: Record<string, boolean> = {};
  const add = (id: string) => {
    const addon = catalog.addons.find((a) => a.id === id);
    if (addon && !isAddonIncluded(addon, bundleId, false) && isAddonVisible(addon, bundleId)) {
      s[id] = true;
    }
  };

  const persona = catalog.personas.find((p) => p.id === personaId);
  if (persona) persona.preselect_addons.forEach(add);

  const matched = catalog.addonRules
    .filter((r) => r.active)
    .filter((r) => ruleMatches(r.conditions, answers, sourceUrl));

  for (const rule of matched) rule.add_addon_ids.forEach(add);
  for (const rule of matched) rule.remove_addon_ids.forEach((id) => delete s[id]);

  return s;
}
