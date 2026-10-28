import { describe, expect, it } from 'vitest';
import { isDeveloperClient, parseTab, parseView, promptsReady } from '@/lib/developer/filters';

describe('isDeveloperClient', () => {
  it('counts committed quotes as clients', () => {
    for (const status of ['accepted', 'agreed', 'won'] as const) {
      expect(isDeveloperClient({ status, onboarding_status: null })).toBe(true);
    }
  });

  it('ignores the in_progress form every submitted quote gets automatically', () => {
    expect(isDeveloperClient({ status: 'new', onboarding_status: 'in_progress' })).toBe(false);
    expect(isDeveloperClient({ status: 'contacted', onboarding_status: null })).toBe(false);
  });

  it('counts an open quote whose onboarding form is under way', () => {
    expect(isDeveloperClient({ status: 'new', onboarding_status: 'review' })).toBe(true);
    expect(isDeveloperClient({ status: 'contacted', onboarding_status: 'confirmed' })).toBe(true);
  });

  it('never counts a lost quote', () => {
    expect(isDeveloperClient({ status: 'lost', onboarding_status: 'confirmed' })).toBe(false);
  });
});

describe('promptsReady', () => {
  it('needs the confirmed onboarding form', () => {
    expect(promptsReady('confirmed')).toBe(true);
    expect(promptsReady('brief')).toBe(false);
    expect(promptsReady(null)).toBe(false);
  });
});

describe('parseTab and parseView', () => {
  it('fall back to the defaults for anything unknown', () => {
    expect(parseTab('build')).toBe('build');
    expect(parseTab('handover')).toBe('handover');
    expect(parseTab('nope')).toBe('design');
    expect(parseTab(undefined)).toBe('design');
    expect(parseView('committed')).toBe('committed');
    expect(parseView('x')).toBe('all');
    expect(parseView(undefined)).toBe('all');
  });
});
