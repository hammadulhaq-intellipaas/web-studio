import { describe, expect, it } from 'vitest';
import { route } from '@/lib/ai/provider';

const or = { openrouter: 'sk-or' };

describe('route', () => {
  it('sends GPT models to OpenRouter under the openai/ prefix', () => {
    expect(route('gpt-6-luna', or)).toEqual({ provider: 'openrouter', id: 'openai/gpt-6-luna' });
    expect(route('gpt-6-sol', or)).toEqual({ provider: 'openrouter', id: 'openai/gpt-6-sol' });
    expect(route(' openai/gpt-6-sol ', or)).toEqual({ provider: 'openrouter', id: 'openai/gpt-6-sol' });
  });

  it('sends Claude models to OpenRouter, by their plain or prefixed name', () => {
    expect(route('anthropic/claude-opus-5.5', or)).toEqual({ provider: 'openrouter', id: 'anthropic/claude-opus-5.5' });
    expect(route('claude-sonnet-5.5', or)).toEqual({ provider: 'openrouter', id: 'anthropic/claude-sonnet-5.5' });
  });

  it('never uses an OpenAI key: without the OpenRouter key nothing is reachable', () => {
    expect(route('gpt-6-luna', { openai: 'sk-openai' } as { openrouter?: string })).toBeNull();
    expect(route('gpt-6-luna', {})).toBeNull();
    expect(route('', or)).toBeNull();
  });
});
