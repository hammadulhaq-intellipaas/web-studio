import { beforeEach, describe, expect, it, vi } from 'vitest';
import { a, makeDefinition, makeRecord } from './fixtures/onboarding';
import type { OnboardingSecrets } from '@/lib/onboarding/types';
import { prompts } from '../supabase/seed/onboarding/index.ts';

// The AI client logs every call to Supabase; that is not what is under test here.
const inserted: unknown[] = [];
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({
      insert: (row: unknown) => {
        inserted.push(row);
        return Promise.resolve({ error: null });
      },
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
  }),
}));

const { assistField } = await import('@/lib/onboarding/ai/assist');
const { buildCorpus, findUngrounded } = await import('@/lib/onboarding/guardrails');

const def = makeDefinition();
const secrets: OnboardingSecrets = { prompts, examples: [] };
const field = def.fields.find((f) => f.id === 'usps')!;
const run = (text: string) => assistField({ definition: def, secrets, record: makeRecord(), field, text });

describe('assistField', () => {
  beforeEach(() => {
    inserted.length = 0;
    process.env.ONBOARDING_AI_FIXTURE = '1';
  });

  it('offers a rewrite of what the client wrote and logs the call', async () => {
    const result = await run('Wir sind schnell und machen sauber.');
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Wir sind schnell');
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ job: 'assist', ok: true, model: 'fixture' });
  });

  it('grounds a suggestion in the client’s own answer, not the rest of the form', async () => {
    // assistField builds its corpus from this one field, so a year, a price or a phone
    // number the model added is ungrounded even if it appears elsewhere on the form.
    const corpus = buildCorpus({ usps: a('Wir sind schnell und machen sauber.') });
    expect(findUngrounded('Wir sind seit 1998 schnell.', corpus)).toContain('1998');
    expect(findUngrounded('Wir sind schnell und machen sauber.', corpus)).toEqual([]);
  });

  it('rejects an empty answer without calling the model', async () => {
    const result = await run('   ');
    expect(result).toEqual({ ok: false, violations: ['empty'] });
    expect(inserted).toHaveLength(0);
  });

  it('redacts a password before anything reaches the model', async () => {
    const result = await run('Unser Login ist Passwort: hunter2 und wir sind schnell.');
    expect(result.ok).toBe(true);
    expect(result.text).not.toContain('hunter2');
  });
});
