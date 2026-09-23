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

/** "Nothing comes to mind" / "we do not have one": silence is never left ambiguous. */
const noneTick = (de: string, en: string) => ({ none_label_de: de, none_label_en: en });

/* ------------------------------------------------------------------ Step 1 · your project */

const project: OnbField[] = [
  field('contact_name', 'project', 'text', 'Wie heißen Sie?', 'What is your name?', {
    required: true,
    placeholder_de: 'Anna Meier',
    placeholder_en: 'Anna Meier',
  }),
  field('contact_company', 'project', 'text', 'Wie heißt Ihr Unternehmen?', 'What is your company called?', {
    required: true,
    placeholder_de: 'Müller Sanitär GmbH',
    placeholder_en: 'Müller Sanitär GmbH',
  }),
  field('contact_email', 'project', 'email', 'Wie lautet Ihre E-Mail-Adresse?', 'What is your email address?', {
    required: true,
    help_de: 'Hierhin schicken wir Ihren Speicherlink und am Ende Ihr fertiges Briefing.',
    help_en: 'We will send your save link here and your finished brief at the end.',
    placeholder_de: 'anna@mueller-sanitaer.de',
    placeholder_en: 'anna@mueller-sanitaer.de',
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
      help_de: 'Das steht in Ihrem Angebot, als die Konfiguration, die Sie bestätigt haben.',
      help_en: 'It is on your quote, as the configuration you confirmed.',
      options: [
        opt('14', '1 bis 4 Seiten', '1 to 4 pages', { min: 1, max: 4 }),
        opt('58', '5 bis 8 Seiten', '5 to 8 pages', { min: 5, max: 8 }),
        opt('912', '9 bis 12 Seiten', '9 to 12 pages', { min: 9, max: 12 }),
        opt('12p', 'Mehr als 12 Seiten', 'More than 12 pages', { min: 13, max: null }),
      ],
    },
  ),
  field(
    'project_type',
    'project',
    'radio',
    'Ist das eine ganz neue Website oder eine Änderung an Ihrer bestehenden?',
    'Is this a brand new website, or changes to one you already have?',
    {
      required: true,
      options: [
        opt('new', 'Eine ganz neue Website', 'A brand new website'),
        opt('changes', 'Änderungen an meiner bestehenden Seite', 'Changes to my existing site'),
      ],
    },
  ),
  field('existing_url', 'project', 'url', 'Wie lautet Ihre aktuelle Website-Adresse?', 'What is your current website address?', {
    required: true,
    show_when: when('project_type', 'changes'),
    placeholder_de: 'https://www.mueller-sanitaer.de',
    placeholder_en: 'https://www.mueller-sanitaer.de',
  }),
];

/* ------------------------------------------------------------------ Step 2 · business details */

const business: OnbField[] = [
  field('legal_name', 'business', 'text', 'Wie lautet Ihr vollständiger Firmenname?', 'What is your full legal company name?', {
    required: true,
    help_de: 'Genau so, wie er im Registereintrag oder auf Ihren Rechnungen steht, nicht so, wie er auf Ihrer aktuellen Website steht.',
    help_en: 'Exactly as it appears on your register entry or your invoices, not as it appears on your current website.',
    placeholder_de: 'Müller Sanitär GmbH',
    placeholder_en: 'Müller Sanitär GmbH',
  }),
  field('legal_form', 'business', 'text', 'Welche Rechtsform hat Ihr Unternehmen?', 'What is your legal form?', {
    required: true,
    placeholder_de: 'GmbH',
    placeholder_en: 'GmbH',
  }),
  field('address_street', 'business', 'text', 'Wie lautet Ihre Straße und Hausnummer?', 'What is your street and number?', {
    required: true,
    placeholder_de: 'Hauptstraße 14',
    placeholder_en: 'Hauptstraße 14',
  }),
  field('address_city', 'business', 'text', 'Wie lauten Postleitzahl und Ort?', 'What is your postcode and city?', {
    required: true,
    placeholder_de: '80331 München',
    placeholder_en: '80331 München',
  }),
  field('vat_id', 'business', 'text', 'Wie lautet Ihre USt-IdNr.?', 'What is your VAT ID?', {
    placeholder_de: 'DE123456789',
    placeholder_en: 'DE123456789',
  }),
  field('register_entry', 'business', 'text', 'Wie lauten Registergericht und Registernummer?', 'What is your register court and number?', {
    help_de: 'Bitte frei lassen, wenn Sie keine haben.',
    help_en: 'Please leave it blank if you do not have one.',
    placeholder_de: 'Amtsgericht München, HRB 12345',
    placeholder_en: 'Amtsgericht München, HRB 12345',
  }),
  field(
    'content_responsible',
    'business',
    'text',
    'Wer ist für den Inhalt Ihrer Website verantwortlich?',
    'Who is responsible for the content on your website?',
    {
      required: true,
      help_de: 'Die benannte Person nach § 18 Abs. 2 MStV, meist die Inhaberin oder der Geschäftsführer.',
      help_en: 'The named person under § 18 Abs. 2 MStV, usually the owner or managing director.',
      placeholder_de: 'Anna Meier',
      placeholder_en: 'Anna Meier',
    },
  ),
  field('public_phone', 'business', 'tel', 'Welche Telefonnummer sollen wir auf der Seite zeigen?', 'What phone number should we show on the site?', {
    placeholder_de: '+49 89 1234567',
    placeholder_en: '+49 89 1234567',
  }),
  field('public_email', 'business', 'email', 'Welche E-Mail-Adresse sollen wir auf der Seite zeigen?', 'What email address should we show on the site?', {
    required: true,
    help_de: 'Das muss nicht die Adresse sein, mit der Sie dieses Formular ausfüllen.',
    help_en: 'This may not be the one you are using to fill in the form.',
    placeholder_de: 'info@mueller-sanitaer.de',
    placeholder_en: 'info@mueller-sanitaer.de',
  }),
  field('opening_hours', 'business', 'textarea', 'Wie sind Ihre Öffnungszeiten?', 'What are your opening hours?', {
    required: true,
    allow_dont_know: true,
    help_de: 'Tag für Tag, inklusive Abend- oder Wochenenddienst.',
    help_en: 'Day by day, including any evening or weekend cover.',
    placeholder_de: 'Mo bis Fr, 8 bis 17 Uhr\nSa, 9 bis 12 Uhr\nSonntag geschlossen, Notdienst erreichbar',
    placeholder_en: 'Mon to Fri, 8am to 5pm\nSat, 9am to 12pm\nClosed Sunday, emergency line open',
    config: { rows: 4 },
  }),
  field('service_scope', 'business', 'radio', 'Wo arbeiten, verkaufen oder betreuen Sie?', 'Where do you work, sell or take clients?', {
    required: true,
    options: [
      opt('one_town', 'Ein Ort oder eine Region', 'One town or region'),
      opt('several', 'Mehrere Regionen', 'Several regions'),
      opt('national', 'Bundesweit', 'Nationwide'),
      opt('international', 'International', 'International'),
    ],
  }),
  field('regions_served', 'business', 'textarea', 'Welche Regionen bedienen Sie?', 'Which regions do you serve?', {
    required: true,
    show_when: when('service_scope', 'one_town', 'several'),
    help_de: 'Bitte genau, denn das steht später in Überschriften, Menüs, der Fußzeile und in dem Text, den Google anzeigt.',
    help_en: 'Please be precise, because this appears in headings, menus, footers and the text Google shows.',
    placeholder_de: 'München und 50 km drumherum, inklusive Dachau und Fürstenfeldbruck',
    placeholder_en: 'München and 50km around it, including Dachau and Fürstenfeldbruck',
    config: { rows: 3 },
  }),
  field('second_address_details', 'business', 'textarea', 'Besuchen Kunden noch weitere Adressen?', 'Do customers visit any other addresses?', {
    help_de: 'Bitte frei lassen, wenn es nur eine gibt.',
    help_en: 'Please leave it blank if there is only one.',
    placeholder_de: 'Werkstatt, Industriestraße 8, 80999 München. Nur Abholung, kein Ausstellungsraum.',
    placeholder_en: 'Werkstatt, Industriestraße 8, 80999 München. Collections only, no showroom.',
    config: { rows: 3 },
  }),
  field(
    'private_content',
    'business',
    'radio',
    'Gibt es etwas, das hinter ein Passwort oder einen Mitglieder-Login gehört?',
    'Is there anything that should sit behind a password or a member login?',
    {
      required: true,
      help_de: 'Bitte sagen Sie uns hier auch, was niemals öffentlich erscheinen darf, etwa Preise, Margen oder Kundennamen.',
      help_en: 'Please tell us here too if something must never appear publicly, such as prices, margins or named clients.',
      options: YES_NO_UNSURE,
    },
  ),
  field(
    'private_content_detail',
    'business',
    'textarea',
    'Was gehört dahinter und wer bekommt Zugang?',
    'What should sit behind it and who gets access?',
    {
      required: true,
      show_when: when('private_content', 'yes'),
      help_de: 'Mitgliederbereiche sind nicht Teil des gebuchten Pakets, wir kommen dazu separat auf Sie zu.',
      help_en: 'Member areas are not part of the booked package, so we will come back to you on this separately.',
      placeholder_de: 'Händlerpreisliste, nur für unsere zwölf Fachkunden',
      placeholder_en: 'Trade price list, for our twelve trade customers only',
      config: { rows: 3 },
    },
  ),
];

