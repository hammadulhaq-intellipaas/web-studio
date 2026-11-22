import 'server-only';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

/**
 * The one place a model is constructed. Every model call goes through OpenRouter with
 * OPENROUTER_API_KEY (team decision, 22 Nov 2026). OPENAI_API_KEY is never used.
 *
 * - A GPT model by its plain name (`gpt-6-luna`) is sent as `openai/gpt-6-luna`.
 * - A Claude model by its plain name (`claude-opus-5.5`) is sent as `anthropic/claude-opus-5.5`.
 * - A model with a provider prefix (`openai/gpt-6-sol`, `anthropic/claude-opus-5.5`) is sent as is.
 *
 * So the model settings can keep their plain names.
 */
const OPENROUTER_URL = 'https://openrouter.ai/api/v1';

export type AiProviderName = 'openrouter';

/** The OpenRouter name a model id is sent under. Null: no OpenRouter key, or no model id. */
export function route(modelId: string, env: { openrouter?: string } = keys()): { provider: AiProviderName; id: string } | null {
  const id = modelId.trim();
  if (!id || !env.openrouter) return null;
  if (id.indexOf('/') > 0) return { provider: 'openrouter', id };
  if (/^claude-/i.test(id)) return { provider: 'openrouter', id: `anthropic/${id}` };
  return { provider: 'openrouter', id: `openai/${id}` };
}

function keys() {
  return { openrouter: process.env.OPENROUTER_API_KEY };
}

/** The provider a model goes to, or null when no key reaches it. */
export function providerName(modelId = 'gpt-6-luna'): AiProviderName | null {
  return route(modelId)?.provider ?? null;
}

/** True when the provider can actually be reached. */
export function apiKeyPresent(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

/** True when this model can be reached with the key that is set. */
export function modelReachable(modelId: string): boolean {
  return route(modelId) !== null;
}

export function getLanguageModel(modelId: string): LanguageModel {
  const target = route(modelId);
  if (!target) throw new Error(`${modelId || 'The model'} needs OPENROUTER_API_KEY, which is not set.`);
  const openrouter = createOpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: OPENROUTER_URL,
    // OpenRouter attributes traffic with these; they are optional but keep the
    // dashboard readable when more than one app shares the key.
    headers: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'https://web-studio.intellipaas.io',
      'X-Title': 'web-studio',
    },
  });
  // OpenRouter speaks the chat completions API, not OpenAI's newer responses API.
  return openrouter.chat(target.id);
}
