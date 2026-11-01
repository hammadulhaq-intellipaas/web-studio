import { describe, expect, it } from 'vitest';
import { EMPTY_SHOWCASE_INPUT, missingForPublish, normalizeSiteUrl, parseShowcaseInput, siteDomain, siteNameFrom, type ShowcaseInput } from '@/lib/showcase/shared';

const PHOTO = 'uploads/0b8f6a1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b.jpg';
const SHOT = 'uploads/1c9a7b2f-3d4e-4f60-9b0c-1d2e3f4a5b6c.jpg';

const complete: ShowcaseInput = {
  ...EMPTY_SHOWCASE_INPUT,
  site_url: 'https://praxis-beispiel.de/',
  business_name: 'Praxis Beispiel',
  owner_name: 'Anna Beispiel',
  owner_title: 'Physiotherapeutin',
  quote: 'Die Seite bringt uns jede Woche neue Termine.',
  screenshot_path: SHOT,
  screenshot_at: '2026-11-01T10:00:00.000Z',
  consent_at: '2026-11-01',
};

describe('showcase: website links', () => {
  it('adds https and keeps http(s) only', () => {
    expect(normalizeSiteUrl('praxis-beispiel.de')).toBe('https://praxis-beispiel.de/');
    expect(normalizeSiteUrl(' http://www.praxis-beispiel.de/start ')).toBe('http://www.praxis-beispiel.de/start');
    expect(normalizeSiteUrl('praxis-beispiel.de:8080')).toBe('https://praxis-beispiel.de:8080/');
    expect(normalizeSiteUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeSiteUrl('ftp://praxis-beispiel.de')).toBeNull();
    expect(normalizeSiteUrl('')).toBeNull();
  });

  it('never sends the screenshot browser to an internal address', () => {
    for (const internal of ['localhost', 'http://localhost:3000', '127.0.0.1', 'http://169.254.169.254/latest', '10.0.0.5', '[::1]', 'printer.local', 'db.internal', 'http://user:pw@praxis-beispiel.de']) {
      expect(normalizeSiteUrl(internal), internal).toBeNull();
    }
  });

  it('shows the bare domain on the card', () => {
    expect(siteDomain('https://www.praxis-beispiel.de/start')).toBe('praxis-beispiel.de');
  });
});

describe('showcase: business name from the website', () => {
  it('prefers og:site_name', () => {
    expect(siteNameFrom('Startseite | Praxis Beispiel', 'Praxis Beispiel München')).toBe('Praxis Beispiel München');
  });

  it('takes the first part of the title, skipping "Home"', () => {
    expect(siteNameFrom('Praxis Beispiel – Physiotherapie in München', '')).toBe('Praxis Beispiel');
    expect(siteNameFrom('Home | Praxis Beispiel', '')).toBe('Praxis Beispiel');
    expect(siteNameFrom('Startseite - Muster Bau GmbH', '')).toBe('Muster Bau GmbH');
    expect(siteNameFrom('Muster-Bau', '')).toBe('Muster-Bau');
    expect(siteNameFrom('IntelliPaaS: the AI-first enterprise integration platform', '')).toBe('IntelliPaaS');
  });
});

describe('showcase: publishing', () => {
  it('a complete entry with the agreement is ready; the photo is optional', () => {
    expect(missingForPublish(complete)).toEqual([]);
    expect(missingForPublish({ ...complete, photo_path: PHOTO })).toEqual([]);
  });

  it('names what is missing, the agreement included', () => {
    expect(missingForPublish({ ...complete, consent_at: null, screenshot_path: null })).toEqual(['screenshot', "the owner's agreement"]);
  });

  it('saves an incomplete draft but refuses to publish it', () => {
    expect(parseShowcaseInput({ ...complete, consent_at: '', published: false }).ok).toBe(true);
    const refused = parseShowcaseInput({ ...complete, consent_at: '', published: true });
    expect(refused).toEqual({ ok: false, error: "To publish, add: the owner's agreement." });
  });

  it('rejects a broken link instead of saving it', () => {
    expect(parseShowcaseInput({ ...complete, site_url: 'not a site' }).ok).toBe(false);
  });

  it('only keeps image paths in the uploads folder', () => {
    const parsed = parseShowcaseInput({ ...complete, photo_path: '../leads/secret.pdf', screenshot_path: SHOT });
    expect(parsed.ok && parsed.value.photo_path).toBeNull();
    expect(parsed.ok && parsed.value.screenshot_path).toBe(SHOT);
  });

  it('drops the screenshot time when there is no screenshot', () => {
    const parsed = parseShowcaseInput({ ...complete, screenshot_path: null });
    expect(parsed.ok && parsed.value.screenshot_at).toBeNull();
  });

  it('trims and caps the text', () => {
    const parsed = parseShowcaseInput({ ...complete, quote: `  ${'a'.repeat(400)}  ` });
    expect(parsed.ok && parsed.value.quote.length).toBe(240);
  });
});
