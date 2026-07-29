-- Long-form hover/tap tooltip copy for add-on cards (info icon next to the name).
-- Additive to note_de/note_en, which stays as the short always-visible line.
-- Not every addon has copy — the one-time SEO/GEO setup trio (seosetup, geosetup,
-- seogeosetup) and the BYOW line items (byospage, byositer) are intentionally left
-- null; AddonCard only renders the info icon when tooltip copy exists.

alter table addons add column tooltip_de text;
alter table addons add column tooltip_en text;

-- ------------------------------------------------------------- content › Seiten & Inhalte
update addons set
  tooltip_de = 'Ergänzt Seiten über die 4 im Paket enthaltenen hinaus — gleiches Design und mobile Optimierung. Sie liefern Text/Bilder, oder Sie ergänzen das Foto-Paket.',
  tooltip_en = 'Adds pages beyond the 4 included in your package — same design and mobile optimization. You supply text/images, or add the Photo package.'
  where id = 'page';
update addons set
  tooltip_de = 'Lizenzfreie Stock- oder leicht bearbeitete Bilder, ausgewählt und auf Ihrer Website platziert. Ergänzt die Standardseiten; kein Vor-Ort-Fotoshooting enthalten.',
  tooltip_en = 'Licensed stock or lightly-edited images selected and placed across your site. Complements the standard pages; no on-site photo shoot included.'
  where id = 'foto';
update addons set
  tooltip_de = 'Ein aufgefrischtes Logo plus Basisfarben und -schriften, web-ready. Erweitert die visuelle Identität auf Ihre enthaltenen Seiten.',
  tooltip_en = 'A refreshed logo plus basic colors and fonts, web-ready. Extends the visual identity applied to your included pages.'
  where id = 'logo';
update addons set
  tooltip_de = 'Ergänzt eine vollständige zweite Sprachversion zusätzlich zur enthaltenen 1 Sprache — professionelle Übersetzung inklusive URL-Struktur, Sprachumschalter und hreflang-Einrichtung.',
  tooltip_en = 'Adds a full second-language version on top of the 1 language included — professional translation plus URL structure, language switcher and hreflang setup.'
  where id = 'lang';

-- ------------------------------------------------------------- content › Funktionen & Integrationen
update addons set
  tooltip_de = 'Ermöglicht Ihnen, Seiten selbst zu bearbeiten und Blog/Events hinzuzufügen — geht über die festen Standardseiten hinaus. Inklusive kurzer Übergabe-Anleitung.',
  tooltip_en = 'Lets you edit pages and add blog/events yourself — goes beyond the standard fixed pages. Includes a short handover guide.'
  where id = 'cms';
update addons set
  tooltip_de = 'Monatliches Hosting, Updates und Support, damit Ihr CMS aktuell bleibt (erweitert die hosting-fertige Basiseinrichtung).',
  tooltip_en = 'Monthly hosting, updates and support to keep your CMS current (extends the base hosting-ready setup).'
  where id = 'cmsmon';
update addons set
  tooltip_de = 'Ergänzt Selbstbuchung über das enthaltene Kontaktformular hinaus. Abo des Drittanbieter-Tools wird separat abgerechnet.',
  tooltip_en = 'Adds self-scheduling beyond the included contact form. Third-party tool subscription billed separately.'
  where id = 'bookembed';
update addons set
  tooltip_de = 'Ein maßgeschneiderter Buchungsablauf, abgestimmt auf Ihre Leistungen und Verfügbarkeit — eine Stufe über dem fertigen Tool.',
  tooltip_en = 'A tailored booking flow matched to your services and availability — a step up from the ready-made tool.'
  where id = 'bookcustom';
update addons set
  tooltip_de = 'Ergänzt sichere Vorauszahlung direkt bei der Terminbuchung. Stripe-Transaktionsgebühren fallen an.',
  tooltip_en = 'Adds secure prepayment at the moment of booking. Stripe transaction fees apply.'
  where id = 'bookpay';
update addons set
  tooltip_de = 'Ergänzt einen einfachen Online-Shop (Produkte, Warenkorb, Stripe-Checkout) — nicht Teil der Standardseite. Produktdaten liefern Sie.',
  tooltip_en = 'Adds a basic online store (products, cart, Stripe checkout) — not part of the standard site. Product data supplied by you.'
  where id = 'ecom';
update addons set
  tooltip_de = 'Ein zusätzliches individuelles Formular zusätzlich zum Standard-Kontaktformular (z. B. Angebotsanfrage, Bewerbung).',
  tooltip_en = 'One extra custom form on top of the standard contact form (e.g. quote request, application).'
  where id = 'form';
