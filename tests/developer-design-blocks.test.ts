import { describe, expect, it } from 'vitest';
import type { PromptContext } from '@/lib/developer/context';
import { assembleDesignPrompt, brandVariant, creativeCheck, sectionsOf, type CurrentSite } from '@/lib/developer/design-blocks';
import { pageListsFromDesign } from '@/lib/developer/messages';

const spec = (name: string) =>
  [`# ${name}: reference spec`, ...['Overview', 'Pages and navigation', 'Header', 'Footer', 'Page layouts', 'Responsive behaviour', 'Motion and interaction', 'Colour', 'Typography', 'Imagery and icons', 'Components', 'Section skeletons', "Dos and don'ts"].map((t, i) => `## ${i + 1}. ${t}\n${name} ${t.toLowerCase()} text.`)].join('\n\n');

const context = (over: Partial<PromptContext> = {}): PromptContext => ({
  client: { company: 'Bloom', contact: 'Nina', email: 'n@b.de', formLanguage: 'de' },
  quote: { package: 'Gold', addons: [] },
  sections: [
    {
      screen: 'design',
      title: 'Design',
      answers: [
        { key: 'address_form', question: 'How should the site address visitors?', answer: 'Informally ("du")' },
        { key: 'business_one_liner', question: 'In one sentence, what do you do?', answer: 'Geburtsvorbereitung mit Körper und Kopf.' },
        { key: 'colour_mood', question: 'What colour mood fits your business?', answer: 'Warm and earthy' },
        { key: 'tone_scale', question: 'How should your site feel?', answer: 'Warm and informal' },
        { key: 'reference_likes', question: 'What do you like about the examples you chose?', answer: 'Graza: Colours' },
      ],
    },
  ],
  referenceSites: [
    { slug: 'rivian', name: 'Rivian', url: 'https://rivian.com/', spec: spec('Rivian'), liked: ['Layout'], dislikes: 'Too dark' },
    { slug: 'graza', name: 'Graza', url: 'https://www.graza.co/', spec: spec('Graza'), liked: ['Colours'], dislikes: '' },
  ],
  clientReferences: [],
  referenceShots: [],
  examples: ['rivian', 'graza'],
  files: [],
  status: 'confirmed',
  confirmedAt: null,
  funnel: 'A',
  existingUrl: null,
  brandKeep: null,
  ...over,
});

const CREATIVE = [
  '## Pages in this design',
  '- Startseite: the homepage',
  '- Kurse: the main action',
  '## Layout direction',
  'Big type, calm grid.',
  '## Pages and sections',
  '### Startseite',
  '1. Hero.',
  '## Motion',
  'None.',
  '## Pages not designed yet',
  '- Blog',
].join('\n');

const reference = { slug: 'rivian', name: 'Rivian', url: 'https://rivian.com/', spec: spec('Rivian') };
const site: CurrentSite = {
  spec: '# Current website: bloommothers.de\n\n## 1. Pages and menu\n- Start\n\n## 2. Content, word for word\n### Prices\n**Price: Programm** (from https://x)\n249 €\n\n## 3. Brand\nx\n\n## 4. Photos\n- assets/current-site/aa-nina.jpg: Nina at work. (person, good quality; fits: portrait)',
  designSpec: spec('Bloom site'),
  logos: ['lead/images/bb-logo.svg'],
  fontFiles: [{ family: 'Times Bloom', file: 'lead/fonts/cc-Times.woff2', weight: '400', style: 'normal' }],
  googleFonts: [],
};

