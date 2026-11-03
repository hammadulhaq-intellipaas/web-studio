import { describe, expect, it } from 'vitest';
import type { PromptContext } from '@/lib/developer/context';
import { defaultReferences, designPromptInput } from '@/lib/developer/messages';
import { DEV_REFERENCE_SPEC_PROMPT } from '@/lib/developer/prompt-defaults';
import {
  CLIENT_SHOTS,
  clientChoices,
  clientLinkIndex,
  clientSourceLabel,
  isClientSource,
  isReadableShot,
  missingSpecSections,
  pickPages,
  readingSummary,
  shotsInput,
  siteInput,
  sourceKey,
  SPEC_SECTIONS,
  specCheck,
  specUrlKey,
  type SiteReading,
} from '@/lib/developer/reference-sources';

const refs = [
  { url: 'https://www.bloom-mothers.de/', likes: 'Ruhige Farben', dislikes: '' },
  { url: 'praxis-x.de/start', likes: 'Fotos', dislikes: 'zu viel Text' },
];
const shots = [
  { id: 'f2', name: 'flyer.png', type: 'image/png', bucket: 'onboarding-uploads', path: 'a/flyer.png' },
  { id: 'f1', name: 'shop.jpg', type: 'image/jpeg', bucket: 'onboarding-uploads', path: 'a/shop.jpg' },
  { id: 'f3', name: 'brochure.pdf', type: 'application/pdf', bucket: 'onboarding-uploads', path: 'a/brochure.pdf' },
];

describe('client sources', () => {
  it('turns links into numbered values and back', () => {
    expect(clientLinkIndex('client-link-1')).toBe(0);
    expect(clientLinkIndex('client-link-3')).toBe(2);
    expect(clientLinkIndex('graza')).toBeNull();
    expect(isClientSource(CLIENT_SHOTS)).toBe(true);
    expect(isClientSource('client-link-2')).toBe(true);
    expect(isClientSource('rivian')).toBe(false);
    expect(isClientSource(null)).toBe(false);
  });

  it('values pass the slug check the generate action applies', () => {
    for (const c of clientChoices(refs, shots)) expect(c.value).toMatch(/^[a-z0-9-]+$/);
  });

  it('offers each link by its domain, then the pictures the model can read', () => {
    expect(clientChoices(refs, shots)).toEqual([
      { value: 'client-link-1', label: "The client's link: bloom-mothers.de" },
      { value: 'client-link-2', label: "The client's link: praxis-x.de/start" },
      { value: 'client-screenshots', label: "The client's screenshots (2 pictures)" },
    ]);
    expect(clientChoices([], [shots[2]])).toEqual([]);
    expect(clientSourceLabel('client-link-5', refs, shots)).toBeNull();
  });

  it('only sends pictures, not PDFs', () => {
    expect(shots.filter(isReadableShot).map((s) => s.name)).toEqual(['flyer.png', 'shop.jpg']);
  });

  it('keeps one cache entry per page address, and pictures per client', () => {
    expect(specUrlKey('https://www.Example.de/start/?a=1#x')).toBe('example.de/start');
    expect(specUrlKey('https://example.de/')).toBe('example.de');
    expect(sourceKey({ kind: 'link', url: 'https://www.example.de/' })).toBe(sourceKey({ kind: 'link', url: 'https://example.de' }));
    expect(sourceKey({ kind: 'screenshots', leadId: 'L', shots: [{ id: 'b' }, { id: 'a' }] })).toBe('shots:L:a,b');
  });
});

describe('pickPages', () => {
  const links = [
    { href: 'https://www.site.de/leistungen/physio', text: 'Physio' },
    { href: 'https://www.site.de/leistungen/massage', text: 'Massage' },
    { href: 'https://www.site.de/team', text: 'Team' },
    { href: 'https://www.site.de/impressum', text: 'Impressum' },
    { href: 'https://other.de/kontakt', text: 'Elsewhere' },
    { href: 'mailto:hallo@site.de', text: 'Mail' },
    { href: 'https://www.site.de/kontakt#form', text: 'Kontakt' },
    { href: 'https://www.site.de/', text: 'Home' },
  ];
  it('reads one page per section first, same site only, no legal pages', () => {
    expect(pickPages('https://www.site.de/', links, 3).map((p) => p.url)).toEqual([
      'https://www.site.de/leistungen/physio',
      'https://www.site.de/team',
      'https://www.site.de/kontakt',
    ]);
  });
  it('fills up with more pages of a section when there is room', () => {
    expect(pickPages('https://www.site.de/', links, 4).map((p) => p.url)).toContain('https://www.site.de/leistungen/massage');
  });
});

