import type { SiteContent, SiteFact, PhotoNote } from './old-site-content';
import type { SiteRead } from './old-site-read';
import { specSections } from './reference-sources';

/**
 * The spec of a Form B client's current website, assembled in code from the read: its pages and
 * menu, its content word for word with the page each part came from, its brand (logo, colours and
 * fonts, from the design spec of the site), its photos and documents, and what could not be read.
 * Facts the check could not find on their page are listed as open points, never as content.
 */

const TOPIC_TITLES: [SiteFact['topic'][], string][] = [
  [['about'], 'About the business'],
  [['service', 'offer'], 'Services and offers'],
  [['price'], 'Prices'],
  [['process'], 'How it works'],
  [['team', 'qualification'], 'Team and qualifications'],
  [['testimonial'], 'Testimonials'],
  [['faq'], 'Questions and answers'],
  [['opening_hours', 'location', 'contact', 'social'], 'Opening hours, location and contact'],
  [['cta'], 'Calls to action'],
  [['other'], 'Other'],
];

const fileName = (path: string) => path.split('/').pop() ?? path;

export interface OwnSiteExtras {
  /** The address the files are found at in the design zip and the client's repository. */
  assetFolder?: string;
}

export function buildOwnSiteSpec(read: SiteRead, designSpec: string | null, extras: OwnSiteExtras = {}): string {
  const folder = extras.assetFolder ?? 'assets/current-site';
  const content = (read.content ?? { summary: '', facts: [], missing: [] }) as SiteContent;
  const photos = ((read.photos ?? []) as PhotoNote[]) ?? [];
  const domain = (() => {
    try {
      return new URL(read.url).hostname.replace(/^www\./, '');
    } catch {
      return read.url;
    }
  })();
  const out: string[] = [];
  out.push(`# Current website: ${domain}`);
  out.push(`Read on ${read.updated_at.slice(0, 10)} from ${read.url}. ${read.pages.length} pages, ${read.assets.length} files.`);
  if (content.summary) out.push('', content.summary);

  out.push('', '## 1. Pages and menu');
  if (read.found.menu.length) out.push('Menu, in order: ' + read.found.menu.map((m) => `"${m.text}"`).join(', ') + '.');
  for (const p of read.pages) out.push(`- ${p.title || p.url} (${p.url})${p.kind === 'legal' ? ', legal page' : ''}${p.via === 'browser' ? ', read in the browser' : ''}`);

  out.push('', '## 2. Content, word for word');
  out.push('Copied from the pages; each part names its page. Use it exactly as written.');
  const verified = content.facts.filter((f) => f.verified);
  for (const [topics, title] of TOPIC_TITLES) {
    const facts = verified.filter((f) => topics.includes(f.topic));
    if (!facts.length) continue;
    out.push('', `### ${title}`);
    for (const f of facts) out.push(`**${f.title}** (from ${f.page})`, f.text, '');
  }
  const open = content.facts.filter((f) => !f.verified);
  if (open.length || content.missing.length) {
    out.push('', '### Open points');
    out.push('Not confirmed on the site: show these as visible placeholders, never as content.');
    for (const f of open) out.push(`- [[OFFEN: ${f.title}]]`);
    for (const m of content.missing) out.push(`- [[OFFEN: ${m}]] (not on the current site)`);
  }

  out.push('', '## 3. Brand');
  const logos = read.assets.filter((a) => a.kind === 'image' && a.logo);
  out.push(logos.length ? `Logo files: ${logos.map((l) => `${folder}/${fileName(l.path)}`).join(', ')}.` : 'No logo file was found; ask the client for one.');
  const fonts = read.assets.filter((a) => a.kind === 'font');
  const families = [...new Set(fonts.map((f) => f.label))];
  if (families.length) {
    out.push(`Fonts the site serves itself: ${families.map((fam) => `${fam} (${fonts.filter((f) => f.label === fam).map((f) => `${f.weight ?? '400'}${f.style === 'italic' ? ' italic' : ''}`).join(', ')})`).join('; ')}. Files in ${folder}/fonts/.`);
  }
  if (read.found.googleFonts.length) out.push(`Google Fonts: ${read.found.googleFonts.join(', ')}.`);
  const brand = designSpec ? specSections(designSpec, [8, 9]) : '';
  out.push(brand ? `From the measured design of the site:\n\n${brand.replace(/^## /gm, '### ')}` : 'The colours and fonts could not be measured.');

  out.push('', '## 4. Photos');
  if (photos.length) {
    for (const p of photos) out.push(`- ${folder}/${fileName(p.path)}: ${p.description} (${p.subject}, ${p.quality} quality${p.people ? ', people' : ''}; fits: ${p.use})`);
  } else {
    const images = read.assets.filter((a) => a.kind === 'image' && !a.logo);
    out.push(images.length ? images.map((i) => `- ${folder}/${fileName(i.path)}${i.label ? `: ${i.label}` : ''}`).join('\n') : 'No photos were found.');
  }

  const pdfs = read.assets.filter((a) => a.kind === 'pdf');
  if (pdfs.length) {
    out.push('', '## 5. Documents');
    for (const d of pdfs) out.push(`- ${folder}/${fileName(d.path)}${d.label ? `: ${d.label}` : ''} (linked from ${d.page})`);
  }

  if (read.notes?.length) {
    out.push('', '## 6. Not read');
    for (const n of read.notes) out.push(`- ${n}`);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