/* ------------------------------------------------------------------ Step 3 · inboxes */

const inboxes: OnbField[] = [
  field('site_emails', 'inboxes', 'textarea', 'Welche E-Mail-Adressen sollen auf Ihrer Seite stehen?', 'Which email addresses should appear on your site?', {
    required: true,
    help_de: 'Bitte nur Adressen, die auch wirklich jemand liest.',
    help_en: 'Please list only addresses that someone actually reads.',
    placeholder_de: 'info@mueller-sanitaer.de, allgemeine Anfragen\ntermine@mueller-sanitaer.de, Terminwünsche',
    placeholder_en: 'info@mueller-sanitaer.de, general enquiries\ntermine@mueller-sanitaer.de, appointments',
    config: { rows: 4 },
  }),
  field(
    'routing_split',
    'inboxes',
    'radio',
    'Sollen verschiedene Arten von Nachrichten an verschiedene Personen gehen?',
    'Should different types of message go to different people?',
    {
      required: true,
      options: [
        opt('yes', 'Ja, bitte getrennt verteilen', 'Yes, please route them separately'),
        opt('no', 'Nein, bitte alles an eine Adresse', 'No, please send everything to one address'),
      ],
    },
  ),
  field('routing_single', 'inboxes', 'email', 'An welche Adresse soll alles gehen?', 'Which address should everything go to?', {
    required: true,
    show_when: when('routing_split', 'no'),
    placeholder_de: 'info@mueller-sanitaer.de',
    placeholder_en: 'info@mueller-sanitaer.de',
  }),
  field('notification_routing', 'inboxes', 'repeater', 'Wohin soll welche Art von Nachricht gehen?', 'Where should each type of message go?', {
    required: true,
    show_when: when('routing_split', 'yes'),
    help_de: 'Wir haben die Adressen übernommen, die Sie uns genannt haben. Bitte ändern Sie alles, was woandershin soll.',
    help_en: 'We have carried over the addresses you gave us, so please change any that should go somewhere different.',
    config: {
      min_rows: 1,
      max_rows: 8,
      initial_rows: 2,
      add_label_de: 'Weitere hinzufügen',
      add_label_en: 'Add another',
      fields: [
        {
          key: 'type',
          type: 'text',
          label_de: 'Art der Nachricht',
          label_en: 'Type of message',
          required: true,
          placeholder_de: 'Allgemeine Anfrage',
          placeholder_en: 'General enquiry',
        },
        {
          key: 'address',
          type: 'email',
          label_de: 'Geht an',
          label_en: 'Send it to',
          required: true,
          placeholder_de: 'info@mueller-sanitaer.de',
          placeholder_en: 'info@mueller-sanitaer.de',
        },
      ],
    },
  }),
  field('approver', 'inboxes', 'text', 'Wer gibt die Website final frei?', 'Who gives final approval on the website?', {
    required: true,
    help_de: 'Bitte ein Name: die Person, deren Ja bedeutet, dass wir live gehen können.',
    help_en: 'One name, please: the person whose yes means we can go live.',
    placeholder_de: 'Anna Meier',
    placeholder_en: 'Anna Meier',
  }),
  field('content_sender', 'inboxes', 'text', 'Wer schickt uns Ihre Texte und Fotos?', 'Who will send us your text and photos?', {
    required: true,
    placeholder_de: 'Anna Meier',
    placeholder_en: 'Anna Meier',
  }),
];

/* ------------------------------------------------------------------ Step 4 · look and sound */

