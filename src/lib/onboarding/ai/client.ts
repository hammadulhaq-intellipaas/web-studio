import 'server-only';
import { generateObject, NoObjectGeneratedError, type LanguageModel } from 'ai';
import type { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { apiKeyPresent, getLanguageModel } from '@/lib/ai/provider';
import { redactSecrets } from '../guardrails';
import type { OnbPrompt, OnboardingSettings, PromptId } from '../types';

export type AiJob = 'completeness' | 'brief' | 'rewrite' | 'assist';

/** Canned outputs stand in for the model in e2e runs (no key, no cost, deterministic). */
export function fixtureMode(): boolean {
  return process.env.ONBOARDING_AI_FIXTURE === '1';
}

export function modelConfigured(): boolean {
  return fixtureMode() || apiKeyPresent();
}

export function getModel(settings: OnboardingSettings): LanguageModel {
  return getLanguageModel(settings.model);
}

export function promptText(prompts: OnbPrompt[], id: PromptId): string {
  return prompts.find((p) => p.id === id)?.content ?? '';
}

export interface AiCall<T> {
  formId: string;
  job: AiJob;
  attempt: number;
  settings: OnboardingSettings;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  /** Result used instead of the model in fixture mode. */
  fixture: () => T;
}

export type AiResult<T> =
  | { ok: true; object: T; model: string; usage: Record<string, unknown> | null; durationMs: number }
  | { ok: false; error: string; text: string | null; model: string; durationMs: number };

/**
 * One structured model call, logged to onboarding_ai_log whatever happens (spec §06:
 * "log every prompt and response against the session id"). Secrets are stripped from the
 * prompt before logging; a schema miss surfaces as `ok: false` with the raw text so the
 * caller can retry with the violation appended.
 */
export async function callModel<T>(input: AiCall<T>): Promise<AiResult<T>> {
  const started = Date.now();
  const modelId = fixtureMode() ? 'fixture' : input.settings.model;
  let result: AiResult<T>;

  if (fixtureMode()) {
    result = { ok: true, object: input.fixture(), model: modelId, usage: null, durationMs: Date.now() - started };
  } else {
    try {
      const { object, usage } = await generateObject({
        model: getModel(input.settings),
        schema: input.schema,
        system: input.system,
        prompt: input.prompt,
      });
      result = {
        ok: true,
        object,
        model: modelId,
        usage: (usage as unknown as Record<string, unknown>) ?? null,
        durationMs: Date.now() - started,
      };
    } catch (err) {
      const text = NoObjectGeneratedError.isInstance(err) ? (err.text ?? null) : null;
      const message = err instanceof Error ? err.message : String(err);
      result = { ok: false, error: message, text, model: modelId, durationMs: Date.now() - started };
    }
  }

  await logCall(input, result);
  return result;
}

async function logCall<T>(input: AiCall<T>, result: AiResult<T>): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient();
    await supabase.from('onboarding_ai_log').insert({
      form_id: input.formId,
      job: input.job,
      attempt: input.attempt,
      model: result.model,
      prompt: { system: redactSecrets(input.system).text, prompt: redactSecrets(input.prompt).text },
      response: result.ok ? (result.object as unknown as Record<string, unknown>) : { error: result.error, text: result.text ? redactSecrets(result.text).text : null },
      ok: result.ok,
      usage: result.ok ? result.usage : null,
      duration_ms: result.durationMs,
    });
  } catch (err) {
    console.error('[onboarding/ai] log insert failed:', err);
  }
}

/** Bumps the per-form call counter; returns false when the cap is reached. */
export async function reserveAiCall(formId: string, current: number, settings: OnboardingSettings): Promise<boolean> {
  if (current >= settings.maxAiCalls) return false;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from('onboarding_forms').update({ ai_calls: current + 1 }).eq('id', formId);
  return !error;
}
