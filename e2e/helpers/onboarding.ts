import type { APIRequestContext } from '@playwright/test';

/** A complete, valid set of answers (mirrors tests/fixtures/onboarding.ts). */
export function completeAnswers(email: string): Record<string, { v: unknown; dk?: true }> {
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
    public_email: a('praxis@physio-nordend.example'),
    opening_hours: a('Mo–Fr 8–18 Uhr'),
    service_scope: a('one_region'),
    regions_served: a('Frankfurt Nordend, Bornheim, Westend'),
    second_address: a('no'),
    public_pricing: a('no'),
    private_content: a('no'),
    site_emails: a('praxis@physio-nordend.example'),
    notification_routing: a([{ _id: 'r1', trigger: 'enquiry', email: 'praxis@physio-nordend.example' }]),
    approver: a('Lena Hartmann'),
    content_sender: a('Lena Hartmann'),
    tone_scale: a(3),
    personality_scale: a(2),
    references: a([{ _id: 'ref1', url: 'https://www.beispiel-physio.de', likes: 'Ruhige Farben, große Fotos der Praxisräume', dislikes: '' }]),
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
    launch_date: a('2027-03-01'),
    content_ready_date: a('2027-01-15'),
  };
}

/** Mints a form through the real route and fills it through the real PATCH API. */
export async function createFilledForm(
  request: APIRequestContext,
  email: string,
  overrides: Record<string, { v: unknown; dk?: true } | null> = {},
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
      answers: Record<string, { v: unknown; dk?: true; src?: string }>;
      flags: { code: string; detail: string | null }[];
      status: string;
      brief_version: number | null;
      review: { history: { skipped: boolean }[]; queue: unknown[]; cursor: number } | null;
      delivery: { pdf_path: string | null } | null;
    };
    files: unknown[];
  };
}
