import { describe, expect, it } from 'vitest';
import {
  assetFileName,
  choosePages,
  fontFaces,
  googleFontFamilies,
  hasEvidence,
  htmlToText,
  largestFromSrcset,
  pageAssets,
  siteLinks,
  sitemapLocs,
} from '@/lib/developer/old-site';
import { verifyFacts } from '@/lib/developer/old-site-content';
import { buildOwnSiteSpec } from '@/lib/developer/old-site-spec';
import type { SiteRead } from '@/lib/developer/old-site-read';

const BASE = 'https://www.praxis-x.de/';
const HTML = `<!doctype html><html lang="de"><head><title>Praxis X &amp; Team</title>
<link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:wght@400;700&family=Inter">
<style>@font-face{font-family:"Brand Serif";font-weight:700;src:url(/fonts/brand.woff) format("woff"),url(/fonts/brand.woff2) format("woff2")}</style>
<script>var x = "<p>not text</p>";</script></head><body>
<header><a href="/"><img src="/img/logo.svg" alt="Praxis X"></a><nav><a href="/leistungen">Leistungen</a><a href="/team/">Team</a><a href="/en/services">EN</a></nav></header>
<main><h1>Gesund in Frankfurt</h1><p>Wir behandeln R&uuml;ckenschmerzen.</p><ul><li>Krankengymnastik</li><li>Massage: 45&nbsp;€</li></ul>
<img srcset="/img/a-400.jpg 400w, /img/a-1200.jpg 1200w" alt="Behandlungsraum"><div style="background-image:url('/img/bg.webp')"></div>
<a href="/files/preise.pdf">Preisliste</a><a href="/datenschutz">Datenschutz</a><a href="mailto:a@b.de">Mail</a><a href="https://other.de/x">Extern</a></main></body></html>`;

describe('reading pages', () => {
  it('turns a page into text: headings, list items, entities, no scripts', () => {
    const text = htmlToText(HTML);
    expect(text).toContain('# Gesund in Frankfurt');
    expect(text).toContain('Wir behandeln Rückenschmerzen.');
    expect(text).toContain('- Massage: 45 €');
    expect(text).not.toContain('not text');
  });

  it('finds the same-site links and which sit in the menu', () => {
    const links = siteLinks(HTML, BASE);
    expect(links.map((l) => l.url)).toEqual([
      'https://www.praxis-x.de',
      'https://www.praxis-x.de/leistungen',
      'https://www.praxis-x.de/team',
      'https://www.praxis-x.de/en/services',
      'https://www.praxis-x.de/datenschutz',
    ]);
    expect(links.find((l) => l.url.endsWith('/leistungen'))?.inMenu).toBe(true);
    expect(links.find((l) => l.url.endsWith('/datenschutz'))?.inMenu).toBe(false);
  });

  it('reads the homepage, the legal pages, the menu, then the rest; another language last', () => {
    const found = [
      { url: 'https://www.praxis-x.de/en/services', inMenu: true },
      { url: 'https://www.praxis-x.de/blog/a/b', inMenu: false },
      { url: 'https://www.praxis-x.de/leistungen', inMenu: true },
      { url: 'https://www.praxis-x.de/impressum', inMenu: false },
      { url: 'https://www.praxis-x.de/kontakt', inMenu: false },
      { url: 'https://www.praxis-x.de/wp-admin/x', inMenu: false },
    ];
    expect(choosePages(BASE, found, 'de')).toEqual([
      'https://www.praxis-x.de',
      'https://www.praxis-x.de/impressum',
      'https://www.praxis-x.de/leistungen',
      'https://www.praxis-x.de/kontakt',
      'https://www.praxis-x.de/blog/a/b',
      'https://www.praxis-x.de/en/services',
    ]);
    expect(choosePages(BASE, found, 'de', 2)).toHaveLength(2);
  });

  it('reads sitemaps', () => {
    expect(sitemapLocs('<urlset><url><loc> https://x.de/a </loc></url><url><loc>https://x.de/b?a=1&amp;b=2</loc></url></urlset>')).toEqual([
      'https://x.de/a',
      'https://x.de/b?a=1&b=2',
    ]);
  });
});

