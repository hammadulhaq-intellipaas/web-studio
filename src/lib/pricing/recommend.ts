import type { Answers, Catalog } from '../types';
import { isAddonIncluded, isAddonVisible, isByow } from './engine';

export interface Recommendation {
  bundle: string;
  /** i18n key under `configurator.reasons.*` for the base sentence. */
  baseKey: string;
  /** i18n keys under `configurator.reasons.why.*`, joined as "Gewählt, weil: …". */
  whyKeys: string[];
}

/** Deterministic bundle recommendation — ported 1:1 from the prototype's recommend(). */
export function recommend(answers: Answers): Recommendation {
  if (isByow(answers)) {
    if (answers.byowScope === 'changes') {
      return { bundle: 'gold', baseKey: 'byowChanges', whyKeys: [] };
    }
    return { bundle: 'byow', baseKey: 'byowLive', whyKeys: [] };
  }

  let bundle =
    ({ '14': 'silver', '58': 'gold', '912': 'platinum', '12p': 'platinum' } as Record<string, string>)[
      answers.pages ?? ''
    ] || 'gold';
  const whyKeys: string[] = [];

  if (answers.langs === '2' && bundle === 'silver') {
    bundle = 'gold';
    whyKeys.push('twoLangs');
  }
  if (answers.langs === '3' && bundle !== 'platinum') {
    bundle = 'platinum';
    whyKeys.push('threeLangs');
  }
  if (answers.blog === 'ja' && bundle === 'silver') {
    bundle = 'gold';
    whyKeys.push('blog');
  }
  if (answers.shop === 'shop' && bundle !== 'platinum') {
    bundle = 'platinum';
    whyKeys.push('shop');
  }

  return { bundle, baseKey: bundle, whyKeys };
}

/** Recommended add-on pre-selection — ported 1:1 from the prototype's recSet(). */
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

  add('cookie');
  const persona = catalog.personas.find((p) => p.id === personaId);
  if (persona) persona.preselect_addons.forEach(add);
  if (answers.contact === 'booking') add('bookembed');
  if (answers.fees === 'ja') add('bookpay');
  if (answers.shop === 'paar' || answers.shop === 'shop') add('ecom');
  if (answers.assets === 'nein') {
    add('logo');
    add('foto');
  }
  if (answers.assets === 'teil') add('foto');
  if (sourceUrl && !isByow(answers)) add('dsgvocheck');
  if (isByow(answers)) {
    const missing = answers.aiMissing ?? [];
    if (missing.includes('seo')) add('seosetup');
    if (missing.includes('email')) add('gws');
    if (missing.includes('perf')) add('perf');
    if (missing.includes('legal')) add('dsgvocheck');
  }
  return s;
}
