/**
 * The client's own references, next to our library of 11 reference websites: the links they gave
 * in the form ("references", up to 3) and the pictures they uploaded ("reference_screenshots").
 * When a proposal follows one of them, a reference spec is written on the spot, in the same 13
 * sections as the library specs (docs/reference-specs), and goes into the design prompt.
 *
 * Plain helpers only, no server code, so they are easy to test.
 */
import type { ChosenExample } from '@/lib/onboarding/examples';

/** One link from the form's "Reference websites" question. */
export interface ClientReference {
  url: string;
  likes: string;
  dislikes: string;
}

/** One picture from the form's "Screenshots of what you like" question. */
export interface ClientShot {
  id: string;
  name: string;
  type: string;
  bucket: string;
  path: string;
}

/** Choice values next to the library slugs; they match the same /^[a-z0-9-]+$/ check. */
export const CLIENT_SHOTS = 'client-screenshots';
export const clientLinkValue = (index: number) => `client-link-${index + 1}`;
const LINK_VALUE = /^client-link-([1-9])$/;

export function clientLinkIndex(value: string | null): number | null {
  const m = value ? LINK_VALUE.exec(value) : null;
  return m ? Number(m[1]) - 1 : null;
}
export const isClientSource = (value: string | null) => value === CLIENT_SHOTS || clientLinkIndex(value) !== null;

/** Pictures the model can look at. PDFs and other files are listed but not sent. */
export const SHOT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const SHOT_MAX_BYTES = 8 * 1024 * 1024;
export const SHOT_MAX_COUNT = 8;
export const isReadableShot = (s: Pick<ClientShot, 'type'>) => SHOT_TYPES.includes(s.type.toLowerCase());

/** "https://www.Example.de/start/?a=1#x" → "example.de/start": one cache entry per page address. */
export function specUrlKey(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, '');
    return `${u.hostname.toLowerCase().replace(/^www\./, '')}${path}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

/** The domain as the team reads it: "https://www.example.de/start" → "example.de". */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** What the cache stores a spec under: a website for everyone, a client's pictures for that client. */
export function sourceKey(source: { kind: 'link'; url: string } | { kind: 'screenshots'; leadId: string; shots: Pick<ClientShot, 'id'>[] }): string {
  if (source.kind === 'link') return `link:${specUrlKey(source.url)}`;
  return `shots:${source.leadId}:${source.shots.map((s) => s.id).sort().join(',')}`;
}

/** How a client source reads in the dropdown and above a proposal. */
export function clientSourceLabel(value: string, refs: ClientReference[], shots: ClientShot[]): string | null {
  if (value === CLIENT_SHOTS) {
    const n = shots.filter(isReadableShot).length;
    return n ? `The client's screenshots (${n} ${n === 1 ? 'picture' : 'pictures'})` : null;
  }
  const i = clientLinkIndex(value);
  const ref = i === null ? undefined : refs[i];
  return ref ? `The client's link: ${domainOf(ref.url)}` : null;
}

/**
 * The client's design examples from the form (see src/lib/onboarding/examples.ts) as Design tab
 * choices, in the form's order: a gallery site is its slug, a link `client-link-N`, the pictures
 * `client-screenshots`. Proposal 1 starts on the first, Proposal 2 on the second.
 */
export function exampleChoices(examples: ChosenExample[]): string[] {
  return examples.map((e) => (e.kind === 'library' ? e.value : e.kind === 'link' ? clientLinkValue(e.index) : CLIENT_SHOTS));
}

/** The client's own sources as dropdown choices: each link, then the pictures if there are any. */
export function clientChoices(refs: ClientReference[], shots: ClientShot[]): { value: string; label: string }[] {
  const out = refs.map((r, i) => ({ value: clientLinkValue(i), label: `The client's link: ${domainOf(r.url)}` }));
  const label = clientSourceLabel(CLIENT_SHOTS, refs, shots);
  if (label) out.push({ value: CLIENT_SHOTS, label });
  return out;
}

/* ------------------------------------------------------------------ reading a site */

/** Pages a layout spec has no use for. */
const SKIP_PAGE = /(cart|basket|checkout|account|login|log-in|signin|sign-in|register|wishlist|privacy|datenschutz|impressum|imprint|terms|cookie|legal|agb|accessibility|sitemap|search|mailto:|tel:|\.pdf$|\.jpe?g$|\.png$)/i;

/**
 * Which pages to read after the homepage: same site only, no legal or shop pages, one page per
 * top-level section first (/services, /about, /contact), header links before footer links.
 */
