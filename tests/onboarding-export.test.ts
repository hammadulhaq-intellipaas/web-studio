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
    expect(displayValue(field('booked_page_band'), answers.booked_page_band, 'de')).toBe('5–8 Seiten');
    expect(displayValue(field('tone_scale'), answers.tone_scale, 'en')).toBe('Friendly but professional (3/5)');
    expect(displayValue(field('integrations'), answers.integrations, 'de')).toBe('Google Maps, Online-Terminbuchung');
    expect(displayValue(field('visitor_actions'), answers.visitor_actions, 'en')).toBe(
      'Most important: Book an appointment\nVery important: Call you\nSomewhat important: Send an enquiry, Visit you in person\nNot important: Buy something, Sign up for something',
    );
    expect(displayValue(field('notification_routing'), answers.notification_routing, 'en')).toBe(
      'When this arrives …: Enquiry · … goes to: praxis@physio-nordend.de',
    );
    expect(displayValue(field('booked_package'), dk(), 'de')).toBe('Weiß ich nicht');
    expect(displayValue(field('premises_photos'), undefined, 'de', [
      { field_key: 'premises_photos', file_name: 'a.jpg', size_bytes: 1, mime_type: 'image/jpeg' },
    ])).toBe('a.jpg');
    expect(displayValue(field('legal_name'), undefined, 'de')).toBe('');
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
      answers: { ...completeAnswers(), booked_package: dk(), crm_name: a('HubSpot', { src: 'followup' }), integrations: a(['crm']) },
    });
    const out = exportRecord(def, record, null, []);
    expect(out.answers.booked_package).toMatchObject({ dont_know: true, value: null });
    expect(out.answers.crm_name.source).toBe('followup');
    expect(out.quote.package).toBeNull();
  });

  it('reads the contact block from the answers', () => {
    expect(contactFrom(completeAnswers())).toEqual({ name: 'Lena Hartmann', company: 'Physio Nordend', email: 'lena@physio-nordend.de' });
    expect(contactFrom({})).toEqual({ name: null, company: null, email: null });
  });
});
