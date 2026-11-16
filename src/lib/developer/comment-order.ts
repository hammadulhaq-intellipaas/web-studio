/**
 * How an improvement prompt numbers the client's marked comments, so the prompt, the pictures
 * given to the model and the zip for Claude Design all say "comment-03.jpg" about the same one.
 * Plain helpers, no server code, so they are easy to test.
 */

export type ReviewDevice = 'laptop' | 'tablet' | 'phone';

/** The width each device view of the review page shows the design at. */
export const DEVICE_WIDTH: Record<ReviewDevice, number> = { laptop: 1280, tablet: 768, phone: 390 };

/**
 * The pinned comments an improvement prompt is about, in the order it numbers them: the comments
 * on the iteration itself, then those carried over from the other proposal, each oldest first.
 */
export function promptOrder<T extends { kind: string; version_id: string; created_at: string }>(comments: T[], versionId: string): T[] {
  const byTime = (a: T, b: T) => a.created_at.localeCompare(b.created_at);
  const pins = comments.filter((c) => c.kind === 'pin');
  return [...pins.filter((c) => c.version_id === versionId).sort(byTime), ...pins.filter((c) => c.version_id !== versionId).sort(byTime)];
}

/** comment-01.jpg, comment-02.jpg … by position in promptOrder. */
export const shotName = (index: number) => `comment-${String(index + 1).padStart(2, '0')}.jpg`;

/**
 * Where to draw a comment's box on the page and what to cut out around it, in CSS px of the page.
 * x and w are percentages of the page width, y and h px; a spot (no w/h) gets a small box around it.
 * The cut-out keeps some of the page around the box so the place is recognisable, and stays
 * inside the page and under a height a model reads comfortably.
 */
export function shotGeometry(
  c: { x: number; y: number; w: number | null; h: number | null },
  page: { width: number; height: number },
  margin = 160,
  maxHeight = 1400,
) {
  const spot = !c.w || !c.h;
  const bw = spot ? 120 : (c.w! / 100) * page.width;
  const bh = spot ? 80 : c.h!;
  const bx = spot ? (c.x / 100) * page.width - bw / 2 : (c.x / 100) * page.width;
  const by = spot ? c.y - bh / 2 : c.y;
  const box = { x: Math.max(0, Math.round(bx)), y: Math.max(0, Math.round(by)), width: Math.round(bw), height: Math.round(bh) };

  const left = Math.max(0, box.x - margin);
  const right = Math.min(page.width, box.x + box.width + margin);
  const top = Math.max(0, box.y - margin);
  const bottom = Math.min(Math.max(page.height, box.y + box.height), box.y + box.height + margin, top + maxHeight);
  // A narrow box on a wide page: show the full width, so the section around it is visible.
  const wide = right - left < page.width * 0.6;
  const clip = {
    x: wide ? 0 : left,
    y: top,
    width: Math.max(1, Math.round(wide ? page.width : right - left)),
    height: Math.max(1, Math.round(bottom - top)),
  };
  return { box, clip };
}
