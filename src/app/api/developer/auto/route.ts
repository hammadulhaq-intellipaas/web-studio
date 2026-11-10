import { NextResponse, after } from 'next/server';
import { runAutoStep } from '@/lib/developer/auto';
import { startAutoStep, validSignature, type AutoStep } from '@/lib/developer/auto-trigger';

export const dynamic = 'force-dynamic';
// One step of the automatic design prompts: reading one website can take two to three minutes.
export const maxDuration = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STEPS = new Set(['begin', 'spec', 'prompts']);

/**
 * One step of the design prompts written after the client confirms (see auto-trigger.ts). Only
 * our own server can start a step: the request is signed with a key only it has. The route
 * answers at once and does the step after the response, then starts the next one, so every step
 * has its own time limit.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { leadId?: unknown; step?: AutoStep } | null;
  const leadId = typeof body?.leadId === 'string' && UUID.test(body.leadId) ? body.leadId : null;
  const step = body?.step && typeof body.step === 'object' && STEPS.has(body.step.step) ? body.step : null;
  if (!leadId || !step) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  if (!validSignature(leadId, step, request.headers.get('x-auto-signature'))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const origin = new URL(request.url).origin;
  after(async () => {
    try {
      const next = await runAutoStep(leadId, step);
      if (next) await startAutoStep(origin, leadId, next);
    } catch (err) {
      console.error(`[developer/auto] ${leadId} ${step.step} failed:`, err);
    }
  });
  return NextResponse.json({ ok: true }, { status: 202 });
}
