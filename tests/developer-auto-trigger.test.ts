import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { autoSignature, MAX_QUEUE_ATTEMPTS, startAutoStep, validSignature, type AutoStep } from '@/lib/developer/auto-trigger';

const enqueue = vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => true);
vi.mock('@/lib/developer/auto-queue', () => ({ enqueueAutoStep: (...args: unknown[]) => enqueue(...args) }));

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

describe('starting the next step', () => {
  const answer = (status: number) => vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status }));
  afterEach(() => {
    vi.restoreAllMocks();
    enqueue.mockClear();
    enqueue.mockImplementation(async () => true);
  });

  it('queues a step Vercel refuses as a loop (508), for the next cron run', async () => {
    answer(508);
    await startAutoStep('https://x.test', lead, begin);
    expect(enqueue).toHaveBeenCalledWith(lead, begin, 'step begin not started: 508', 1);
  });

  it('queues a step when our own app cannot be reached', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNRESET'));
    await startAutoStep('https://x.test', lead, begin, 2);
    expect(enqueue).toHaveBeenCalledWith(lead, begin, 'step begin not started: no answer', 3);
  });

  it('does not queue a started step, a wrongly built or signed one, or one refused too often', async () => {
    answer(202);
    await startAutoStep('https://x.test', lead, begin);
    answer(403);
    await expect(startAutoStep('https://x.test', lead, begin)).rejects.toThrow('403');
    answer(508);
    await expect(startAutoStep('https://x.test', lead, begin, MAX_QUEUE_ATTEMPTS)).rejects.toThrow('508');
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('fails as before when the queue table is missing (migration 036 not run)', async () => {
    answer(508);
    enqueue.mockImplementation(async () => false);
    await expect(startAutoStep('https://x.test', lead, begin)).rejects.toThrow('508');
  });
});
