import type { APIRequestContext } from '@playwright/test';

/** A complete, valid set of answers (mirrors tests/fixtures/onboarding.ts). */
export function completeAnswers(email: string): Record<string, { v: unknown; dk?: true; dk_date?: string; none?: true }> {
  const a = (v: unknown) => ({ v });
  return {
    contact_name: a('Lena Hartmann'),
    contact_company: a('Physio Nordend'),
    contact_email: a(email),
    booked_package: a('gold'),
    booked_page_band: a('58'),
    project_type: a('new'),
    legal_name: a('Physio Nordend Lena Hartmann e.K.'),
    legal_form: a('e.K.'),
    address_street: a('Eckenheimer Landstraße 12'),
    address_city: a('60318 Frankfurt am Main'),
    content_responsible: a('Lena Hartmann'),
    opening_hours: a('Mo bis Fr, 8 bis 18 Uhr'),
    service_scope: a('one_town'),
    regions_served: a('Frankfurt Nordend, Bornheim, Westend'),
    private_content: a('no'),
    site_emails: a('praxis@physio-nordend.example, allgemeine Anfragen'),
    routing_split: a('yes'),
    notification_routing: a([{ _id: 'r1', type: 'Allgemeine Anfrage', address: 'praxis@physio-nordend.example' }]),
    approver: a('Lena Hartmann'),
    content_sender: a('Lena Hartmann'),
    business_one_liner: a('Wir behandeln Rückenschmerzen und Sportverletzungen, mit Terminen innerhalb einer Woche.'),
    target_audience: a('Berufstätige zwischen 30 und 60, die seit Monaten Schmerzen haben.'),
    ideal_customer: a('Büroangestellte mit Rückenschmerzen, die eine feste Behandlungsserie buchen.'),
    usps: a('Termine innerhalb einer Woche, alle Kassen, barrierefreier Zugang, feste Therapeutin pro Patient.'),
    proof_to_show: a(['reviews', 'certifications']),
    factual_claims: a('Zertifikate: Manuelle Therapie seit 2015, bestätigt von Lena'),
    tone_scale: a(3),
    personality_scale: a(2),
    references: a([{ _id: 'ref1', url: 'https://www.beispiel-physio.de', likes: 'Ruhige Farben, große Fotos der Praxisräume', dislikes: '' }]),
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
    launch_date: a('2027-03-01'),
    launch_date_fixed: a('no'),
    content_ready_date: a('2027-01-15'),
  };
}

/** Mints a form through the real route and fills it through the real PATCH API. */
export async function createFilledForm(
  request: APIRequestContext,
  email: string,
  overrides: Record<string, { v: unknown; dk?: true; dk_date?: string; none?: true } | null> = {},
  locale: 'de' | 'en' = 'de',
): Promise<string> {
  const res = await request.get(`${locale === 'de' ? '' : '/en'}/onboardingform/new`, { maxRedirects: 0 });
  const location = res.headers()['location'] ?? '';
  const id = location.split('/').pop();
  if (!id || id.length !== 21) throw new Error(`mint failed: ${res.status()} ${location}`);

  const changes = { ...completeAnswers(email), ...overrides };
  const patch = await request.patch(`/api/onboarding/${id}`, {
    data: { base_rev: 0, changes, current_step: 'review' },
  });
  if (!patch.ok()) throw new Error(`patch failed: ${patch.status()} ${await patch.text()}`);
  return id;
}

export async function getRecord(request: APIRequestContext, id: string) {
  const res = await request.get(`/api/onboarding/${id}`);
  return (await res.json()) as {
    record: Record<string, unknown> & {
      rev: number;
      answers: Record<string, { v: unknown; dk?: true; dk_date?: string; none?: true; src?: string }>;
      flags: { code: string; detail: string | null }[];
      status: string;
      brief_version: number | null;
      review: { history: { skipped: boolean }[]; queue: unknown[]; cursor: number } | null;
      delivery: { pdf_path: string | null } | null;
    };
    files: unknown[];
  };
}
