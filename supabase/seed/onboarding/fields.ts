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
    placeholder_de: 'Name',
    placeholder_en: 'Name',
  }),
  field('contact_company', 'project', 'text', 'Wie heißt Ihr Unternehmen?', 'What is your company called?', {
    required: true,
    placeholder_de: 'Ihr Firmenname',
    placeholder_en: 'Your company name',
  }),
  field('contact_email', 'project', 'email', 'Wie lautet Ihre E-Mail-Adresse?', 'What is your email address?', {
    required: true,
    help_de: 'Hierhin schicken wir Ihren Speicherlink und am Ende Ihr fertiges Briefing.',
    help_en: 'We will send your save link here and your finished brief at the end.',
    placeholder_de: 'name@ihrefirma.de',
    placeholder_en: 'name@yourcompany.com',
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
    placeholder_de: 'https://www.ihrefirma.de',
    placeholder_en: 'https://www.yourcompany.com',
  }),
];

/* ------------------------------------------------------------------ Step 2 · business details */

const business: OnbField[] = [
  field('legal_name', 'business', 'text', 'Wie lautet Ihr vollständiger Firmenname?', 'What is your full legal company name?', {
    required: true,
    help_de: 'Genau so, wie er im Registereintrag oder auf Ihren Rechnungen steht, nicht so, wie er auf Ihrer aktuellen Website steht.',
    help_en: 'Exactly as it appears on your register entry or your invoices, not as it appears on your current website.',
    placeholder_de: 'Ihr Firmenname',
    placeholder_en: 'Your company name',
  }),
  field('legal_form', 'business', 'text', 'Welche Rechtsform hat Ihr Unternehmen?', 'What is your legal form?', {
    required: true,
    placeholder_de: 'GmbH',
    placeholder_en: 'GmbH, UG, sole trader…',
  }),
  field('address_street', 'business', 'text', 'Wie lautet Ihre Straße und Hausnummer?', 'What is your street and number?', {
    required: true,
    placeholder_de: 'Straße und Hausnummer',
    placeholder_en: 'Street and number',
  }),
  field('address_city', 'business', 'text', 'Wie lauten Postleitzahl und Ort?', 'What is your postcode and city?', {
    required: true,
    placeholder_de: 'PLZ und Ort',
    placeholder_en: 'Postcode and town',
  }),
  field('vat_id', 'business', 'text', 'Wie lautet Ihre USt-IdNr.?', 'What is your VAT ID?', {
    placeholder_de: 'DE123456789',
    placeholder_en: 'DE123456789',
    config: {
      tooltip_de:
        'Die USt-IdNr. steht in Ihrem Impressum, wenn Sie eine haben. In Deutschland ist diese Angabe gesetzlich vorgeschrieben.',
      tooltip_en:
        'Your VAT ID goes on your legal notice if you have one. In Germany that is a legal requirement.',
    },
  }),
  field('register_entry', 'business', 'text', 'Wie lauten Registergericht und Registernummer?', 'What is your register court and number?', {
    help_de: 'Bitte frei lassen, wenn Sie keine haben.',
    help_en: 'Please leave it blank if you do not have one.',
    placeholder_de: 'Amtsgericht Musterstadt, HRB 12345',
    placeholder_en: 'Local court and number, e.g. HRB 12345',
    config: {
      tooltip_de:
        'Registergericht und Registernummer gehören ins Impressum. Außer bei einem Einzelunternehmen haben Sie das fast sicher.',
      tooltip_en:
        'The register court and number belong on your legal notice. Unless you are a sole trader, you will almost certainly have one.',
    },
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
      placeholder_de: 'Name',
      placeholder_en: 'Name',
      // A German media-law requirement with no equivalent in an English brief.
      config: {
        locales: ['de'],
        tooltip_de:
          'Nach § 18 Abs. 2 MStV muss im Impressum stehen, wer für die Inhalte verantwortlich ist. Das ist eine deutsche Vorgabe.',
      },
    },
  ),
  field('public_phone', 'business', 'tel', 'Welche Telefonnummer sollen wir auf der Seite zeigen?', 'What phone number should we show on the site?', {
    placeholder_de: '+49 …',
    placeholder_en: '+49 …',
    config: {
      tooltip_de:
        'Diese Nummer steht öffentlich auf Ihrer Website. Bitte geben Sie Ihre Mobilnummer nur an, wenn Sie sie dort zeigen wollen.',
      tooltip_en:
        'This number is published on your website. Only give us a mobile number if you want it shown there.',
    },
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
    placeholder_de: 'Ihre Stadt und 50 km drumherum, inklusive der Nachbarorte',
    placeholder_en: 'Your town and 50km around it, including the neighbouring places',
    config: { rows: 3 },
  }),
  field('second_address_details', 'business', 'textarea', 'Besuchen Kunden noch weitere Adressen?', 'Do customers visit any other addresses?', {
    help_de: 'Bitte frei lassen, wenn es nur eine gibt.',
    help_en: 'Please leave it blank if there is only one.',
    placeholder_de: 'Werkstatt, zweite Adresse. Nur Abholung, kein Ausstellungsraum.',
    placeholder_en: 'Workshop, second address. Collections only, no showroom.',
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
    placeholder_de: 'info@ihrefirma.de',
    placeholder_en: 'info@yourcompany.com',
  }),
  field('notification_routing', 'inboxes', 'repeater', 'Wohin soll welche Art von Nachricht gehen?', 'Where should each type of message go?', {
    required: true,
    show_when: when('routing_split', 'yes'),
    help_de: 'Bitte eine Zeile pro Art von Nachricht, mit der Adresse, an die sie gehen soll.',
    help_en: 'One row per type of message, with the address it should go to.',
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
          placeholder_de: 'info@ihrefirma.de',
          placeholder_en: 'info@yourcompany.com',
        },
      ],
    },
  }),
  field('approver', 'inboxes', 'text', 'Wer gibt die Website final frei?', 'Who gives final approval on the website?', {
    required: true,
    help_de: 'Bitte ein Name: die Person, deren Ja bedeutet, dass wir live gehen können.',
    help_en: 'One name, please: the person whose yes means we can go live.',
    placeholder_de: 'Name',
    placeholder_en: 'Name',
  }),
  field('content_sender', 'inboxes', 'text', 'Wer schickt uns Ihre Texte und Fotos?', 'Who will send us your text and photos?', {
    required: true,
    placeholder_de: 'Name',
    placeholder_en: 'Name',
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
  field('ideal_customer', 'design', 'textarea', 'Wer ist Ihr idealer Kunde?', 'Who is your ideal customer?', {
    required: true,
    ai_check: true,
    help_de: 'Der Kunde, von dem Sie gern zehn mehr hätten: was er braucht und warum er gut zu Ihnen passt.',
    help_en: 'The customer you would happily have ten more of: what they need and why they suit you.',
    placeholder_de: 'Paare, die ihr Haus gerade gekauft haben und das Bad einmal richtig machen wollen, statt es zu flicken.',
    placeholder_en: 'Couples who have just bought their house and want the bathroom done properly once, rather than patched.',
    config: { rows: 3, min_chars: 25, ai_assist: true },
  }),
  field('excluded_audience', 'design', 'textarea', 'Wen soll Ihre Website auf keinen Fall ansprechen?', 'Who should your website definitely not attract?', {
    help_de: 'Optional. Zum Beispiel Anfragen, die Sie nicht annehmen, oder Kunden, die nicht zu Ihnen passen.',
    help_en: 'Optional. For example enquiries you do not take on, or customers who are not a good fit.',
    placeholder_de: 'Schnäppchenjäger, die nur den günstigsten Preis vergleichen. Kleinreparaturen unter einer halben Stunde.',
    placeholder_en: 'Bargain hunters who only compare the cheapest price. Small repairs under half an hour.',
    config: { rows: 3 },
  }),
  field('usps', 'design', 'textarea', 'Warum wählen Kunden Sie und nicht Ihre Mitbewerber?', 'Why do customers choose you over your competitors?', {
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
    placeholder_en: 'Bathrooms built to last.',
    config: { rows: 2, ai_assist: true },
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
      opt('nothing', 'Nichts davon, wir halten es lieber reduziert', 'None of these, we prefer to keep it minimal'),
    ],
    config: { min_checked: 1, exclusive: ['nothing'] },
  }),
  field('factual_claims', 'design', 'textarea', 'Wie lauten die Angaben und wer hat sie bestätigt?', 'What are the details and who has confirmed them?', {
    required: true,
    show_when: whenNot('proof_to_show', 'nothing'),
    help_de: 'Bitte nennen Sie die Belege oder die Person, die sie für Ihre Website liefern kann.',
    help_en: 'Please provide the supporting details or the name of the person who can provide them for your website.',
    config: { rows: 4 },
  }),
  field('tone_scale', 'design', 'slider', 'Wie soll sich Ihre Seite anfühlen?', 'How should your site feel?', {
    required: true,
    help_de: 'Bitte stellen Sie sich einen Ihrer Kunden vor, der die Seite öffnet, und wählen Sie, was sich für ihn richtig anfühlen würde.',
    help_en: 'Please picture one of your customers opening it and choose what would feel right to them.',
    config: {
      min: 1,
      max: 5,
      step: 0.1,
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
  field('tone_note', 'design', 'textarea', 'Was meinen Sie damit genau?', 'What exactly do you mean by that?', {
    help_de: 'Optional. Zum Beispiel ein Gefühl, eine Marke oder eine Website, an die Sie dabei gedacht haben.',
    help_en: 'Optional. For example a feeling, a brand or a website you had in mind.',
    config: { rows: 2 },
  }),
  field('personality_scale', 'design', 'slider', 'Wie markant soll das Design sein?', 'How bold should the design be?', {
    required: true,
    help_de: 'Hier geht es darum, wie stark das Design selbst auffällt, nicht darum, wie förmlich es ist.',
    help_en: 'This one is about how much the design itself stands out, not how formal it is.',
    config: {
      min: 1,
      max: 5,
      step: 0.1,
      captions: [
        { de: 'Klar und minimalistisch', en: 'Clean and minimal' },
        { de: 'Zurückhaltend', en: 'Understated' },
        { de: 'Ausgewogen', en: 'Balanced' },
        { de: 'Eigenständig', en: 'Distinctive' },
        { de: 'Markant', en: 'Bold' },
      ],
      examples: [
        { de: 'Aufgeräumte Struktur, viel Weißraum', en: 'Well-organised structure, generous white space' },
        { de: 'Ruhige Farben, klassische Schrift', en: 'Calm colours, classic type' },
        { de: 'Ein paar Akzente, ohne laut zu werden', en: 'A few accents without shouting' },
        { de: 'Eigene Fotos, charaktervolle Schrift', en: 'Your own photography, characterful type' },
        { de: 'Große Gesten, starke Farben', en: 'Big gestures, strong colours' },
      ],
    },
  }),
  field('personality_note', 'design', 'textarea', 'Was meinen Sie damit genau?', 'What exactly do you mean by that?', {
    help_de: 'Optional. Zum Beispiel ein Gefühl, eine Marke oder eine Website, an die Sie dabei gedacht haben.',
    help_en: 'Optional. For example a feeling, a brand or a website you had in mind.',
    config: { rows: 2 },
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
          placeholder_de: 'https://www.beispielseite.de',
          placeholder_en: 'https://www.example-site.com',
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
      config: { max_files: 10, max_total_mb: 25 },
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
      opt('cool', 'Kühl und klar', 'Cool and crisp'),
      opt('bold', 'Kräftig und kontrastreich', 'Bold and high contrast'),
      opt('muted', 'Dezent und ruhig', 'Soft and calm'),
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
      opt('none', 'Kaum Fotos, lieber Schrift und Grafik', 'Few photos, led by type and graphics'),
    ],
    config: { min_checked: 1, exclusive: ['none'] },
  }),
  field('hero_intent', 'design', 'radio', 'Was sollen Menschen zuerst sehen, bevor sie scrollen?', 'What should people see first, before they scroll?', {
    required: true,
    options: [
      opt('work_photo', 'Ein Foto unserer Arbeit', 'A photo of our work'),
      opt('team_photo', 'Ein Foto von uns', 'A photo of us'),
      opt('statement', 'Einen klaren Satz, was wir tun', 'A clear statement of what we do'),
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
    placeholder_en: 'Bathroom renovation\nAccessible bathrooms\nHeating upgrades\nEmergency call-outs',
    config: { rows: 5, min_lines: 2, ai_assist: true },
  }),
  field('page_list', 'pages', 'textarea', 'Welche Seiten braucht Ihre Website?', 'What pages does your site need?', {
    required: true,
    help_de:
      'Eine pro Zeile, Unterseiten bitte mit einem Bindestrich einrücken. Rechtsseiten, die 404-Seite und die Danke-Seite sind immer dabei und zählen nicht mit.',
    help_en:
      'One per line and please start a sub-page with a dash. Legal pages, the 404 page and the thank you page are always included and do not count towards your total.',
    placeholder_de: 'Home\nLeistungen\n- Badsanierung\n- Barrierefreie Bäder\nÜber uns\nKontakt',
    placeholder_en: 'Home\nServices\n- Bathroom renovation\n- Accessible bathrooms\nAbout us\nContact',
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
  field('visitor_action', 'pages', 'radio', 'Was sollen Besucher auf Ihrer Website vor allem tun?', 'What is the main action you want visitors to take on your website?', {
    required: true,
    help_de: 'Bitte wählen Sie ein Hauptziel. Danach richten wir Aufbau, Inhalte und Handlungsaufrufe der Website aus.',
    help_en: 'Please select one main goal. We will use this to shape the website’s layout, content, and calls to action.',
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
    placeholder_de: 'Name',
    placeholder_en: 'Name',
  }),
  field('notice_proofreading', 'pages', 'notice', '', '', {
    show_when: when('translation_by', 'studio'),
    config: { text_key: 'notice_proofreading', tone: 'info' },
  }),
];

/* ------------------------------------------------------------------ Step 6 · integrations */

/** Provider / link / account holder, asked once per ticked system. */
/**
 * One connected service: which provider, and the link. Each service words these in its own
 * terms rather than sharing a composed prefix, and no block asks who holds the account —
 * we ask once, at the end of the step, who to contact when a link cannot be given.
 */
function integrationBlock(
  key: string,
  copy: {
    providerDe: string;
    providerEn: string;
    providerExample: string;
    urlDe: string;
    urlEn: string;
    urlPlaceholder: string;
    /** English placeholder, when the German one names a German address. */
    urlPlaceholderEn?: string;
    /** A CRM or a chat tool can be connected before the client digs out a link. */
    urlRequired?: boolean;
  },
): OnbField[] {
  return [
    field(`${key}_provider`, 'integrations', 'text', copy.providerDe, copy.providerEn, {
      required: true,
      show_when: when('integrations', key),
      placeholder_de: copy.providerExample,
      placeholder_en: copy.providerExample,
    }),
    field(`${key}_url`, 'integrations', 'url', copy.urlDe, copy.urlEn, {
      required: copy.urlRequired ?? true,
      show_when: when('integrations', key),
      placeholder_de: copy.urlPlaceholder,
      placeholder_en: copy.urlPlaceholderEn ?? copy.urlPlaceholder,
    }),
  ];
}

const integrations: OnbField[] = [
  field('integrations', 'integrations', 'checkboxes', 'Welche Tools oder Dienste soll Ihre Website anbinden?', 'Which tools or services should your website connect to?', {
    required: true,
    help_de: 'Bitte alles auswählen, was zutrifft. Zu jedem gewählten Dienst fragen wir anschließend die passenden Angaben ab.',
    help_en: 'Select all that apply. We will ask for the relevant details for each service you choose.',
    options: [
      opt('maps', 'Google Maps', 'Google Maps'),
      opt('reviews', 'Google-Bewertungen', 'Google Reviews'),
      opt('booking', 'Online-Terminbuchung', 'Online booking system'),
      opt('payments', 'Online-Zahlungen', 'Online payments'),
      opt('newsletter', 'E-Mail-Marketing oder Newsletter', 'Email marketing / newsletter'),
      opt('crm', 'CRM oder Kundendatenbank', 'CRM / customer database'),
      opt('chat', 'Live-Chat oder Chatbot', 'Live chat / chatbot'),
      opt('other', 'Ein anderer Dienst', 'Other service'),
      opt('none', 'Keine Anbindung nötig', 'No integrations needed'),
    ],
    config: { min_checked: 1, exclusive: ['none'] },
  }),
  ...integrationBlock('booking', {
    providerDe: 'Welches Buchungssystem nutzen Sie?',
    providerEn: 'Which booking provider do you use?',
    providerExample: 'Calendly',
    urlDe: 'Bitte teilen Sie den Link zu Ihrer Buchungsseite.',
    urlEn: 'Please share the link to your booking page.',
    urlPlaceholder: 'https://calendly.com/ihrefirma',
    urlPlaceholderEn: 'https://calendly.com/yourcompany',
  }),
  ...integrationBlock('payments', {
    providerDe: 'Welchen Zahlungsanbieter nutzen Sie?',
    providerEn: 'Which payment provider do you use?',
    providerExample: 'Stripe, PayPal, Square',
    urlDe: 'Bitte teilen Sie Ihren Zahlungs-, Checkout- oder Kontolink.',
    urlEn: 'Please share your payment, checkout, or account link.',
    urlPlaceholder: 'https://dashboard.stripe.com/…',
  }),
  field('payment_live', 'integrations', 'radio', 'Ist das Zahlungskonto schon aktiv?', 'Is the payment account already active?', {
    required: true,
    show_when: when('integrations', 'payments'),
    options: YES_NO_UNSURE,
  }),
  ...integrationBlock('newsletter', {
    providerDe: 'Welchen E-Mail-Marketing-Anbieter nutzen Sie?',
    providerEn: 'Which email marketing provider do you use?',
    providerExample: 'Mailchimp, Brevo, Klaviyo',
    urlDe: 'Bitte teilen Sie den Link zu Ihrem Anmeldeformular, Ihrer Newsletter-Seite oder Ihrem Konto.',
    urlEn: 'Please share the link to your signup form, newsletter page, or account.',
    urlPlaceholder: 'https://app.brevo.com/…',
  }),
  field('newsletter_list_exists', 'integrations', 'radio', 'Gibt es schon eine Empfängerliste?', 'Does a subscriber list already exist?', {
    required: true,
    show_when: when('integrations', 'newsletter'),
    options: YES_NO,
  }),
  ...integrationBlock('crm', {
    providerDe: 'Welches CRM oder welche Kundendatenbank nutzen Sie?',
    providerEn: 'Which CRM or customer database do you use?',
    providerExample: 'HubSpot, Salesforce, Pipedrive',
    urlDe: 'Bitte teilen Sie den passenden Konto-, Login- oder Hilfecenter-Link.',
    urlEn: 'Please share the relevant account, login, or help-centre link.',
    urlPlaceholder: 'https://app.hubspot.com/…',
    urlRequired: false,
  }),
  field('crm_what_syncs', 'integrations', 'textarea', 'Was soll mit dem CRM synchronisiert werden?', 'What should sync with the CRM?', {
    required: true,
    show_when: when('integrations', 'crm'),
    placeholder_de: 'Jede Anfrage wird ein Kontakt und Buchungsanfragen erzeugen eine Aufgabe.',
    placeholder_en: 'Every enquiry becomes a contact and booking requests create a task.',
    config: { rows: 3 },
  }),
  ...integrationBlock('chat', {
    providerDe: 'Welchen Live-Chat- oder Chatbot-Anbieter nutzen Sie?',
    providerEn: 'Which live-chat or chatbot provider do you use?',
    providerExample: 'Tidio, Intercom, HubSpot Chat',
    urlDe: 'Bitte teilen Sie den passenden Konto-, Login- oder Hilfecenter-Link.',
    urlEn: 'Please share the relevant account, login, or help-centre link.',
    urlPlaceholder: 'https://app.crisp.chat/…',
    urlRequired: false,
  }),
  field('other_integration', 'integrations', 'textarea', 'Welchen weiteren Dienst soll Ihre Website anbinden?', 'What other service would you like to connect to your website?', {
    required: true,
    show_when: when('integrations', 'other'),
    placeholder_de: 'Unser Warenwirtschaftssystem, damit der Shop zeigt, was wirklich verfügbar ist',
    placeholder_en: 'Our stock system, so the shop shows what is actually available',
    config: { rows: 3 },
  }),
  field('other_url', 'integrations', 'url', 'Bitte teilen Sie den passenden Link.', 'Please share the relevant link.', {
    show_when: when('integrations', 'other'),
    placeholder_de: 'https://…',
    placeholder_en: 'https://…',
  }),
  field('integrations_none_confirm', 'integrations', 'radio', 'Bitte bestätigen Sie, dass Sie derzeit keine Anbindung brauchen.', 'Please confirm that you do not currently need any website integrations.', {
    required: true,
    show_when: when('integrations', 'none'),
    options: [
      opt('confirmed', 'Bestätigt', 'Confirmed'),
      opt('unsure', 'Nicht sicher – bitte beraten Sie uns', 'Not sure — please advise'),
    ],
  }),
  field('integrations_contact', 'integrations', 'text', 'Wenn Sie keinen Link liefern können: Wen können wir nach den Angaben fragen?', 'If you cannot provide a link, who can we contact for the details?', {
    show_when: whenNot('integrations', 'none'),
    placeholder_de: 'Name',
    placeholder_en: 'Name',
  }),
  field('notice_no_passwords', 'integrations', 'notice', '', '', {
    show_when: whenNot('integrations', 'none'),
    config: { text_key: 'notice_no_passwords', tone: 'warn' },
  }),
  field('gbp_link', 'integrations', 'url', 'Bitte teilen Sie den Link zu Ihrem Google-Unternehmensprofil oder Ihrer Google-Bewertungsseite.', 'Please share the link to your Google Business Profile or Google reviews page.', {
    required: true,
    show_when: when('integrations', 'maps', 'reviews'),
    help_de: 'Dieser eine Link gibt uns Ihren Standort auf der Karte und Ihre Bewertungen, wir brauchen ihn also nur einmal.',
    help_en: 'This one link gives us your map location and your reviews, so we only need it once.',
    placeholder_de: 'https://g.page/ihrefirma',
    placeholder_en: 'https://g.page/yourcompany',
  }),
  field('social_profiles', 'integrations', 'textarea', 'Welche Social-Profile haben Sie?', 'What are your social profiles?', {
    help_de: 'Bitte eines pro Zeile.',
    help_en: 'One per line, please.',
    placeholder_de: 'https://instagram.com/ihrefirma\nhttps://facebook.com/ihrefirma',
    placeholder_en: 'https://instagram.com/yourcompany\nhttps://facebook.com/yourcompany',
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
    help_de: 'Bis zu zehn Dateien, zusammen höchstens 25 MB. Für größere Dateien nutzen Sie bitte den Ordnerlink oben.',
    help_en: 'Up to ten files, 25 MB in total. For larger files, please use the folder link above.',
    config: { max_files: 10, max_total_mb: 25 },
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
    placeholder_de: 'Händlerportal Ihres Lieferanten. Wer kann den Zugang beantragen?',
    placeholder_en: 'Your supplier\'s dealer portal. Who can request access?',
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
        { key: 'provider', type: 'text', label_de: 'Anbieter', label_en: 'Provider', placeholder_de: 'Anbieter', placeholder_en: 'Provider' },
        {
          key: 'holder',
          type: 'text',
          label_de: 'Wer hat den Zugang',
          label_en: 'Who holds the login',
          required: true,
          placeholder_de: 'Name',
          placeholder_en: 'Name',
        },
      ],
    },
  }),
  // Only for a brand new site. A client changing an existing one already gave us the
  // address on screen 1, and that is the domain, so asking again is asking twice.
  field('domain', 'access_legal', 'text', 'Welche Domain soll die Seite nutzen?', 'Which domain should the site use?', {
    show_when: when('project_type', 'new'),
    help_de: 'Die Adresse, unter der die neue Seite laufen soll, falls Sie schon eine haben.',
    help_en: 'The address the new site should run on, if you already have one.',
    placeholder_de: 'www.ihrefirma.de',
    placeholder_en: 'www.yourcompany.com',
    config: noneTick('Wir haben noch keine, bitte beraten Sie uns', 'We do not have one yet, please advise'),
  }),
  field('site_manager', 'access_legal', 'textarea', 'Wer betreut die Seite nach dem Start?', 'Who will look after the site after launch?', {
    help_de: 'Bitte eine Person pro Zeile, denn jede bekommt einen eigenen Zugang.',
    help_en: 'One per line, please, because each person gets their own login.',
    placeholder_de: 'Name, Aktuelles und Team-Seiten',
    placeholder_en: 'Name, news and team pages',
    config: { rows: 3 },
  }),
  field(
    'legal_pages',
    'access_legal',
    'radio',
    'Haben Sie bereits Rechtsseiten für Ihre Website?',
    'Do you already have legal pages for your website?',
    {
      required: true,
      help_de:
        'Dazu gehören zum Beispiel Impressum, Datenschutzerklärung, AGB, Widerrufsbelehrung oder andere rechtliche Hinweise.',
      help_en:
        'This may include an Impressum, privacy policy, terms and conditions, cancellation policy, or other legal notices.',
      options: [
        opt('reuse', 'Ja – bitte unsere vorhandenen Rechtsseiten nutzen', 'Yes — use our existing legal pages'),
        opt('none', 'Nein – wir brauchen Hilfe dabei', 'No — we need help with these'),
        opt('unsure', 'Ich bin nicht sicher', "I'm not sure"),
      ],
    },
  ),
  field('legal_pages_links', 'access_legal', 'textarea', 'Bitte teilen Sie die Links zu Ihren vorhandenen Rechtsseiten.', 'Please share the links to your existing legal pages.', {
    required: true,
    show_when: when('legal_pages', 'reuse'),
    placeholder_de: 'https://www.ihrefirma.de/impressum\nhttps://www.ihrefirma.de/datenschutz',
    placeholder_en: 'https://www.yourcompany.com/legal-notice\nhttps://www.yourcompany.com/privacy',
    config: { rows: 3 },
  }),
  field('legal_pages_advice', 'access_legal', 'textarea', 'Bitte teilen Sie vorhandene Links zu Rechtsseiten oder sagen Sie uns, wer dazu beraten kann.', 'Please share any existing legal-page links or tell us who can advise on this.', {
    show_when: when('legal_pages', 'unsure'),
    config: { rows: 3 },
  }),
  field('notice_legal_placeholder', 'access_legal', 'notice', '', '', {
    show_when: when('legal_pages', 'none'),
    config: { text_key: 'notice_legal_placeholder', tone: 'info' },
  }),
  field('legal_reviewer', 'access_legal', 'text', 'Wer prüft sie vor dem Start?', 'Who will check them before launch?', {
    required: true,
    show_when: when('legal_pages', 'reuse'),
    help_de: 'Ein Name reicht.',
    help_en: 'One name is enough.',
    placeholder_de: 'Name',
    placeholder_en: 'Name',
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
  field(
    'sells_to_consumers',
    'access_legal',
    'radio',
    'Können Kunden Produkte oder Leistungen direkt über die Website kaufen?',
    'Will customers be able to buy products or services directly on the website?',
    {
      required: true,
      help_de:
        'Zum Beispiel über einen Onlineshop, einen Zahlungslink, eine Anzahlung bei der Buchung, eine Mitgliedschaft oder den Verkauf digitaler Produkte.',
      help_en:
        'For example, through an online shop, payment link, booking deposit, membership, or digital-product checkout.',
      options: YES_NO_UNSURE,
    },
  ),
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
      placeholder_de: 'Die Seite zu unserer wichtigsten Leistung bringt uns die meisten Anfragen',
      placeholder_en: 'The page about our main service brings us most of our enquiries',
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
    placeholder_de: 'Unser Messestand im Frühjahr',
    placeholder_en: 'Our trade-fair stand in the spring',
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
      opt('no', 'Nein, da muss einiges korrigiert werden', 'No, a few things need correcting'),
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
  // 25 Sep: both asked for an address the client has already given us — once on the
  // project step and, where messages are routed separately, again on the inboxes step.
  // The legal page takes it from there rather than asking a third time.
  'site_emails',
  'public_email',
  // The 24 Sep corrections dropped "who holds the account?" from every integration
  // block, and the "other service" block no longer asks for a provider separately.
  'booking_account',
  'payments_account',
  'newsletter_account',
  'crm_account',
  'chat_account',
  'other_account',
  'other_provider',
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
