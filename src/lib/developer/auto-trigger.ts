import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * The automatic design prompts run as a chain of short requests to /api/developer/auto, each
 * with its own time limit: one per client reference to read (a website, their pictures), then
 * one for both prompts. Reading a website and writing two prompts in one request did not fit in
 * Vercel's five minutes. This module only starts a step; it pulls in nothing heavy, so the
 * onboarding confirmation can use it safely.
 */
export type AutoStep =
  | { step: 'begin' }
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

/** Starts one step; the route answers at once and does the work after its response. */
export async function startAutoStep(origin: string, leadId: string, step: AutoStep): Promise<void> {
  const res = await fetch(`${origin}/api/developer/auto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-auto-signature': autoSignature(leadId, step) },
    body: JSON.stringify({ leadId, step }),
  });
  if (!res.ok) throw new Error(`step ${step.step} not started: ${res.status}`);
}