update addons set
  tooltip_de = 'Ergänzt eine interaktive Standortkarte und erweitert die Standard-Kontaktseite.',
  tooltip_en = 'Adds an interactive location map, extending the standard contact page.'
  where id = 'maps';
update addons set
  tooltip_de = 'Ergänzt ein interaktives Element wie WhatsApp-Button, Bewertungs-Badge oder Click-to-Call — zusätzlich zu den enthaltenen Social-Links.',
  tooltip_en = 'Adds one interactive element such as a WhatsApp button, reviews badge or click-to-call — beyond the included social links.'
  where id = 'widgets';
update addons set
  tooltip_de = 'Ergänzt Live-Chat in Echtzeit. Abo des Drittanbieters wird separat abgerechnet.',
  tooltip_en = 'Adds real-time live chat. Third-party plan billed separately.'
  where id = 'chatwidget';
update addons set
  tooltip_de = 'Geschwindigkeits- und technisches Feintuning über den Standardbuild hinaus, um Googles Core Web Vitals zu verbessern.',
  tooltip_en = 'Speed and technical tuning above the standard build to improve Google''s Core Web Vitals.'
  where id = 'perf';

-- ------------------------------------------------------------- marketing › SEO & GEO
update addons set
  tooltip_de = 'Monatliches Keyword-Monitoring, ein Report und 1 SEO-Artikel/Monat — laufendes Marketing über den einmaligen Build hinaus.',
  tooltip_en = 'Monthly keyword monitoring, a report and 1 SEO article/month — ongoing marketing beyond the one-time build.'
  where id = 'seostarter';
update addons set
  tooltip_de = 'Ergänzt einen 2. Artikel/Monat, Wettbewerbs-Monitoring und einen monatlichen Call zusätzlich zu Starter.',
  tooltip_en = 'Adds a 2nd article/month, competitor monitoring and a monthly call on top of Starter.'
  where id = 'seopro';
update addons set
  tooltip_de = 'Verfolgt Ihre Sichtbarkeit in KI-Antworten (ChatGPT, Perplexity, Gemini).',
  tooltip_en = 'Tracks your visibility in AI answers (ChatGPT, Perplexity, Gemini).'
  where id = 'geomon';
update addons set
  tooltip_de = 'Bündelt SEO- und GEO-Monitoring zu ca. 17 % Rabatt gegenüber Einzelbuchung.',
  tooltip_en = 'Bundles SEO and GEO monitoring at ~17% off versus separately.'
  where id = 'seogeokombi';
update addons set
  tooltip_de = 'Erstellt/optimiert Ihr Google Unternehmensprofil, damit Sie in der lokalen Suche und bei Maps erscheinen.',
  tooltip_en = 'Creates/optimizes your Google Business Profile so you appear in local search and Maps.'
  where id = 'localseo';
update addons set
  tooltip_de = 'Gleicht Name/Adresse/Telefon über Verzeichnisse hinweg ab, um lokales Vertrauen zu stärken.',
  tooltip_en = 'Aligns your Name/Address/Phone across directories to boost local trust.'
  where id = 'citation';

-- ------------------------------------------------------------- marketing › Social Media
update addons set
  tooltip_de = '4 Beiträge/Monat, erstellt und veröffentlicht auf 1 Plattform — erweitert Ihre enthaltenen Social-Links um aktives Posting.',
  tooltip_en = '4 posts/month created and published on 1 platform — extends your included social links into active posting.'
  where id = 'socialbasic';
update addons set
  tooltip_de = 'Zeigt Ihren Live-Social-Feed direkt auf der Website (zusätzlich zu den enthaltenen Social-Links).',
  tooltip_en = 'Displays your live social feed directly on the site (adds to the included social links).'
  where id = 'socialfeed';

-- ------------------------------------------------------------- marketing › Blog & Newsletter
update addons set
  tooltip_de = 'Wiederkehrende, SEO-optimierte Artikel. Mindestlaufzeit 12 Monate; zusätzliche Einzelartikel je 60 €.',
  tooltip_en = 'Recurring SEO-optimized articles. 12-month minimum; extra one-off articles €60 each.'
  where id = 'blogabo';
update addons set
  tooltip_de = 'Richtet den Blog-Bereich ein (Kategorien, Layout, Styling) über die festen Standardseiten hinaus.',
  tooltip_en = 'Sets up the blog section (categories, layout, styling) beyond the standard fixed pages.'
  where id = 'blogsetup';
update addons set
  tooltip_de = 'Blog-Einrichtung plus Ihre ersten 3 SEO-Artikel zum vergünstigten Erstauftrags-Satz (~33 €/Artikel).',
  tooltip_en = 'Blog setup + your first 3 SEO articles at a discounted first-order rate (~€33/article).'
  where id = 'blogstarter';