const design: OnbField[] = [
  field('business_one_liner', 'design', 'textarea', 'Was machen Sie, in einem Satz?', 'In one sentence, what do you do?', {
    required: true,
    ai_check: true,
    help_de: 'Bitte in den Worten, die Sie einem Kunden sagen würden, der vor Ihnen steht.',
    help_en: 'Please use the words you would say to a customer standing in front of you.',
    placeholder_de: 'Wir sanieren Bäder, schnell und sauber, und wir werden an dem Tag fertig, den wir zugesagt haben.',
    placeholder_en: 'We renovate bathrooms, quickly and cleanly and we finish on the day we said we would.',
    config: { rows: 3, min_chars: 25, ai_assist: true },
  }),
  field('target_audience', 'design', 'textarea', 'Für wen ist Ihre Website vor allem da?', 'Who is your website mainly for?', {
    required: true,
    ai_check: true,
    help_de: 'Bitte beschreiben Sie die Person, nicht den Markt.',
    help_en: 'Please describe the person rather than the market.',
    placeholder_de: 'Hauseigentümer über 50, die eine große Renovierung planen, meist ihre letzte.',
    placeholder_en: 'Homeowners over 50 planning one big renovation, usually their last one.',
    config: { rows: 3, min_chars: 25, ai_assist: true },
  }),
  field('usps', 'design', 'textarea', 'Warum wählen Kunden Sie und nicht die nächste Firma?', 'Why do customers choose you rather than the next firm?', {
    required: true,
    ai_check: true,
    help_de: 'Bitte konkret.',
    help_en: 'Please be concrete.',
    placeholder_de: 'Festpreis, bevor wir anfangen. Dreißig Jahre in derselben Straße. Wir arbeiten nie mit Subunternehmern.',
    placeholder_en: 'Fixed price agreed before we start. Thirty years in the same street. We never use subcontractors.',
    config: { rows: 4, min_chars: 30, ai_assist: true },
  }),
  field('tagline', 'design', 'textarea', 'Haben Sie einen Slogan, der auf die Seite soll?', 'Do you have a slogan or tagline you want on your site?', {
    placeholder_de: 'Bäder, die halten.',
    placeholder_en: 'Bäder, die halten.',
    config: { rows: 2 },
  }),
  field('proof_to_show', 'design', 'checkboxes', 'Welche Belege sollen wir auf Ihrer Seite zeigen?', 'What proof would you like us to show on your site?', {
    required: true,
    help_de: 'Bitte nur das, was Sie uns auch geben können, denn wir gestalten dafür Platz ein.',
    help_en: 'Please pick the ones you can actually give us, because we will design space for them.',
    options: [
      opt('reviews', 'Kundenbewertungen', 'Customer reviews'),
      opt('years', 'Jahre am Markt', 'Years in business'),
      opt('certifications', 'Zertifikate und Qualifikationen', 'Certifications and qualifications'),
      opt('clients', 'Kunden oder Partner mit Namen', 'Named clients or partners'),
      opt('awards', 'Auszeichnungen', 'Awards'),
      opt('guarantees', 'Garantien', 'Guarantees'),
      opt('work_photos', 'Fotos Ihrer Arbeit', 'Photos of your work'),
      opt('before_after', 'Vorher-nachher-Fotos', 'Before and after photos'),
      opt('nothing', 'Nichts davon, wir hätten es lieber schlicht', 'Nothing, we would rather keep it plain'),
    ],
    config: { min_checked: 1, exclusive: ['nothing'] },
  }),
  field('factual_claims', 'design', 'textarea', 'Wie lauten die Angaben und wer hat sie bestätigt?', 'What are the details and who has confirmed them?', {
    required: true,
    show_when: whenNot('proof_to_show', 'nothing'),
    help_de: 'Alles Sachliche auf Ihrer Seite ist eine öffentliche Aussage Ihres Unternehmens, deshalb veröffentlichen wir nur, was Sie bestätigt haben.',
    help_en: 'Anything factual on your site is a public statement by your company, so we only publish what you have confirmed.',
    placeholder_de: 'Jahre am Markt: gegründet 1994, bestätigt von Anna\nZertifikate: Meisterbetrieb seit 2003, bestätigt von Anna',
    placeholder_en: 'Years in business: founded 1994, confirmed by Anna\nCertifications: Meisterbetrieb since 2003, confirmed by Anna',
    config: { rows: 4 },
  }),
  field('tone_scale', 'design', 'slider', 'Wie soll sich Ihre Seite anfühlen?', 'How should your site feel?', {
    required: true,
    help_de: 'Bitte stellen Sie sich einen Ihrer Kunden vor, der die Seite öffnet, und wählen Sie, was sich für ihn richtig anfühlen würde.',
    help_en: 'Please picture one of your customers opening it and choose what would feel right to them.',
    config: {
      min: 1,
      max: 5,
      captions: [
        { de: 'Verspielt und fröhlich', en: 'Fun and playful' },
        { de: 'Warm und ungezwungen', en: 'Warm and informal' },
        { de: 'Freundlich, aber professionell', en: 'Friendly but professional' },
        { de: 'Professionell und zurückhaltend', en: 'Professional and restrained' },
        { de: 'Formell und seriös', en: 'Formal and serious' },
      ],
      examples: [
        { de: 'Kindergarten, Kreativwerkstatt, Trampolinpark', en: 'Kindergarten, art and craft studio, trampoline park' },
        { de: 'Friseur, Café, Personal Trainer', en: 'Hairdresser, café, personal trainer' },
        { de: 'Die meisten Handwerksbetriebe, die meisten Praxen', en: 'Most trades, most clinics' },
        { de: 'Beratung, Arztpraxis', en: 'Consultancy, medical practice' },
        { de: 'Kanzlei, Steuerberatung, Behörde', en: 'Law firm, accountant, government' },
      ],
    },
  }),
  field('personality_scale', 'design', 'slider', 'Wie markant soll das Design sein?', 'How bold should the design be?', {
    required: true,
    help_de: 'Hier geht es darum, wie stark das Design selbst auffällt, nicht darum, wie förmlich es ist.',
    help_en: 'This one is about how much the design itself stands out, not how formal it is.',
    config: {
      min: 1,
      max: 5,
      captions: [
        { de: 'Sehr schlicht', en: 'Very plain' },
        { de: 'Zurückhaltend', en: 'Understated' },
        { de: 'Ausgewogen', en: 'Balanced' },
        { de: 'Eigenständig', en: 'Distinctive' },
        { de: 'Markant', en: 'Bold' },
      ],
      examples: [
        { de: 'Klare Struktur, fast keine Dekoration', en: 'Clean structure, almost no decoration' },
        { de: 'Ruhige Farben, klassische Schrift', en: 'Calm colours, classic type' },
        { de: 'Ein paar Akzente, ohne laut zu werden', en: 'A few accents without shouting' },
        { de: 'Eigene Fotos, charaktervolle Schrift', en: 'Your own photography, characterful type' },
        { de: 'Große Gesten, starke Farben', en: 'Big gestures, strong colours' },
      ],
    },
  }),
  field('references', 'design', 'repeater', 'Welche Websites gefallen Ihnen?', 'Which websites do you like?', {
    required: true,
    help_de: 'Eine reicht, drei sind ideal. Bitte sagen Sie uns, welcher Teil Ihnen gefällt, nicht die ganze Seite.',
    help_en: 'One is enough, three is ideal. Please tell us the part you like, not the whole site.',
    config: {
      min_rows: 1,
      max_rows: 3,
      initial_rows: 1,
      add_label_de: 'Weitere Seite hinzufügen',
      add_label_en: 'Add another site',
      link_setting: 'onb_examples_url',
      link_label_de: 'Beispiele unserer Arbeit ansehen',
      link_label_en: 'See examples of our work',
      fields: [
        {
          key: 'url',
          type: 'url',
          label_de: 'Link',
          label_en: 'Link',
          required: true,
          placeholder_de: 'https://www.musterpraxis.de',
          placeholder_en: 'https://www.musterpraxis.de',
        },
        {
          key: 'likes',
          type: 'textarea',
          label_de: 'Was gefällt Ihnen daran?',
          label_en: 'What do you like about it?',
          required: true,
          min_chars: 15,
          placeholder_de: 'Wie die Leistungen aufgelistet sind, eine pro Karte mit Preis',
          placeholder_en: 'The way the treatments are listed, one per card with the price',
        },
        {
          key: 'dislikes',
          type: 'textarea',
          label_de: 'Was gefällt Ihnen nicht?',
          label_en: 'Anything you do not like?',
          placeholder_de: 'Zu viel Blau',
          placeholder_en: 'Too much blue',
        },
      ],
    },
  }),
  field(
    'reference_screenshots',
    'design',
    'upload',
    'Haben Sie Screenshots oder etwas anderes, das zeigt, was Ihnen gefällt?',
    'Do you have screenshots, or anything else that shows what you like?',
    {
      help_de: 'Eine Broschüre, ein Schaufenster, eine Zeitschriftenseite, wirklich alles.',
      help_en: 'A brochure, a shop front, a magazine page, anything at all.',
      config: { max_files: 10, max_mb: 25 },
    },
  ),
  field('avoid', 'design', 'textarea', 'Gibt es etwas, das Sie auf Ihrer Website nicht wollen?', 'Is there anything you do not want on your website?', {
    required: true,
    help_de: 'Bitte deutlich, denn wir behandeln das als harte Regel, nicht als Vorliebe.',
    help_en: 'Please be blunt, because we treat this as a hard rule rather than a preference.',
    placeholder_de: 'Keine Stockfotos von Menschen im Anzug. Nichts, was nach Krankenhaus aussieht. Keine Slider.',
    placeholder_en: 'No stock photos of people in suits. Nothing that looks like a hospital. No sliding banners.',
    config: { rows: 3, ...noneTick('Mir fällt nichts ein', 'Nothing comes to mind') },
  }),
  field(
    'brand_guidelines',
    'design',
    'radio',
    'Haben Sie ein Marken- oder Gestaltungshandbuch?',
    'Do you have a brand or design guideline document?',
    {
      required: true,
      help_de: 'Wenn ja, ersparen Sie uns das Raten, und wir halten uns daran.',
      help_en: 'If you have one it saves us guessing and we will follow it.',
      options: YES_NO_UNSURE,
    },
  ),
  field('brand_guidelines_link', 'design', 'url', 'Link oder Datei', 'Link or file', {
    required: true,
    show_when: when('brand_guidelines', 'yes'),
    placeholder_de: 'https://drive.google.com/…',
    placeholder_en: 'https://drive.google.com/…',
  }),
  field('brand_colours', 'design', 'text', 'Welche Farben hat Ihre Marke?', 'What are your brand colours?', {
    show_when: whenNot('brand_guidelines', 'yes'),
    help_de: 'Hex-Codes, wenn Sie sie haben, sonst bitte beschreiben.',
    help_en: 'Hex codes if you have them, otherwise please describe them.',
    placeholder_de: 'Das Dunkelblau von unseren Transportern und ein warmes Orange. #1E5EFF, #F27127',
    placeholder_en: 'The dark blue from our vans and a warm orange. #1E5EFF, #F27127',
  }),
  field('colour_mood', 'design', 'checkboxes', 'Welche Farbstimmung passt zu Ihrem Unternehmen?', 'What colour mood fits your business?', {
    required: true,
    help_de: 'Bitte wählen Sie, wie die Farben wirken sollen. Höchstens zwei.',
    help_en: 'Please choose how the colours should feel in use. Up to two.',
    options: [
      opt('light', 'Hell und luftig', 'Light and airy'),
      opt('dark', 'Dunkel und hochwertig', 'Dark and premium'),
      opt('warm', 'Warm und erdig', 'Warm and earthy'),
      opt('cool', 'Kühl und klinisch', 'Cool and clinical'),
      opt('bold', 'Kräftig und kontrastreich', 'Bold and high contrast'),
      opt('muted', 'Gedeckt und ruhig', 'Muted and calm'),
    ],
    config: { min_checked: 1, max_checked: 2 },
  }),
  field('typography_feel', 'design', 'radio', 'Welche Art von Schrift fühlt sich richtig an?', 'Which kind of lettering feels right?', {
    required: true,
    allow_dont_know: true,
    help_de: 'Nicht die genaue Schriftart, nur die Familie, zu der sie gehört.',
    help_en: 'Not the exact font, please, just the family it belongs to.',
    options: [
      opt('classic', 'Klassisch und traditionell', 'Classic and traditional'),
      opt('modern', 'Klar und modern', 'Clean and modern'),
      opt('technical', 'Technisch und präzise', 'Technical and precise'),
      opt('warm', 'Warm und rund', 'Warm and rounded'),
      opt('trust', 'Entscheiden Sie, wir vertrauen Ihnen', 'You choose, we trust you'),
    ],
  }),
  field('photo_subjects', 'design', 'checkboxes', 'Welche Fotos wollen Sie auf Ihrer Seite?', 'What photos do you want on your site?', {
    required: true,
    help_de: 'Wir gleichen das mit den Dateien ab, die Sie uns später schicken.',
    help_en: 'We will check this against the files you send us later.',
    options: [
      opt('work', 'Unsere fertigen Arbeiten', 'Our finished work'),
      opt('team', 'Uns und unser Team', 'Us and our team'),
      opt('premises', 'Unsere Räume', 'Our premises'),
      opt('products', 'Unsere Produkte', 'Our products'),
      opt('customers', 'Menschen wie unsere Kunden', 'People like our customers'),
      opt('none', 'Kaum Fotos, lieber Schrift und Grafik', 'Mostly no photos, type and graphics'),
    ],
    config: { min_checked: 1, exclusive: ['none'] },
  }),
  field('hero_intent', 'design', 'radio', 'Was sollen Menschen zuerst sehen, bevor sie scrollen?', 'What should people see first, before they scroll?', {
    required: true,
    options: [
      opt('work_photo', 'Ein Foto unserer Arbeit', 'A photo of our work'),
      opt('team_photo', 'Ein Foto von uns', 'A photo of us'),
      opt('statement', 'Einen klaren Satz, was wir tun', 'A plain statement of what we do'),
      opt('price', 'Einen Preis oder ein Angebot', 'A price or an offer'),
      opt('form', 'Ein Buchungs- oder Anfrageformular', 'A booking or enquiry form'),
      opt('video', 'Ein kurzes Video', 'A short video'),
    ],
  }),
  field('homepage_density', 'design', 'radio', 'Wie viel soll Ihre Startseite sagen?', 'How much should your homepage say?', {
    required: true,
    help_de: 'Es gibt kein Richtig, bitte entscheiden Sie danach, ob Ihre Kunden schnell entscheiden oder sich Zeit nehmen.',
    help_en: 'There is no right answer, so please choose by whether your customers decide quickly or take their time.',
    options: [
      opt('short', 'Kurz und knackig, sie sollen anrufen', 'Short and punchy, we want them to call'),
      opt('balanced', 'Ausgewogen, genug zum Entscheiden', 'Balanced, enough to decide'),
      opt('detailed', 'Ausführlich, unsere Kunden lesen alles, bevor sie kaufen', 'Detailed, our customers read everything before they buy'),
    ],
  }),
];