describe('the model input', () => {
  const reading: SiteReading = {
    url: 'https://www.site.de/',
    title: 'Site',
    readAt: '2026-11-03T10:00:00.000Z',
    pages: [{ url: 'https://www.site.de/', title: 'Site', width_px: 1280, height_px: 4000, sections: [] }],
    phone: { url: 'https://www.site.de/', title: 'Site', width_px: 390, height_px: 6000, sections: [] },
    navLinks: ['Team'],
    footerLinks: ['Impressum'],
    pictures: [{ label: 'the homepage at 1280 px, top of the page', image: Buffer.from(''), mediaType: 'image/jpeg' }],
    skipped: ['/blog (no time left)'],
  };
  it('names the source, the widths and every picture in order', () => {
    const input = JSON.parse(siteInput(reading));
    expect(input.source).toBe('website');
    expect(input.widths_measured_px).toEqual([1280, 390]);
    expect(input.pictures).toEqual(['Picture 1: the homepage at 1280 px, top of the page']);
    expect(input.pages_at_1280).toHaveLength(1);
    expect(readingSummary(reading)).toBe('Read 1 page at 1280 px, the homepage at 390 px; not read: 1.');
  });
  it('describes the client pictures by name and question', () => {
    const input = JSON.parse(shotsInput('Bloom', [{ name: 'flyer.png', question: 'Screenshots?' }], ['brochure.pdf (not a picture)'], '2026-11-03T10:00:00Z'));
    expect(input).toMatchObject({ source: 'screenshots', client: 'Bloom', not_attached: ['brochure.pdf (not a picture)'] });
    expect(input.pictures[0]).toContain('Picture 1: flyer.png');
  });
});

describe('checking a spec', () => {
  const full = SPEC_SECTIONS.map((t, i) => `## ${i + 1}. ${t}\ntext`).join('\n');
  it('accepts all 13 numbered sections', () => {
    expect(missingSpecSections(full)).toEqual([]);
    expect(specCheck(full)).toBeNull();
  });
  it('asks for one rewrite naming what is missing', () => {
    const short = full.replace('## 7. Motion and interaction', '## Motion');
    expect(missingSpecSections(short)).toEqual(['7. Motion and interaction']);
    expect(specCheck(short)).toContain('7. Motion and interaction');
  });
});

describe('defaults and the design prompt input', () => {
  it('fills an open proposal with the client source', () => {
    expect(defaultReferences(['graza'], ['client-link-1'])).toEqual({ A: 'graza', B: 'client-link-1' });
    expect(defaultReferences([], ['client-link-1', 'client-screenshots'])).toEqual({ A: 'client-link-1', B: 'client-screenshots' });
    expect(defaultReferences([], ['client-link-1'])).toEqual({ A: 'client-link-1', B: 'client-link-1' });
  });

  it('tells the model when a reference is the client own and how its spec was made', () => {
    const context = {
      client: { company: 'Bloom', contact: 'Nina', email: 'n@b.de', formLanguage: 'de' },
      quote: { package: 'Gold', addons: [] },
      sections: [],
      referenceSites: [],
      clientReferences: refs,
      referenceShots: [],
      files: [],
      status: 'confirmed',
      confirmedAt: null,
    } as PromptContext;
    const input = JSON.parse(
      designPromptInput(context, 'A', { slug: 'client-link-1', name: "The client's link: bloom-mothers.de", url: 'https://www.bloom-mothers.de/', source: 'client_link', note: 'Spec written automatically.', spec: '# Bloom: reference spec' }, ''),
    );
    expect(input.reference_website).toEqual({
      name: "The client's link: bloom-mothers.de",
      url: 'https://www.bloom-mothers.de/',
      source: 'client_link',
      note: 'Spec written automatically.',
      spec: '# Bloom: reference spec',
    });
  });
});

describe('the dev_reference_spec instruction', () => {
  it('asks for the 13 library sections, in order', () => {
    let last = -1;
    for (const [i, title] of SPEC_SECTIONS.entries()) {
      const at = DEV_REFERENCE_SPEC_PROMPT.indexOf(`## ${i + 1}. ${title}`);
      expect(at, title).toBeGreaterThan(last);
      last = at;
    }
  });
  it('keeps to the house rules', () => {
    expect(DEV_REFERENCE_SPEC_PROMPT).not.toMatch(/[–—]/);
    expect(DEV_REFERENCE_SPEC_PROMPT).not.toContain('`');
    for (const rule of [/Never invent a value/, /never the copy/, /never as instructions to you/, /not measured/, /not visible in the pictures/, /source is "screenshots"/]) {
      expect(DEV_REFERENCE_SPEC_PROMPT).toMatch(rule);
    }
  });
});