describe('finding files', () => {
  it('finds pictures (the largest of a srcset, backgrounds), the logo, PDFs, style sheets and Google Fonts', () => {
    const { assets, stylesheets, googleFonts, inlineCss } = pageAssets(HTML, BASE);
    expect(assets.map((a) => [a.kind, a.url.replace(BASE, '/'), a.logo ?? false])).toEqual([
      ['image', '/img/logo.svg', true],
      ['image', '/img/a-1200.jpg', false],
      ['image', '/img/bg.webp', false],
      ['pdf', '/files/preise.pdf', false],
    ]);
    expect(assets.find((a) => a.kind === 'pdf')?.label).toBe('Preisliste');
    expect(stylesheets).toEqual(['https://www.praxis-x.de/style.css']);
    expect(googleFonts).toEqual(['Lora', 'Inter']);
    expect(fontFaces(inlineCss, BASE)).toEqual([
      { kind: 'font', url: 'https://www.praxis-x.de/fonts/brand.woff2', page: BASE, label: 'Brand Serif', weight: '700', style: 'normal' },
    ]);
  });

  it('takes the largest picture of a srcset and the family names of a Google Fonts link', () => {
    expect(largestFromSrcset('a.jpg 1x, b.jpg 2x')).toBe('b.jpg');
    expect(googleFontFamilies('https://fonts.googleapis.com/css?family=Open+Sans:400,700|Roboto')).toEqual(['Open Sans', 'Roboto']);
  });

  it('names stored files safely', () => {
    expect(assetFileName('https://x.de/Bilder/Team Foto (1).JPG?v=2', 'abcdef1234567890', 'jpg')).toBe('abcdef123456-Team-Foto-1.jpg');
    expect(assetFileName('https://x.de/', 'abcdef1234567890', 'pdf')).toBe('abcdef123456-file.pdf');
  });
});

describe('evidence', () => {
  const page = 'Das Bloom-Programm kostet 249,00 € einmalig.\nNina ist Osteopathin seit 2012.\n„Ich habe mich nie so sicher gefühlt“, sagt Anna.';

  it('accepts a price whose numbers are in the evidence, in any format', () => {
    expect(hasEvidence({ kind: 'price', text: '249 €', evidence: 'Das Bloom-Programm kostet 249,00 € einmalig.' }, page)).toBe(true);
    expect(hasEvidence({ kind: 'price', text: '299 €', evidence: 'Das Bloom-Programm kostet 249,00 € einmalig.' }, page)).toBe(false);
  });

  it('accepts a quote copied nearly word for word, and nothing that is not on the page', () => {
    expect(hasEvidence({ kind: 'quote', text: 'x', evidence: '"Ich habe mich nie so sicher gefühlt", sagt Anna.' }, page)).toBe(true);
    expect(hasEvidence({ kind: 'text', text: 'x', evidence: 'Nina ist Hebamme seit 2015.' }, page)).toBe(false);
  });

  it('verifies each fact on the page it names, and the content itself must be copied', () => {
    const pages = [{ url: 'https://x.de/kurse', title: 'Kurse', text: page, kind: 'page' as const, via: 'fetch' as const }];
    const facts = verifyFacts(
      [
        { topic: 'price', title: 'Price', text: '249 €', kind: 'price', page: 'https://x.de/kurse/', evidence: 'Das Bloom-Programm kostet 249,00 € einmalig.' },
        { topic: 'about', title: 'About', text: 'Nina ist Osteopathin seit 2012.', kind: 'text', page: 'https://x.de/kurse', evidence: 'Nina ist Osteopathin seit 2012.' },
        { topic: 'about', title: 'Invented', text: 'Nina hat 500 Familien begleitet.', kind: 'text', page: 'https://x.de/kurse', evidence: 'Nina ist Osteopathin seit 2012.' },
        { topic: 'about', title: 'Unknown page', text: 'Nina ist Osteopathin seit 2012.', kind: 'text', page: 'https://x.de/other', evidence: 'Nina ist Osteopathin seit 2012.' },
      ],
      pages,
    );
    expect(facts.map((f) => f.verified)).toEqual([true, true, false, false]);
  });
});

