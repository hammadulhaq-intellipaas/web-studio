import { SUPABASE_URL } from '@/lib/supabase/env';

/**
 * The showcase: websites we have built, each shown as a card with a screenshot taken from
 * the site's link, the owner's photo, name, professional title and a line of review. Edited
 * on /admin/showcase. Nothing here is server-only, so the card and the editor use the same
 * rules as the save action.
 */

export const SHOWCASE_MIGRATIONS = ['20261101000026_showcase.sql', '20261101000027_showcase_simpler.sql'] as const;
/** Public bucket: the cards load the images straight from storage. */
export const SHOWCASE_BUCKET = 'showcase';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES: Record<string, 'jpg' | 'png' | 'webp'> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
/** Where an image lands (uploaded or a screenshot); a saved entry only ever points at a path like this. */
export const UPLOAD_PATH = /^uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

/** A sentence or two: the card is a glance, not a case study. */
export const QUOTE_MAX = 240;
export const LINE_MAX = 120;

export interface ShowcaseItem {
  id: string;
  site_url: string;
  /** Filled in from the site when the screenshot is taken; the team can correct it. */
  business_name: string;
  owner_name: string;
  owner_title: string;
  /** The owner's review, shown as written on the German and the English page. */
  quote: string;
  /** Optional: without a photo the card shows the owner's initials. */
  photo_path: string | null;
  screenshot_path: string | null;
  screenshot_at: string | null;
  /** yyyy-mm-dd: the day the team recorded the owner's agreement to being shown. */
  consent_at: string | null;
  consent_by: string | null;
  published: boolean;
  sort: number;
  updated_at: string | null;
  updated_by: string | null;
}

/** The fields the editor sends; the order, who agreed and the timestamps are set by the server. */
export type ShowcaseInput = Pick<
  ShowcaseItem,
  'site_url' | 'business_name' | 'owner_name' | 'owner_title' | 'quote' | 'photo_path' | 'screenshot_path' | 'screenshot_at' | 'consent_at' | 'published'
>;

export const EMPTY_SHOWCASE_INPUT: ShowcaseInput = {
  site_url: '',
  business_name: '',
  owner_name: '',
  owner_title: '',
  quote: '',
  photo_path: null,
  screenshot_path: null,
  screenshot_at: null,
  consent_at: null,
  published: false,
};

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * "praxis-x.de" → "https://praxis-x.de/". Anything that is not a public web address → null:
 * the screenshot browser opens this address on our server, so no IPs and no internal names.
 */
export function normalizeSiteUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/+/, '')}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (!host.includes('.') || host.startsWith('[') || IPV4.test(host)) return null;
    if (/(^|\.)(localhost|local|internal|lan|home\.arpa)$/.test(host)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** The domain as the card shows it: "https://www.praxis-x.de/start" → "praxis-x.de". */
export function siteDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

const GENERIC_TITLE = /^(home|homepage|start|startseite|willkommen|welcome)$/i;

/**
 * The business name from the site itself: its og:site_name, else the page title's first part
 * ("Praxis X – Physiotherapie" or "Praxis X: Physiotherapie" → "Praxis X"), or the next part
 * when the first is just "Home".
 */
export function siteNameFrom(title: string, ogSiteName: string): string {
  const fromOg = ogSiteName.trim();
  if (fromOg) return fromOg.slice(0, LINE_MAX);
  const parts = title
    .split(/\s+[|–—·•:-]\s+|:\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const name = parts.find((p) => !GENERIC_TITLE.test(p)) ?? parts[0] ?? '';
  return name.slice(0, LINE_MAX);
}

export function publicImageUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${SHOWCASE_BUCKET}/${path}`;
}

/** What an entry still needs before it can be published; empty when it is ready. */
export function missingForPublish(item: ShowcaseInput): string[] {
  const missing: string[] = [];
  if (!normalizeSiteUrl(item.site_url)) missing.push('website link');
  if (!item.screenshot_path) missing.push('screenshot');
  if (!item.owner_name.trim()) missing.push("owner's name");
  if (!item.owner_title.trim()) missing.push('professional title');
  if (!item.quote.trim()) missing.push('review');
  if (!item.consent_at) missing.push("the owner's agreement");
  return missing;
}

const clip = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const imagePath = (value: unknown) => (typeof value === 'string' && UPLOAD_PATH.test(value) ? value : null);

/**
 * Cleans what the editor sent. A draft may be incomplete; publishing needs everything in
 * `missingForPublish`, which the database checks again.
 */
export function parseShowcaseInput(raw: Record<string, unknown>): { ok: true; value: ShowcaseInput } | { ok: false; error: string } {
  const siteRaw = clip(raw.site_url, 300);
  const site = siteRaw ? normalizeSiteUrl(siteRaw) : '';
  if (site === null) return { ok: false, error: 'The website link does not look right. Example: praxis-x.de' };
  const consent = clip(raw.consent_at, 10);
  if (consent && !/^\d{4}-\d{2}-\d{2}$/.test(consent)) return { ok: false, error: 'The agreement date is not a date.' };
  const takenAt = clip(raw.screenshot_at, 40);
  const screenshot = imagePath(raw.screenshot_path);

  const value: ShowcaseInput = {
    site_url: site,
    business_name: clip(raw.business_name, LINE_MAX),
    owner_name: clip(raw.owner_name, LINE_MAX),
    owner_title: clip(raw.owner_title, LINE_MAX),
    quote: clip(raw.quote, QUOTE_MAX),
    photo_path: imagePath(raw.photo_path),
    screenshot_path: screenshot,
    screenshot_at: screenshot && takenAt && !Number.isNaN(Date.parse(takenAt)) ? new Date(takenAt).toISOString() : null,
    consent_at: consent || null,
    published: raw.published === true,
  };
  if (value.published) {
    const missing = missingForPublish(value);
    if (missing.length) return { ok: false, error: `To publish, add: ${missing.join(', ')}.` };
  }
  return { ok: true, value };
}
