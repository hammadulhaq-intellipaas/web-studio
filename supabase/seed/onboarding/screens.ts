import type { OnbScreen } from '../../../src/lib/onboarding/types.ts';

/**
 * The ten screens of the onboarding form. Order here is the order in the stepper
 * (`sort` is assigned from it). `review` is the closing node: gap check → brief → confirm.
 */
const rows: Omit<OnbScreen, 'sort' | 'active'>[] = [
  {
    id: 'project',
    kind: 'questions',
    title_de: 'Ihr Projekt',
    title_en: 'Your project',
    short_de: 'Projekt',
    short_en: 'Project',
    intro_de:
      'Zuerst ein paar Angaben zu Ihnen und zum gebuchten Paket. Ihre Antworten werden automatisch gespeichert – Sie können jederzeit unterbrechen und über Ihren Link weitermachen.',
    intro_en:
      'A few details about you and the package you booked first. Your answers save automatically — you can stop at any time and pick up again from your link.',
  },
  {
    id: 'business',
    kind: 'questions',
    title_de: 'Unternehmensdaten',
    title_en: 'Business details',
    short_de: 'Unternehmen',
    short_en: 'Business',
    intro_de:
      'Diese Angaben landen auf Ihren Rechtsseiten und müssen exakt stimmen. Bitte prüfen Sie sie, statt sie von Ihrer alten Website zu kopieren – die meisten Fehler, die wir finden, wurden von einer früheren Seite übernommen.',
    intro_en:
      'These go on your legal pages, so they have to be exact. Please check them rather than copying from your old website — most of the errors we find came across from a previous site.',
  },
  {
    id: 'inboxes',
    kind: 'questions',
    title_de: 'Postfächer und Benachrichtigungen',
    title_en: 'Inboxes and notifications',
    short_de: 'Postfächer',
    short_en: 'Inboxes',
    intro_de: 'Wer soll erreichbar sein – und wer erfährt es, wenn über die Website etwas eingeht?',
    intro_en: 'Who should be reachable — and who hears about it when something arrives through the site?',
  },
  {
    id: 'design',
    kind: 'questions',
    title_de: 'Gestaltungsrichtung',
    title_en: 'Design direction',
    short_de: 'Design',
    short_en: 'Design',
    intro_de:
      'Es gibt hier kein Richtig oder Falsch. Je klarer Sie sagen, was Ihnen gefällt und was nicht, desto näher liegt der erste Entwurf an Ihrer Vorstellung.',
    intro_en:
      "There's no right or wrong here. The clearer you are about what you like and don't, the closer the first draft lands to what you had in mind.",
  },
  {
    id: 'pages',
    kind: 'questions',
    title_de: 'Seitenstruktur',
    title_en: 'Page structure',
    short_de: 'Seiten',
    short_en: 'Pages',
    intro_de: 'Welche Seiten braucht Ihre Website, was bieten Sie an – und was soll ein Besucher tun?',
    intro_en: 'Which pages does your site need, what do you offer — and what should a visitor do?',
  },
  {
    id: 'integrations',
    kind: 'questions',
    title_de: 'Verbundene Systeme',
    title_en: 'Integrations and connected systems',
    short_de: 'Systeme',
    short_en: 'Systems',
    intro_de: 'Alles, womit die Website verbunden sein soll: Karten, Bewertungen, Buchung, Zahlung, Newsletter, CRM.',
    intro_en: 'Everything the site should connect to: maps, reviews, booking, payments, newsletter, CRM.',
  },
  {
    id: 'files',
    kind: 'questions',
    title_de: 'Logo, Fotos und Dateien',
    title_en: 'Logo, photos and files',
    short_de: 'Dateien',
    short_en: 'Files',
    intro_de: 'Ein Ordnerlink reicht. Alternativ können Sie hier einige Dateien direkt hochladen – ohne Anmeldung.',
    intro_en: 'A folder link is enough. Or upload a handful of files right here — no sign-in needed.',
  },
  {
    id: 'access_legal',
    kind: 'questions',
    title_de: 'Zugänge und Rechtliches',
    title_en: 'Access and legal',
    short_de: 'Zugänge & Recht',
    short_en: 'Access & legal',
    intro_de: 'Bitte nur Namen und Zuständigkeiten – niemals Passwörter. Zugangsdaten tauschen wir später über einen sicheren Weg aus.',
    intro_en: 'Names and responsibilities only — never passwords. We exchange credentials later through a secure channel.',
  },
  {
    id: 'timing',
    kind: 'questions',
    title_de: 'Zeitplan',
    title_en: 'Timing',
    short_de: 'Zeitplan',
    short_en: 'Timing',
    intro_de: 'Wann soll die Website live gehen – und bis wann können Sie liefern?',
    intro_en: 'When should the site go live — and by when can you deliver?',
  },
  {
    id: 'review',
    kind: 'review',
    title_de: 'Prüfen und bestätigen',
    title_en: 'Review and confirm',
    short_de: 'Abschluss',
    short_en: 'Review',
    intro_de: null,
    intro_en: null,
  },
];

export const screens: OnbScreen[] = rows.map((r, i) => ({ ...r, sort: (i + 1) * 10, active: true }));