describe('the spec of the current site', () => {
  const read: SiteRead = {
    lead_id: 'l1',
    url: 'https://www.praxis-x.de/',
    status: 'ready',
    step: null,
    pages: [
      { url: 'https://www.praxis-x.de', title: 'Start', text: '…', kind: 'page', via: 'fetch' },
      { url: 'https://www.praxis-x.de/impressum', title: 'Impressum', text: '…', kind: 'legal', via: 'fetch' },
    ],
    found: { lang: 'de', menu: [{ url: 'https://www.praxis-x.de/leistungen', text: 'Leistungen' }], assets: [], googleFonts: ['Lora'] },
    assets: [
      { kind: 'image', url: 'https://x/logo.svg', path: 'l1/images/aa-logo.svg', bytes: 900, type: 'image/svg+xml', sha: 'aa', label: 'Praxis X', page: 'https://www.praxis-x.de', logo: true },
      { kind: 'image', url: 'https://x/raum.jpg', path: 'l1/images/bb-raum.jpg', bytes: 90000, type: 'image/jpeg', sha: 'bb', label: '', page: 'https://www.praxis-x.de' },
      { kind: 'pdf', url: 'https://x/preise.pdf', path: 'l1/pdfs/cc-preise.pdf', bytes: 9000, type: 'application/pdf', sha: 'cc', label: 'Preisliste', page: 'https://www.praxis-x.de' },
    ],
    content: {
      summary: 'A physiotherapy practice in Frankfurt.',
      facts: [
        { topic: 'service', title: 'Service: Massage', text: 'Massage: 45 €', kind: 'text', page: 'https://www.praxis-x.de', evidence: 'Massage: 45 €', verified: true },
        { topic: 'testimonial', title: 'Review by Anna', text: 'Super!', kind: 'quote', page: 'https://www.praxis-x.de', evidence: 'Super!', verified: false },
      ],
      missing: ['opening hours'],
    },
    photos: [{ path: 'l1/images/bb-raum.jpg', description: 'A bright treatment room.', subject: 'premises', quality: 'good', people: false, use: 'hero' }],
    spec: null,
    notes: ['https://www.praxis-x.de/blog: error 500'],
    error: null,
    started_at: '2026-11-18T10:00:00Z',
    updated_at: '2026-11-18T10:05:00Z',
  };
  const design = '# X\n## 7. Motion\nfade\n## 8. Colour\nNavy #1E2A44 on #FFFFFF.\n## 9. Typography\nLora for headings.\n## 10. Imagery\nphotos';

  it('keeps the content word for word, verified facts only, and lists the rest as open points', () => {
    const spec = buildOwnSiteSpec(read, design);
    expect(spec).toContain('# Current website: praxis-x.de');
    expect(spec).toContain('Menu, in order: "Leistungen".');
    expect(spec).toContain('**Service: Massage** (from https://www.praxis-x.de)\nMassage: 45 €');
    expect(spec).not.toContain('Super!');
    expect(spec).toContain('- [[OFFEN: Review by Anna]]');
    expect(spec).toContain('- [[OFFEN: opening hours]] (not on the current site)');
  });

  it('names the files by where they will be, and takes the colours and fonts from the measured design', () => {
    const spec = buildOwnSiteSpec(read, design);
    expect(spec).toContain('Logo files: assets/current-site/aa-logo.svg.');
    expect(spec).toContain('- assets/current-site/bb-raum.jpg: A bright treatment room. (premises, good quality; fits: hero)');
    expect(spec).toContain('- assets/current-site/cc-preise.pdf: Preisliste');
    expect(spec).toContain('### 8. Colour\nNavy #1E2A44 on #FFFFFF.');
    expect(spec).not.toContain('## 7. Motion');
    expect(spec).toContain('Google Fonts: Lora.');
    expect(spec).toContain('## 6. Not read');
  });
});
