import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * The automatic design prompts run as a chain of short requests to /api/developer/auto, each
 * with its own time limit: one per client reference to read (a website, their pictures), then
 * one for both prompts. Reading a website and writing two prompts in one request did not fit in
 * Vercel's five minutes. This module only starts a step; it pulls in nothing heavy, so the
 * onboarding confirmation can use it safely.
 */
/** The parts of reading a Form B client's current website, in order (old-site-read.ts). */
export const SITE_PHASES = ['pages', 'assets', 'content', 'photos', 'design', 'spec'] as const;
export type SitePhase = (typeof SITE_PHASES)[number];

export type AutoStep =
  | { step: 'begin' }
  | { step: 'site'; phase: SitePhase }
  /** A design made in the app (app-design.ts), one part per step. */
  | { step: 'build'; versionId: string; phase: 'system' | 'page' | 'assets' | 'check' | 'fix' | 'recheck' | 'finish'; index?: number }
  | { step: 'refs' }
  | { step: 'spec'; value: string; queue: string[]; references: { A: string | null; B: string | null } }
  | { step: 'prompts'; references: { A: string | null; B: string | null } };

/** Signs a step for a lead with a key only the server has, so nobody else can start one. */
export function autoSignature(leadId: string, step: AutoStep): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return createHmac('sha256', `developer-auto:${key}`).update(`${leadId}|${JSON.stringify(step)}`).digest('hex');
}

export function validSignature(leadId: string, step: AutoStep, signature: string | null): boolean {
  if (!signature || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  const expected = Buffer.from(autoSignature(leadId, step));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/**
 * Starts one step; the route answers at once and does the work after its response. A step our
 * own app refuses or cannot be reached for (Vercel's recursion protection answers 508 after a few
 * steps in a row) goes on the queue, and the next cron run starts it as a new chain
 * (auto-queue.ts). `attempts` counts the refused starts so far.
 */
export async function startAutoStep(origin: string, leadId: string, step: AutoStep, attempts = 0): Promise<void> {
  let status = 0;
  try {
    const res = await fetch(`${origin}/api/developer/auto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-auto-signature': autoSignature(leadId, step) },
      body: JSON.stringify({ leadId, step }),
    });
    if (res.ok) return;
    status = res.status;
  } catch {
    // Unreachable for a moment: worth another try, like a refusal.
  }
  const why = `step ${step.step} not started: ${status || 'no answer'}`;
  // A request we built wrongly (400) or signed wrongly (403) fails the same way every time.
  const retry = status !== 400 && status !== 403 && attempts < MAX_QUEUE_ATTEMPTS;
  if (retry) {
    const { enqueueAutoStep } = await import('./auto-queue');
    if (await enqueueAutoStep(leadId, step, why, attempts + 1)) {
      console.log(`[developer/auto] ${leadId} ${step.step} queued for the next run (${why})`);
      return;
    }
  }
  throw new Error(why);
}

/** A step refused this many times is given up and logged, not queued again. */
export const MAX_QUEUE_ATTEMPTS = 5;