update addons set
  tooltip_de = 'Bindet Brevo/Mailchimp/ActiveCampaign an, inklusive Anmeldeformular und Starter-Template — erweitert das enthaltene Kontaktformular um E-Mail-Marketing.',
  tooltip_en = 'Connects Brevo/Mailchimp/ActiveCampaign with a signup form and starter template — extends the included contact form into email marketing.'
  where id = 'newsletter';
update addons set
  tooltip_de = 'Wir schreiben, gestalten und versenden 2 Newsletter/Monat über Brevo für Sie.',
  tooltip_en = 'We write, design and send 2 newsletters/month via Brevo for you.'
  where id = 'newscare';

-- ------------------------------------------------------------- marketing › Werbung & Reporting
update addons set
  tooltip_de = 'Laufende Kampagnen-Einrichtung und -Optimierung. Ihr Werbebudget wird separat von Google/Meta abgerechnet.',
  tooltip_en = 'Ongoing campaign setup and optimization. Your ad budget is billed separately by Google/Meta.'
  where id = 'ads';
update addons set
  tooltip_de = 'Ein monatlicher, verständlicher Report zu Traffic und Suchperformance.',
  tooltip_en = 'A monthly plain-language report on traffic and search performance.'
  where id = 'ga4';

-- ------------------------------------------------------------- KI-Services
update addons set
  tooltip_de = 'Einmalige Einrichtung eines auf Ihr Unternehmen trainierten KI-Assistenten, der rund um die Uhr Fragen beantwortet — über das enthaltene Kontaktformular hinaus. Optionale CRM-Anbindung.',
  tooltip_en = 'One-time setup of an AI assistant trained on your business, answering questions 24/7 — beyond the included contact form. Optional CRM connection.'
  where id = 'aichatbot';
update addons set
  tooltip_de = 'Monatliches Hosting, Updates und Monitoring, damit der Chatbot zuverlässig läuft.',
  tooltip_en = 'Monthly hosting, updates and monitoring to keep the chatbot running.'
  where id = 'aichatmon';
update addons set
  tooltip_de = '4 KI-Content-Entwürfe/Monat zum Prüfen, Bearbeiten und Veröffentlichen.',
  tooltip_en = '4 AI content drafts/month for you to review, edit and publish.'
  where id = 'aicontent';
update addons set
  tooltip_de = 'Automatisierte, markenkonforme Antworten auf Ihre Google- und Yelp-Bewertungen.',
  tooltip_en = 'Automated, on-brand replies to your Google and Yelp reviews.'
  where id = 'aireviews';

-- ------------------------------------------------------------- Compliance
update addons set
  tooltip_de = 'DSGVO-konformer Cookie-Banner plus GA4-Analytics — erweitert das enthaltene Impressum & die Datenschutzerklärung um nachvollziehbare, konforme Analytics.',
  tooltip_en = 'GDPR-compliant cookie banner plus GA4 analytics — extends the included legal notice & privacy policy into trackable, compliant analytics.'
  where id = 'cookie';
update addons set
  tooltip_de = 'Barrierefreiheits-Audit plus die Umsetzung zur Erfüllung des BFSG-Standards — gesetzlich verpflichtend seit 28.06.2025.',
  tooltip_en = 'Accessibility audit plus the fixes to meet the BFSG standard — a legal requirement since 28 Jun 2025.'
  where id = 'bfsg';
update addons set
  tooltip_de = 'Prüft Ihre bestehende Website auf DSGVO-/Rechtsrisiken mit einer Liste empfohlener Maßnahmen.',
  tooltip_en = 'Reviews your existing site for GDPR/legal risks with a list of recommended fixes.'
  where id = 'dsgvocheck';
update addons set
  tooltip_de = 'Jährliche Überprüfung, damit Ihre Rechtstexte und Datenschutz-Einrichtung aktuell zu Regeländerungen bleiben.',
  tooltip_en = 'Yearly review to keep your legal texts and privacy setup current with regulation changes.'
  where id = 'dsgvoyear';

-- ------------------------------------------------------------- E-Mail & Verwaltung
update addons set
  tooltip_de = 'Bis zu 3 professionelle Adressen auf Ihrer Domain — zusätzlich zur enthaltenen 1 E-Mail-Adresse. Googles Lizenzgebühren werden separat von Google abgerechnet.',
  tooltip_en = 'Up to 3 professional addresses on your domain — beyond the 1 email included. Google''s license fees billed separately by Google.'
  where id = 'gws';
update addons set
  tooltip_de = 'Wir übernehmen die Rolle Ihres Workspace-Admins und kümmern uns um Konten und Einstellungen für Sie.',
  tooltip_en = 'We act as your Workspace admin, handling accounts and settings for you.'
  where id = 'gadmin';
