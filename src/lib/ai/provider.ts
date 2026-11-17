import 'server-only';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

/**
 * The one place a model is constructed. Each model goes to the provider that serves it:
 *
 * - A GPT model by its plain name (`gpt-6-luna`) goes to OpenAI with OPENAI_API_KEY, as it always
 *   has. Without that key it goes to OpenRouter as `openai/gpt-6-luna`.
 * - A model with a provider prefix (`anthropic/claude-opus-5.5`, `openai/gpt-6-sol`) goes to
 *   OpenRouter with OPENROUTER_API_KEY. An `openai/…` model falls back to OpenAI when there is
 *   no OpenRouter key.
 * - A Claude model by its plain name (`claude-opus-5.5`) goes to OpenRouter as `anthropic/…`.
 *
 * So setting OPENROUTER_API_KEY changes nothing for the GPT jobs already running; it only makes
 * the Claude models reachable.
 */
const OPENROUTER_URL = 'https://openrouter.ai/api/v1';

export type AiProviderName = 'openai' | 'openrouter';

/** Where a model id is sent, and under which name. Null: no key for it. */
export function route(modelId: string, env: { openai?: string; openrouter?: string } = keys()): { provider: AiProviderName; id: string } | null {
  const id = modelId.trim();
  const slash = id.indexOf('/');
  if (slash > 0) {
    if (env.openrouter) return { provider: 'openrouter', id };
    if (id.startsWith('openai/') && env.openai) return { provider: 'openai', id: id.slice(slash + 1) };
    return null;
  }
  if (/^claude-/i.test(id)) return env.openrouter ? { provider: 'openrouter', id: `anthropic/${id}` } : null;
  if (env.openai) return { provider: 'openai', id };
  if (env.openrouter) return { provider: 'openrouter', id: `openai/${id}` };
  return null;
}

function keys() {
  return { openai: process.env.OPENAI_API_KEY, openrouter: process.env.OPENROUTER_API_KEY };
}

/** The provider a model goes to, or null when no key reaches it. */
export function providerName(modelId = 'gpt-6-luna'): AiProviderName | null {
  return route(modelId)?.provider ?? null;
}

/** True when some provider can actually be reached. */
export function apiKeyPresent(): boolean {
  return !!(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY);
}

/** True when this model can be reached with the keys that are set. */
export function modelReachable(modelId: string): boolean {
  return route(modelId) !== null;
}

export function getLanguageModel(modelId: string): LanguageModel {
  const target = route(modelId);
  if (!target) {
    throw new Error(
      /^(anthropic\/|claude-)/i.test(modelId.trim())
        ? `${modelId} needs OPENROUTER_API_KEY, which is not set.`
        : `No API key is set for ${modelId}.`,
    );
  }
  if (target.provider === 'openrouter') {
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
  return createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(target.id);
}
