import type { OnbBriefSection } from '../../../src/lib/onboarding/types.ts';

/**
 * The fixed structure of the brief (spec §06, Job 3). The model composes the prose; it
 * never chooses the sections. Section 9 is assembled by code from every unanswered,
 * "don't know" or skipped item so nothing is silently dropped.
 */
const rows: Omit<OnbBriefSection, 'sort' | 'active'>[] = [
  {
    id: 'who',
    title_de: 'Wer dieses Unternehmen ist – in eigenen Worten',
    title_en: 'Who this business is, in their own words',
    instructions:
      'Describe the business from the answers only: legal name and form, where it works and which regions it serves, what it sells (catalogue), why customers choose it (usps), factual claims it wants shown, tagline if any. Keep the client\'s own wording for services.',
    source_fields: [
      'contact_company', 'legal_name', 'legal_form', 'address_city', 'service_scope', 'regions_served',
      'second_address', 'second_address_details', 'catalogue', 'usps', 'factual_claims', 'tagline', 'existing_url',
      'project_type',
    ],
    generated_by: 'llm',
  },
  {
    id: 'goals',
    title_de: 'Was die Website erreichen muss – und das Eine, das ein Besucher tun soll',
    title_en: 'What the site has to achieve, and the one thing a visitor should do',
    instructions:
      'State the single "most important" visitor action first, then the "very important" ones, then the rest in descending priority. Mention public pricing and private content decisions. Do not invent goals beyond the ranked actions.',
    source_fields: ['visitor_actions', 'visitor_action_other', 'public_pricing', 'pricing_detail', 'private_content', 'private_content_detail'],
    generated_by: 'llm',
  },
  {
    id: 'pages',
    title_de: 'Seitenstruktur',
    title_en: 'Page structure',
    instructions:
      'Render the page list as a markdown list preserving the hierarchy (sub-pages indented). State the page count and the booked page band as given. Note any linking requirements. If the list and the count disagree, say so plainly without proposing a price.',
    source_fields: ['booked_package', 'booked_page_band', 'page_count', 'page_list', 'page_relationships'],
    generated_by: 'llm',
  },
  {
    id: 'look',
    title_de: 'Wie sie aussehen und sich anfühlen soll',
    title_en: 'What it should look and feel like',
    instructions:
      'Give both slider values WITH their captions. List each reference site with what the client liked and disliked about it, verbatim where possible. Include brand colours, brand guideline availability and the "do not want" list. Mention premises photos and screenshots only if files were provided.',
    source_fields: [
      'tone_scale', 'personality_scale', 'references', 'reference_screenshots', 'avoid', 'brand_colours',
      'brand_guidelines', 'brand_guidelines_link', 'premises_photos', 'logo_vector', 'photo_source', 'photo_portal',
    ],
    generated_by: 'llm',
  },
  {
    id: 'content',
    title_de: 'Inhalte und Sprachen – wer liefert und wer freigibt',
    title_en: 'Content and languages, and who supplies and approves what',
    instructions:
      'Name the languages, who translates and who approves translations, who sends content, who gives final approval, who manages the site after launch, where assets come from (folder link / uploads) and whether publish rights were confirmed.',
    source_fields: [
      'languages', 'translation_by', 'translation_approver', 'content_sender', 'approver', 'site_manager',
      'assets_folder', 'assets_sharing_confirmed', 'assets_upload', 'publish_rights', 'opening_hours',
    ],
    generated_by: 'llm',
  },
  {
    id: 'systems',
    title_de: 'Verbundene Systeme – Anbieter und Kontoinhaber',
    title_en: 'Integrations and connected systems, with provider and account holder',
    instructions:
      'One bullet per selected integration: provider, account holder (name only), link or status as given. Then notification routing as "trigger → address" lines, the public email addresses, Google Business Profile, social profiles and how they are displayed, and where reviews come from. Never include a password even if one appears in the answers.',
    source_fields: [
      'integrations', 'maps_link', 'reviews_link', 'booking_provider', 'booking_account_holder', 'booking_url',
      'payment_provider', 'payment_account_holder', 'payment_live', 'newsletter_provider', 'newsletter_account_holder',
      'newsletter_list_exists', 'crm_name', 'crm_account_holder', 'crm_what_syncs', 'chat_provider', 'other_integration',
      'notification_routing', 'site_emails', 'gbp_link', 'social_profiles', 'social_display', 'reviews',
    ],
    generated_by: 'llm',
  },
  {
    id: 'legal',
    title_de: 'Rechtliches und Compliance',
    title_en: 'Legal and compliance',
    instructions:
      'Legal-page decision (reuse / none / not sure) and who reviewed them; extra documents needed; whether the business sells to consumers online and the accessibility (BFSG) note if so; the Impressum data: legal name, form, address, register entry, VAT ID, responsible person, public phone and email. Accounts and domain: who holds which login, names only.',
    source_fields: [
      'legal_pages', 'legal_reviewer', 'legal_extras', 'sells_to_consumers', 'legal_name', 'legal_form',
      'address_street', 'address_city', 'register_entry', 'vat_id', 'content_responsible', 'public_phone',
      'public_email', 'accounts', 'domain',
    ],
    generated_by: 'llm',
  },
  {
    id: 'dates',
    title_de: 'Termine und Abhängigkeiten',
    title_en: 'Dates and dependencies',
    instructions:
      'State the preferred launch date, whether it is fixed and why, and the content delivery date exactly as given. List what the build depends on (content, access, assets). Do NOT promise or estimate a timeline, build duration or delivery date of our own.',
    source_fields: ['launch_date', 'launch_date_fixed', 'launch_date_reason', 'content_ready_date', 'anything_else'],
    generated_by: 'llm',
  },
  {
    id: 'still_needed',
    title_de: 'Was wir noch brauchen',
    title_en: 'What we still need',
    instructions: 'Composed by the system from every unanswered, "don\'t know" or skipped item.',
    source_fields: [],
    generated_by: 'system',
  },
];

export const briefSections: OnbBriefSection[] = rows.map((r, i) => ({ ...r, sort: (i + 1) * 10, active: true }));
