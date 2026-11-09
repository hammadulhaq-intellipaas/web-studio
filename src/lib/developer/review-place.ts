/**
 * Where the comment field opens on the review page: beside the box the client drew, inside the
 * design area. To the right of the box when it fits, else to the left, else below, else above;
 * always fully inside the area. All values in pixels of the design area.
 */
export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const MARGIN = 12;
const GAP = 12;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

export function composerPlace(box: Rect, area: { width: number; height: number }, size: { width: number; height: number }): { left: number; top: number; width: number } {
  const width = Math.min(size.width, area.width - 2 * MARGIN);
  const height = size.height;
  const right = box.left + box.width;
  const bottom = box.top + box.height;
  const maxLeft = area.width - width - MARGIN;
  const maxTop = area.height - height - MARGIN;
  if (right + GAP + width <= area.width - MARGIN) return { left: right + GAP, top: clamp(box.top, MARGIN, maxTop), width };
  if (box.left - GAP - width >= MARGIN) return { left: box.left - GAP - width, top: clamp(box.top, MARGIN, maxTop), width };
  const left = clamp(box.left, MARGIN, maxLeft);
  if (bottom + GAP + height <= area.height - MARGIN) return { left, top: bottom + GAP, width };
  if (box.top - GAP - height >= MARGIN) return { left, top: box.top - GAP - height, width };
  // No room anywhere: over the design at the bottom, the box stays visible above it.
  return { left, top: clamp(maxTop, MARGIN, maxTop), width };
}