/* ------------------------------------------------------------------ Step 5 · page structure */

const pages: OnbField[] = [
  field('catalogue', 'pages', 'textarea', 'Was sind Ihre Produkte oder Leistungen?', 'What are your products or services?', {
    required: true,
    ai_check: true,
    help_de: 'Eine pro Zeile, genau so geschrieben, wie sie erscheinen sollen, denn daraus werden Überschriften und Seitennamen.',
    help_en: 'One per line, spelt exactly as they should appear, because these become section headings and page names.',
    placeholder_de: 'Badsanierung\nBarrierefreie Bäder\nHeizungsmodernisierung\nNotdienst',
    placeholder_en: 'Badsanierung\nBarrierefreie Bäder\nHeizungsmodernisierung\nNotdienst',
    config: { rows: 5, min_lines: 2, ai_assist: true },
  }),
  field('page_list', 'pages', 'textarea', 'Welche Seiten braucht Ihre Website?', 'What pages does your site need?', {
    required: true,
    help_de:
      'Eine pro Zeile, Unterseiten bitte mit einem Bindestrich einrücken. Rechtsseiten, die 404-Seite und die Danke-Seite sind immer dabei und zählen nicht mit.',
    help_en:
      'One per line and please start a sub-page with a dash. Legal pages, the 404 page and the thank you page are always included and do not count towards your total.',
    placeholder_de: 'Home\nLeistungen\n- Badsanierung\n- Barrierefreie Bäder\nÜber uns\nKontakt',
    placeholder_en: 'Home\nLeistungen\n- Badsanierung\n- Barrierefreie Bäder\nÜber uns\nKontakt',
    config: { rows: 7, min_lines: 3, count_band: 'booked_page_band' },
  }),
  field(
    'page_relationships',
    'pages',
    'textarea',
    'Sollen bestimmte Seiten besonders aufeinander verweisen?',
    'Should any pages link to each other in a particular way?',
    {
      placeholder_de: 'Jede Leistungsseite soll unten zwei verwandte Leistungen vorschlagen.',
      placeholder_en: 'Each service page should suggest two related services at the bottom.',
      config: { rows: 3 },
    },
  ),
  field('visitor_action', 'pages', 'radio', 'Was soll ein Besucher tun?', 'What should a visitor do?', {
    required: true,
    help_de: 'Bitte wählen Sie die wichtigste Sache, denn wir gestalten die ganze Seite darum herum.',
    help_en: 'Please pick the main one, because we design the whole site around it.',
    options: [
      opt('call', 'Sie anrufen', 'Call you'),
      opt('enquiry', 'Eine Anfrage schicken', 'Send an enquiry'),
      opt('booking', 'Einen Termin buchen', 'Book an appointment'),
      opt('buy', 'Etwas kaufen', 'Buy something'),
      opt('visit', 'Sie vor Ort besuchen', 'Visit you in person'),
      opt('signup', 'Sich für etwas anmelden', 'Sign up for something'),
      opt('other', 'Etwas anderes', 'Something else'),
    ],
  }),
  field('visitor_action_other', 'pages', 'text', 'Was soll ein Besucher sonst tun können?', 'What else should a visitor be able to do?', {
    required: true,
    show_when: when('visitor_action', 'other'),
    placeholder_de: 'Unseren Ratgeber zu Badezimmer-Zuschüssen herunterladen',
    placeholder_en: 'Download our guide to bathroom grants',
  }),
  field('languages', 'pages', 'radio', 'In welchen Sprachen soll Ihre Seite sein?', 'Which languages should your site be in?', {
    required: true,
    options: [
      opt('de', 'Nur Deutsch', 'German only'),
      opt('de_en', 'Deutsch und Englisch', 'German and English'),
      opt('de_other', 'Deutsch und eine weitere Sprache', 'German and another language'),
      opt('three_plus', 'Drei oder mehr Sprachen', 'Three or more languages'),
    ],
  }),
  field('translation_by', 'pages', 'radio', 'Wer übersetzt?', 'Who will do the translation?', {
    required: true,
    show_when: whenNot('languages', 'de'),
    options: [
      opt('studio', 'Web Studio übersetzt', 'Web Studio translates it'),
      opt('client', 'Wir liefern die Übersetzungen selbst', 'We supply the translations ourselves'),
    ],
  }),
  field('translation_approver', 'pages', 'text', 'Wer gibt die Übersetzung frei?', 'Who will approve the translation?', {
    required: true,
    show_when: whenNot('languages', 'de'),
    help_de: 'Bitte ein Name.',
    help_en: 'One name, please.',
    placeholder_de: 'Anna Meier',
    placeholder_en: 'Anna Meier',
  }),
  field('notice_proofreading', 'pages', 'notice', '', '', {
    show_when: when('translation_by', 'studio'),
    config: { text_key: 'notice_proofreading', tone: 'info' },
  }),
];

