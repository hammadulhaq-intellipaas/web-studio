import { describe, expect, it } from 'vitest';
import {
  buildCorpus,
  findForbidden,
  findUngrounded,
  redactAnswers,
  redactSecrets,
  REDACTED,
  sanitizeForPdf,
} from '@/lib/onboarding/guardrails';
import type { RepeaterRow } from '@/lib/onboarding/types';
import { a } from './fixtures/onboarding';

describe('redactSecrets', () => {
  it.each([
    ['Passwort: Sommer2026!', `Passwort: ${REDACTED}`],
    ['password = hunter2', `password: ${REDACTED}`],
    ['Das Kennwort lautet geheim123 und', `Das Kennwort: ${REDACTED} und`],
    ['PIN 4711', `PIN: ${REDACTED}`],
    ['Passwort Sommer2026! bitte', `Passwort: ${REDACTED} bitte`],
    ['API key: sk-live-abcdef', `API key: ${REDACTED}`],
    ['Zugang: https://max:geheim@ftp.firma.de/', `Zugang: https://max:${REDACTED}@ftp.firma.de/`],
    ['Login: max / geheim', `Login: max / ${REDACTED}`],
  ])('redacts %s', (input, expected) => {
    const { text, count } = redactSecrets(input);
    expect(text).toBe(expected);
    expect(count).toBeGreaterThan(0);
  });

  it('leaves ordinary text alone', () => {
    for (const s of [
      'Amtsgericht München, HRB 12345',
      '#1E5EFF, #0F2440',
      'Passwortschutz für den Mitgliederbereich gewünscht',
      'Domain: IONOS – Frau Müller\nHosting: Hetzner – Herr Schmidt',
      'Der Token-Ring ist ein Netzwerk',
      'Der Token wird beim Login geprüft',
      'Zugang: Frau Müller kümmert sich',
    ]) {
      const { text, count } = redactSecrets(s);
      expect(text, s).toBe(s);
      expect(count, s).toBe(0);
    }
  });

  it('redacts inside repeater cells and counts every hit', () => {
    const { answers, count } = redactAnswers({
      accounts: a('Hosting: Hetzner, Passwort: abc123'),
      references: a([{ _id: 'r1', url: 'https://x.de', likes: 'password: qwerty' }]),
      clean: a('nothing here'),
    });
    expect(count).toBe(2);
    expect(String(answers.accounts.v)).toContain(REDACTED);
    expect((answers.references.v as RepeaterRow[])[0].likes).toContain(REDACTED);
    expect(answers.clean.v).toBe('nothing here');
  });
});

describe('forbidden content', () => {
  const corpus = buildCorpus({
    usps: a('Termine innerhalb einer Woche, alle Kassen'),
    public_phone: a('069 / 123 456 78'),
    maps_link: a('https://maps.app.goo.gl/abc123'),
    launch_date: a('2026-12-01'),
  });

  it('flags prices and duration promises', () => {
    expect(findForbidden('Das kostet 1.990 € einmalig.', corpus)).toEqual(['1.990 €']);
    expect(findForbidden('We build within 3 to 6 weeks.', corpus)).toEqual(['3 to 6 weeks']);
    expect(findForbidden('Lieferung in 10 Werktagen', corpus)).toEqual(['10 Werktagen']);
    expect(findForbidden('Etwa USD 500', corpus)).toEqual(['USD 500']);
    expect(findForbidden('Start am 2026-12-01 wie gewünscht', corpus)).toEqual([]);
  });

  it('allows a phrase the client wrote themselves', () => {
    expect(findForbidden('Termine innerhalb einer Woche, alle Kassen', corpus)).toEqual([]);
  });
});

describe('grounding', () => {
  const corpus = buildCorpus({
    public_phone: a('069 / 123 456 78'),
    maps_link: a('https://maps.app.goo.gl/abc123'),
    public_email: a('praxis@physio-nordend.de'),
    launch_date: a('2026-12-01'),
    factual_claims: a('Seit 2009 am Markt, über 4.000 Patienten'),
  });

  it('accepts facts that occur in the answers, in any formatting', () => {
    const text =
      'Telefon: 069 12345678. Karte: https://maps.app.goo.gl/abc123 — Kontakt praxis@physio-nordend.de. Seit 2009 am Markt. Start 2026-12-01. Tonalität 3 von 5.';
    expect(findUngrounded(text, corpus)).toEqual([]);
  });

  it('flags invented numbers, phones, urls and emails', () => {
    const text = 'Rufen Sie 0800 999 999 an, siehe https://www.erfunden.de und info@erfunden.de, seit 1999.';
    const hits = findUngrounded(text, corpus);
    expect(hits).toContain('https://www.erfunden.de');
    expect(hits).toContain('info@erfunden.de');
    expect(hits.some((h) => h.replace(/\D/g, '') === '0800999999')).toBe(true);
    expect(hits).toContain('1999');
  });
});

describe('sanitizeForPdf', () => {
  it('keeps German typography and drops emoji and zero-width characters', () => {
    const input = 'Größe „Über“ – 5 € … ✓ fertig 🚀 Pfeil → hier​';
    expect(sanitizeForPdf(input)).toBe('Größe „Über“ – 5 € … + fertig  Pfeil -> hier');
  });
});
