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
    de: `Das ist Ihr Website-Briefing. Bitte tragen Sie die Angaben ein, die wir zum Bau Ihrer Website brauchen. Alles, was Sie schreiben, wird am Ende zu einem Briefing zusammengefasst, das Sie prüfen und freigeben.

**Bevor Sie anfangen**

- Bitte halten Sie einen Ordnerlink mit Ihrem Logo und Ihren Fotos bereit, freigegeben, sodass jeder mit dem Link ihn ansehen kann
- Bitte nehmen Sie Ihre Rechtsangaben aus dem Registereintrag oder einer Rechnung: Registereintrag, USt-IdNr. und die inhaltlich verantwortliche Person
- Bitte suchen Sie zwei oder drei Websites aus, die Ihnen gefallen, und eine, die Ihnen nicht gefällt
- Bitte finden Sie heraus, wer den Zugang zu Ihrer Domain hat und zu allem, womit die Seite verbunden ist

Bitte tragen Sie nirgendwo in diesem Formular Passwörter ein. Zugänge regeln wir separat und sicher.`,
    en: `This is your website brief. Please fill in the information we need to build your website. Everything you write comes together at the end as one brief for you to check and approve.

**Before you start**

- Please have a folder link with your logo and photos ready, shared so anyone with the link can view it
- Please take your legal details from your register entry or an invoice: register entry, VAT ID and the person responsible for content
- Please pick two or three websites you like and one you do not
- Please find out who holds the login for your domain and for anything else the site connects to

Please do not put passwords anywhere in this form. We will arrange access separately and securely.`,
  },
  {
    key: 'landing_what_you_get',
    title_de: 'Was nach dem Absenden passiert',
    title_en: 'What happens after you submit',
    de: `- **Ihr erster Entwurf, meist innerhalb von 10 Tagen.** Wir machen aus Ihren Antworten einen Design-Eindruck und schicken ihn Ihnen.
- **Ihre Durchsicht.** Sie sagen uns, was geändert werden soll, und wir setzen es um. Drei Änderungsrunden sind enthalten.
- **Bau und Start.** Sobald Sie den Entwurf freigeben, bauen wir die Seite, meist in etwa drei Wochen, und veröffentlichen sie auf Ihrer Domain.`,
    en: `- **Your first design, usually within 10 days.** We turn your answers into a design impression and send it to you.
- **Your review.** You tell us what you want changed and we apply it. Three rounds of changes are included.
- **Build and go live.** Once you approve the design we build the site, usually in about three weeks and publish it on your domain.`,
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
    title_de: 'Bestätigung und wie das Projekt läuft',
    title_en: 'Confirmation and how the project runs',
    de: `Fast geschafft. Dieser letzte Teil beschreibt, was als Nächstes passiert und wie lange es dauert, damit es auf keiner Seite Überraschungen gibt.

Mit dem Absenden dieses Formulars bestätigen Sie, dass die obenstehenden Angaben nach bestem Wissen richtig und vollständig sind, dass Sie das Recht haben, alles Eingesandte zu verwenden, und dass dies der Leistungsumfang ist, auf dem unser Festpreis beruht.

**Wie lange es dauert**

Wir liefern einen Design-Eindruck innerhalb von 10 Tagen nach Eingang dieses vollständigen Formulars. Sobald Sie diesen Entwurf freigeben, bauen wir Ihre Website innerhalb von 3 Wochen.

Beide Zeiträume sind Kalendertage und beginnen mit einer vollständigen Übergabe. Ein lückenhaftes Formular startet die Uhr nicht. Wir fragen zuerst nach, was fehlt.

**Drei Änderungsrunden sind enthalten**

Eine nach dem Design-Eindruck und zwei während des Baus.

Eine Runde heißt: Sie sehen sich an, was wir geschickt haben, senden uns Ihre Änderungen in einer Nachricht, und wir setzen sie um. Bitte schicken Sie jede Runde am Stück. Rückmeldungen, die in Teilen ankommen, dauern länger und verbrauchen Ihre Runden schneller.

**Die drei Wochen hängen auch von Ihnen ab**

Wir bauen in den Lücken zwischen Ihren Durchsichten. Die Schätzung von drei Wochen setzt voraus, dass Sie sich an jedem Punkt der Durchsicht innerhalb von 5 Tagen melden.

Dauert eine Durchsicht länger, verschiebt sich der Liefertermin um denselben Zeitraum. Wir nennen Ihnen dann den neuen Termin, statt ihn stillschweigend verstreichen zu lassen.

**Was den Zeitplan ändert**

Zwei Dinge fallen aus den drei Runden und den drei Wochen heraus.

Änderungen an der Seitenstruktur, nachdem das Design freigegeben ist: Seiten hinzufügen oder entfernen, Abschnitte aufteilen, das Menü umbauen.

Ein grundlegendes Redesign: eine Richtungsänderung statt einer Verfeinerung dessen, was Sie freigegeben haben.

Beides ist kein Problem. Beides wird separat angeboten und eingeplant, und wir nennen Ihnen Kosten und neuen Liefertermin, bevor wir damit anfangen.`,
    en: `Almost done. This last part sets out what happens next and how long it takes, so there are no surprises on either side.

By submitting this form you confirm that the information above is accurate and complete to the best of your knowledge, that you have the right to use everything you have sent us and that this is the scope our fixed price is based on.

**How long it takes**

We deliver a design impression within 10 days of receiving this form complete. Once you approve that design, your website is built within 3 weeks.

Both periods are calendar days and both start from a complete handover. A form with gaps in it does not start the clock. We will come back to you for what is missing first.

**Three rounds of changes are included**

One round after the design impression and two during the build.

A round means you review what we have sent, send us your changes in one message and we apply them. Please do send each round in one go. Feedback that arrives in pieces takes longer to work through and uses up your rounds faster.

**The three weeks depends on you as well as us**

We build in the gaps between your reviews. The three week estimate assumes you come back to us within 5 days at each review point.

If a review takes longer than that, the delivery date moves by the same amount. We will always tell you the new date rather than letting it drift quietly.

**What changes the timeline**

Two things fall outside the three rounds and the three weeks.

Changes to the page structure after the design is approved: adding or removing pages, splitting sections, reorganising the menu.

A major redesign: a change of direction rather than a refinement of what you approved.

Neither is a problem. Both are quoted and scheduled separately and we will tell you the cost and the new delivery date before we start any of it.`,
  },
  {
    key: 'confirm_checks',
    title_de: 'Bitte bestätigen',
    title_en: 'Please confirm',
    de: `- Unsere Firmen- und Rechtsangaben sind richtig und aktuell
- Die Angaben, die wir gemacht haben, dürfen veröffentlicht werden
- Wir haben das Recht, Logo, Fotos und Texte zu verwenden, die wir Ihnen schicken
- Der hier beschriebene Umfang ist die Grundlage unseres Festpreises, alles später Hinzukommende wird separat angeboten
- Wir haben den Zeitplan, die drei Änderungsrunden und das, was darüber hinausgeht, gelesen und verstanden`,
    en: `- Our company and legal details are correct and current
- The facts we have given you may be published
- We have the right to use the logo, photos and text we are sending
- The scope described here is the basis of our fixed price and anything added later will be quoted separately
- We have read and understood the timeline, the three rounds of changes and what falls outside them`,
  },
  {
    key: 'done',
    title_de: 'Vielen Dank',
    title_en: 'Thank you',
    de: `Wir sehen uns das an und melden uns, falls etwas fehlt. Diese Prüfung ist der Start Ihres Projekts.

**Was wir später von Ihnen brauchen:** die eigentlichen Texte für jede Seite, sobald die Struktur steht, die Angaben für wiederkehrende Einträge, die wir Ihnen als einfache Tabelle schicken, statt sie hier abzutippen, Ihre Rückmeldung zur Vorschau in einem Dokument und den Domain-Zugang in der Woche, in der wir live gehen.

Eine Kopie von allem, was Sie uns gesagt haben, ist auf dem Weg zu Ihnen.`,
    en: `We will check this over and come back to you if anything is missing. That check is what starts your project.

**What we will ask for later:** the actual text for each page once the structure is agreed, the details for each repeating entry, which we will send as a simple spreadsheet rather than asking you to type it here, your feedback on the preview in one document and domain access in the week we go live.

A copy of everything you have told us is on its way to you.`,
  },
  {
    key: 'notice_no_passwords',
    de: `Bitte einen Namen, niemals ein Passwort. Zugänge regeln wir separat und sicher.`,
    en: `A name, please, never a password. We will arrange access separately and securely.`,
  },
  {
    key: 'understood',
    title_de: 'Das haben wir verstanden',
    title_en: 'Here is what we have understood',
    de: `Bevor Sie bestätigen, lesen Sie das bitte einmal durch. Wenn etwas davon falsch ist, lässt es sich jetzt viel günstiger korrigieren als nach dem Entwurf.

Sie sind {business_one_liner}, arbeiten {service_scope}, vor allem für {target_audience}.

Sie heben sich ab, weil {usps}.

Am meisten wollen Sie, dass ein Besucher {visitor_action}.

Es soll {tone_caption} wirken, {boldness_caption}, {colour_mood}, mit {brand_colours} und {typography_feel} Schrift. Die Fotos zeigen {photo_subjects}. Ganz oben auf der Startseite: {hero_intent}. {homepage_density}.

{reference_1_link} gefiel Ihnen wegen {reference_1_likes}.

Sie wollen nicht: {do_not_want}.

Wir stellen {proof_to_show} nach vorne.`,
    en: `Before you confirm, please read this back. If any of it is wrong, it is far cheaper to fix here than after we have designed it.

You are {business_one_liner}, working {service_scope}, mainly for {target_audience}.

You stand out because {usps}.

The thing you most want a visitor to do is {visitor_action}.

It should look {tone_caption}, {boldness_caption}, {colour_mood}, using {brand_colours}, with {typography_feel} lettering. The photos show {photo_subjects}. At the top of the homepage: {hero_intent}. {homepage_density}.

You liked {reference_1_link} for {reference_1_likes}.

You do not want {do_not_want}.

We will lead with {proof_to_show}.`,
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
    de: `Kein Problem. Wir setzen zunächst Platzhalter ein und sagen Ihnen rechtzeitig, was vor dem Start Ihrer Website nötig ist.`,
    en: `No problem. We can add placeholders for now and let you know what is needed before the website goes live.`,
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
