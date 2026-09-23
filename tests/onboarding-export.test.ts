import { describe, expect, it } from 'vitest';
import { contactFrom, displayValue, exportRecord } from '@/lib/onboarding/export';
import type { OnbField } from '@/lib/onboarding/types';
import { a, completeAnswers, dk, makeDefinition, makeRecord } from './fixtures/onboarding';

const def = makeDefinition();
const field = (id: string): OnbField => def.fields.find((f) => f.id === id)!;

describe('displayValue', () => {
  it('renders options, captions, rankings and repeaters as readable text', () => {
    const answers = completeAnswers();
    expect(displayValue(field('booked_package'), answers.booked_package, 'en')).toBe('Gold');
    expect(displayValue(field('booked_page_band'), answers.booked_page_band, 'de')).toBe('5 bis 8 Seiten');
    expect(displayValue(field('tone_scale'), answers.tone_scale, 'en')).toBe('Friendly but professional (3/5)');
    expect(displayValue(field('integrations'), answers.integrations, 'de')).toBe('Google Maps, Online-Terminbuchung');
    expect(displayValue(field('visitor_action'), answers.visitor_action, 'en')).toBe('Book an appointment');
    expect(displayValue(field('notification_routing'), answers.notification_routing, 'en')).toBe(
      'Type of message: Allgemeine Anfrage · Send it to: praxis@physio-nordend.de',
    );
    expect(displayValue(field('booked_package'), dk(), 'de')).toBe('Weiß ich nicht');
    // "I don't know" plus the date they expect to know is what the team plans around.
    expect(displayValue(field('booked_package'), { v: null, dk: true, dk_date: '2027-01-10' }, 'de')).toBe(
      'Weiß ich nicht (weiß Bescheid ab 2027-01-10)',
    );
    expect(displayValue(field('booked_package'), { v: null, dk: true, dk_date: '2027-01-10' }, 'en')).toBe(
      "Don't know (will know by 2027-01-10)",
    );
    // An explicit "nothing comes to mind" reads back as the CMS wrote it, not as a blank.
    expect(displayValue(field('avoid'), { v: null, none: true }, 'de')).toBe('Mir fällt nichts ein');
    expect(displayValue(field('avoid'), { v: null, none: true }, 'en')).toBe('Nothing comes to mind');
    expect(displayValue(field('reference_screenshots'), undefined, 'de', [
      { field_key: 'reference_screenshots', file_name: 'a.jpg', size_bytes: 1, mime_type: 'image/jpeg' },
    ])).toBe('a.jpg');
    expect(displayValue(field('legal_name'), undefined, 'de')).toBe('');
  });

  it('shows follow-up notes under the value in the client language', () => {
    const answer = a('Krankengymnastik\nManuelle Therapie', { note: 'Auch Lymphdrainage als Unterseite?\n→ Ja' });
    expect(displayValue(field('catalogue'), answer, 'de')).toBe('Krankengymnastik\nManuelle Therapie\nNachfrage: Auch Lymphdrainage als Unterseite? → Ja');
    expect(displayValue(field('catalogue'), answer, 'en')).toContain('Follow-up:');
  });
});

describe('exportRecord', () => {
  it('produces the team-facing record with resolved labels in both languages', () => {
    const record = makeRecord({
      flags: [{ code: 'needs_quote', detail: 'member_area', severity: 'sales', source: 'rule' }],
      review: { round: 1, budget_left: 10, answers_hash: 'x', queue: [], cursor: 0, history: [], gaps: [], llm_questions: [] },
      confirmed: { name: 'Lena Hartmann', at: '2026-09-21T11:00:00Z', terms_version: 'v2' },
    });
    const out = exportRecord(def, record, null, []);

    expect(out.form_id).toBe(record.id);
    expect(out.client).toEqual({ company: 'Physio Nordend', contact_name: 'Lena Hartmann', email: 'lena@physio-nordend.de' });
    expect(out.quote).toEqual({ package: 'gold', page_band: '58' });
    expect(out.answers.tone_scale.value).toEqual({ value: 3, label: 'Friendly but professional', label_de: 'Freundlich, aber professionell' });
    expect(out.answers.tone_scale.display.de).toBe('Freundlich, aber professionell (3/5)');
    expect(out.answers.references.value).toEqual([
      { id: 'ref1', url: 'https://www.beispiel-physio.de', likes: 'Ruhige Farben, große Fotos der Praxisräume', dislikes: '' },
    ]);
    expect(out.answers.existing_url).toBeUndefined(); // hidden
    expect(out.answers.notice_bfsg).toBeUndefined(); // notices never export
    expect(out.flags[0].detail).toBe('member_area');
    expect(out.confirmed?.terms_version).toBe('v2');
    expect(out.brief).toBeNull();
    // answers follow the form's order
    expect(Object.keys(out.answers).slice(0, 3)).toEqual(['contact_name', 'contact_company', 'contact_email']);
  });

  it('marks don\'t-know and follow-up provenance', () => {
    const record = makeRecord({
      answers: { ...completeAnswers(), booked_package: dk(), crm_provider: a('HubSpot', { src: 'followup' }), integrations: a(['crm']) },
    });
    const out = exportRecord(def, record, null, []);
    expect(out.answers.booked_package).toMatchObject({ dont_know: true, value: null });
    expect(out.answers.crm_provider.source).toBe('followup');
    expect(out.quote.package).toBeNull();
  });

  it('reads the contact block from the answers', () => {
    expect(contactFrom(completeAnswers())).toEqual({ name: 'Lena Hartmann', company: 'Physio Nordend', email: 'lena@physio-nordend.de' });
    expect(contactFrom({})).toEqual({ name: null, company: null, email: null });
  });
});
