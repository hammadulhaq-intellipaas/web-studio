import { SUPABASE_URL } from '@/lib/supabase/env';
import type { Locale } from '@/lib/types';

/**
 * The showcase: websites we have built, each shown as a card with a screenshot, the owner's
 * photo, name, professional title and a line of review. Edited on /admin/showcase. Nothing
 * here is server-only, so the card and the editor use the same rules as the save action.
 */

export const SHOWCASE_MIGRATION = '20261101000026_showcase.sql';
/** Public bucket: the cards load the images straight from storage. */
export const SHOWCASE_BUCKET = 'showcase';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES: Record<string, 'jpg' | 'png' | 'webp'> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
/** Where an uploaded image lands; a saved entry only ever points at a path like this. */
export const UPLOAD_PATH = /^uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

/** A sentence or two: the card is a glance, not a case study. */
export const QUOTE_MAX = 240;
export const LINE_MAX = 120;
const NOTE_MAX = 500;

export interface ShowcaseItem {
  id: string;
  owner_name: string;
  owner_title_de: string;
  owner_title_en: string;
  business_name: string;
  about_de: string;
  about_en: string;
  quote_de: string;
  quote_en: string;
  site_url: string;
  photo_path: string | null;
  screenshot_path: string | null;
  /** yyyy-mm-dd: the day the owner agreed to being shown. */
  consent_at: string | null;
  consent_note: string;
  published: boolean;
  sort: number;
  updated_at: string | null;
  updated_by: string | null;
}

/** The fields the editor sends; everything else is set by the server. */
export type ShowcaseInput = Omit<ShowcaseItem, 'id' | 'updated_at' | 'updated_by'>;

export const EMPTY_SHOWCASE_INPUT: ShowcaseInput = {
  owner_name: '',
  owner_title_de: '',
  owner_title_en: '',
  business_name: '',
  about_de: '',
  about_en: '',
  quote_de: '',
  quote_en: '',
  site_url: '',
  photo_path: null,
  screenshot_path: null,
  consent_at: null,
  consent_note: '',
  published: false,
  sort: 0,
};

/** "praxis-x.de" → "https://praxis-x.de". Anything that is not a web address → null. */
export function normalizeSiteUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!url.hostname.includes('.')) return null;
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

export function publicImageUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${SHOWCASE_BUCKET}/${path}`;
}

/** Text in the visitor's language, or the other language when that one is empty. */
export function inLocale(de: string, en: string, locale: Locale): string {
  return (locale === 'en' ? en || de : de || en).trim();
}

/** What an entry still needs before it can be published; empty when it is ready. */
export function missingForPublish(item: ShowcaseInput): string[] {
  const missing: string[] = [];
  if (!normalizeSiteUrl(item.site_url)) missing.push('website address');
  if (!item.owner_name.trim()) missing.push("owner's name");
  if (!item.owner_title_de.trim() && !item.owner_title_en.trim()) missing.push('professional title');
  if (!item.quote_de.trim() && !item.quote_en.trim()) missing.push('review');
  if (!item.photo_path) missing.push("owner's photo");
  if (!item.screenshot_path) missing.push('screenshot');
  if (!item.consent_at) missing.push('consent date');
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
  if (site === null) return { ok: false, error: 'The website address does not look right. Example: praxis-x.de' };
  const consent = clip(raw.consent_at, 10);
  if (consent && !/^\d{4}-\d{2}-\d{2}$/.test(consent)) return { ok: false, error: 'The consent date is not a date.' };
  const sort = Number(raw.sort);

  const value: ShowcaseInput = {
    owner_name: clip(raw.owner_name, LINE_MAX),
    owner_title_de: clip(raw.owner_title_de, LINE_MAX),
    owner_title_en: clip(raw.owner_title_en, LINE_MAX),
    business_name: clip(raw.business_name, LINE_MAX),
    about_de: clip(raw.about_de, LINE_MAX),
    about_en: clip(raw.about_en, LINE_MAX),
    quote_de: clip(raw.quote_de, QUOTE_MAX),
    quote_en: clip(raw.quote_en, QUOTE_MAX),
    site_url: site,
    photo_path: imagePath(raw.photo_path),
    screenshot_path: imagePath(raw.screenshot_path),
    consent_at: consent || null,
    consent_note: clip(raw.consent_note, NOTE_MAX),
    published: raw.published === true,
    sort: Number.isFinite(sort) ? Math.max(-9999, Math.min(9999, Math.round(sort))) : 0,
  };
  if (value.published) {
    const missing = missingForPublish(value);
    if (missing.length) return { ok: false, error: `To publish, add: ${missing.join(', ')}.` };
  }
  return { ok: true, value };
}
