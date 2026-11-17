import { describe, expect, it } from 'vitest';
import { route } from '@/lib/ai/provider';

const both = { openai: 'sk-openai', openrouter: 'sk-or' };

describe('route', () => {
  it('keeps GPT models on OpenAI when its key is set, even with an OpenRouter key', () => {
    expect(route('gpt-6-luna', both)).toEqual({ provider: 'openai', id: 'gpt-6-luna' });
    expect(route('gpt-6-sol', { openai: 'sk' })).toEqual({ provider: 'openai', id: 'gpt-6-sol' });
  });

  it('sends Claude models to OpenRouter, by their plain or prefixed name', () => {
    expect(route('anthropic/claude-opus-5.5', both)).toEqual({ provider: 'openrouter', id: 'anthropic/claude-opus-5.5' });
    expect(route('claude-sonnet-5.5', both)).toEqual({ provider: 'openrouter', id: 'anthropic/claude-sonnet-5.5' });
    expect(route('anthropic/claude-opus-5.5', { openai: 'sk' })).toBeNull();
    expect(route('claude-opus-5.5', { openai: 'sk' })).toBeNull();
  });

  it('uses OpenRouter for GPT models only when there is no OpenAI key', () => {
    expect(route('gpt-6-luna', { openrouter: 'sk-or' })).toEqual({ provider: 'openrouter', id: 'openai/gpt-6-luna' });
    expect(route('openai/gpt-6-sol', { openai: 'sk' })).toEqual({ provider: 'openai', id: 'gpt-6-sol' });
    expect(route('openai/gpt-6-sol', both)).toEqual({ provider: 'openrouter', id: 'openai/gpt-6-sol' });
  });

  it('reaches nothing without keys', () => {
    expect(route('gpt-6-luna', {})).toBeNull();
  });
});
