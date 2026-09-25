import { describe, expect, it } from 'vitest';
import { isTestLeadAddress, teamRecipients } from '@/lib/emails';

/**
 * Walking the customer flow should not put a mail in three people's inboxes. The list is a
 * CMS setting so it can be changed without a deploy, and it silences only the team copy.
 */
describe('test leads do not notify the team', () => {
  const SKIP = '@example.com, fizra.farid@intellipaas.io, delivered@resend.dev';

  it('matches an exact address, ignoring case and spacing', () => {
    expect(isTestLeadAddress('fizra.farid@intellipaas.io', SKIP)).toBe(true);
    expect(isTestLeadAddress('  Fizra.Farid@IntelliPaaS.io ', SKIP)).toBe(true);
    expect(isTestLeadAddress('delivered@resend.dev', SKIP)).toBe(true);
  });

  it('matches a whole domain when the rule starts with @', () => {
    expect(isTestLeadAddress('e2e-123@example.com', SKIP)).toBe(true);
    expect(isTestLeadAddress('anyone@example.com', SKIP)).toBe(true);
  });

  it('leaves real customers alone', () => {
    expect(isTestLeadAddress('thorsten@winergy-coaching.com', SKIP)).toBe(false);
    // A near miss must not match: the rule is the whole address, not a substring.
    expect(isTestLeadAddress('notfizra.farid@intellipaas.io', SKIP)).toBe(false);
    expect(isTestLeadAddress('someone@notexample.com', SKIP)).toBe(false);
  });

  it('does nothing when the setting is empty or the address is missing', () => {
    expect(isTestLeadAddress('anyone@example.com', '')).toBe(false);
    expect(isTestLeadAddress('', SKIP)).toBe(false);
    expect(isTestLeadAddress(null, SKIP)).toBe(false);
  });

  it('is separate from who the team notification goes to', () => {
    expect(teamRecipients('leads@intellipaas.io, matt@intellipaas.io')).toEqual([
      'leads@intellipaas.io',
      'matt@intellipaas.io',
    ]);
    expect(teamRecipients('')).toEqual([]);
  });
});
