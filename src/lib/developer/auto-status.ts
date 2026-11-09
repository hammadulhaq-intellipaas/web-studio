/**
 * The design prompts are written automatically when the client confirms the onboarding form
 * (src/lib/developer/auto.ts). Plain helpers, shared by that job and the Design tab.
 */

/** Who the automatic prompts are saved as, shown next to them on the Design tab. */
export const AUTO_BY = 'Automatic (client confirmed)';

/**
 * How long after the confirmation the Design tab says the prompts are still being written. The
 * slowest case (reading the client's own website, then both prompts) takes about 3.5 minutes.
 */
export const AUTO_WINDOW_MS = 6 * 60 * 1000;

export function autoPending(confirmedAt: string | null, promptCount: number, now: number = Date.now()): boolean {
  if (!confirmedAt || promptCount > 0) return false;
  const at = Date.parse(confirmedAt);
  return Number.isFinite(at) && now >= at && now - at < AUTO_WINDOW_MS;
}
