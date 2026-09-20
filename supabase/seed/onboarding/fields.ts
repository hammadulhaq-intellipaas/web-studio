import type { RuleCondition } from '../../../src/lib/types.ts';
import type { FieldOption, FieldType, OnbField } from '../../../src/lib/onboarding/types.ts';

/* ------------------------------------------------------------------ tiny DSL */

type Extra = Partial<Omit<OnbField, 'id' | 'screen_id' | 'type' | 'label_de' | 'label_en' | 'sort'>>;

function field(
  id: string,
  screen_id: string,
  type: FieldType,
  label_de: string,
  label_en: string,
  extra: Extra = {},
): OnbField {
  return {
    id,
    screen_id,
    sort: 0, // assigned from array order below
    type,
    label_de,
    label_en,
    help_de: null,
    help_en: null,
    placeholder_de: null,
    placeholder_en: null,
    required: false,
    allow_dont_know: false,
    ai_check: false,
    options: [],
    config: {},
    show_when: [],
    active: true,
    ...extra,
  };
}

function opt(value: string, label_de: string, label_en: string, extra: Partial<FieldOption> = {}): FieldOption {
  return { value, label_de, label_en, ...extra };
}

const when = (key: string, ...values: string[]): RuleCondition[] => [{ key, values }];
const whenNot = (key: string, ...values: string[]): RuleCondition[] => [{ key, values, negate: true }];

const YES_NO = [opt('yes', 'Ja', 'Yes'), opt('no', 'Nein', 'No')];
const YES_NO_UNSURE = [...YES_NO, opt('unsure', 'Nicht sicher', 'Not sure')];

/* ------------------------------------------------------------------ Screen 1 · project */

const project: OnbField[] = [
  field('contact_name', 'project', 'text', 'Ihr Name', 'Your name', {
    required: true,
    placeholder_de: 'Vorname Nachname',
    placeholder_en: 'First and last name',
  }),
  field('contact_company', 'project', 'text', 'Unternehmen', 'Company', { required: true }),
  field('contact_email', 'project', 'email', 'Ihre E-Mail-Adresse', 'Your email address', {
    required: true,
    help_de: 'An diese Adresse schicken wir Ihren Speicherlink und am Ende Ihr Briefing.',
    help_en: "We'll send your save link and, at the end, your brief to this address.",
    placeholder_de: 'name@firma.de',
    placeholder_en: 'name@company.com',
  }),
  field('booked_package', 'project', 'radio', 'Welches Paket haben Sie gebucht?', 'Which package did you book?', {
    required: true,
    allow_dont_know: true,
    options: [opt('silver', 'Silver', 'Silver'), opt('gold', 'Gold', 'Gold'), opt('platinum', 'Platinum', 'Platinum')],
  }),
  field(
    'booked_page_band',
    'project',
    'radio',
    'Wie viele Seiten umfasst Ihr Angebot?',
    'How many pages does your quote cover?',
    {
      required: true,
      allow_dont_know: true,
      help_de: 'Steht in Ihrem Angebot bzw. in der Konfiguration, die Sie bestätigt haben.',
      help_en: "It's in your quote — the configuration you confirmed.",
      options: [
        opt('14', '1–4 Seiten', '1–4 pages', { min: 1, max: 4 }),
        opt('58', '5–8 Seiten', '5–8 pages', { min: 5, max: 8 }),
        opt('912', '9–12 Seiten', '9–12 pages', { min: 9, max: 12 }),
        opt('12p', 'Mehr als 12 Seiten', 'More than 12 pages', { min: 13, max: null }),
      ],
    },
  ),
  field(
    'project_type',
    'project',
    'radio',
    'Geht es um eine ganz neue Website oder um Änderungen an einer bestehenden?',
    'Is this a brand new website, or changes to one you already have?',
    {
      required: true,
      options: [
        opt('new', 'Eine neue Website', 'A brand new website'),
        opt('changes', 'Änderungen an meiner bestehenden Website', 'Changes to my existing site'),
      ],
    },
  ),
  field('existing_url', 'project', 'url', 'Adresse Ihrer aktuellen Website', 'Your current website address', {
    required: true,
    show_when: when('project_type', 'changes'),
    placeholder_de: 'https://www.…',
    placeholder_en: 'https://www.…',
  }),
];

/* ------------------------------------------------------------------ Screen 2 · business */