/* ------------------------------------------------------------------ Step 6 · integrations */

/** Provider / link / account holder, asked once per ticked system. */
function integrationBlock(key: string, labelDe: string, labelEn: string, providerPlaceholder: string, urlPlaceholder: string): OnbField[] {
  return [
    field(`${key}_provider`, 'integrations', 'text', `${labelDe}: Welchen Anbieter nutzen Sie?`, `${labelEn}: which provider do you use?`, {
      required: true,
      show_when: when('integrations', key),
      placeholder_de: providerPlaceholder,
      placeholder_en: providerPlaceholder,
    }),
    field(`${key}_url`, 'integrations', 'url', `${labelDe}: Wie lautet der Link?`, `${labelEn}: what is the link?`, {
      required: true,
      show_when: when('integrations', key),
      placeholder_de: urlPlaceholder,
      placeholder_en: urlPlaceholder,
    }),
    field(`${key}_account`, 'integrations', 'text', `${labelDe}: Wer hat das Konto?`, `${labelEn}: who holds the account?`, {
      required: true,
      show_when: when('integrations', key),
      placeholder_de: 'Anna Meier',
      placeholder_en: 'Anna Meier',
    }),
  ];
}

const integrations: OnbField[] = [
  field('integrations', 'integrations', 'checkboxes', 'Womit soll Ihre Seite verbunden sein?', 'Which systems should your site connect to?', {
    required: true,
    help_de: 'Bitte alles auswählen, was zutrifft, dann fragen wir die Details ab.',
    help_en: 'Please select everything that applies and we will ask you for the details.',
    options: [
      opt('maps', 'Google Maps', 'Google Maps'),
      opt('reviews', 'Google-Bewertungen', 'Google Reviews'),
      opt('booking', 'Online-Terminbuchung', 'Online booking'),
      opt('payments', 'Zahlungen', 'Payments'),
      opt('newsletter', 'Newsletter oder E-Mail-Marketing', 'Newsletter or email marketing'),
      opt('crm', 'CRM', 'CRM'),
      opt('chat', 'Chat oder Chatbot', 'Chat or chatbot'),
      opt('other', 'Etwas anderes', 'Something else'),
      opt('none', 'Keine Verbindungen nötig', 'No connections needed'),
    ],
    config: { min_checked: 1, exclusive: ['none'] },
  }),
  ...integrationBlock('booking', 'Terminbuchung', 'Online booking', 'Calendly', 'https://calendly.com/mueller-sanitaer'),
  ...integrationBlock('payments', 'Zahlungen', 'Payments', 'Stripe', 'https://dashboard.stripe.com/…'),
  field('payment_live', 'integrations', 'radio', 'Ist das Zahlungskonto schon aktiv?', 'Is the payment account already active?', {
    required: true,
    show_when: when('integrations', 'payments'),
    options: YES_NO_UNSURE,
  }),
  ...integrationBlock('newsletter', 'Newsletter', 'Newsletter', 'Brevo', 'https://app.brevo.com/…'),
  field('newsletter_list_exists', 'integrations', 'radio', 'Gibt es schon eine Empfängerliste?', 'Does a subscriber list already exist?', {
    required: true,
    show_when: when('integrations', 'newsletter'),
    options: YES_NO,
  }),
  ...integrationBlock('crm', 'CRM', 'CRM', 'HubSpot', 'https://app.hubspot.com/…'),
  field('crm_what_syncs', 'integrations', 'textarea', 'Was soll mit dem CRM synchronisiert werden?', 'What should sync with the CRM?', {
    required: true,
    show_when: when('integrations', 'crm'),
    placeholder_de: 'Jede Anfrage wird ein Kontakt, Terminwünsche erzeugen eine Aufgabe.',
    placeholder_en: 'Every enquiry becomes a contact and booking requests create a task.',
    config: { rows: 3 },
  }),
  ...integrationBlock('chat', 'Chat', 'Chat', 'Crisp', 'https://app.crisp.chat/…'),
  field('other_integration', 'integrations', 'textarea', 'Was ist es und was soll es tun?', 'What is it and what should it do?', {
    required: true,
    show_when: when('integrations', 'other'),
    placeholder_de: 'Unser Warenwirtschaftssystem, damit der Shop zeigt, was wirklich verfügbar ist',
    placeholder_en: 'Our stock system, so the shop shows what is actually available',
    config: { rows: 3 },
  }),
  ...integrationBlock('other', 'Weiteres System', 'The other system', 'Anbieter', 'https://…'),
  field('notice_no_passwords', 'integrations', 'notice', '', '', {
    show_when: whenNot('integrations', 'none'),
    config: { text_key: 'notice_no_passwords', tone: 'info' },
  }),
  field('gbp_link', 'integrations', 'url', 'Wie lautet der Link zu Ihrem Google-Unternehmensprofil?', 'What is your Google Business Profile link?', {
    required: true,
    show_when: when('integrations', 'maps', 'reviews'),
    help_de: 'Dieser eine Link gibt uns Ihren Standort auf der Karte und Ihre Bewertungen, wir brauchen ihn also nur einmal.',
    help_en: 'This one link gives us your map location and your reviews, so we only need it once.',
    placeholder_de: 'https://g.page/mueller-sanitaer',
    placeholder_en: 'https://g.page/mueller-sanitaer',
  }),
  field('social_profiles', 'integrations', 'textarea', 'Welche Social-Profile haben Sie?', 'What are your social profiles?', {
    help_de: 'Bitte eines pro Zeile.',
    help_en: 'One per line, please.',
    placeholder_de: 'https://instagram.com/muellersanitaer\nhttps://facebook.com/muellersanitaer',
    placeholder_en: 'https://instagram.com/muellersanitaer\nhttps://facebook.com/muellersanitaer',
    config: { rows: 3 },
  }),
  field('reviews', 'integrations', 'textarea', 'Haben Sie Bewertungen oder Referenzen, die wir nutzen dürfen?', 'Do you have reviews or testimonials we can use?', {
    help_de: 'Bitte einfügen oder uns sagen, woher wir sie nehmen sollen.',
    help_en: 'Please paste them, or tell us where to take them from.',
    placeholder_de: 'Bitte die von unserem Google-Profil verwenden.',
    placeholder_en: 'Please use the ones on our Google profile.',
    config: { rows: 3 },
  }),
];

