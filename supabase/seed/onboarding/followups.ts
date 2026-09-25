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
      'Bei den Rechtsseiten waren Sie sich noch nicht sicher. Dürfen wir Ihre bestehenden Rechtsseiten übernehmen, oder gibt es noch keine?',
    question_en:
      'You were not yet sure about your legal pages. May we carry over your existing ones, or are there none yet?',
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
      'Das ist kein Problem. Wir setzen zunächst Platzhalter ein. Impressum und Datenschutzerklärung sind gesetzlich vorgeschrieben, und wir übernehmen sie gern für Sie. Dürfen wir Ihnen dazu ein Angebot senden?',
    question_en:
      'That is no problem at all. We will put a placeholder in for now. These pages are required by law, and we would be glad to take care of them for you. May we send you a quote?',
    quick_replies: [qr('yes', 'Ja, gerne', 'Yes please'), qr('no', 'Nein, danke', 'No thanks')],
    writes_to: null,
    mode: 'set',
    raises: { yes: { code: 'interest', detail: 'legal_pages' } },
  },
  {
    id: 'fu_crm_name',
    trigger: { field: 'crm_provider', when: 'empty' },
    question_de: 'Welches CRM nutzen Sie, damit wir die Anbindung richtig vorbereiten?',
    question_en: 'Which CRM do you use, so we can prepare the connection properly?',
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
    question_de: 'Würden Sie uns den Link zu Ihrem Google-Unternehmensprofil geben? Daraus beziehen wir Karte und Bewertungen.',
    question_en: 'Would you share the link to your Google Business Profile? That is where your map and reviews come from.',
    quick_replies: [],
    writes_to: 'gbp_link',
    mode: 'set',
    raises: null,
  },
  {
    id: 'fu_page_list_thin',
    trigger: { field: 'page_list', when: 'lt_lines', value: 3 },
    question_de: 'Sie haben eine schlanke Seitenstruktur angegeben. Soll jede Leistung oder jedes Produkt eine eigene Seite erhalten?',
    question_en: 'You have chosen a lean page structure. Should each service or product have a page of its own?',
    quick_replies: [qr('yes', 'Ja', 'Yes'), qr('no', 'Nein', 'No'), qr('unsure', 'Weiß ich nicht', 'Not sure')],
    writes_to: 'page_relationships',
    mode: 'append',
    raises: null,
  },
  {
    id: 'fu_reference_likes',
    trigger: { field: 'references', when: 'lt_chars', value: 15, sub: 'likes' },
    question_de: 'Was genau spricht Sie an dieser Website an: der Aufbau, die Bildsprache oder die Art, wie sie geschrieben ist?',
    question_en: 'What is it about that website that appeals to you: the layout, the photography, or the way it is written?',
    quick_replies: [],
    writes_to: 'references',
    mode: 'set',
    raises: null,
  },
  {
    id: 'fu_dont_know',
    trigger: { when: 'dont_know' },
    question_de:
      'Bei „{label}“ haben Sie „Weiß ich nicht“ gewählt. Möchten Sie uns jetzt schon etwas dazu sagen? Andernfalls überspringen Sie die Frage einfach, und wir kommen zum genannten Termin darauf zurück.',
    question_en:
      'You chose "I do not know" for "{label}". Would you like to tell us anything about it now? If not, simply skip this and we will come back to you on the date you gave.',
    quick_replies: [],
    writes_to: null, // resolved to the triggering field at runtime
    mode: 'set',
    raises: null,
  },
  {
    id: 'fu_scope_flag',
    trigger: { when: 'flag', flag: 'scope_flag' },
    question_de:
      'Sie haben mehr Seiten aufgeführt, als Ihr Angebot umfasst. Wir melden uns dazu persönlich bei Ihnen, Sie müssen jetzt nichts weiter tun.',
    question_en:
      'You have listed more pages than your quote covers. We will be in touch personally about that, and there is nothing further for you to do now.',
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
      'Between the date your content arrives and your preferred launch, there is less time than we would usually allow for the build. Which matters more to you?',
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