const business: OnbField[] = [
  field(
    'legal_name',
    'business',
    'text',
    'Vollständiger Firmenname – genau wie im Handelsregister oder auf Ihren Rechnungen',
    'Full legal company name, exactly as on your commercial register entry or invoices',
    { required: true },
  ),
  field('legal_form', 'business', 'text', 'Rechtsform', 'Legal form', {
    required: true,
    placeholder_de: 'GmbH, e.K., GbR, Einzelunternehmen …',
    placeholder_en: 'GmbH, e.K., GbR, sole trader …',
  }),
  field('address_street', 'business', 'text', 'Straße und Hausnummer', 'Street and number', { required: true }),
  field('address_city', 'business', 'text', 'PLZ und Ort', 'Postcode and city', { required: true }),
  field('vat_id', 'business', 'text', 'USt-IdNr.', 'VAT ID (USt-IdNr.)', {
    placeholder_de: 'DE123456789',
    placeholder_en: 'DE123456789',
  }),
  field(
    'register_entry',
    'business',
    'text',
    'Registergericht und Registernummer, falls vorhanden',
    'Register court and number, if you have one',
    { placeholder_de: 'Amtsgericht München, HRB 12345', placeholder_en: 'Amtsgericht München, HRB 12345' },
  ),
  field(
    'content_responsible',
    'business',
    'text',
    'Inhaltlich verantwortliche Person (§ 18 Abs. 2 MStV)',
    'Person responsible for content (§ 18 Abs. 2 MStV)',
    { required: true },
  ),
  field('public_phone', 'business', 'tel', 'Öffentliche Telefonnummer', 'Public phone number'),
  field('public_email', 'business', 'email', 'Öffentliche E-Mail-Adresse', 'Public email address', {
    required: true,
  }),
  field('opening_hours', 'business', 'textarea', 'Öffnungszeiten, Tag für Tag', 'Opening hours, day by day', {
    required: true,
    allow_dont_know: true,
    placeholder_de: 'Mo–Fr 9–18 Uhr\nSa 10–14 Uhr',
    placeholder_en: 'Mon–Fri 9am–6pm\nSat 10am–2pm',
    config: { rows: 4 },
  }),
  field(
    'service_scope',
    'business',
    'radio',
    'Wo arbeiten, verkaufen oder betreuen Sie Kunden?',
    'Where do you work, sell or take clients?',
    {
      required: true,
      options: [
        opt('one_region', 'In einer Stadt oder Region', 'One town or region'),
        opt('several_regions', 'In mehreren Regionen', 'Several regions'),
        opt('national', 'Deutschlandweit', 'Nationwide'),
        opt('international', 'International', 'International'),
      ],
    },
  ),
  field(
    'regions_served',
    'business',
    'textarea',
    'Welche Regionen bedienen Sie? Bitte genau benennen – unabhängig von Ihrer Adresse',
    'Which regions do you serve? Name them precisely, separately from your address',
    { required: true, show_when: when('service_scope', 'one_region', 'several_regions'), config: { rows: 3 } },
  ),
  field(
    'second_address',
    'business',
    'radio',
    'Haben Sie eine zweite Adresse, die Kunden besuchen?',
    'Do you have a second address customers visit?',
    { options: YES_NO },
  ),
  field(
    'second_address_details',
    'business',
    'textarea',
    'Die zweite Adresse – und was dort passiert',
    'The second address, and what happens there',
    { required: true, show_when: when('second_address', 'yes'), config: { rows: 3 } },
  ),
  field(
    'factual_claims',
    'business',
    'textarea',
    'Welche Fakten sollen auf der Website stehen?',
    'What factual claims should appear on your site?',
    {
      help_de: 'Jahre am Markt, Anzahl Kunden, Reaktionszeiten, Zertifizierungen, Auszeichnungen, Mitgliedschaften.',
      help_en: 'Years in business, number of clients, reply times, certifications, awards, memberships.',
      config: { rows: 4 },
    },
  ),
  field(
    'public_pricing',
    'business',
    'radio',
    'Sollen Preise oder Preisspannen öffentlich gezeigt werden?',
    'Should any prices or price ranges be shown publicly?',
    { options: YES_NO_UNSURE },
  ),
  field(
    'pricing_detail',
    'business',
    'textarea',
    'Welche Preise – und wie sollen sie dargestellt werden?',
    'Which prices, and how should they be shown?',
    { show_when: when('public_pricing', 'yes'), config: { rows: 3 } },
  ),
  field(
    'private_content',
    'business',
    'radio',
    'Gibt es Inhalte, die hinter einem Passwort- oder Mitgliederbereich liegen sollen?',
    'Is there information that should sit behind a password-protected or member page?',
    { options: YES_NO_UNSURE },
  ),
  field(
    'private_content_detail',
    'business',
    'textarea',
    'Was soll dort liegen – und wer bekommt Zugang?',
    'What should sit behind it, and who gets access?',
    {
      required: true,
      show_when: when('private_content', 'yes'),
      help_de: 'Mitgliederbereiche sind nicht Teil des gebuchten Pakets – wir melden uns dazu separat bei Ihnen.',
      help_en: "Member areas are not part of the booked package — we'll come back to you on this separately.",
      config: { rows: 3 },
    },
  ),
];

