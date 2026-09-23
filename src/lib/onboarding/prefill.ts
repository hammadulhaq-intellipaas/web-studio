import type { Answer, Answers } from './types';

/**
 * What the onboarding form can be filled in with from the quote it was created from.
 *
 * The rule for everything here is that the two questions must be *the same question*. A
 * copy is safe; a translation between two differently worded questions is where wrong
 * answers come from, and the client would be confirming our guess as their own fact.
 *
 * Deliberately NOT prefilled, and why:
 *  - `legal_name` from the intake's "Company name": the onboarding field asks for the name
 *    "exactly as it appears on your register entry, not as it appears on your website", and
 *    it goes verbatim onto the legal notice. A trading name is not a legal name.
 *  - `integrations` from the booked add-ons: lossy both ways (a bundle can include maps with
 *    no `maps` add-on), and it is a required list with an exclusive "none", so a half-ticked
 *    list would read as a finished answer.
 *  - `sells_to_consumers` from the shop question: it drives the legal pages, and a B2B
 *    seller answers "shop" but "no" here.
 *  - `languages` from `langs`: that says how many languages, never which.
 *  - `visitor_action` from `contact`: `contact` is form-vs-booking for pricing; this asks
 *    for the one thing a visitor should do, which for a shop is "buy" either way.
 *  - `public_phone` from `lead.telefon`: their number for a sales call is not necessarily
 *    the one they want published.
 *  - `address_street`/`address_city` from the intake's single address field: needs parsing.
 *  - `gbp_link` and `brand_colours`: both are behind a reveal whose trigger is unanswered at
 *    this point, so `clearHidden` would drop them again. Prefilling them is a no-op.
 */

export interface PrefillSource {
  vorname: string;
  nachname: string;
  firma: string;
  email: string;
  source_url: string | null;
  drive_link: string | null;
  /**
   * The questionnaire's single-choice answers. Only `hasSite` and `pages` are read; the
   * rest are named so it stays visible that they were available and left alone on purpose.
   */
  config: {
    bundle?: string;
    answers?: Partial<
      Record<'hasSite' | 'pages' | 'langs' | 'contact' | 'shop' | 'blog' | 'fees' | 'assets' | 'selfbuilt' | 'byowScope', string | null>
    >;
  } | null;
  stage2: { fields?: Record<string, string> } | null;
}

const PACKAGE_IDS = new Set(['silver', 'gold', 'platinum']);
const PAGE_BANDS = new Set(['14', '58', '912', '12p']);

/** A shared folder link is only useful if it is actually a link. */
function looksLikeLink(value: string): boolean {
  return /^(https?:\/\/|www\.)\S+$/i.test(value.trim());
}

/** Same question on the intake as on the onboarding form, so a straight copy. */
const FROM_INTAKE: Record<string, string> = {
  rechtsform: 'legal_form',
  ustid: 'vat_id',
  oeffnung: 'opening_hours',
  usps: 'usps',
  socialp: 'social_profiles',
  bewertungen: 'reviews',
  leistungen: 'catalogue',
  einsatz: 'business_one_liner',
};

/**
 * Every prefilled answer is tagged `src: 'lead'` so the form can mark it as carried over
 * and ask the client to check it, rather than presenting our value as theirs.
 */
export function prefillFromLead(lead: PrefillSource): Answers {
  const out: Answers = {};
  const put = (key: string, value: string | null | undefined) => {
    const text = typeof value === 'string' ? value.trim() : '';
    if (text) out[key] = { v: text, src: 'lead' } as Answer;
  };

  put('contact_name', `${lead.vorname ?? ''} ${lead.nachname ?? ''}`.trim());
  put('contact_company', lead.firma);
  put('contact_email', lead.email);

  const bundle = lead.config?.bundle ?? '';
  if (PACKAGE_IDS.has(bundle)) put('booked_package', bundle);

  const answers = lead.config?.answers ?? {};
  if (PAGE_BANDS.has(answers.pages ?? '')) put('booked_page_band', answers.pages);

  // The questionnaire's four options collapse to two: only an existing website is a change.
  const hasSite = answers.hasSite;
  if (hasSite) {
    put('project_type', hasSite === 'website' ? 'changes' : 'new');
    // The URL input sits on that same question, so it is the site they mean.
    if (hasSite === 'website') put('existing_url', lead.source_url);
  }

  if (lead.drive_link && looksLikeLink(lead.drive_link)) put('assets_folder', lead.drive_link);

  const intake = lead.stage2?.fields ?? {};
  for (const [from, to] of Object.entries(FROM_INTAKE)) put(to, intake[from]);

  return out;
}
