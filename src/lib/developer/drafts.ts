import type { Proposal } from './messages';

/** Private bucket for uploaded Claude Design exports; files are served by /drafts, never directly. */
export const DESIGN_BUCKET = 'developer-designs';

const UMLAUTS: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', Ä: 'ae', Ö: 'oe', Ü: 'ue', ß: 'ss' };

/** "Müller Sanitär GmbH" becomes "mueller-sanitaer-gmbh": the client part of a draft link. */
export function slugify(text: string): string {
  const ascii = text
    .replace(/[äöüÄÖÜß]/g, (c) => UMLAUTS[c])
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!ascii) return 'client';
  if (ascii.length <= 40) return ascii;
  const cut = ascii.slice(0, 40);
  return cut.includes('-') ? cut.slice(0, cut.lastIndexOf('-')) : cut;
}

/**
 * The next iteration of a proposal and its link label: p1-i1, p1-i2, and p2-i1 on its own count.
 * People read it as "Proposal 1 · Iteration 2"; A and B stay the stored names.
 */
export function nextLabel(proposal: Proposal, existing: { proposal: Proposal; version: number }[]): { version: number; label: string } {
  const version = existing.filter((v) => v.proposal === proposal).reduce((max, v) => Math.max(max, v.version), 0) + 1;
  return { version, label: `p${proposal === 'A' ? 1 : 2}-i${version}` };
}

/** Labels of new uploads (p1-i2) and of the first ones (v1-a), so early links keep working. */
const LABEL = /^(?:p[12]-i\d{1,4}|v\d{1,4}-[ab])$/;
export const isLabel = (value: string) => LABEL.test(value);

/** "Proposal 1 · Iteration 2", or the German "Entwurf 1 · Iteration 2" on the client's page. */
export function versionName(proposal: Proposal, iteration: number, lang: 'de' | 'en' = 'en'): string {
  return `${lang === 'de' ? 'Entwurf' : 'Proposal'} ${proposal === 'A' ? 1 : 2} · Iteration ${iteration}`;
}

/**
 * Storage key of one file of an unpacked design. The path is hex-encoded so spaces, umlauts
 * and any other character a designer put into a file name are always a valid key.
 */
export function siteKey(leadId: string, versionId: string, path: string): string {
  return `${leadId}/${versionId}/site/${Buffer.from(path, 'utf8').toString('hex')}`;
}

const TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  json: 'application/json',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  mp4: 'video/mp4',
  webm: 'video/webm',
  pdf: 'application/pdf',
  txt: 'text/plain; charset=utf-8',
};

export function contentTypeFor(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return TYPES[ext] ?? 'application/octet-stream';
}

/** The public link to a design version, as it is sent to the client. */
export function draftPath(slug: string, label: string): string {
  return `/drafts/${slug}/${label}`;
}

/** Each path segment encoded, the slashes kept: for links to files like "Agentur Artz.dc.html". */
export function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}