/* ------------------------------------------------------------------ Screen 3 · inboxes */

const inboxes: OnbField[] = [
  field(
    'site_emails',
    'inboxes',
    'textarea',
    'Welche E-Mail-Adressen sollen auf der Website erscheinen?',
    'Which email addresses should appear on the site?',
    {
      required: true,
      help_de: 'Nur Adressen, die tatsächlich jemand liest.',
      help_en: 'Only addresses someone actually reads.',
      config: { rows: 3 },
    },
  ),
  field(
    'notification_routing',
    'inboxes',
    'repeater',
    'Wenn etwas eingeht – wer soll davon erfahren?',
    'When something arrives, who should hear about it?',
    {
      required: true,
      help_de: 'Eine Regel pro Zeile. Sie können verschiedene Dinge an verschiedene Personen schicken.',
      help_en: 'One rule per line — you can send different things to different people.',
      config: {
        initial_rows: 2,
        min_rows: 1,
        max_rows: 8,
        add_label_de: 'Weitere Regel',
        add_label_en: 'Add another',
        fields: [
          {
            key: 'trigger',
            type: 'select',
            label_de: 'Wenn eingeht …',
            label_en: 'When this arrives …',
            required: true,
            options: [
              opt('enquiry', 'Kontaktanfrage', 'Enquiry'),
              opt('booking', 'Terminbuchung', 'Booking'),
              opt('callback', 'Rückrufwunsch', 'Callback request'),
              opt('newsletter', 'Newsletter-Anmeldung', 'Newsletter sign-up'),
              opt('order', 'Bestellung', 'Order'),
              opt('other', 'Sonstiges', 'Other'),
            ],
          },
          {
            key: 'email',
            type: 'email',
            label_de: '… geht an',
            label_en: '… goes to',
            required: true,
            placeholder_de: 'name@firma.de',
            placeholder_en: 'name@company.com',
          },
        ],
      },
    },
  ),
  field(
    'approver',
    'inboxes',
    'text',
    'Wer gibt die finale Freigabe für die Website?',
    'Who gives final approval on the website?',
    { required: true },
  ),
  field('content_sender', 'inboxes', 'text', 'Wer schickt uns Texte und Fotos?', 'Who sends us text and photos?', {
    required: true,
  }),
  field(
    'site_manager',
    'inboxes',
    'textarea',
    'Wer betreut die Website nach dem Start aktiv in Ihrem Unternehmen?',
    'Who will be actively managing the site in the business after launch?',
    { config: { rows: 2 } },
  ),
];

/* ------------------------------------------------------------------ Screen 4 · design */

