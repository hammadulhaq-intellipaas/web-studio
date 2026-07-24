import type { Addon, AddonCategory } from './types';
import { isAddonVisible } from './pricing/engine';

/** A sub-section: a child category with the visible add-ons that belong to it. */
export interface CategorySubSection {
  category: AddonCategory;
  addons: Addon[];
}

/**
 * A top-level category node for the configurator's extras stack. Either it has
 * `subSections` (a parent with child categories) or `directAddons` (a leaf that
 * groups add-ons itself) — never both non-empty in practice.
 */
export interface CategoryNode {
  category: AddonCategory;
  subSections: CategorySubSection[];
  directAddons: Addon[];
}

/** Guards against an admin-authored cycle (A→B→A) making the tree walk hang. */
const MAX_DEPTH = 2;

/**
 * Builds the 2-level category tree for a bundle, in `sort` order, dropping any
 * category whose entire subtree has no add-ons visible for the current bundle.
 * Add-ons are matched to a category only when `isAddonVisible` passes, so the
 * BYOW-only categories fall away automatically off the BYOW path.
 */
export function buildCategoryTree(
  categories: AddonCategory[],
  addons: Addon[],
  bundleId: string,
): CategoryNode[] {
  const visibleAddonsFor = (categoryId: string) =>
    addons
      .filter((a) => a.category_id === categoryId && isAddonVisible(a, bundleId))
      .sort((a, b) => a.sort - b.sort);

  const childrenOf = (parentId: string, depth: number): AddonCategory[] =>
    depth > MAX_DEPTH
      ? []
      : categories.filter((c) => c.parent_id === parentId).sort((a, b) => a.sort - b.sort);

  const tops = categories.filter((c) => c.parent_id == null).sort((a, b) => a.sort - b.sort);

  const nodes: CategoryNode[] = tops.map((top) => {
    const subSections: CategorySubSection[] = childrenOf(top.id, 1)
      .map((child) => ({ category: child, addons: visibleAddonsFor(child.id) }))
      .filter((s) => s.addons.length > 0);
    return {
      category: top,
      subSections,
      directAddons: visibleAddonsFor(top.id),
    };
  });

  return nodes.filter((n) => n.subSections.length > 0 || n.directAddons.length > 0);
}

/** Add-ons in a node's subtree that are currently selected — for the collapsed-header count. */
export function countSelected(node: CategoryNode, sel: Record<string, boolean>): number {
  const all = [...node.directAddons, ...node.subSections.flatMap((s) => s.addons)];
  return all.filter((a) => sel[a.id]).length;
}
