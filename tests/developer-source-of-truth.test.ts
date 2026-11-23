import { describe, expect, it } from 'vitest';
import type { PromptContext } from '@/lib/developer/context';
import { designPromptCheck, designPromptProblems, normalizeText, quotes, stripDashesOutsideQuotes } from '@/lib/developer/design-prompt-check';
import { decodeCloudflareEmail, htmlToText, revealCloudflareEmails } from '@/lib/developer/old-site';
import { brandVariant, currentWebsiteMd, hexColours, photoKey, sourceOfTruth, uniquePhotos, type SiteForTruth } from '@/lib/developer/source-of-truth';

const context = {
  client: { company: 'Bloom', contact: 'Nina', email: 'n@b.de', formLanguage: 'de' },
  quote: { package: 'Gold', addons: [] },
  sections: [
    {
      screen: 'design',
      title: 'Design',
      answers: [
        { key: 'brand_keep', question: 'Keep your logo and colours?', answer: 'Keep them' },
        { key: 'languages', question: 'Which languages should your site be in?', answer: 'German and English' },
      ],
    },
  ],
  referenceSites: [],
  clientReferences: [],
  referenceShots: [],
  examples: [],
  files: [],
  pages: ['Kurse (change: both courses side by side)', 'FAQ (new)'],
  status: 'confirmed',
  confirmedAt: null,
  funnel: 'B',
  existingUrl: 'https://www.bloommothers.de/',
  brandKeep: true,
} as PromptContext;

const photo = (path: string, quality: 'good' | 'ok' | 'poor' = 'good') => ({ path, description: `Photo ${path}`, subject: 'person' as const, quality, people: true, use: 'section' as const });

const site: SiteForTruth = {
  read: {
    url: 'https://www.bloommothers.de/',
    updated_at: '2026-11-19T08:00:00Z',
    pages: [
      { url: 'https://www.bloommothers.de', title: 'Bloom', text: '', kind: 'page', via: 'fetch' },
      { url: 'https://www.bloommothers.de/impressum', title: 'Impressum', text: '', kind: 'legal', via: 'fetch' },
    ],
    found: { lang: 'de', menu: [{ url: '/kurse', text: 'Kurse' }], assets: [], googleFonts: [] },
    assets: [
      { kind: 'image', url: 'x', path: 'lead/aaaaaaaaaaaa-logo.svg', bytes: 900, type: 'image/svg+xml', sha: '1', label: 'Bloom', page: '/', logo: true },
      { kind: 'image', url: 'x', path: 'lead/8eb3a3acc9e9-nina-143.jpg', bytes: 300_000, type: 'image/jpeg', sha: '2', label: '', page: '/' },
      { kind: 'image', url: 'x', path: 'lead/dac3dc756fc1-nina-143.webp', bytes: 90_000, type: 'image/webp', sha: '3', label: '', page: '/' },
      { kind: 'font', url: 'x', path: 'lead/fonts/bbbbbbbbbbbb-Times.woff2', bytes: 20_000, type: 'font/woff2', sha: '4', label: 'Times Bloom', page: '/', weight: '400' },
    ],
    content: {
      summary: 'Bloom sells online courses for pregnancy and after birth.',
      facts: [
        { topic: 'about', title: 'About', text: 'Bloom ist eine körperbasierte Lernplattform.', kind: 'text', page: 'https://www.bloommothers.de/', evidence: '', verified: true },
        { topic: 'testimonial', title: 'Testimonial', text: 'Bloom hat mir geholfen, mir selbst zu vertrauen.', kind: 'quote', page: 'https://www.bloommothers.de', evidence: '', verified: true },
        { topic: 'contact', title: 'Contact: Email', text: 'E-Mail: [email protected]', kind: 'text', page: 'https://www.bloommothers.de/impressum', evidence: '', verified: true },
        { topic: 'price', title: 'Price: Bundle', text: 'Kombipreis 600 €', kind: 'price', page: 'https://www.bloommothers.de', evidence: '', verified: false },
      ],
      missing: ['Opening hours'],
    },
    photos: [photo('lead/8eb3a3acc9e9-nina-143.jpg'), photo('lead/dac3dc756fc1-nina-143.webp'), photo('lead/cccccccccccc-blurry.jpg', 'poor')],
    notes: [],
  },
  designSpec: '# bloommothers.de: reference spec\n> Source: x\n\n## 8. Colour\n| Role | Hex |\n|---|---|\n| page background | #f6f1e7 |\n| primary text | #2c2a22 |',
};