export function pickPages(home: string, links: { href: string; text: string }[], max: number): { url: string; text: string }[] {
  let host: string;
  try {
    host = new URL(home).hostname.replace(/^www\./, '');
  } catch {
    return [];
  }
  const clean = (href: string) => {
    try {
      const u = new URL(href);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
      if (u.hostname.replace(/^www\./, '') !== host) return null;
      u.hash = '';
      u.search = '';
      const s = u.toString().replace(/\/$/, '');
      return SKIP_PAGE.test(s) ? null : s;
    } catch {
      return null;
    }
  };
  const seen = new Set([clean(home) ?? home.replace(/\/$/, '')]);
  const candidates: { url: string; text: string }[] = [];
  for (const l of links) {
    const url = clean(l.href);
    if (url && !seen.has(url)) {
      seen.add(url);
      candidates.push({ url, text: l.text });
    }
  }
  const section = (u: string) => new URL(u).pathname.split('/').filter(Boolean)[0] ?? '';
  const out: { url: string; text: string }[] = [];
  const used = new Set<string>();
  for (const c of candidates) {
    if (out.length >= max) break;
    if (!used.has(section(c.url))) {
      used.add(section(c.url));
      out.push(c);
    }
  }
  for (const c of candidates) {
    if (out.length >= max) break;
    if (!out.includes(c)) out.push(c);
  }
  return out;
}

/** One page as the measuring script returns it (site-measure.ts). */
export type PageMeasure = Record<string, unknown> & { url: string; title: string; width_px: number; height_px: number; sections?: unknown[] };

export interface SiteReading {
  url: string;
  title: string;
  readAt: string;
  /** The homepage first, then the other pages, all at 1280 px. */
  pages: PageMeasure[];
  /** The homepage at 390 px, when it could be read. */
  phone: PageMeasure | null;
  navLinks: string[];
  footerLinks: string[];
  /** Pictures for the model, in the order of `pictureLabels`. */
  pictures: { label: string; image: Buffer; mediaType: string }[];
  /** Pages that could not be read, with the reason. */
  skipped: string[];
}

/** One line the Design tab shows under a spec: what it was made from. */
export function readingSummary(r: Pick<SiteReading, 'pages' | 'phone' | 'skipped'>): string {
  const pages = `${r.pages.length} ${r.pages.length === 1 ? 'page' : 'pages'} at 1280 px`;
  const phone = r.phone ? ', the homepage at 390 px' : '';
  const skipped = r.skipped.length ? `; not read: ${r.skipped.length}` : '';
  return `Read ${pages}${phone}${skipped}.`;
}

/**
 * The model's input for a website: the measurements as compact JSON. Units are in the key names
 * (height_px, width_pct), so the model never has to guess them.
 */
export function siteInput(r: SiteReading): string {
  const page = (p: PageMeasure) => {
    const { url, title, ...rest } = p;
    return { url, title, ...rest };
  };
  return JSON.stringify(
    {
      source: 'website',
      url: r.url,
      title: r.title,
      read_at: r.readAt.slice(0, 10),
      widths_measured_px: r.phone ? [1280, 390] : [1280],
      navigation_links: r.navLinks.slice(0, 20),
      footer_links: r.footerLinks.slice(0, 30),
      pages_at_1280: r.pages.map(page),
      homepage_at_390: r.phone ? page(r.phone) : null,
      pictures: r.pictures.map((p, i) => `Picture ${i + 1}: ${p.label}`),
    },
    null,
    1,
  );
}

/** The model's input for the client's pictures: what each one is, in the order they are attached. */
export function shotsInput(company: string, shots: { name: string; question: string }[], skipped: string[], readAt: string): string {
  return JSON.stringify(
    {
      source: 'screenshots',
      client: company,
      read_at: readAt.slice(0, 10),
      pictures: shots.map((s, i) => `Picture ${i + 1}: ${s.name} (the client's answer to "${s.question}")`),
      not_attached: skipped,
    },
    null,
    1,
  );
}

/* ------------------------------------------------------------------ checking a spec */

export const SPEC_SECTIONS = [
  'Overview',
  'Pages and navigation',
  'Header',
  'Footer',
  'Page layouts',
  'Responsive behaviour',
  'Motion and interaction',
  'Colour',
  'Typography',
  'Imagery and icons',
  'Components',
  'Section skeletons',
  "Dos and don'ts",
];

/** The numbered sections ("## 7. Motion and interaction") the spec is missing. */
export function missingSpecSections(md: string): string[] {
  return SPEC_SECTIONS.map((title, i) => ({ title, n: i + 1 }))
    .filter(({ n }) => !new RegExp(`^##\\s+${n}\\.\\s`, 'm').test(md))
    .map(({ title, n }) => `${n}. ${title}`);
}

/** Asks for one rewrite when sections are missing. */
export function specCheck(md: string): string | null {
  const missing = missingSpecSections(md);
  return missing.length
    ? `Your spec is missing these sections: ${missing.join(', ')}. Rewrite the whole spec with all 13 numbered sections, in the order and with the headings the instructions give. Where the data shows nothing for a section, say so in one line.`
    : null;
}
