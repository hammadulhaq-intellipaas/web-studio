import { describe, expect, it } from 'vitest';
import type { PromptContext } from '@/lib/developer/context';
import { defaultReferences } from '@/lib/developer/messages';
import { PROMPT_SECTIONS } from '@/lib/developer/design-prompt-check';
import { sourceOfTruth } from '@/lib/developer/source-of-truth';
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
  clientReferences: [{ url: 'https://example.com', liked: ['Layout'], likes: 'the calm layout', dislikes: '' }],
  referenceShots: [],
  examples: ['graza', 'client-link-1'],
  files: [{ question: 'Logo', name: 'logo.svg', type: 'image/svg+xml' }],
  status: 'confirmed',
  confirmedAt: '2026-10-28T10:00:00Z',
  funnel: 'A',
  existingUrl: null,
  brandKeep: null,
};

describe('defaultReferences', () => {
  it('gives A the first example and B the second', () => {
    expect(defaultReferences(['graza', 'rivian', 'devol'])).toEqual({ A: 'graza', B: 'rivian' });
    expect(defaultReferences(['graza', 'client-link-1'])).toEqual({ A: 'graza', B: 'client-link-1' });
    expect(defaultReferences(['client-link-1', 'client-screenshots'])).toEqual({ A: 'client-link-1', B: 'client-screenshots' });
  });
  it('starts both on the only example, and on nothing without examples', () => {
    expect(defaultReferences(['graza'])).toEqual({ A: 'graza', B: 'graza' });
    expect(defaultReferences([])).toEqual({ A: null, B: null });
  });
  it('skips the examples that cannot be used yet', () => {
    const libraryOnly = (v: string) => !v.startsWith('client-');
    expect(defaultReferences(['client-link-1', 'graza'], libraryOnly)).toEqual({ A: 'graza', B: 'graza' });
  });
});

describe('the source of truth', () => {
  const reference = { slug: 'graza', name: 'Graza', url: 'https://www.graza.co/', spec: '# Graza: reference spec\n\n## 1. Overview\nPlayful.' };

  it('carries the proposal, the answers, the quote, the reference and the notes, and keeps the email out', () => {
    const { text, files, variant } = sourceOfTruth({ context, proposal: 'B', reference, leads: { A: 'graza', B: 'graza' }, site: null, internalNotes: '  Keep it calm.  ' });
    expect(variant).toBe('A');
    expect(files.map((f) => f.name)).toEqual(['onboarding.md', 'quote.md', 'reference-website.md', 'other-examples.md']);
    expect(text).toContain("Müller Sanitär GmbH's new website, Proposal 2");
    expect(text).toContain('## Internal notes from the team');
    expect(text).toContain('Keep it calm.');
    expect(text).toContain('- In one sentence, what do you do? Wir bauen Bäder.');
    expect(text).toContain('- Add-ons: Online booking system (Calendly/Cal.com)');
    expect(text).toContain('- Contact person: Anna Meier');
    expect(text).not.toContain('anna@example.com');
    // The client's own link is one of the other examples, with what they wrote about it.
    expect(files[3].content).toContain('- In their words: "the calm layout"');
    // The examples answer is not repeated in onboarding.md.
    expect(files[0].content).not.toContain('Are there other websites you like?');
  });

  it('has no reference file and no notes section without them', () => {
    const { text, files } = sourceOfTruth({ context, proposal: 'A', reference: null, leads: { A: null, B: null }, site: null, internalNotes: '   ' });
    expect(files.map((f) => f.name)).not.toContain('reference-website.md');
    expect(text).toContain('This proposal follows: no reference website');
    expect(text).not.toContain('Internal notes');
  });
});

describe('the dev_design instruction', () => {
  it('has no em or en dashes and carries the rules that keep sites from looking AI-made', () => {
    expect(DEV_DESIGN_PROMPT).not.toMatch(/[–—]/);
    for (const rule of [/never invent/i, /gradients/i, /three identical icon cards/i, /em dash/i, /legal pages/, /source of truth/i, /Do not map it onto the new site/]) {
      expect(DEV_DESIGN_PROMPT).toMatch(rule);
    }
  });

  it('asks for exactly the sections the check looks for, in order', () => {
    const headings = [...DEV_DESIGN_PROMPT.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    expect(headings).toEqual(['The client', 'Brand (fixed)', 'Direction', 'Pages', 'Photos', 'Rules', 'Your freedom', 'Not designed yet']);
    for (const s of PROMPT_SECTIONS) expect(headings.some((h) => h.startsWith(s))).toBe(true);
  });
});
