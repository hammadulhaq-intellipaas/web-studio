import {
  briefSections,
  fields,
  flagRules,
  followups,
  screens,
  texts,
} from '../../supabase/seed/onboarding/index.ts';
import type {
  Answer,
  Answers,
  AnswerValue,
  OnboardingDefinition,
  OnboardingFormRecord,
  OnboardingSettings,
} from '@/lib/onboarding/types';

export const SETTINGS: OnboardingSettings = {
  model: 'gpt-4o',
  maxFollowups: 12,
  maxRounds: 2,
  maxAiCalls: 20,
  buildWeeksMin: 3,
  buildWeeksMax: 6,
  estimatedMinutes: 20,
  termsVersion: 'v2',
  examplesUrl: '',
  folderHelpUrl: 'https://example.com/help',
  teamEmail: 'team@example.com',
};

/** The seed content as the runtime would load it from Supabase. */
export function makeDefinition(overrides: Partial<OnboardingDefinition> = {}): OnboardingDefinition {
  return {
    screens,
    fields,
    followups,
    flagRules,
    briefSections,
    texts,
    settings: SETTINGS,
    ...overrides,
  };
}

export const a = (v: AnswerValue | null, extra: Partial<Answer> = {}): Answer => ({ v, ...extra });
export const dk = (): Answer => ({ v: null, dk: true });

/** A fully answered, valid form — the happy path every test starts from. */
export function completeAnswers(): Answers {
  return {
    contact_name: a('Lena Hartmann'),
    contact_company: a('Physio Nordend'),
    contact_email: a('lena@physio-nordend.de'),
    booked_package: a('gold'),
    booked_page_band: a('58'),
    project_type: a('new'),
    legal_name: a('Physio Nordend Lena Hartmann e.K.'),
    legal_form: a('e.K.'),
    address_street: a('Eckenheimer Landstraße 12'),
    address_city: a('60318 Frankfurt am Main'),
    content_responsible: a('Lena Hartmann'),
    public_email: a('praxis@physio-nordend.de'),
    opening_hours: a('Mo bis Fr, 8 bis 18 Uhr'),
    service_scope: a('one_town'),
    regions_served: a('Frankfurt Nordend, Bornheim, Westend'),
    private_content: a('no'),
    routing_split: a('yes'),
    notification_routing: a([{ _id: 'r1', type: 'Allgemeine Anfrage', address: 'praxis@physio-nordend.de' }]),
    approver: a('Lena Hartmann'),
    content_sender: a('Lena Hartmann'),
    business_one_liner: a('Wir behandeln Rückenschmerzen und Sportverletzungen, mit Terminen innerhalb einer Woche.'),
    target_audience: a('Berufstätige zwischen 30 und 60, die seit Monaten Schmerzen haben und schnell einen Termin brauchen.'),
    ideal_customer: a('Büroangestellte mit Rückenschmerzen, die eine feste Behandlungsserie buchen und dranbleiben.'),
    usps: a('Termine innerhalb einer Woche, alle Kassen, barrierefreier Zugang, feste Therapeutin pro Patient.'),
    proof_to_show: a(['reviews', 'certifications']),
    factual_claims: a('Zertifikate: Manuelle Therapie seit 2015, bestätigt von Lena'),
    tone_scale: a(3),
    personality_scale: a(2),
    references: a([
      { _id: 'ref1', url: 'https://www.beispiel-physio.de', likes: 'Ruhige Farben, große Fotos der Praxisräume', dislikes: '' },
    ]),
    avoid: a('Keine Stockfotos von lächelnden Models.'),
    brand_guidelines: a('no'),
    brand_colours: a('#2A7F62, #F4F1EA'),
    colour_mood: a(['light', 'muted']),
    typography_feel: a('modern'),
    photo_subjects: a(['premises', 'team']),
    hero_intent: a('statement'),
    homepage_density: a('balanced'),
    catalogue: a('Krankengymnastik\nManuelle Therapie\nLymphdrainage'),
    page_list: a('Startseite\nLeistungen\n- Krankengymnastik\n- Manuelle Therapie\nTeam\nKontakt'),
    visitor_action: a('booking'),
    languages: a('de'),
    integrations: a(['maps', 'booking']),
    gbp_link: a('https://g.page/physio-nordend'),
    booking_provider: a('Doctolib'),
    booking_url: a('https://www.doctolib.de/physio-nordend'),
    integrations_contact: a('Lena Hartmann'),
    assets_folder: a('https://drive.google.com/drive/folders/abc'),
    assets_sharing_confirmed: a(['yes']),
    photo_portal_needed: a('no'),
    accounts_table: a([{ _id: 'acc1', account: 'domain', provider: 'IONOS', holder: 'Lena Hartmann' }]),
    domain: a('www.physio-nordend.de'),
    legal_pages: a('reuse'),
    legal_pages_links: a('https://www.physio-nordend.de/impressum'),
    legal_reviewer: a('Lena Hartmann'),
    sells_to_consumers: a('no'),
    launch_date: a('2026-12-01'),
    launch_date_fixed: a('no'),
    content_ready_date: a('2026-10-15'),
  };
}

export function makeRecord(overrides: Partial<OnboardingFormRecord> = {}): OnboardingFormRecord {
  return {
    id: 'testtesttesttesttest1',
    locale: 'de',
    status: 'in_progress',
    rev: 3,
    current_step: 'timing',
    name: 'Lena Hartmann',
    company: 'Physio Nordend',
    email: 'lena@physio-nordend.de',
    answers: completeAnswers(),
    flags: [],
    review: null,
    brief_version: null,
    confirmed: null,
    delivery: null,
    ai_calls: 0,
    save_link_sent_at: null,
    lead_id: null,
    created_at: '2026-09-21T10:00:00.000Z',
    updated_at: '2026-09-21T10:30:00.000Z',
    ...overrides,
  };
}

export const TODAY = '2026-09-21';
