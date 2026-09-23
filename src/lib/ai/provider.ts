import 'server-only';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

/**
 * The one place a model is constructed, for both the onboarding form and the
 * suggested-plan generator.
 *
 * OpenAI today. OpenRouter is OpenAI-compatible, so moving there later needs no code
 * change at all: set `OPENROUTER_API_KEY` and this picks it up, then change the model id
 * to its prefixed form (`openai/gpt-6-luna`) — which for the onboarding form is the
 * `onb_model` CMS setting, so not even a deploy.
 */
const OPENROUTER_URL = 'https://openrouter.ai/api/v1';

export type AiProviderName = 'openai' | 'openrouter';

export function providerName(): AiProviderName {
  return process.env.OPENROUTER_API_KEY ? 'openrouter' : 'openai';
}

/** True when some provider can actually be reached. */
export function apiKeyPresent(): boolean {
  return !!(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY);
}

export function getLanguageModel(modelId: string): LanguageModel {
  if (process.env.OPENROUTER_API_KEY) {
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
    return openrouter(modelId);
  }
  return createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(modelId);
}
