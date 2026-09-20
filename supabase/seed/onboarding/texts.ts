import type { OnbText } from '../../../src/lib/onboarding/types.ts';

type Pair = { key: string; title_de?: string; title_en?: string; de: string; en: string };

/**
 * Long-form copy rendered as markdown. Placeholders in braces (`{link}`, `{name}`,
 * `{company}`, `{minutes}`) are substituted at render time. Everything here is a first
 * draft for Angelica to edit in the CMS — the terms block in particular carries the three
 * corrections from the 16 Sep call.
 */
const pairs: Pair[] = [
  {
    key: 'landing',
    title_de: 'Ihr Website-Briefing',
    title_en: 'Your website brief',
    de: `Damit wir Ihre Website bauen können, brauchen wir ein paar Dinge von Ihnen – Firmendaten, Inhalte, Zugänge, Wünsche. Dieses Formular fragt sie Schritt für Schritt ab, merkt sich Ihren Fortschritt und fasst am Ende alles in einem Briefing zusammen, das Sie bestätigen.

Sie brauchen dafür etwa **{minutes} Minuten**. Sie können jederzeit unterbrechen: Ihr Fortschritt wird automatisch gespeichert, und über Ihren Link machen Sie später einfach weiter.`,
    en: `To build your website we need a few things from you — company details, content, access, preferences. This form asks for them step by step, remembers your progress, and ends by turning everything into a brief you confirm.

It takes about **{minutes} minutes**. You can stop at any time: your progress saves automatically, and your link brings you straight back.`,
  },
  {
    key: 'landing_what_you_get',
    title_de: 'Was Sie davon haben',
    title_en: 'What you get',
    de: `- **Ein Briefing statt E-Mail-Pingpong.** Alles, was wir für den Bau brauchen, an einem Ort.
- **Nachfragen sofort.** Wo eine Antwort fehlt oder unklar ist, fragen wir direkt hier nach – nicht Tage später.
- **Ihre Bestätigung.** Sie lesen unser Verständnis Ihrer Wünsche, ändern, was nicht stimmt, und geben frei.
- **Als PDF und per E-Mail.** Für Sie und für unser Team.`,
    en: `- **One brief instead of email ping-pong.** Everything we need to build, in one place.
- **Follow-ups right away.** Where an answer is missing or unclear we ask here — not days later.
- **Your confirmation.** You read our understanding of what you want, change what's wrong, and approve it.
- **As a PDF and by email.** For you and for our team.`,
  },
  {
    key: 'review_intro',
    title_de: 'Fast fertig',
    title_en: 'Almost there',
    de: `Wir haben Ihre Antworten durchgesehen. Zu ein paar Punkten haben wir noch kurze Nachfragen – jede davon können Sie auch überspringen. Danach fassen wir alles für Sie zusammen.`,
    en: `We've been through your answers. There are a few short follow-ups — every one of them can be skipped. After that we put everything together for you.`,
  },
  {
    key: 'review_nothing',
    title_de: 'Alles da',
    title_en: 'All there',
    de: `Wir haben keine Nachfragen. Wir fassen Ihre Angaben jetzt zusammen.`,
    en: `No follow-ups needed. We're putting your brief together now.`,
  },
  {
    key: 'brief_intro',
    title_de: 'So haben wir Sie verstanden',
    title_en: 'This is our understanding of what you want',
    de: `Lesen Sie das Briefing bitte in Ruhe durch. Stimmt etwas nicht, ändern Sie den Abschnitt direkt oder sagen Sie uns, was daran falsch ist – wir schreiben ihn dann neu. Was wir noch von Ihnen brauchen, steht am Ende. Mit Ihrer Bestätigung starten wir den Bau auf dieser Grundlage.`,
    en: `Please read the brief carefully. If something is wrong, edit the section directly or tell us what's off and we'll rewrite it. What we still need from you is listed at the end. Your confirmation is what we start building from.`,
  },
  {
    key: 'terms',
    title_de: 'Ablauf und Bedingungen',
    title_en: 'Process and terms',
    de: `**Ablauf.** Nach Ihrer Bestätigung dieses Briefings erhalten Sie innerhalb von **10 Tagen** einen ersten Design-Eindruck. Auf dieser Basis bauen wir Ihre Website **innerhalb von 3 bis 6 Wochen, je nach Aufwand – den genauen Zeitraum bestätigen wir mit Ihnen.**

**Änderungsrunden.** Enthalten sind **drei Änderungsrunden**. Strukturelle Änderungen oder ein grundlegendes Redesign fallen nicht darunter und werden separat besprochen.

**Ihre Mitwirkung.** Der Zeitplan setzt voraus, dass Sie **kleine Fragen innerhalb von 24 Stunden und größere innerhalb von 3 Tagen** beantworten und Texte, Fotos und Zugänge zum angegebenen Termin liefern. Verzögerungen auf Ihrer Seite verschieben den Zeitplan entsprechend.

**Inhalte.** Für die Richtigkeit der gelieferten Inhalte, Rechtstexte und Bildrechte sind Sie verantwortlich. Übersetzungen, die wir für Sie anfertigen, geben Sie vor Veröffentlichung frei.`,
    en: `**Process.** Once you confirm this brief you receive a first design impression within **10 days**. On that basis we build your website **within 3 to 6 weeks depending on effort — we'll confirm the exact period with you.**

**Rounds of changes.** **Three rounds of changes** are included. Structural changes or a major redesign fall outside this and are discussed separately.

**Your part.** The schedule assumes you answer **small questions within 24 hours and bigger ones within 3 days**, and that text, photos and access arrive by the date you gave. Delays on your side move the schedule accordingly.

**Content.** You are responsible for the accuracy of the content, legal texts and image rights you supply. Translations we produce for you are approved by you before publication.`,
  },
  {
    key: 'confirm_checks',
    title_de: 'Bestätigungen',
    title_en: 'Confirmations',
    de: `- Ich habe das Briefing gelesen; es beschreibt, was wir bauen sollen.
- Ich habe Ablauf und Bedingungen gelesen und akzeptiere sie.
- Ich bin berechtigt, dieses Briefing für das genannte Unternehmen zu bestätigen.`,
    en: `- I have read the brief; it describes what we are to build.
- I have read the process and terms and accept them.
- I am authorised to confirm this brief for the company named.`,
  },
  {
    key: 'done',
    title_de: 'Vielen Dank – Ihr Briefing ist bei uns',
    title_en: 'Thank you — your brief is with us',
    de: `Eine Kopie als PDF geht an Ihre E-Mail-Adresse, und unser Team hat dieselbe Fassung erhalten.

**Wie es weitergeht:** Wir lesen Ihr Briefing, klären offene Punkte aus „Was wir noch brauchen“ mit Ihnen und melden uns mit dem ersten Design-Eindruck.`,
    en: `A PDF copy is on its way to your email address, and our team has received the same version.

**What happens next:** we read your brief, clear anything under "What we still need" with you, and come back with the first design impression.`,
  },
  {
    key: 'notice_proofreading',
    title_de: 'Hinweis zur Übersetzung',
    title_en: 'Note on translation',
    de: `Wir übersetzen kostenfrei. Sie geben die übersetzten Inhalte vor Veröffentlichung frei – die inhaltliche Verantwortung bleibt bei Ihnen.`,
    en: `We translate free of charge. You approve the translated content before it goes live — content responsibility stays with you.`,
  },
  {
    key: 'notice_logo_redraw',
    title_de: 'Logo ohne Vektordatei',
    title_en: 'Logo without a vector file',
    de: `Ohne Vektordatei wirkt ein Logo auf großen Bildschirmen und im Druck schnell unscharf. Wir können es für Sie nachzeichnen – dazu melden wir uns separat bei Ihnen.`,
    en: `Without a vector file a logo quickly looks blurry on large screens and in print. We can redraw it for you — we'll come back to you on that separately.`,
  },
  {
    key: 'notice_legal_placeholder',
    title_de: 'Rechtsseiten',
    title_en: 'Legal pages',
    de: `Kein Problem – wir setzen zunächst Platzhalter ein. Impressum und Datenschutzerklärung sind gesetzlich vorgeschrieben; wir können sie für Sie erstellen und melden uns dazu bei Ihnen.`,
    en: `No problem — we'll put placeholders in for now. Impressum and privacy policy are required by law; we can take care of them for you and will come back to you on that.`,
  },
  {
    key: 'notice_bfsg',
    title_de: 'Barrierefreiheit (BFSG)',
    title_en: 'Accessibility (BFSG)',
    de: `Wer online an Verbraucher verkauft, unterliegt seit Juni 2025 dem Barrierefreiheitsstärkungsgesetz. Wir bauen Ihre Website nach gängigen Barrierefreiheits-Standards und weisen im Briefing darauf hin.`,
    en: `Businesses selling to consumers online have been subject to the German Accessibility Act (BFSG) since June 2025. We build to common accessibility standards and note this in your brief.`,
  },
  {
    key: 'email_save_link',
    title_de: 'Ihr Link zum Website-Briefing',
    title_en: 'Your link to the website brief',
    de: `Hallo {name},

hier ist Ihr persönlicher Link, mit dem Sie Ihr Website-Briefing jederzeit weiter ausfüllen können:

{link}

Ihr Fortschritt ist gespeichert. Der Link ist nur für Sie bestimmt – bitte geben Sie ihn nicht weiter.

Ihr Web Studio Team`,
    en: `Hello {name},

Here is your personal link to continue your website brief at any time:

{link}

Your progress is saved. The link is meant for you only — please don't share it.

Your Web Studio team`,
  },
  {
    key: 'email_brief_client',
    title_de: 'Ihr bestätigtes Website-Briefing – {company}',
    title_en: 'Your confirmed website brief — {company}',
    de: `Hallo {name},

vielen Dank für Ihre Bestätigung. Im Anhang finden Sie Ihr Briefing als PDF – die Grundlage, auf der wir Ihre Website bauen.

Was wir noch von Ihnen brauchen, steht im letzten Abschnitt. Wir melden uns dazu und mit dem ersten Design-Eindruck.

Ihr Web Studio Team`,
    en: `Hello {name},

Thank you for confirming. Attached is your brief as a PDF — the basis we build your website on.

Anything we still need from you is in the last section. We'll be in touch about that and with the first design impression.

Your Web Studio team`,
  },
  {
    key: 'email_brief_team',
    title_de: 'Onboarding bestätigt: {company}',
    title_en: 'Onboarding confirmed: {company}',
    de: `{company} ({name}, {email}) hat das Briefing bestätigt.

Anhänge: Briefing als PDF und der vollständige Datensatz als JSON.

Flags für den Vertrieb und offene Punkte stehen unten und im Admin: {admin_link}`,
    en: `{company} ({name}, {email}) has confirmed their brief.

Attachments: the brief as PDF and the full record as JSON.

Sales flags and open items are listed below and in the admin: {admin_link}`,
  },
  {
    key: 'pdf_footer',
    title_de: '',
    title_en: '',
    de: `IntelliPaaS Web Studio · Dieses Briefing wurde vom Kunden bestätigt und ist die Grundlage für den Bau. Fragen an das Web Studio Team.`,
    en: `IntelliPaaS Web Studio · This brief was confirmed by the client and is the basis for the build. Questions to the Web Studio team.`,
  },
];

export const texts: OnbText[] = pairs.flatMap((p) => [
  { id: `${p.key}_de`, key: p.key, locale: 'de' as const, title: p.title_de ?? '', content_markdown: p.de },
  { id: `${p.key}_en`, key: p.key, locale: 'en' as const, title: p.title_en ?? '', content_markdown: p.en },
]);
