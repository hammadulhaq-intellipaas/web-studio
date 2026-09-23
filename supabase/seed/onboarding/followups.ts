import type { OnbFollowup, QuickReply } from '../../../src/lib/onboarding/types.ts';

const qr = (value: string, label_de: string, label_en: string): QuickReply => ({ value, label_de, label_en });

/**
 * The deterministic trigger → question table (spec §06, Job 2). Rules decide WHAT is
 * asked; the model only adds questions about free text that is not specific enough.
 * `{label}` in a question is replaced with the triggering field's label.
 */
const rows: Omit<OnbFollowup, 'sort' | 'active'>[] = [
  {
    id: 'fu_legal_pages_unsure',
    trigger: { field: 'legal_pages', when: 'equals', value: 'unsure' },
    question_de:
      'Bei den Rechtsseiten waren Sie sich nicht sicher: Dürfen wir Ihre aktuellen Rechtsseiten übernehmen – oder haben Sie noch keine?',
    question_en:
      "You weren't sure about the legal pages: are you happy for us to use your current legal pages, or don't you have any?",
    quick_replies: [
      qr('reuse', 'Die aktuellen übernehmen', 'Use the current ones'),
      qr('none', 'Wir haben keine', "Don't have any"),
      qr('unsure', 'Weiß ich nicht', 'Not sure'),
    ],
    writes_to: 'legal_pages',
    mode: 'set',
    raises: null,
  },
  {
    id: 'fu_legal_pages_offer',
    trigger: { field: 'legal_pages', when: 'equals', value: 'none' },
    question_de:
      'Kein Problem – wir setzen zunächst Platzhalter ein. Impressum und Datenschutzerklärung sind gesetzlich vorgeschrieben, und wir können sie für Sie erstellen. Sollen wir Ihnen dazu ein Angebot schicken?',
    question_en:
      "No problem — we'll put a placeholder in. These pages are required by law, and we can take care of them for you. Shall we send you a price?",
    quick_replies: [qr('yes', 'Ja, gerne', 'Yes please'), qr('no', 'Nein, danke', 'No thanks')],
    writes_to: null,
    mode: 'set',
    raises: { yes: { code: 'interest', detail: 'legal_pages' } },
  },
  {
    id: 'fu_crm_name',
    trigger: { field: 'crm_provider', when: 'empty' },
    question_de: 'Welches CRM nutzen Sie?',
    question_en: 'Which CRM do you use?',
    quick_replies: [
      qr('HubSpot', 'HubSpot', 'HubSpot'),
      qr('Salesforce', 'Salesforce', 'Salesforce'),
      qr('Pipedrive', 'Pipedrive', 'Pipedrive'),
    ],
    writes_to: 'crm_provider',
    mode: 'set',
    raises: null,
  },
  {
    id: 'fu_maps_link',
    trigger: { field: 'gbp_link', when: 'empty' },
    question_de: 'Können Sie den Link zu Ihrem Google-Unternehmensprofil einfügen? Daraus kommen Karte und Bewertungen.',
    question_en: 'Can you paste the link to your Google Business Profile? That is where the map and the reviews come from.',
    quick_replies: [],
    writes_to: 'gbp_link',
    mode: 'set',
    raises: null,
  },
  {
    id: 'fu_page_list_thin',
    trigger: { field: 'page_list', when: 'lt_lines', value: 3 },
    question_de: 'Sie haben nur wenige Seiten aufgeführt. Soll jede Leistung oder jedes Produkt eine eigene Seite bekommen?',
    question_en: 'You have listed only a few pages. Should each service or product have its own page?',
    quick_replies: [qr('yes', 'Ja', 'Yes'), qr('no', 'Nein', 'No'), qr('unsure', 'Weiß ich nicht', 'Not sure')],
    writes_to: 'page_relationships',
    mode: 'append',
    raises: null,
  },
  {
    id: 'fu_reference_likes',
    trigger: { field: 'references', when: 'lt_chars', value: 15, sub: 'likes' },
    question_de: 'Was genau gefällt Ihnen an dieser Seite? Der Aufbau, die Fotos, die Art, wie sie geschrieben ist?',
    question_en: 'What is it about that site you like? The layout, the photography, the way it is written?',
    quick_replies: [],
    writes_to: 'references',
    mode: 'set',
    raises: null,
  },
  {
    id: 'fu_dont_know',
    trigger: { when: 'dont_know' },
    question_de:
      'Bei „{label}“ haben Sie „Weiß ich nicht“ gewählt. Können Sie uns jetzt etwas dazu sagen? Wenn nicht, überspringen Sie die Frage einfach, wir kommen zum genannten Termin darauf zurück.',
    question_en:
      'You chose "I do not know" for "{label}". Can you tell us anything about it now? If not, please just skip it and we will come back to you on the date you gave.',
    quick_replies: [],
    writes_to: null, // resolved to the triggering field at runtime
    mode: 'set',
    raises: null,
  },
  {
    id: 'fu_scope_flag',
    trigger: { when: 'flag', flag: 'scope_flag' },
    question_de:
      'Sie haben mehr Seiten aufgeführt, als Ihr Angebot umfasst. Wir melden uns dazu bei Ihnen, Sie müssen jetzt nichts tun.',
    question_en:
      'You have listed more pages than your quote covers. We will come back to you about that and there is nothing for you to do now.',
    quick_replies: [qr('ok', 'Verstanden', 'Understood')],
    writes_to: null,
    mode: 'acknowledge',
    raises: null,
  },
  {
    id: 'fu_date_conflict',
    trigger: { when: 'flag', flag: 'date_conflict' },
    question_de:
      'Zwischen Ihrem Liefertermin für Texte und Fotos und dem gewünschten Start bleibt weniger Zeit als üblich für den Bau. Was ist für Sie wichtiger?',
    question_en:
      'There is less time than usual for the build between your content date and the launch date you want. Which matters more to you?',
    quick_replies: [
      qr('launch_fixed', 'Der Starttermin steht fest', 'The launch date is fixed'),
      qr('content_earlier', 'Inhalte können früher kommen', 'Content can come earlier'),
      qr('unsure', 'Weiß ich nicht', 'Not sure'),
    ],
    writes_to: null,
    mode: 'set',
    raises: null,
  },
];

export const followups: OnbFollowup[] = rows.map((r, i) => ({ ...r, sort: (i + 1) * 10, active: true }));
