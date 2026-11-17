import 'server-only';
import { generateObject, generateText, type ModelMessage } from 'ai';
import type { z } from 'zod';
import { getLanguageModel } from '@/lib/ai/provider';
import { fixtureMode } from '@/lib/onboarding/ai/client';
import { redactSecrets } from '@/lib/onboarding/guardrails';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Model calls of the newer developer jobs (reading the client's current website, the creative part
 * of the design prompt, the designs made in the app): text or a structured answer, with pictures,
 * a time limit, and a line in onboarding_ai_log like every other job.
 */
export interface CallOptions {
  formId: string;
  job: string;
  modelId: string;
  system: string;
  prompt: string;
  pictures?: { image: Buffer; mediaType: string }[];
  timeoutMs: number;
  maxOutputTokens?: number;
}

function message(opts: CallOptions): ModelMessage {
  const pictures = opts.pictures ?? [];
  return pictures.length
    ? { role: 'user', content: [{ type: 'text', text: opts.prompt }, ...pictures.map((p) => ({ type: 'image' as const, image: p.image, mediaType: p.mediaType }))] }
    : { role: 'user', content: opts.prompt };
}

async function log(opts: CallOptions, ok: boolean, response: Record<string, unknown>, ms: number, usage: unknown = null) {
  const pictures = opts.pictures?.length ? `\n\n[${opts.pictures.length} pictures attached]` : '';
  try {
    await createSupabaseAdminClient()
      .from('onboarding_ai_log')
      .insert({
        form_id: opts.formId,
        job: opts.job,
        attempt: 1,
        model: opts.modelId,
        prompt: { system: redactSecrets(opts.system).text, prompt: redactSecrets(opts.prompt).text + pictures },
        response,
        ok,
        usage,
        duration_ms: ms,
      });
  } catch (err) {
    console.error('[developer] log insert failed:', err);
  }
}

const reason = (err: unknown, timeoutMs: number) => {
  const raw = err instanceof Error ? err.message : String(err);
  return err instanceof Error && /abort|timeout/i.test(err.name + raw) ? `the model took longer than ${Math.round(timeoutMs / 1000)} s` : raw;
};

/** A text answer. In fixture mode (tests) the fixture is returned without a call. */
export async function callText(opts: CallOptions & { fixture: string }): Promise<string> {
  const started = Date.now();
  if (fixtureMode()) {
    await log(opts, true, { text: opts.fixture }, 0);
    return opts.fixture;
  }
  try {
    const result = await generateText({
      model: getLanguageModel(opts.modelId),
      system: opts.system,
      messages: [message(opts)],
      maxOutputTokens: opts.maxOutputTokens ?? 20000,
      abortSignal: AbortSignal.timeout(opts.timeoutMs),
    });
    if (result.finishReason === 'length') throw new Error('the model ran out of room before finishing');
    await log(opts, true, { text: result.text }, Date.now() - started, result.usage ?? null);
    return result.text.trim();
  } catch (err) {
    const why = reason(err, opts.timeoutMs);
    await log(opts, false, { error: why }, Date.now() - started);
    throw new Error(why);
  }
}

/** A structured answer, checked against the schema. */
export async function callObject<T>(opts: CallOptions & { schema: z.ZodType<T>; fixture: T }): Promise<T> {
  const started = Date.now();
  if (fixtureMode()) {
    await log(opts, true, { object: opts.fixture as unknown as Record<string, unknown> }, 0);
    return opts.fixture;
  }
  try {
    const result = await generateObject({
      model: getLanguageModel(opts.modelId),
      schema: opts.schema,
      system: opts.system,
      messages: [message(opts)],
      maxOutputTokens: opts.maxOutputTokens ?? 30000,
      abortSignal: AbortSignal.timeout(opts.timeoutMs),
    });
    await log(opts, true, { object: result.object as unknown as Record<string, unknown> }, Date.now() - started, result.usage ?? null);
    return result.object;
  } catch (err) {
    const why = reason(err, opts.timeoutMs);
    await log(opts, false, { error: why }, Date.now() - started);
    throw new Error(why);
  }
}