/* ------------------------------------------------------------------ Step 7 · logo, photos, files */

const files: OnbField[] = [
  field('assets_folder', 'files', 'url', 'Wie lautet der Link zu Ihrem Ordner?', 'What is the link to your folder?', {
    required: true,
    help_de:
      'Google Drive, Dropbox, OneDrive und WeTransfer gehen alle. Bitte prüfen Sie, dass die Fotos darin sind, die Sie auf Ihrer Seite zeigen wollen.',
    help_en:
      'Google Drive, Dropbox, OneDrive and WeTransfer all work. Please check the photos you told us your site should show are in there.',
    placeholder_de: 'https://drive.google.com/drive/folders/…',
    placeholder_en: 'https://drive.google.com/drive/folders/…',
    config: {
      required_unless: 'assets_upload',
      link_setting: 'onb_folder_help_url',
      link_label_de: 'So geben Sie einen Ordner frei',
      link_label_en: 'How to share a folder',
    },
  }),
  field('assets_sharing_confirmed', 'files', 'checkboxes', 'Freigabe bestätigen', 'Confirm the sharing setting', {
    required: true,
    show_when: [{ key: 'assets_folder', values: ['__set'] }],
    options: [opt('yes', 'Ja, jeder mit dem Link kann sie ansehen', 'Yes, anyone with the link can view')],
    config: { min_checked: 1 },
  }),
  field('assets_upload', 'files', 'upload', 'Möchten Sie Ihre Dateien lieber hier hochladen?', 'Would you rather upload your files here?', {
    help_de: 'Bis zu zehn Dateien, je 25 MB. Bei mehr hält ein Ordnerlink alles an einem Ort.',
    help_en: 'Up to ten files, 25 MB each. For more than that, a folder link keeps everything in one place.',
    config: { max_files: 10, max_mb: 25 },
  }),
  field(
    'photo_portal_needed',
    'files',
    'radio',
    'Müssen Fotos aus einem Lieferantenportal kommen?',
    'Do any of your photos have to come from a supplier portal?',
    { required: true, options: YES_NO },
  ),
  field('photo_portal', 'files', 'textarea', 'Welches Portal und wer besorgt unseren Zugang?', 'Which portal and who arranges our access?', {
    required: true,
    show_when: when('photo_portal_needed', 'yes'),
    help_de: 'Bitte fangen Sie jetzt damit an, denn Lieferantenzugänge dauern meist ein bis zwei Wochen.',
    help_en: 'Please start this now, because supplier logins usually take a week or two to arrange.',
    placeholder_de: 'Grohe-Händlerportal. Anna kann den Zugang für Sie beantragen.',
    placeholder_en: 'Grohe dealer portal. Anna can request access for you.',
    config: { rows: 3 },
  }),
];

