import { describe, expect, it } from 'vitest';
import type { PromptContext } from '@/lib/developer/context';
import { defaultReferences, designPromptInput } from '@/lib/developer/messages';
import { DEV_DESIGN_PROMPT } from '@/lib/developer/prompt-defaults';

const context: PromptContext = {
  client: { company: 'Müller Sanitär GmbH', contact: 'Anna Meier', email: 'anna@example.com', formLanguage: 'de' },
  quote: { package: 'Gold', addons: ['Online booking system (Calendly/Cal.com)'] },
  sections: [
    {
      screen: 'design',
      title: 'How your site should look and sound',
      answers: [
        { key: 'business_one_liner', question: 'In one sentence, what do you do?', answer: 'Wir bauen Bäder.' },
        { key: 'references', question: 'Are there other websites you like?', answer: 'Link: https://example.com · What do you like about it: the calm layout' },
      ],
    },
  ],
  referenceSites: [],
  files: [{ question: 'Logo', name: 'logo.svg', type: 'image/svg+xml' }],
  status: 'confirmed',
  confirmedAt: '2026-10-28T10:00:00Z',
};

describe('defaultReferences', () => {
  it('gives A the first pick and B the second', () => {
    expect(defaultReferences(['graza', 'rivian', 'devol'])).toEqual({ A: 'graza', B: 'rivian' });
  });
  it('starts both on the only pick, and on nothing without picks', () => {
    expect(defaultReferences(['graza'])).toEqual({ A: 'graza', B: 'graza' });
    expect(defaultReferences([])).toEqual({ A: null, B: null });
  });
});

describe('designPromptInput', () => {
  const reference = { slug: 'graza', name: 'Graza', url: 'https://www.graza.co/', spec: '# Graza: reference spec\n\n## 1. Overview' };

  it('carries the proposal, the spec and the notes, and pulls the client\'s own references out', () => {
    const input = JSON.parse(designPromptInput(context, 'B', reference, '  Keep it calm.  '));
    expect(input.proposal).toBe('B');
    expect(input.reference_website).toEqual({ name: 'Graza', url: 'https://www.graza.co/', spec: reference.spec });
    expect(input.other_references).toContain('the calm layout');
    expect(input.answers[0].items.map((i: { question: string }) => i.question)).toEqual(['In one sentence, what do you do?']);
    expect(input.answers[0].items[0].answer).toBe('Wir bauen Bäder.');
    expect(input.internal_notes).toBe('Keep it calm.');
    expect(input.quote.addons).toEqual(['Online booking system (Calendly/Cal.com)']);
  });

  it('sends null for no reference and no notes', () => {
    const input = JSON.parse(designPromptInput(context, 'A', null, '   '));
    expect(input.reference_website).toBeNull();
    expect(input.internal_notes).toBeNull();
  });
});

describe('the dev_design instruction', () => {
  it('has no em or en dashes and carries the rules that keep sites from looking AI-made', () => {
    expect(DEV_DESIGN_PROMPT).not.toMatch(/[–—]/);
    for (const rule of [/never invent/i, /gradients/i, /three identical icon cards/i, /em dash/i, /390 px/, /Impressum/, /# Website design brief/]) {
      expect(DEV_DESIGN_PROMPT).toMatch(rule);
    }
  });
});