describe('current-website.md', () => {
  const md = currentWebsiteMd(site);

  it('groups the checked content by page, word for word', () => {
    expect(md).toMatch(/### Bloom\nhttps:\/\/www\.bloommothers\.de\n- \(about\) Bloom ist eine körperbasierte Lernplattform\.\n- \(testimonial\) Bloom hat mir geholfen/);
  });

  it('never passes Cloudflare\'s "[email protected]" on as content, and lists unconfirmed facts as open', () => {
    expect(md).not.toContain('E-Mail: [email protected]');
    expect(md).toContain('- Contact: Email (hidden on the site)');
    expect(md).toContain('- Price: Bundle');
    expect(md).toContain('- Opening hours');
    expect(md).not.toContain('Kombipreis 600');
  });

  it('lists the brand files, each photo once (the larger file), no poor ones, and the measured design', () => {
    expect(md).toContain('- Logo: assets/current-site/aaaaaaaaaaaa-logo.svg');
    expect(md).toContain('- Font Times Bloom, served by the site itself, in assets/current-site/fonts/: 400 (bbbbbbbbbbbb-Times.woff2)');
    expect(md).toContain('assets/current-site/8eb3a3acc9e9-nina-143.jpg');
    expect(md).not.toContain('dac3dc756fc1-nina-143.webp');
    expect(md).not.toContain('blurry');
    expect(md).toContain('#### 8. Colour');
    expect(md).not.toContain('# bloommothers.de: reference spec');
  });
});

describe('the facts worked out in code', () => {
  it('knows a Form B client who keeps their brand, and says so above the files', () => {
    expect(brandVariant(context, site)).toBe('B-keep');
    expect(brandVariant({ ...context, brandKeep: false } as PromptContext, site)).toBe('B-fresh');
    expect(brandVariant({ ...context, funnel: 'A' } as PromptContext, null)).toBe('A');
    const { text, files } = sourceOfTruth({ context, proposal: 'A', reference: null, leads: { A: null, B: null }, site, internalNotes: '' });
    expect(files.map((f) => f.name)).toEqual(['onboarding.md', 'quote.md', 'current-website.md']);
    expect(text).toContain('- Brand: the client keeps their logo, colours and fonts');
    expect(text).toContain('- How the site addresses visitors: not answered in the form.');
    expect(text).toContain('- Languages of the new site: German and English.');
    expect(files[0].content).toContain('## Pages of the new site\nFrom the pages they keep, change and add:\n- Kurse (change: both courses side by side)\n- FAQ (new)');
  });
});

describe('photos and colours', () => {
  it('treats the same photo in another format or size as one', () => {
    expect(photoKey('lead/8eb3a3acc9e9-nina-143.jpg')).toBe('nina-143');
    expect(photoKey('lead/dac3dc756fc1-Nina-143-1024x683.webp')).toBe('nina-143');
    const bytes = new Map([
      ['a/8eb3a3acc9e9-x.jpg', 10],
      ['a/dac3dc756fc1-x.webp', 20],
    ]);
    expect(uniquePhotos([photo('a/8eb3a3acc9e9-x.jpg'), photo('a/dac3dc756fc1-x.webp')], bytes).map((p) => p.path)).toEqual(['a/dac3dc756fc1-x.webp']);
  });

  it('reads hex colours, short ones written out', () => {
    expect([...hexColours('Cream #F6F1E7, ink #222 and #2c2a22.')]).toEqual(['#f6f1e7', '#222222', '#2c2a22']);
  });
});

describe('the check of a written design prompt', () => {
  const truth = sourceOfTruth({ context, proposal: 'A', reference: null, leads: { A: null, B: null }, site, internalNotes: '' });
  const currentSite = truth.files.find((f) => f.name === 'current-website.md')!.content;
  const good = [
    '# Website design: Bloom, Proposal 1',
    '## The client',
    'Bloom sells online courses.',
    '## Brand (fixed)',
    'Logo assets/current-site/aaaaaaaaaaaa-logo.svg. Background #f6f1e7, text #2c2a22, white #ffffff.',
    'Font assets/current-site/fonts/bbbbbbbbbbbb-Times.woff2.',
    '## Direction',
    'Calm and editorial.',
    '## Pages',
    '### Startseite',
    '- "Bloom ist eine körperbasierte Lernplattform."',
    '- "Finde deinen Kurs" (new)',
    '## Photos',
    '- assets/current-site/8eb3a3acc9e9-nina-143.jpg: Nina',
    '## Rules',
    '- Content word for word.',
    '## Your freedom',
    'The layout.',
    '## Not designed yet',
    '- FAQ',
  ].join('\n');
  const check = (prompt: string) => designPromptProblems({ prompt, truth: truth.text, variant: truth.variant, currentSite });

  it('passes a prompt that keeps to the source of truth', () => {
    expect(check(good)).toEqual([]);
    expect(designPromptCheck({ prompt: good, truth: truth.text, variant: truth.variant, currentSite })).toBeNull();
  });

  it('finds missing sections, invented or translated quotes, unknown files and foreign colours', () => {
    const bad = good
      .replace('## Your freedom\nThe layout.\n', '')
      .replace('"Bloom ist eine körperbasierte Lernplattform."', '"Bloom is a body-based learning platform for women who want more."')
      .replace('8eb3a3acc9e9-nina-143.jpg', 'invented-photo.jpg')
      .replace('#2c2a22', '#a48b86');
    const problems = check(bad).join('\n');
    expect(problems).toContain('"## Your freedom"');
    expect(problems).toContain('"Bloom is a body-based learning platform for women who want more."');
    expect(problems).toContain('assets/current-site/invented-photo.jpg');
    expect(problems).toContain('#a48b86');
    expect(designPromptCheck({ prompt: bad, truth: truth.text, variant: truth.variant, currentSite })).toMatch(/^Fix these problems/);
  });

  it('accepts a quote whose dashes or punctuation differ, and short new wording', () => {
    expect(normalizeText('Bloom ergänzt sie — mit einem Weg.')).toBe(normalizeText('Bloom ergänzt sie, mit einem Weg'));
    expect(quotes('Say "Jetzt buchen" (new) and “Ich dachte” here.')).toEqual([
      { text: 'Jetzt buchen', marked: true },
      { text: 'Ich dachte', marked: false },
    ]);
  });

  it('finds a brief that is far too long', () => {
    expect(check(`${good}\n${'word '.repeat(4000)}`).join('\n')).toMatch(/Shorten it to under 3,000/);
  });

  it('takes dashes out of our own words only, never out of the client\'s quoted text', () => {
    expect(stripDashesOutsideQuotes('Calm — warm. "Bloom ergänzt sie — mit einem Weg."')).toBe('Calm, warm. "Bloom ergänzt sie — mit einem Weg."');
  });
});

describe('email addresses Cloudflare hides', () => {
  // "info@bloom.de", XOR-encoded with the key 0x42, as Cloudflare writes it.
  const hex = '42' + [...'info@bloom.de'].map((c) => (c.charCodeAt(0) ^ 0x42).toString(16).padStart(2, '0')).join('');

  it('decodes them, and refuses anything that is not an address', () => {
    expect(decodeCloudflareEmail(hex)).toBe('info@bloom.de');
    expect(decodeCloudflareEmail('zz')).toBeNull();
    expect(decodeCloudflareEmail('4243')).toBeNull();
  });

  it('writes them out again in the page text, in both of Cloudflare\'s forms', () => {
    const html = `<p>E-Mail: <a href="/cdn-cgi/l/email-protection" class="__cf_email__" data-cfemail="${hex}">[email&#160;protected]</a></p><p><a href="/cdn-cgi/l/email-protection#${hex}">[email&#160;protected]</a></p>`;
    expect(revealCloudflareEmails(html)).not.toContain('protected');
    expect(htmlToText(html)).toBe('E-Mail: info@bloom.de\ninfo@bloom.de');
  });
});
