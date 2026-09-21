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
  maxRewrites: 9,
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
    opening_hours: a('Mo–Fr 8–18 Uhr'),
    service_scope: a('one_region'),
    regions_served: a('Frankfurt Nordend, Bornheim, Westend'),
    second_address: a('no'),
    public_pricing: a('no'),
    private_content: a('no'),
    site_emails: a('praxis@physio-nordend.de'),
    notification_routing: a([{ _id: 'r1', trigger: 'enquiry', email: 'praxis@physio-nordend.de' }]),
    approver: a('Lena Hartmann'),
    content_sender: a('Lena Hartmann'),
    tone_scale: a(3),
    personality_scale: a(2),
    references: a([
      { _id: 'ref1', url: 'https://www.beispiel-physio.de', likes: 'Ruhige Farben, große Fotos der Praxisräume', dislikes: '' },
    ]),
    brand_guidelines: a('no'),
    page_count: a(6),
    page_list: a('Startseite\nLeistungen\n- Krankengymnastik\n- Manuelle Therapie\nTeam\nKontakt'),
    catalogue: a('Krankengymnastik\nManuelle Therapie\nLymphdrainage'),
    visitor_actions: a({ book: 'most', call: 'very', visit: 'some', enquiry: 'some', buy: 'not', signup: 'not' }),
    languages: a('single'),
    integrations: a(['maps', 'booking']),
    maps_link: a('https://maps.app.goo.gl/abc123'),
    booking_provider: a('Doctolib'),
    assets_folder: a('https://drive.google.com/drive/folders/abc'),
    logo_vector: a('yes'),
    publish_rights: a('yes'),
    accounts: a('Domain: IONOS – Lena Hartmann\nHosting: keins'),
    domain: a('www.physio-nordend.de'),
    legal_pages: a('reuse'),
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
