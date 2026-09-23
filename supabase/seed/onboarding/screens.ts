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
      'In diesem Abschnitt geht es um Sie und das Paket, das Sie gebucht haben. Bitte prüfen Sie alles, was wir aus Ihrem Angebot übernommen haben, denn es ist nicht immer aktuell.',
    intro_en:
      'This section is about you and the package you booked. Please check anything we have carried over from your quote, because it is not always up to date.',
  },
  {
    id: 'business',
    kind: 'questions',
    title_de: 'Unternehmensdaten',
    title_en: 'Business details',
    short_de: 'Unternehmen',
    short_en: 'Business',
    intro_de:
      'Dieser Abschnitt baut Ihre Rechtsseiten. Bitte nehmen Sie diese Angaben aus Ihrem Registereintrag oder einer aktuellen Rechnung, denn sie stehen Wort für Wort auf Ihrer Seite.',
    intro_en:
      'This section builds your legal pages. Please take these details from your register entry or a recent invoice, because they appear on your site word for word.',
  },
  {
    id: 'inboxes',
    kind: 'questions',
    title_de: 'Postfächer und Benachrichtigungen',
    title_en: 'Inboxes and notifications',
    short_de: 'Postfächer',
    short_en: 'Inboxes',
    intro_de:
      'In diesem Abschnitt geht es um Ihre Postfächer und Benachrichtigungen. Bitte sagen Sie uns, über welche Adressen Sie erreichbar sind und wer erfahren soll, wenn eine Nachricht eingeht. Das ist nicht immer dasselbe.',
    intro_en:
      'This section is about your inboxes and notifications. Please tell us which addresses people can use to reach you and who should hear about it when a message arrives. They are not always the same.',
  },
  {
    id: 'design',
    kind: 'questions',
    title_de: 'Wie Ihre Seite aussehen und klingen soll',
    title_en: 'How your site should look and sound',
    short_de: 'Auftritt',
    short_en: 'Look & sound',
    intro_de:
      'In diesem Abschnitt geht es darum, wie Ihre Website aussehen und klingen soll. Bitte werden Sie so konkret wie möglich, denn alles auf diesem Bildschirm fließt direkt in Ihren ersten Entwurf.',
    intro_en:
      'This section is about how your website should look and sound. Please be as specific as you can, because everything on this screen goes straight into your first design.',
  },
  {
    id: 'pages',
    kind: 'questions',
    title_de: 'Seitenstruktur',
    title_en: 'Page structure',
    short_de: 'Seiten',
    short_en: 'Pages',
    intro_de:
      'In diesem Abschnitt geht es um die Struktur und die Seiten Ihrer Website. Bitte beginnen Sie mit Ihrem Angebot, denn daraus ergeben sich meist Ihre Seiten.',
    intro_en:
      'This section is about the structure and pages of your website. Please start with what you offer, because your pages usually follow from it.',
  },
  {
    id: 'integrations',
    kind: 'questions',
    title_de: 'Verbundene Systeme',
    title_en: 'Integrations and connected systems',
    short_de: 'Systeme',
    short_en: 'Systems',
    intro_de:
      'In diesem Abschnitt geht es um die Systeme, mit denen Ihre Website verbunden sein soll: Karten, Bewertungen, Buchung, Zahlungen oder Newsletter. Bitte geben Sie uns die Links, damit wir sie anbinden können.',
    intro_en:
      'This section is about the integrations your website needs, such as maps, reviews, booking, payments or your newsletter. Please give us the links so we can connect them to your site.',
  },
  {
    id: 'files',
    kind: 'questions',
    title_de: 'Logo, Fotos und Dateien',
    title_en: 'Logo, photos and files',
    short_de: 'Dateien',
    short_en: 'Files',
    intro_de:
      'In diesem Abschnitt geht es um die Dateien, aus denen wir Ihre Website bauen: Logo, Fotos und Dokumente. Bitte achten Sie darauf, dass ein Ordnerlink freigegeben ist, damit wir ihn öffnen können.',
    intro_en:
      'This section is about the files we build your website from: your logo, your photos and any documents. Please make sure any folder link you send is shared, so we can open it.',
  },
  {
    id: 'access_legal',
    kind: 'questions',
    title_de: 'Zugänge und Rechtliches',
    title_en: 'Access and legal',
    short_de: 'Zugänge & Recht',
    short_en: 'Access & legal',
    intro_de:
      'In diesem Abschnitt geht es um die Konten, von denen Ihre Website abhängt, und um die Rechtsseiten, die sie braucht. Bitte nur Namen und Anbieter, niemals Passwörter.',
    intro_en:
      'This section is about the accounts your website depends on and the legal pages it needs. Please give us names and providers only, never passwords.',
  },
  {
    id: 'timing',
    kind: 'questions',
    title_de: 'Zeitplan',
    title_en: 'Timing',
    short_de: 'Zeitplan',
    short_en: 'Timing',
    intro_de:
      'In diesem Abschnitt geht es um den Zeitplan. Bitte nennen Sie realistische Termine statt erhoffter, denn wir planen den ganzen Bau darum herum.',
    intro_en:
      'This section is about timing. Please give us realistic dates rather than hopeful ones, because we plan the whole build around them.'
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