/* ------------------------------------------------------------------ Step 8 · access and legal */

const accessLegal: OnbField[] = [
  field('accounts_table', 'access_legal', 'repeater', 'Welche Konten gibt es und wer hat den Zugang?', 'What accounts exist and who holds each login?', {
    required: true,
    help_de: 'Bitte nur Anbieter und Namen, niemals Passwörter. Zugangsdaten tauschen wir später sicher aus.',
    help_en: 'Please give us providers and names only, never passwords. We will arrange access separately and securely.',
    config: {
      min_rows: 1,
      max_rows: 10,
      initial_rows: 4,
      add_label_de: 'Weiteres Konto hinzufügen',
      add_label_en: 'Add another account',
      fields: [
        {
          key: 'account',
          type: 'select',
          label_de: 'Konto',
          label_en: 'Account',
          required: true,
          options: [
            opt('domain', 'Domain', 'Domain'),
            opt('hosting', 'Hosting', 'Hosting'),
            opt('email', 'Geschäfts-E-Mail', 'Business email'),
            opt('gbp', 'Google-Unternehmensprofil', 'Google Business Profile'),
            opt('analytics', 'Google Analytics', 'Google Analytics'),
            opt('other', 'Etwas anderes', 'Anything else'),
          ],
        },
        { key: 'provider', type: 'text', label_de: 'Anbieter', label_en: 'Provider', placeholder_de: 'IONOS', placeholder_en: 'IONOS' },
        {
          key: 'holder',
          type: 'text',
          label_de: 'Wer hat den Zugang',
          label_en: 'Who holds the login',
          required: true,
          placeholder_de: 'Anna Meier',
          placeholder_en: 'Anna Meier',
        },
      ],
    },
  }),
  field('domain', 'access_legal', 'text', 'Welche Domain soll die Seite nutzen?', 'Which domain should the site use?', {
    required: true,
    help_de: 'Wenn die neue Seite unter einer anderen Adresse laufen soll, sagen Sie es uns bitte hier.',
    help_en: 'Please change it if the new site should use a different address.',
    placeholder_de: 'www.mueller-sanitaer.de',
    placeholder_en: 'www.mueller-sanitaer.de',
    config: noneTick('Wir haben noch keine, bitte beraten Sie uns', 'We do not have one yet, please advise'),
  }),
  field('site_manager', 'access_legal', 'textarea', 'Wer betreut die Seite nach dem Start?', 'Who will look after the site after launch?', {
    help_de: 'Bitte eine Person pro Zeile, denn jede bekommt einen eigenen Zugang.',
    help_en: 'One per line, please, because each person gets their own login.',
    placeholder_de: 'Anna Meier, Aktuelles und Team-Seiten',
    placeholder_en: 'Anna Meier, news and team pages',
    config: { rows: 3 },
  }),
  field(
    'legal_pages',
    'access_legal',
    'radio',
    'Was soll mit Ihren Rechtsseiten passieren, Impressum und Datenschutzerklärung?',
    'What should happen with your legal pages, the Impressum and privacy policy?',
    {
      required: true,
      help_de: 'Das Gesetz hat sich 2024 geändert, deshalb nennen die meisten älteren Impressumsseiten noch die alte Vorschrift.',
      help_en: 'German law changed in 2024, so most older Impressum pages still cite the old statute.',
      options: [
        opt('reuse', 'Bitte unsere aktuellen übernehmen', 'Please reuse our current ones'),
        opt('none', 'Wir haben keine', 'We do not have any'),
        opt('unsure', 'Wir sind nicht sicher', 'We are not sure'),
      ],
    },
  ),
  field('notice_legal_placeholder', 'access_legal', 'notice', '', '', {
    show_when: when('legal_pages', 'none'),
    config: { text_key: 'notice_legal_placeholder', tone: 'info' },
  }),
  field('legal_reviewer', 'access_legal', 'text', 'Wer prüft sie vor dem Start?', 'Who will check them before launch?', {
    required: true,
    show_when: when('legal_pages', 'reuse'),
    help_de: 'Ein Name reicht.',
    help_en: 'One name is enough.',
    placeholder_de: 'Anna Meier',
    placeholder_en: 'Anna Meier',
  }),
  field('legal_extras', 'access_legal', 'checkboxes', 'Brauchen Sie auch AGB, eine Widerrufsbelehrung oder einen AVV?', 'Do you also need AGB, a cancellation policy or an AVV?', {
    options: [
      opt('agb', 'AGB', 'Terms and conditions (AGB)'),
      opt('widerruf', 'Widerrufsbelehrung', 'Cancellation policy'),
      opt('avv', 'Auftragsverarbeitungsvertrag (AVV)', 'Data processing agreement (AVV)'),
      opt('none', 'Nichts davon', 'None of these'),
    ],
    config: { exclusive: ['none'] },
  }),
  field('sells_to_consumers', 'access_legal', 'radio', 'Verkaufen Sie online an Verbraucher?', 'Do you sell to consumers online?', {
    required: true,
    options: YES_NO_UNSURE,
  }),
  field('notice_bfsg', 'access_legal', 'notice', '', '', {
    show_when: when('sells_to_consumers', 'yes', 'unsure'),
    config: { text_key: 'notice_bfsg', tone: 'warn' },
  }),
  field(
    'seo_pages',
    'access_legal',
    'textarea',
    'Hat Ihre aktuelle Seite Seiten, die Ihnen Anfragen bringen?',
    'Does your current site have pages that bring you enquiries?',
    {
      show_when: when('project_type', 'changes'),
      help_de: 'Wenn Sie wissen, auf welche Seiten Google die Leute schickt, sagen Sie es uns, dann halten wir diese Adressen am Leben.',
      help_en: 'If you know which pages Google sends people to, please tell us and we will keep their addresses working.',
      placeholder_de: '/badsanierung-muenchen bringt uns die meisten Anfragen',
      placeholder_en: '/badsanierung-muenchen brings us most of our enquiries',
      config: { rows: 3 },
    },
  ),
];