describe('the creative part', () => {
  it('needs all five sections, or is asked once to rewrite', () => {
    expect(creativeCheck(CREATIVE)).toBeNull();
    expect(creativeCheck('## Pages in this design\n- Home')).toMatch(/## Layout direction/);
    expect(sectionsOf(CREATIVE).get('layout direction')).toBe('Big type, calm grid.');
  });
});

describe('assembleDesignPrompt', () => {
  it('puts the creative part in its place and keeps the page lists the build prompt reads', () => {
    const md = assembleDesignPrompt({ context: context(), proposal: 'A', reference, leads: { A: 'rivian', B: 'graza' }, creative: CREATIVE, site: null });
    expect(md.startsWith('# Website design: Bloom, Proposal 1')).toBe(true);
    const headings = [...md.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    expect(headings).toEqual([
      'Pages in this design',
      'Goal',
      'How to work',
      'Brand and identity',
      'Reference website: Rivian',
      "The client's other examples",
      'Layout direction',
      'Pages and sections',
      'Content, word for word',
      'Photos and files',
      'Motion',
      'Responsive behaviour',
      'Must not',
      'Self-check before you deliver',
      'Deliverable',
      'Pages not designed yet',
    ]);
    expect(pageListsFromDesign(md)).toEqual({ designed: ['Startseite', 'Kurse'], notDesigned: ['Blog'] });
  });

  it('takes the reference layout word for word, its liked parts, and only the liked parts of the other examples', () => {
    const md = assembleDesignPrompt({ context: context(), proposal: 'A', reference, leads: { A: 'rivian', B: 'graza' }, creative: CREATIVE, site: null });
    expect(md).toContain('The client likes about it: Layout. They do not like: "Too dark"; leave that out.');
    expect(md).toContain('### 5. Page layouts\nRivian page layouts text.');
    expect(md).toContain('### 7. Motion and interaction\nRivian motion');
    expect(md).not.toContain('Rivian colour text');
    expect(md).toContain('### Graza (leads the other proposal: borrow only what nothing else offers)');
    expect(md).toContain('#### 8. Colour\nGraza colour text.');
    expect(md).not.toContain('Graza page layouts text');
  });

  it('A: the brand and the content come from the answers; du from the form', () => {
    const md = assembleDesignPrompt({ context: context(), proposal: 'B', reference: null, leads: { A: null, B: null }, creative: CREATIVE, site: null });
    expect(md).toContain('- What colour mood fits your business? Warm and earthy');
    expect(md).toContain('- In one sentence, what do you do? Geburtsvorbereitung mit Körper und Kopf.');
    expect(md).toContain('Address visitors with "du" on every page.');
    expect(md).toContain('360 px (small phone)');
    expect(md).toContain('1920 px (large screen)');
    // The examples are not content.
    expect(md).not.toContain('Graza: Colours');
  });

  it('B-keep: the measured colours and fonts, the logo and font files, the old content and photos', () => {
    const ctx = context({ funnel: 'B', brandKeep: true, existingUrl: 'bloommothers.de', pages: ['Die Methode', 'Kurse (change: kürzer)', 'Podcast (new)'] });
    expect(brandVariant(ctx, site)).toBe('B-keep');
    const md = assembleDesignPrompt({ context: ctx, proposal: 'A', reference, leads: { A: 'rivian', B: 'graza' }, creative: CREATIVE, site });
    expect(md).toContain('The client keeps their brand.');
    expect(md).toContain('Logo: assets/current-site/bb-logo.svg.');
    expect(md).toContain('Times Bloom 400 (cc-Times.woff2)');
    expect(md).toContain('### 8. Colour\nBloom site colour text.');
    expect(md).toContain('#### Prices\n**Price: Programm** (from https://x)\n249 €');
    expect(md).toContain('- Kurse (change: kürzer)');
    expect(md).toContain('- assets/current-site/aa-nina.jpg: Nina at work.');
    // Their brand wins over the colours they like elsewhere.
    expect(md).toContain('Their colours and fonts never replace the brand above.');
  });

  it('B-fresh: only the logo stays', () => {
    const ctx = context({ funnel: 'B', brandKeep: false, existingUrl: 'bloommothers.de' });
    expect(brandVariant(ctx, site)).toBe('B-fresh');
    const md = assembleDesignPrompt({ context: ctx, proposal: 'A', reference, leads: { A: 'rivian', B: null }, creative: CREATIVE, site });
    expect(md).toContain('The client wants a completely new look: new colours and new fonts. Keep only their logo (assets/current-site/bb-logo.svg).');
    expect(md).not.toContain('Bloom site colour text');
  });

  it('has no em or en dashes in its fixed blocks', () => {
    const md = assembleDesignPrompt({ context: context(), proposal: 'A', reference: null, leads: { A: null, B: null }, creative: CREATIVE, site: null });
    expect(md).not.toMatch(/[–—]/);
  });
});
