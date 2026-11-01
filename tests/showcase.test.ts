import { describe, expect, it } from 'vitest';
import { EMPTY_SHOWCASE_INPUT, inLocale, missingForPublish, normalizeSiteUrl, parseShowcaseInput, siteDomain, type ShowcaseInput } from '@/lib/showcase/shared';

const PHOTO = 'uploads/0b8f6a1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b.jpg';
const SHOT = 'uploads/1c9a7b2f-3d4e-4f60-9b0c-1d2e3f4a5b6c.png';

const complete: ShowcaseInput = {
  ...EMPTY_SHOWCASE_INPUT,
  owner_name: 'Anna Beispiel',
  owner_title_de: 'Physiotherapeutin',
  business_name: 'Praxis Beispiel',
  quote_de: 'Die Seite bringt uns jede Woche neue Termine.',
  site_url: 'https://praxis-beispiel.de/',
  photo_path: PHOTO,
  screenshot_path: SHOT,
  consent_at: '2026-11-01',
};

describe('showcase: web addresses', () => {
  it('adds https and keeps http(s) only', () => {
    expect(normalizeSiteUrl('praxis-beispiel.de')).toBe('https://praxis-beispiel.de/');
    expect(normalizeSiteUrl(' http://www.praxis-beispiel.de/start ')).toBe('http://www.praxis-beispiel.de/start');
    expect(normalizeSiteUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeSiteUrl('localhost')).toBeNull();
    expect(normalizeSiteUrl('')).toBeNull();
  });

  it('shows the bare domain on the card', () => {
    expect(siteDomain('https://www.praxis-beispiel.de/start')).toBe('praxis-beispiel.de');
  });
});

describe('showcase: languages', () => {
  it('falls back to the other language when one is empty', () => {
    expect(inLocale('Physiotherapeutin', '', 'en')).toBe('Physiotherapeutin');
    expect(inLocale('', 'Physiotherapist', 'de')).toBe('Physiotherapist');
    expect(inLocale('Physiotherapeutin', 'Physiotherapist', 'en')).toBe('Physiotherapist');
  });
});

describe('showcase: publishing', () => {
  it('a complete entry with consent is ready', () => {
    expect(missingForPublish(complete)).toEqual([]);
  });

  it('names what is missing, consent included', () => {
    expect(missingForPublish({ ...complete, consent_at: null, photo_path: null })).toEqual(["owner's photo", 'consent date']);
  });

  it('saves an incomplete draft but refuses to publish it', () => {
    expect(parseShowcaseInput({ ...complete, consent_at: '', published: false }).ok).toBe(true);
    const refused = parseShowcaseInput({ ...complete, consent_at: '', published: true });
    expect(refused).toEqual({ ok: false, error: 'To publish, add: consent date.' });
  });

  it('rejects a broken web address instead of saving it', () => {
    expect(parseShowcaseInput({ ...complete, site_url: 'not a site' }).ok).toBe(false);
  });

  it('only keeps image paths in the uploads folder', () => {
    const parsed = parseShowcaseInput({ ...complete, photo_path: '../leads/secret.pdf', screenshot_path: SHOT });
    expect(parsed.ok && parsed.value.photo_path).toBeNull();
    expect(parsed.ok && parsed.value.screenshot_path).toBe(SHOT);
  });

  it('trims and caps the text', () => {
    const parsed = parseShowcaseInput({ ...complete, quote_de: `  ${'a'.repeat(400)}  `, sort: '3.6' });
    expect(parsed.ok && parsed.value.quote_de.length).toBe(240);
    expect(parsed.ok && parsed.value.sort).toBe(4);
  });
});