/* ------------------------------------------------------------------ Step 9 · timing */

const timing: OnbField[] = [
  field('launch_date', 'timing', 'date', 'Wann soll die Seite live gehen?', 'When would you like the site to go live?', {
    required: true,
    config: { min_date: 'today' },
  }),
  field('launch_date_fixed', 'timing', 'radio', 'Steht dieses Datum fest?', 'Is that date fixed?', { options: YES_NO }),
  field('launch_date_reason', 'timing', 'text', 'Woran hängt es?', 'What is it tied to?', {
    required: true,
    show_when: when('launch_date_fixed', 'yes'),
    placeholder_de: 'Unser Stand auf der ISH im März',
    placeholder_en: 'Our stand at the ISH trade fair in March',
  }),
  field('content_ready_date', 'timing', 'date', 'Wann können Sie uns alle Texte und Fotos schicken?', 'When can you send us all your text and photos?', {
    required: true,
    help_de: 'Dieses Datum, nicht der Starttermin, entscheidet darüber, wann wir fertig werden können.',
    help_en: 'This date, not the launch date, is what actually determines when we can finish.',
    config: { min_date: 'today' },
  }),
  field('anything_else', 'timing', 'textarea', 'Gibt es sonst etwas, das wir wissen sollten?', 'Is there anything else we should know?', {
    help_de: 'Wirklich alles, auch was Sie für unwichtig halten.',
    help_en: 'Anything at all, please, including things you think might not matter.',
    placeholder_de: 'Wir ändern im Frühjahr unseren Namen, und mein Partner hat starke Meinungen zur Farbe Grün.',
    placeholder_en: 'We are changing our name in the spring and my business partner has strong views about the colour green.',
    config: { rows: 4 },
  }),
];

/* ------------------------------------------------------------------ Step 10 · review */

/**
 * Asked on the closing screen, not on a question screen: the client's verdict on the
 * read-back and, when it is wrong, what we got wrong. They live in the definition so the
 * answers survive a patch and travel with the export and the brief.
 */
const review: OnbField[] = [
  field('understood_ok', 'review', 'radio', 'Stimmt das so?', 'Is that right?', {
    options: [
      opt('yes', 'Ja, das sind wir', 'Yes, that is us'),
      opt('mostly', 'Im Wesentlichen, meine Korrekturen stehen unten', 'Mostly, see my corrections below'),
      opt('no', 'Nein, das haben wir schlecht erklärt', 'No, we have explained it badly'),
    ],
  }),
  field('understood_corrections', 'review', 'textarea', 'Was haben wir falsch verstanden?', 'What have we got wrong?', {
    show_when: whenNot('understood_ok', 'yes'),
    help_de: 'Bitte in Ihren eigenen Worten. Wir lesen jetzt lieber einen Absatz, als später neu zu gestalten.',
    help_en: 'Please tell us in your own words. We would rather read a paragraph now than redesign later.',
    config: { rows: 4 },
  }),
];

/* ------------------------------------------------------------------ export */

/**
 * Fields from the first version of the form that the 23 Sep 2026 spec dropped or replaced.
 * The upsert migration switches them off rather than deleting them, so answers already
 * given to them survive in the records that carry them.
 */
export const retiredFieldIds = [
  'crm_name',
  'payment_provider',
  'booking_account_holder',
  'payment_account_holder',
  'newsletter_account_holder',
  'crm_account_holder',
  'publish_rights',
  'public_pricing',
  'pricing_detail',
  'second_address',
  'page_count',
  'visitor_actions',
  'premises_photos',
  'maps_link',
  'reviews_link',
  'social_display',
  'logo_vector',
  'notice_logo_redraw',
  'photo_source',
  'accounts',
];

const all = [...project, ...business, ...inboxes, ...design, ...pages, ...integrations, ...files, ...accessLegal, ...timing, ...review];

export const fields: OnbField[] = all.map((f, i) => ({ ...f, sort: (i + 1) * 10 }));