const design: OnbField[] = [
  field('tone_scale', 'design', 'slider', 'Wie soll sich die Website anfühlen?', 'How should the site feel?', {
    required: true,
    config: {
      min: 1,
      max: 5,
      captions: [
        { de: 'Verspielt und locker', en: 'Fun and playful' },
        { de: 'Warm und persönlich', en: 'Warm and informal' },
        { de: 'Freundlich, aber professionell', en: 'Friendly but professional' },
        { de: 'Professionell und zurückhaltend', en: 'Professional and restrained' },
        { de: 'Formell und seriös', en: 'Formal and serious' },
      ],
      examples: [
        { de: 'Kindergarten, Kreativwerkstatt, Trampolinpark', en: 'Kindergarten, art and craft studio, trampoline park' },
        { de: 'Friseur, Café, Personal Trainer', en: 'Hairdresser, café, personal trainer' },
        { de: 'Die meisten Handwerksbetriebe und Praxen', en: 'Most trades, most clinics' },
        { de: 'Beratung, Arztpraxis', en: 'Consultancy, medical practice' },
        { de: 'Kanzlei, Steuerberatung, Behörde', en: 'Law firm, accountant, government' },
      ],
    },
  }),
  field('personality_scale', 'design', 'slider', 'Wie viel Persönlichkeit?', 'How much personality?', {
    required: true,
    config: {
      min: 1,
      max: 5,
      captions: [
        { de: 'Sehr zurückgenommen – die Inhalte sprechen', en: 'Very restrained — let the content speak' },
        { de: 'Dezent', en: 'Understated' },
        { de: 'Ausgewogen', en: 'Balanced' },
        { de: 'Mit eigenem Charakter', en: 'Distinctive' },
        { de: 'Mutig und ausdrucksstark', en: 'Bold and expressive' },
      ],
      examples: [
        { de: 'Klare Struktur, wenig Schmuck', en: 'Clean structure, little decoration' },
        { de: 'Ruhige Farben, klassische Schrift', en: 'Calm colours, classic type' },
        { de: 'Ein paar Akzente, ohne laut zu werden', en: 'A few accents without shouting' },
        { de: 'Eigene Bildsprache, markante Schrift', en: 'Own imagery, distinctive type' },
        { de: 'Große Gesten, starke Farben', en: 'Big gestures, strong colours' },
      ],
    },
  }),
  field('references', 'design', 'repeater', 'Referenz-Websites', 'Reference websites', {
    required: true,
    help_de: 'Link, was Ihnen daran gefällt – und was nicht. Eine Referenz reicht, bis zu drei sind möglich.',
    help_en: "Link, what you like, what you don't. One is enough, up to three are welcome.",
    config: {
      initial_rows: 1,
      min_rows: 1,
      max_rows: 3,
      add_label_de: 'Weitere Referenz',
      add_label_en: 'Add another',
      link_setting: 'onb_examples_url',
      link_label_de: 'Beispiele aus unserer Arbeit ansehen',
      link_label_en: 'See examples of our work',
      fields: [
        {
          key: 'url',
          type: 'url',
          label_de: 'Link',
          label_en: 'Link',
          required: true,
          placeholder_de: 'https://…',
          placeholder_en: 'https://…',
        },
        {
          key: 'likes',
          type: 'textarea',
          label_de: 'Was gefällt Ihnen daran?',
          label_en: 'What do you like about it?',
          required: true,
          min_chars: 15,
          placeholder_de: 'Aufbau, Farben, Bildsprache, Tonfall …',
          placeholder_en: 'Layout, colours, imagery, tone of voice …',
        },
        {
          key: 'dislikes',
          type: 'textarea',
          label_de: 'Was gefällt Ihnen nicht?',
          label_en: "What don't you like?",
        },
      ],
    },
  }),
  field(
    'reference_screenshots',
    'design',
    'upload',
    'Screenshots der Referenzseiten (optional)',
    'Screenshots of the reference sites (optional)',
    { config: { max_files: 3, max_mb: 25, accept: ['jpg', 'jpeg', 'png', 'webp', 'pdf'] } },
  ),
  field('avoid', 'design', 'textarea', 'Was möchten Sie auf keinen Fall?', 'Anything you definitely DO NOT want', {
    config: { rows: 3 },
  }),
  field(
    'brand_colours',
    'design',
    'text',
    'Ihre Markenfarben – Hex-Codes, falls vorhanden',
    'Your brand colours, hex codes if you have them',
    { placeholder_de: '#1E5EFF, #0F2440 …', placeholder_en: '#1E5EFF, #0F2440 …' },
  ),
  field(
    'brand_guidelines',
    'design',
    'radio',
    'Gibt es ein Marken- oder Designhandbuch?',
    'Do you have a brand or design guideline document?',
    { required: true, options: YES_NO_UNSURE },
  ),
  field('brand_guidelines_link', 'design', 'url', 'Link zu Ihren Markenrichtlinien', 'Link to your brand guidelines', {
    required: true,
    show_when: when('brand_guidelines', 'yes'),
  }),
  field(
    'premises_photos',
    'design',
    'upload',
    'Fotos Ihrer Räume – auch Handyfotos helfen',
    'Photos of your premises — even phone photos help',
    { config: { max_files: 10, max_mb: 25, accept: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'] } },
  ),
];

/* ------------------------------------------------------------------ Screen 5 · pages */

const pages: OnbField[] = [
  field('page_count', 'pages', 'number', 'Wie viele Seiten brauchen Sie?', 'How many pages do you need?', {
    required: true,
    ai_check: true,
    config: { min: 1, max: 200 },
  }),
  field(
    'page_list',
    'pages',
    'textarea',
    'Listen Sie Ihre Seiten auf, eine pro Zeile. Unterseiten mit einem Bindestrich einrücken',
    'List your pages, one per line. Indent a sub-page with a dash',
    {
      required: true,
      ai_check: true,
      placeholder_de: 'Startseite\nLeistungen\n- Leistung A\n- Leistung B\nÜber uns\nKontakt',
      placeholder_en: 'Home\nServices\n- Service A\n- Service B\nAbout us\nContact',
      config: { rows: 8, min_lines: 3 },
    },
  ),
  field(
    'page_relationships',
    'pages',
    'textarea',
    'Müssen bestimmte Seiten auf besondere Weise miteinander verlinkt sein?',
    'Do any pages need to link to each other in a particular way?',
    { config: { rows: 3 } },
  ),
  field(
    'catalogue',
    'pages',
    'textarea',
    'Ihre Produkte oder Leistungen – eine pro Zeile, genau so geschrieben, wie sie erscheinen sollen',
    'Tell us about your products or services — one per line, spelled exactly as they should appear',
    { required: true, ai_check: true, config: { rows: 6 } },
  ),
  field('visitor_actions', 'pages', 'ranking', 'Was soll ein Besucher tun? Bitte einordnen', 'What should a visitor do? Rank these', {
    required: true,
    help_de: 'Genau eine Aktion ist „am wichtigsten“, bis zu drei sind „sehr wichtig“.',
    help_en: 'Exactly one action is "most important", up to three are "very important".',
    options: [
      opt('call', 'Sie anrufen', 'Call you'),
      opt('enquiry', 'Eine Anfrage senden', 'Send an enquiry'),
      opt('book', 'Einen Termin buchen', 'Book an appointment'),
      opt('buy', 'Etwas kaufen', 'Buy something'),
      opt('visit', 'Sie vor Ort besuchen', 'Visit you in person'),
      opt('signup', 'Sich für etwas anmelden', 'Sign up for something'),
    ],
    config: {
      buckets: [
        { value: 'most', label_de: 'Am wichtigsten', label_en: 'Most important', min: 1, max: 1 },
        { value: 'very', label_de: 'Sehr wichtig', label_en: 'Very important', max: 3 },
        { value: 'some', label_de: 'Eher wichtig', label_en: 'Somewhat important' },
        { value: 'not', label_de: 'Nicht wichtig', label_en: 'Not important', default: true },
      ],
    },
  }),
  field(
    'visitor_action_other',
    'pages',
    'text',
    'Etwas anderes, das ein Besucher tun soll',
    'Something else a visitor should do',
  ),
  field(
    'tagline',
    'pages',
    'textarea',
    'Haben Sie einen Slogan oder Claim, den Sie bereits nutzen?',
    'Do you have a slogan or tagline you already use?',
    { config: { rows: 2 } },
  ),
  field('usps', 'pages', 'textarea', 'Warum entscheiden sich Kunden für Sie?', 'Why do customers choose you?', {
    ai_check: true,
    config: { rows: 4 },
  }),
  field('languages', 'pages', 'radio', 'Welche Sprachen?', 'Which languages?', {
    required: true,
    options: [
      opt('single', 'Nur Deutsch', 'German only'),
      opt('de_en', 'Deutsch und Englisch', 'German and English'),
      opt('de_other', 'Deutsch und eine weitere Sprache', 'German and another language'),
      opt('three_plus', 'Drei oder mehr Sprachen', 'Three or more languages'),
    ],
  }),
  field('translation_by', 'pages', 'radio', 'Wer übersetzt?', 'Who does the translation?', {
    required: true,
    show_when: whenNot('languages', 'single'),
    options: [
      opt('us', 'Sie (Web Studio) übersetzen', 'You (Web Studio) translate it'),
      opt('client', 'Wir liefern die Übersetzungen', 'We provide the translations'),
    ],
  }),
  field(
    'translation_approver',
    'pages',
    'text',
    'Wer gibt die Übersetzung frei? Wir brauchen einen Namen',
    'Who approves the translation? We need a name',
    { required: true, show_when: whenNot('languages', 'single') },
  ),
  field('notice_proofreading', 'pages', 'notice', '', '', {
    show_when: when('translation_by', 'us'),
    config: { text_key: 'notice_proofreading', tone: 'info' },
  }),
];

/* ------------------------------------------------------------------ Screen 6 · integrations */

const accountHolder = (id: string, dep: string) =>
  field(id, 'integrations', 'text', 'Wer hat Zugriff auf das Konto?', 'Who holds the account?', {
    show_when: when('integrations', dep),
    help_de: 'Ein Name – niemals ein Passwort.',
    help_en: 'A name — never a password.',
  });

const integrations: OnbField[] = [
  field(
    'integrations',
    'integrations',
    'checkboxes',
    'Muss Ihre Website mit anderen Systemen verbunden werden?',
    'Does your site need to connect to any other system?',
    {
      required: true,
      options: [
        opt('maps', 'Google Maps', 'Google Maps'),
        opt('reviews', 'Google-Bewertungen', 'Google Reviews'),
        opt('booking', 'Online-Terminbuchung', 'Online booking'),
        opt('payments', 'Zahlungen', 'Payments'),
        opt('newsletter', 'Newsletter / E-Mail-Marketing', 'Newsletter / email marketing'),
        opt('crm', 'CRM', 'CRM'),
        opt('chat', 'Chat / Chatbot', 'Chat / chatbot'),
        opt('other', 'Etwas anderes', 'Something else'),
        opt('none', 'Keine Verbindungen nötig', 'No connections needed'),
      ],
      config: { min_checked: 1, exclusive: ['none'] },
    },
  ),
  field('maps_link', 'integrations', 'url', 'Link zu Ihrem Standort auf Google Maps', 'Paste the link to your location on Google Maps', {
    required: true,
    show_when: when('integrations', 'maps'),
  }),
  field('reviews_link', 'integrations', 'url', 'Link zu Ihren Bewertungen', 'Link to your reviews', {
    required: true,
    show_when: when('integrations', 'reviews'),
  }),
  field('booking_provider', 'integrations', 'text', 'Welches Buchungssystem?', 'Which booking system?', {
    show_when: when('integrations', 'booking'),
    placeholder_de: 'z. B. Calendly, Cal.com, Doctolib …',
    placeholder_en: 'e.g. Calendly, Cal.com, Doctolib …',
  }),
  accountHolder('booking_account_holder', 'booking'),
  field('booking_url', 'integrations', 'url', 'Link zu Ihrer Buchungsseite', 'Link to your booking page', {
    show_when: when('integrations', 'booking'),
  }),
  field('payment_provider', 'integrations', 'text', 'Welcher Zahlungsanbieter?', 'Which payment provider?', {
    show_when: when('integrations', 'payments'),
    placeholder_de: 'z. B. Stripe, PayPal, Mollie …',
    placeholder_en: 'e.g. Stripe, PayPal, Mollie …',
  }),
  accountHolder('payment_account_holder', 'payments'),
  field('payment_live', 'integrations', 'radio', 'Ist das Konto bereits aktiv?', 'Is the account already active?', {
    show_when: when('integrations', 'payments'),
    options: YES_NO_UNSURE,
  }),
  field('newsletter_provider', 'integrations', 'text', 'Welches Newsletter-Tool?', 'Which newsletter tool?', {
    show_when: when('integrations', 'newsletter'),
    placeholder_de: 'z. B. Mailchimp, Brevo, CleverReach …',
    placeholder_en: 'e.g. Mailchimp, Brevo, CleverReach …',
  }),
  accountHolder('newsletter_account_holder', 'newsletter'),
  field(
    'newsletter_list_exists',
    'integrations',
    'radio',
    'Gibt es schon eine Empfängerliste?',
    'Does a list of subscribers already exist?',
    { show_when: when('integrations', 'newsletter'), options: YES_NO },
  ),
  field('crm_name', 'integrations', 'text', 'Welches CRM nutzen Sie?', 'Which CRM do you use?', {
    required: true,
    show_when: when('integrations', 'crm'),
    placeholder_de: 'z. B. HubSpot, Salesforce, Pipedrive …',
    placeholder_en: 'e.g. HubSpot, Salesforce, Pipedrive …',
  }),
  accountHolder('crm_account_holder', 'crm'),
  field('crm_what_syncs', 'integrations', 'textarea', 'Was soll synchronisiert werden?', 'What should sync?', {
    show_when: when('integrations', 'crm'),
    config: { rows: 2 },
  }),
  field(
    'chat_provider',
    'integrations',
    'text',
    'Welcher Chat-Anbieter – falls schon vorhanden?',
    'Which chat provider, if you already have one?',
    { show_when: when('integrations', 'chat') },
  ),
  field(
    'other_integration',
    'integrations',
    'textarea',
    'Was ist es – und was soll es tun?',
    'What is it, and what should it do?',
    { show_when: when('integrations', 'other'), config: { rows: 3 } },
  ),
  field('gbp_link', 'integrations', 'url', 'Link zu Ihrem Google-Unternehmensprofil', 'Google Business Profile link'),
  field('social_profiles', 'integrations', 'textarea', 'Social-Media-Profile, eines pro Zeile', 'Social profiles, one per line', {
    config: { rows: 3 },
  }),
  field(
    'social_display',
    'integrations',
    'radio',
    'Im Footer verlinkt – oder als Feed in eine Seite eingebettet?',
    'Linked in the footer, or the feed embedded in a page?',
    {
      options: [
        opt('footer', 'Im Footer verlinkt', 'Linked in the footer'),
        opt('embedded', 'Feed in eine Seite eingebettet', 'Feed embedded in a page'),
      ],
    },
  ),
  field(
    'reviews',
    'integrations',
    'textarea',
    'Bewertungen oder Kundenstimmen – hier einfügen oder sagen, woher wir sie nehmen sollen',
    'Reviews or testimonials — paste them, or tell us where to take them from',
    { config: { rows: 4 } },
  ),
];

/* ------------------------------------------------------------------ Screen 7 · files */

const files: OnbField[] = [
  field(
    'assets_folder',
    'files',
    'url',
    'Link zu einem Ordner mit Ihrem Logo, Fotos und Dateien',
    'Link to a folder with your logo, photos and files',
    {
      required: true,
      help_de: 'Google Drive, Dropbox, OneDrive – Hauptsache, jeder mit dem Link kann den Ordner ansehen.',
      help_en: 'Google Drive, Dropbox, OneDrive — as long as anyone with the link can view it.',
      config: {
        required_unless: 'assets_upload',
        link_setting: 'onb_folder_help_url',
        link_label_de: 'So geben Sie einen Ordner frei',
        link_label_en: 'How to share a folder',
      },
    },
  ),
  field(
    'assets_sharing_confirmed',
    'files',
    'checkboxes',
    'Haben Sie die Freigabe so eingestellt, dass jeder mit dem Link zugreifen kann?',
    'Have you set sharing so anyone with the link can view?',
    { options: [opt('yes', 'Ja, jeder mit dem Link kann den Ordner ansehen', 'Yes, anyone with the link can view')] },
  ),
  field('assets_upload', 'files', 'upload', 'Oder laden Sie hier einige Dateien hoch', 'Or upload a handful of files here', {
    config: { max_files: 10, max_mb: 25 },
  }),
  field(
    'logo_vector',
    'files',
    'radio',
    'Haben Sie Ihr Logo als Vektordatei (.svg, .eps, .ai)?',
    'Do you have your logo as a vector file (.svg, .eps, .ai)?',
    { required: true, options: YES_NO_UNSURE },
  ),
  field('notice_logo_redraw', 'files', 'notice', '', '', {
    show_when: when('logo_vector', 'no'),
    config: { text_key: 'notice_logo_redraw', tone: 'warn' },
  }),
  field('photo_source', 'files', 'radio', 'Woher kommen Ihre Fotos?', 'Where do your photos come from?', {
    options: [
      opt('own', 'Eigene Fotos', 'Our own photos'),
      opt('shoot', 'Ein Fotoshooting ist geplant', 'A photo shoot is planned'),
      opt('stock', 'Stockfotos', 'Stock photos'),
      opt('portal', 'Aus einem Lieferanten- oder Herstellerportal', 'From a supplier portal'),
    ],
  }),
  field(
    'photo_portal',
    'files',
    'textarea',
    'Name des Portals – und wer organisiert unseren Zugang?',
    'Name of the portal, and who arranges our access',
    { required: true, show_when: when('photo_source', 'portal'), config: { rows: 2 } },
  ),
  field(
    'publish_rights',
    'files',
    'radio',
    'Haben Sie die Rechte, alles zu veröffentlichen, was Sie uns schicken?',
    "Do you have permission to publish everything you're sending us?",
    { required: true, options: YES_NO },
  ),
];

/* ------------------------------------------------------------------ Screen 8 · access & legal */

const accessLegal: OnbField[] = [
  field(
    'accounts',
    'access_legal',
    'textarea',
    'Welche Konten gibt es – und wer hat jeweils den Zugang?',
    'What accounts exist, and who holds each login?',
    {
      required: true,
      help_de: 'Domain, Registrar, Hosting, Analytics – nur Namen, niemals Passwörter.',
      help_en: 'Domain, registrar, hosting, analytics — names only, never passwords.',
      placeholder_de: 'Domain: IONOS – Frau Müller\nHosting: …',
      placeholder_en: 'Domain: IONOS – Ms Müller\nHosting: …',
      config: { rows: 5 },
    },
  ),
  field('domain', 'access_legal', 'text', 'Welche Domain soll die Website nutzen?', 'Which domain should the site use?', {
    required: true,
    help_de: 'Ihre Webadresse, z. B. www.meine-firma.de. Meistens ändert sich daran nichts.',
    help_en: "Your web address, e.g. www.my-company.de. Usually this doesn't change.",
    placeholder_de: 'www.meine-firma.de',
    placeholder_en: 'www.my-company.de',
  }),
  field(
    'legal_pages',
    'access_legal',
    'radio',
    'Ihre Rechtsseiten – Impressum und Datenschutzerklärung',
    'Your legal pages — Impressum and privacy policy',
    {
      required: true,
      ai_check: true,
      options: [
        opt('reuse', 'Vorhandene übernehmen', 'Reuse the existing ones'),
        opt('none', 'Wir haben keine', "We don't have any"),
        opt('unsure', 'Nicht sicher', 'Not sure'),
      ],
    },
  ),
  field('notice_legal_placeholder', 'access_legal', 'notice', '', '', {
    show_when: when('legal_pages', 'none'),
    config: { text_key: 'notice_legal_placeholder', tone: 'info' },
  }),
  field(
    'legal_reviewer',
    'access_legal',
    'text',
    'Wer auf Ihrer Seite hat sie zuletzt gelesen?',
    'Who on your side has read them recently?',
    { required: true, show_when: when('legal_pages', 'reuse') },
  ),
  field(
    'legal_extras',
    'access_legal',
    'checkboxes',
    'Brauchen Sie außerdem AGB, eine Widerrufsbelehrung oder einen AV-Vertrag?',
    'Do you also need AGB, a cancellation policy or a DPA?',
    {
      options: [
        opt('agb', 'AGB', 'Terms and conditions (AGB)'),
        opt('withdrawal', 'Widerrufsbelehrung', 'Cancellation policy'),
        opt('dpa', 'AV-Vertrag (DPA)', 'Data processing agreement (DPA)'),
        opt('none', 'Nichts davon', 'None of these'),
      ],
      config: { exclusive: ['none'] },
    },
  ),
  field(
    'sells_to_consumers',
    'access_legal',
    'radio',
    'Verkaufen Sie online an Verbraucher?',
    'Do you sell to consumers online?',
    { required: true, options: YES_NO_UNSURE },
  ),
  field('notice_bfsg', 'access_legal', 'notice', '', '', {
    show_when: when('sells_to_consumers', 'yes'),
    config: { text_key: 'notice_bfsg', tone: 'info' },
  }),
];

/* ------------------------------------------------------------------ Screen 9 · timing */

const timing: OnbField[] = [
  field('launch_date', 'timing', 'date', 'Gewünschter Starttermin', 'Preferred launch date', {
    required: true,
    config: { min_date: 'today' },
  }),
  field('launch_date_fixed', 'timing', 'radio', 'Steht dieser Termin fest?', 'Is that date fixed?', {
    options: YES_NO,
  }),
  field(
    'launch_date_reason',
    'timing',
    'text',
    'Woran hängt er – Veranstaltung, Messe, Kampagne?',
    'What is it tied to — an event, trade fair, campaign?',
    { required: true, show_when: when('launch_date_fixed', 'yes') },
  ),
  field(
    'content_ready_date',
    'timing',
    'date',
    'Bis wann können Sie uns alle Texte und Fotos schicken?',
    'Date you can send us all text and photos by',
    { required: true, ai_check: true, config: { min_date: 'today' } },
  ),
  field(
    'anything_else',
    'timing',
    'textarea',
    'Gibt es sonst noch etwas, das wir wissen sollten?',
    'Anything else we should know?',
    { config: { rows: 4 } },
  ),
];

/* ------------------------------------------------------------------ export */

export const fields: OnbField[] = [
  project,
  business,
  inboxes,
  design,
  pages,
  integrations,
  files,
  accessLegal,
  timing,
].flatMap((group) => group.map((f, i) => ({ ...f, sort: (i + 1) * 10 })));
