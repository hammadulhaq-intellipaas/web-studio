import { NextResponse } from 'next/server';
import { takeQueuedSteps } from '@/lib/developer/auto-queue';
import { startAutoStep } from '@/lib/developer/auto-trigger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Vercel Cron, every minute (vercel.json): starts the chain steps that our own app refused to
 * start in a row (auto-queue.ts). A step started from here is the first of a new chain for
 * Vercel's recursion protection. With CRON_SECRET set, only Vercel's cron may call it; without
 * it, a call can only start steps that are already queued and signed, a minute early.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  // The public address, never the one Vercel's cron calls: that is the deployment's own URL,
  // which deployment protection answers with 401 (19 Nov 2026).
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || new URL(request.url).origin;
  const steps = await takeQueuedSteps();
  const results = await Promise.allSettled(steps.map((s) => startAutoStep(origin, s.lead_id, s.step, s.attempts)));
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`[developer/auto/queue] ${steps[i].lead_id} ${steps[i].step.step} given up:`, r.reason);
  });
  return NextResponse.json({ started: results.filter((r) => r.status === 'fulfilled').length, failed: results.filter((r) => r.status === 'rejected').length });
}
