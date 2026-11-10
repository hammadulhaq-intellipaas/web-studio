import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { autoSignature, validSignature, type AutoStep } from '@/lib/developer/auto-trigger';

const lead = '2d6c3b17-28a4-4c2f-96f9-ecaa375adfde';
const begin: AutoStep = { step: 'begin' };
const spec: AutoStep = { step: 'spec', value: 'client-link-1', queue: [], references: { A: 'atha-hot-yoga', B: 'client-link-1' } };
let saved: string | undefined;

beforeAll(() => {
  saved = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});
afterAll(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = saved;
});

describe('the automatic design prompt steps', () => {
  it('accept only a step signed by our own server, for that lead and that step', () => {
    const signature = autoSignature(lead, spec);
    expect(validSignature(lead, spec, signature)).toBe(true);
    expect(validSignature(lead, begin, signature)).toBe(false);
    expect(validSignature('00000000-0000-0000-0000-000000000000', spec, signature)).toBe(false);
    expect(validSignature(lead, { ...spec, value: 'client-screenshots' }, signature)).toBe(false);
    expect(validSignature(lead, spec, null)).toBe(false);
    expect(validSignature(lead, spec, 'x'.repeat(64))).toBe(false);
  });

  it('change with the server key', () => {
    const before = autoSignature(lead, begin);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'another-key';
    expect(autoSignature(lead, begin)).not.toBe(before);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });
});
