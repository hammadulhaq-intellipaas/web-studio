import { describe, expect, it } from 'vitest';
import { germanDateTime, renderTextEmail } from '@/lib/onboarding/emails';
import { makeDefinition } from './fixtures/onboarding';

describe('team email on confirmation', () => {
  it('says who completed the form and when, in German time, and nothing else', () => {
    // 09:22 UTC on 28 Sep 2026 is 11:22 in Germany (summer time).
    const when = germanDateTime('2026-09-28T09:22:00Z');
    expect(when).toEqual({ date: '28 September 2026', time: '11:22' });

    const mail = renderTextEmail(makeDefinition().texts, 'email_brief_team', 'en', {
      name: 'Angelica Sy',
      company: 'IntelliPaaS',
      email: 'angelica.sy@intellipaas.io',
      ...when,
    })!;
    expect(mail.subject).toBe('Onboarding completed: IntelliPaaS');
    expect(mail.text).toBe(
      'Angelica Sy (IntelliPaaS, angelica.sy@intellipaas.io) completed the onboarding form on 28 September 2026 at 11:22 (German time).\n\nThe brief is attached as a PDF.',
    );
    expect(mail.text).not.toMatch(/Flags|JSON|open|admin/i);
  });

  it('uses winter time outside daylight saving', () => {
    expect(germanDateTime('2026-12-01T09:05:00Z')).toEqual({ date: '1 December 2026', time: '10:05' });
  });
});
