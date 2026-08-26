-- Seed: 1:1 port of the prototype catalog (IntelliPaaS Web Konfigurator v2)
-- German texts verbatim from the design export; English authored here.

-- ------------------------------------------------------------- categories (2-level tree)
-- Top-level parents have parent_id null; sub-sections point at their parent.
insert into addon_categories (id, parent_id, name_de, name_en, note_de, note_en, sort) values
-- Website content & functionality
('content',       null,        'Website-Inhalte & Funktionen', 'Website content & functionality', null, null, 10),
('content_pages', 'content',   'Seiten & Inhalte', 'Pages & content', null, null, 10),
('inhalte',       'content',   'Funktionen & Integrationen', 'Features & integrations', null, null, 20),
-- Marketing
('marketing',     null,        'Marketing', 'Marketing', null, null, 20),
('seogeo_setup',  'marketing', 'SEO & GEO Setup', 'SEO & GEO Setup', null, null, 10),
('seogeo_bundles','marketing', 'SEO & GEO Marketing-Bundles', 'SEO & GEO Marketing Bundles', 'Monatlich, 12 Monate Mindestlaufzeit.', 'Monthly, 12-month minimum term.', 20),
('mkt_social',    'marketing', 'Social Media', 'Social media', null, null, 30),
('blogabo',       'marketing', 'Blog & Newsletter', 'Blog & newsletter', 'Blog-Abo: Mindestlaufzeit 12 Monate — im Abo deutlich günstiger als Einzelartikel (60 €).', 'Blog subscription: minimum term 12 months — much cheaper than single articles (€60).', 40),
('mkt_ads',       'marketing', 'Werbung & Reporting', 'Advertising & reporting', null, null, 50),
-- AI services
('ki',            null,        'KI-Services', 'AI services', null, null, 30),
-- Compliance
('compliance',    null,        'Compliance', 'Compliance', null, null, 40),
-- Email & administration
('email_admin',   null,        'E-Mail & Verwaltung', 'Email & administration', null, null, 60),
-- Bring Your Own Website (shown on the BYOW path only)
('byos',          null,        'Bring-Your-Own-Website-Leistungen', 'Bring Your Own Website services', null, null, 70);

-- ------------------------------------------------------------- bundles
insert into bundles (id, name, tag_de, tag_en, price, chips, backup_upgrade_price, backup_upgrade_label_de, backup_upgrade_label_en, backup_base_label_de, backup_base_label_en, sort) values
('silver', 'Silver', 'Der solide Start', 'The solid start', 1990, '[
  {"de":"Bis 4 Seiten","en":"Up to 4 pages"},
  {"de":"1 Sprache","en":"1 language"},
  {"de":"Kontaktformular","en":"Contact form"},
  {"de":"Social Links","en":"Social links"},
  {"de":"Impressum & Datenschutz","en":"Legal notice & privacy policy"},
  {"de":"SSL","en":"SSL"},
  {"de":"Hosting-ready DE/EU","en":"Hosting-ready DE/EU"},
  {"de":"1 E-Mail-Adresse (eigene Domain)","en":"1 email address (own domain)"},
  {"de":"Monatliches Backup","en":"Monthly backup"}
]', 29, 'Wöchentliches Backup', 'Weekly backup', 'monatlich', 'monthly', 10),
('gold', 'Gold', 'Der Hauptabschluss — bester Gegenwert', 'The main deal — best value', 2990, '[
  {"de":"Alles in Silver","en":"Everything in Silver"},
  {"de":"Bis 8 Seiten","en":"Up to 8 pages"},
  {"de":"2 Sprachen","en":"2 languages"},
  {"de":"Blog-Setup","en":"Blog setup"},
  {"de":"SEO-Basis (Meta, Sitemap, Search Console)","en":"SEO basics (meta, sitemap, Search Console)"},
  {"de":"Erweiterte Formularlogik","en":"Advanced form logic"},
  {"de":"Bis 3 E-Mail-Adressen","en":"Up to 3 email addresses"},
  {"de":"Wöchentliches Backup","en":"Weekly backup"}
]', 39, 'Tägliches Backup', 'Daily backup', 'wöchentlich', 'weekly', 20),
('platinum', 'Platinum', 'Kontrolle, Sicherheit, Eigenständigkeit', 'Control, security, independence', 4990, '[
  {"de":"Alles in Gold","en":"Everything in Gold"},
  {"de":"Bis 12 Seiten","en":"Up to 12 pages"},
  {"de":"3 Sprachen","en":"3 languages"},
  {"de":"Premium-Design","en":"Premium design"},
  {"de":"Cloudflare Security (WAF + DDoS)","en":"Cloudflare security (WAF + DDoS)"},
  {"de":"Conversion-Optimierung","en":"Conversion optimization"},
  {"de":"Performance-Tuning","en":"Performance tuning"},
  {"de":"Erweitertes Tracking","en":"Advanced tracking"},
  {"de":"Bis 5 E-Mail-Adressen","en":"Up to 5 email addresses"},
  {"de":"CMS inklusive — Seiten, Blog & Events selbst verwalten","en":"CMS included — manage pages, blog & events yourself"},
  {"de":"VIP-Support 3 Monate gratis","en":"VIP support free for 3 months"},
  {"de":"Tägliches Backup","en":"Daily backup"}
]', 99, 'Echtzeit-Backup', 'Real-time backup', 'täglich', 'daily', 30),
('byow', 'Bring Your Own Website', 'Sie bauen — wir stellen live', 'You build — we take it live', 1200, '[
  {"de":"Domain verbinden","en":"Connect your domain"},
  {"de":"Hosting (Vercel/Hetzner DE)","en":"Hosting (Vercel/Hetzner DE)"},
  {"de":"SSL","en":"SSL"},
  {"de":"E-Mail via eigener Domain","en":"Email via your own domain"},
  {"de":"Cloudflare Basis-Proxy","en":"Cloudflare basic proxy"},
  {"de":"Spam-Schutz Formular","en":"Form spam protection"},
  {"de":"SEO-Grundlagen (Favicon, OG-Tags, Sitemap)","en":"SEO basics (favicon, OG tags, sitemap)"},
  {"de":"Impressum-Vorlage","en":"Legal notice template"},
  {"de":"Passwortschutz bis Go-live","en":"Password protection until go-live"},
  {"de":"Abnahmetest","en":"Acceptance test"}
]', null, null, null, null, null, 40);

-- ------------------------------------------------------------- addons
-- tooltip_de/en: longer explainer shown on hover/tap of the info icon (additive to
-- note_de/note_en). null where docs/tooltip-copy-source.md has no matching copy.
insert into addons (id, category_id, name_de, name_en, note_de, note_en, billing, price_now, price_later, qty, tiers, included_in, byow_only, not_byow, ai_bundle_member, badge_de, badge_en, highlight, sort, tooltip_de, tooltip_en) values
-- content › Seiten & Inhalte
('page',        'content_pages', 'Zusätzliche Website-Seiten', 'Additional website pages', null, null, 'once', 190, 290, '{"min":1,"max":25,"unit_de":"Seiten","unit_en":"pages"}', null, '{}', false, true, false, null, null, false, 10, 'Ergänzt Seiten über die 4 im Paket enthaltenen hinaus — gleiches Design und mobile Optimierung. Sie liefern Text/Bilder, oder Sie ergänzen das Foto-Paket.', 'Adds pages beyond the 4 included in your package — same design and mobile optimization. You supply text/images, or add the Photo package.'),
('foto',        'content_pages', 'Foto-/Bildpaket', 'Photo/image package', null, null, 'once', 290, 440, null, null, '{}', false, false, false, null, null, false, 20, 'Lizenzfreie Stock- oder leicht bearbeitete Bilder, ausgewählt und auf Ihrer Website platziert. Ergänzt die Standardseiten; kein Vor-Ort-Fotoshooting enthalten.', 'Licensed stock or lightly-edited images selected and placed across your site. Complements the standard pages; no on-site photo shoot included.'),
('logo',        'content_pages', 'Logo-/Branding-Auffrischung', 'Logo/branding refresh', null, null, 'once', 490, 790, null, null, '{}', false, false, false, null, null, false, 30, 'Ein aufgefrischtes Logo plus Basisfarben und -schriften, web-ready. Erweitert die visuelle Identität auf Ihre enthaltenen Seiten.', 'A refreshed logo plus basic colors and fonts, web-ready. Extends the visual identity applied to your included pages.'),
('lang',        'content_pages', 'Weitere Sprache', 'Additional language', 'Mehr als Übersetzung: Struktur, URLs, hreflang.', 'More than translation: structure, URLs, hreflang.', 'once', 790, 1190, '{"min":1,"max":3,"unit_de":"Sprachen","unit_en":"languages"}', null, '{}', false, false, false, null, null, false, 40, 'Ergänzt eine vollständige zweite Sprachversion zusätzlich zur enthaltenen 1 Sprache — professionelle Übersetzung inklusive URL-Struktur, Sprachumschalter und hreflang-Einrichtung.', 'Adds a full second-language version on top of the 1 language included — professional translation plus URL structure, language switcher and hreflang setup.'),
-- content › Funktionen & Integrationen
('cms',         'inhalte', 'CMS-Einrichtung (Seiten, Blog & Events selbst verwalten)', 'CMS setup (manage pages, blog & events yourself)', null, null, 'once', 490, 790, null, null, '{platinum}', false, false, false, null, null, false, 10, 'Ermöglicht Ihnen, Seiten selbst zu bearbeiten und Blog/Events hinzuzufügen — geht über die festen Standardseiten hinaus. Inklusive kurzer Übergabe-Anleitung.', 'Lets you edit pages and add blog/events yourself — goes beyond the standard fixed pages. Includes a short handover guide.'),
('cmsmon',      'inhalte', 'CMS laufend (Hosting, Updates, User-Support)', 'CMS ongoing (hosting, updates, user support)', null, null, 'monthly', 39, 59, null, null, '{platinum}', false, false, false, null, null, false, 15, 'Monatliches Hosting, Updates und Support, damit Ihr CMS aktuell bleibt (erweitert die hosting-fertige Basiseinrichtung).', 'Monthly hosting, updates and support to keep your CMS current (extends the base hosting-ready setup).'),
('bookembed',   'inhalte', 'Online-Buchungssystem (Calendly/Cal.com)', 'Online booking system (Calendly/Cal.com)', null, null, 'once', 490, 790, null, null, '{}', false, false, false, null, null, false, 20, 'Ergänzt Selbstbuchung über das enthaltene Kontaktformular hinaus. Abo des Drittanbieter-Tools wird separat abgerechnet.', 'Adds self-scheduling beyond the included contact form. Third-party tool subscription billed separately.'),
('bookcustom',  'inhalte', 'Online-Buchungssystem (Custom Build)', 'Online booking system (custom build)', null, null, 'once', 990, 1490, null, null, '{}', false, false, false, null, null, false, 30, 'Ein maßgeschneiderter Buchungsablauf, abgestimmt auf Ihre Leistungen und Verfügbarkeit — eine Stufe über dem fertigen Tool.', 'A tailored booking flow matched to your services and availability — a step up from the ready-made tool.'),
('bookpay',     'inhalte', 'Bezahlung bei Terminbuchung (Stripe)', 'Payment at booking (Stripe)', 'Für kostenpflichtige Termine — sichere Vorkasse direkt bei der Buchung.', 'For paid appointments — secure prepayment right at booking.', 'once', 490, 790, null, null, '{}', false, false, false, null, null, false, 40, 'Ergänzt sichere Vorauszahlung direkt bei der Terminbuchung. Stripe-Transaktionsgebühren fallen an.', 'Adds secure prepayment at the moment of booking. Stripe transaction fees apply.'),
('ecom',        'inhalte', 'eCommerce / Stripe-Checkout', 'eCommerce / Stripe checkout', null, null, 'once', 1490, 2090, null, null, '{}', false, false, false, null, null, false, 50, 'Ergänzt einen einfachen Online-Shop (Produkte, Warenkorb, Stripe-Checkout) — nicht Teil der Standardseite. Produktdaten liefern Sie.', 'Adds a basic online store (products, cart, Stripe checkout) — not part of the standard site. Product data supplied by you.'),
('form',        'inhalte', 'Weitere Kontaktformulare', 'Additional contact forms', null, null, 'once', 290, 450, null, null, '{}', false, false, false, null, null, false, 60, 'Ein zusätzliches individuelles Formular zusätzlich zum Standard-Kontaktformular (z. B. Angebotsanfrage, Bewerbung).', 'One extra custom form on top of the standard contact form (e.g. quote request, application).'),
('maps',        'inhalte', 'Google-Maps-Einbindung', 'Google Maps embed', null, null, 'once', 190, 290, null, null, '{}', false, false, false, null, null, false, 70, 'Ergänzt eine interaktive Standortkarte und erweitert die Standard-Kontaktseite.', 'Adds an interactive location map, extending the standard contact page.'),
('widgets',     'inhalte', 'Widgets', 'Widgets', null, null, 'once', 190, 290, null, null, '{}', false, false, false, null, null, false, 80, 'Ergänzt ein interaktives Element wie WhatsApp-Button, Bewertungs-Badge oder Click-to-Call — zusätzlich zu den enthaltenen Social-Links.', 'Adds one interactive element such as a WhatsApp button, reviews badge or click-to-call — beyond the included social links.'),
('chatwidget',  'inhalte', 'Telefon-/Chat-Widget (Tidio, LiveChat)', 'Phone/chat widget (Tidio, LiveChat)', null, null, 'once', 150, 250, null, null, '{}', false, false, false, null, null, false, 90, 'Ergänzt Live-Chat in Echtzeit. Abo des Drittanbieters wird separat abgerechnet.', 'Adds real-time live chat. Third-party plan billed separately.'),
('perf',        'inhalte', 'Performance-Optimierung (Core Web Vitals)', 'Performance optimization (Core Web Vitals)', null, null, 'once', 290, 490, null, null, '{platinum}', false, false, false, null, null, false, 100, 'Geschwindigkeits- und technisches Feintuning über den Standardbuild hinaus, um Googles Core Web Vitals zu verbessern.', 'Speed and technical tuning above the standard build to improve Google''s Core Web Vitals.'),
-- marketing › SEO & GEO — Setup
-- Priced per Fizra 2026-08-26. The combo sits below 420 + 420 so "Best value" is true;
-- if it is ever raised above 840, clear badge_de/badge_en at the same time.
('seosetup',    'seogeo_setup', 'SEO-Onpage-Setup (Meta, Sitemap, Search Console)', 'SEO on-page setup (meta, sitemap, Search Console)', 'Kostenlos bei SEO Starter, SEO Pro oder dem SEO + GEO Kombi.', 'Free with SEO Starter, SEO Pro or the SEO + GEO combo.', 'once', 420, 630, null, null, '{}', false, false, false, null, null, false, 10, 'Richtet Ihre technischen SEO-Grundlagen ein — Meta-Tags, Sitemap, Google Search Console — einmalig.', 'Sets up your technical SEO foundations — meta tags, sitemap, Google Search Console — one-time.'),
('geosetup',    'seogeo_setup', 'GEO-Basis-Setup (Schema.org, AI-Sichtbarkeit)', 'GEO basic setup (Schema.org, AI visibility)', 'Kostenlos bei GEO Monitoring oder dem SEO + GEO Kombi.', 'Free with GEO monitoring or the SEO + GEO combo.', 'once', 420, 630, null, null, '{}', false, false, false, null, null, false, 20, 'Optimiert Ihre Sichtbarkeit in KI-Assistenten über strukturierte Schema.org-Daten — einmalig.', 'Optimizes your visibility in AI assistants through Schema.org structured data — one-time.'),
('seogeosetup', 'seogeo_setup', 'SEO + GEO Setup Bundle', 'SEO + GEO setup bundle', 'Einmalige Einrichtungsgebühr — kostenlos beim SEO + GEO Kombi.', 'One-time setup fee — free with the SEO + GEO combo.', 'once', 800, 1200, null, null, '{}', false, false, false, 'Bestes Preis-Leistung', 'Best value', true, 30, 'Bündelt SEO- und GEO-Setup in einer einmaligen Gebühr — günstiger als beides einzeln, gefunden bei Google und bei ChatGPT.', 'Bundles the SEO and GEO setup in one one-time fee — cheaper than booking them separately, and found on both Google and ChatGPT.'),
('localseo',    'seogeo_bundles', 'Lokale SEO-Einrichtung (Google Business Profile)', 'Local SEO setup (Google Business Profile)', null, null, 'once', 350, 550, null, null, '{}', false, false, false, null, null, false, 40, 'Erstellt/optimiert Ihr Google Unternehmensprofil, damit Sie in der lokalen Suche und bei Maps erscheinen.', 'Creates/optimizes your Google Business Profile so you appear in local search and Maps.'),
('citation',    'seogeo_bundles', 'Lokale Zitationsbereinigung (NAP, Verzeichnisse)', 'Local citation cleanup (NAP, directories)', null, null, 'once', 250, 390, null, null, '{}', false, false, false, null, null, false, 50, 'Gleicht Name/Adresse/Telefon über Verzeichnisse hinweg ab, um lokales Vertrauen zu stärken.', 'Aligns your Name/Address/Phone across directories to boost local trust.'),
-- marketing › SEO & GEO — laufend
('seostarter',  'seogeo_bundles', 'SEO Starter — Keyword-Monitoring, Reports, 1 Artikel/Mon.', 'SEO Starter — keyword monitoring, reports, 1 article/mo.', null, null, 'monthly', 269, null, null, null, '{}', false, false, false, null, null, false, 10, 'Monatliches Keyword-Monitoring, ein Report und 1 SEO-Artikel/Monat — laufendes Marketing über den einmaligen Build hinaus.', 'Monthly keyword monitoring, a report and 1 SEO article/month — ongoing marketing beyond the one-time build.'),
('seopro',      'seogeo_bundles', 'SEO Pro — + 2 Artikel/Mon., Wettbewerbs-Monitoring, Call', 'SEO Pro — + 2 articles/mo., competitor monitoring, call', null, null, 'monthly', 399, null, null, null, '{}', false, false, false, null, null, false, 20, 'Ergänzt einen 2. Artikel/Monat, Wettbewerbs-Monitoring und einen monatlichen Call zusätzlich zu Starter.', 'Adds a 2nd article/month, competitor monitoring and a monthly call on top of Starter.'),
('geomon',      'seogeo_bundles', 'GEO Monitoring — AI-Sichtbarkeit (ChatGPT, Perplexity, Gemini)', 'GEO monitoring — AI visibility (ChatGPT, Perplexity, Gemini)', null, null, 'monthly', 149, null, null, null, '{}', false, false, true, null, null, false, 30, 'Verfolgt Ihre Sichtbarkeit in KI-Antworten (ChatGPT, Perplexity, Gemini).', 'Tracks your visibility in AI answers (ChatGPT, Perplexity, Gemini).'),
('seogeokombi', 'seogeo_bundles', 'SEO + GEO Kombi (~17 % Rabatt)', 'SEO + GEO combo (~17% off)', null, null, 'monthly', 349, null, null, null, '{}', false, false, false, 'Bestes Preis-Leistung', 'Best value', true, 40, 'Bündelt SEO- und GEO-Monitoring zu ca. 17 % Rabatt gegenüber Einzelbuchung.', 'Bundles SEO and GEO monitoring at ~17% off versus separately.'),
-- marketing › Social Media
('socialbasic', 'mkt_social', 'Social Media Basic (4 Posts/Mon., 1 Plattform)', 'Social media basic (4 posts/mo., 1 platform)', null, null, 'monthly', 149, null, null, null, '{}', false, false, false, null, null, false, 10, '4 Beiträge/Monat, erstellt und veröffentlicht auf 1 Plattform — erweitert Ihre enthaltenen Social-Links um aktives Posting.', '4 posts/month created and published on 1 platform — extends your included social links into active posting.'),
('socialfeed',  'mkt_social', 'Social-Media-Feed-Integration', 'Social media feed integration', null, null, 'once', 150, 250, null, null, '{}', false, false, false, null, null, false, 20, 'Zeigt Ihren Live-Social-Feed direkt auf der Website (zusätzlich zu den enthaltenen Social-Links).', 'Displays your live social feed directly on the site (adds to the included social links).'),
-- marketing › Blog & Newsletter
('blogabo',     'blogabo', 'Blogartikel-Abo, SEO-optimiert', 'Blog article subscription, SEO-optimized', 'Mindestlaufzeit 12 Monate. Einzelartikel außerhalb des Abos: 60 €/Artikel.', 'Minimum term 12 months. Single articles outside the subscription: €60/article.', 'monthly', 40, null, null, '[{"n":1,"price":40},{"n":3,"price":110},{"n":4,"price":145},{"n":5,"price":175},{"n":10,"price":320}]', '{}', false, false, false, null, null, false, 35, 'Wiederkehrende, SEO-optimierte Artikel. Mindestlaufzeit 12 Monate; zusätzliche Einzelartikel je 60 €.', 'Recurring SEO-optimized articles. 12-month minimum; extra one-off articles €60 each.'),
('blogsetup',   'blogabo', 'Blog-Einrichtung', 'Blog setup', null, null, 'once', 200, 350, null, null, '{gold,platinum}', false, false, false, null, null, false, 20, 'Richtet den Blog-Bereich ein (Kategorien, Layout, Styling) über die festen Standardseiten hinaus.', 'Sets up the blog section (categories, layout, styling) beyond the standard fixed pages.'),
('blogstarter', 'blogabo', 'Blog Starter Bundle (Einrichtung + 3 Artikel)', 'Blog starter bundle (setup + 3 articles)', 'Nur im Erstauftrag — impliziert 33 €/Artikel.', 'First order only — implies €33/article.', 'once', 299, null, null, null, '{}', false, false, false, null, null, false, 30, 'Blog-Einrichtung plus Ihre ersten 3 SEO-Artikel zum vergünstigten Erstauftrags-Satz (~33 €/Artikel).', 'Blog setup + your first 3 SEO articles at a discounted first-order rate (~€33/article).'),
('newsletter',  'blogabo', 'Newsletter-Anbindung (Brevo)', 'Newsletter integration (Brevo)', null, null, 'once', 390, 590, null, null, '{}', false, false, false, null, null, false, 40, 'Bindet Brevo/Mailchimp/ActiveCampaign an, inklusive Anmeldeformular und Starter-Template — erweitert das enthaltene Kontaktformular um E-Mail-Marketing.', 'Connects Brevo/Mailchimp/ActiveCampaign with a signup form and starter template — extends the included contact form into email marketing.'),
('newscare',    'blogabo', 'Newsletter-Betreuung (2 Newsletter/Mon., Brevo)', 'Newsletter management (2 newsletters/mo., Brevo)', null, null, 'monthly', 179, null, null, null, '{}', false, false, false, null, null, false, 50, 'Wir schreiben, gestalten und versenden 2 Newsletter/Monat über Brevo für Sie.', 'We write, design and send 2 newsletters/month via Brevo for you.'),
-- marketing › Werbung & Reporting
('ads',         'mkt_ads', 'Google/Meta Ads Management (zzgl. Werbebudget)', 'Google/Meta ads management (ad budget extra)', null, null, 'monthly', 390, null, null, null, '{}', false, false, false, null, null, false, 10, 'Laufende Kampagnen-Einrichtung und -Optimierung. Ihr Werbebudget wird separat von Google/Meta abgerechnet.', 'Ongoing campaign setup and optimization. Your ad budget is billed separately by Google/Meta.'),
('ga4',         'mkt_ads', 'GA4 + Search Console Report (monatlich)', 'GA4 + Search Console report (monthly)', null, null, 'monthly', 59, null, null, null, '{}', false, false, false, null, null, false, 20, 'Ein monatlicher, verständlicher Report zu Traffic und Suchperformance.', 'A monthly plain-language report on traffic and search performance.'),
-- KI-Services
('aichatbot', 'ki', 'KI-Chatbot / Concierge (Setup, Wissensbasis, CRM)', 'AI chatbot / concierge (setup, knowledge base, CRM)', null, null, 'once', 1290, 1990, null, null, '{}', false, false, true, null, null, false, 10, 'Einmalige Einrichtung eines auf Ihr Unternehmen trainierten KI-Assistenten, der rund um die Uhr Fragen beantwortet — über das enthaltene Kontaktformular hinaus. Optionale CRM-Anbindung.', 'One-time setup of an AI assistant trained on your business, answering questions 24/7 — beyond the included contact form. Optional CRM connection.'),
('aichatmon', 'ki', 'KI-Chatbot laufend (Hosting, Updates, Monitoring)', 'AI chatbot ongoing (hosting, updates, monitoring)', null, null, 'monthly', 249, null, null, null, '{}', false, false, true, null, null, false, 20, 'Monatliches Hosting, Updates und Monitoring, damit der Chatbot zuverlässig läuft.', 'Monthly hosting, updates and monitoring to keep the chatbot running.'),
('aicontent', 'ki', 'KI-Content-Engine (4 AI-Drafts/Mon.)', 'AI content engine (4 AI drafts/mo.)', null, null, 'monthly', 299, null, null, null, '{}', false, false, true, null, null, false, 30, '4 KI-Content-Entwürfe/Monat zum Prüfen, Bearbeiten und Veröffentlichen.', '4 AI content drafts/month for you to review, edit and publish.'),
('aireviews', 'ki', 'KI-Bewertungsantworten (Google/Yelp, automatisiert)', 'AI review responses (Google/Yelp, automated)', null, null, 'monthly', 129, null, null, null, '{}', false, false, true, null, null, false, 40, 'Automatisierte, markenkonforme Antworten auf Ihre Google- und Yelp-Bewertungen.', 'Automated, on-brand replies to your Google and Yelp reviews.'),
-- Compliance
('cookie',     'compliance', 'Cookie-Consent + Analytics (GA4, DSGVO-konform)', 'Cookie consent + analytics (GA4, GDPR-compliant)', null, null, 'once', 350, 590, null, null, '{}', false, false, false, null, null, false, 10, 'DSGVO-konformer Cookie-Banner plus GA4-Analytics — erweitert das enthaltene Impressum & die Datenschutzerklärung um nachvollziehbare, konforme Analytics.', 'GDPR-compliant cookie banner plus GA4 analytics — extends the included legal notice & privacy policy into trackable, compliant analytics.'),
('bfsg',       'compliance', 'BFSG-Barrierefreiheitspaket (Audit + Umsetzung)', 'BFSG accessibility package (audit + implementation)', 'Gesetzespflicht seit 28.06.2025.', 'Legal requirement since 28 Jun 2025.', 'once', 699, 990, null, null, '{}', false, false, false, null, null, false, 20, 'Barrierefreiheits-Audit plus die Umsetzung zur Erfüllung des BFSG-Standards — gesetzlich verpflichtend seit 28.06.2025.', 'Accessibility audit plus the fixes to meet the BFSG standard — a legal requirement since 28 Jun 2025.'),
('dsgvocheck', 'compliance', 'DSGVO-/Abmahn-Check Bestandssite', 'GDPR/legal-risk check for existing site', null, null, 'once', 490, 790, null, null, '{}', false, false, false, null, null, false, 30, 'Prüft Ihre bestehende Website auf DSGVO-/Rechtsrisiken mit einer Liste empfohlener Maßnahmen.', 'Reviews your existing site for GDPR/legal risks with a list of recommended fixes.'),
('dsgvoyear',  'compliance', 'DSGVO-Jahresupdate', 'Annual GDPR update', null, null, 'yearly', 199, 299, null, null, '{}', false, false, false, null, null, false, 40, 'Jährliche Überprüfung, damit Ihre Rechtstexte und Datenschutz-Einrichtung aktuell zu Regeländerungen bleiben.', 'Yearly review to keep your legal texts and privacy setup current with regulation changes.'),
-- E-Mail & Verwaltung
('gws',        'email_admin', 'E-Mail-Einrichtung Google Workspace (bis 3 Adressen)', 'Google Workspace email setup (up to 3 addresses)', 'Google-Lizenzgebühren nicht inbegriffen — Abrechnung separat direkt durch Google.', 'Google license fees not included — billed separately by Google.', 'once', 290, 450, null, null, '{}', false, false, false, null, null, false, 10, 'Bis zu 3 professionelle Adressen auf Ihrer Domain — zusätzlich zur enthaltenen 1 E-Mail-Adresse. Googles Lizenzgebühren werden separat von Google abgerechnet.', 'Up to 3 professional addresses on your domain — beyond the 1 email included. Google''s license fees billed separately by Google.'),
('gadmin',     'email_admin', 'Google-Admin-Betreuung (wir als Admin)', 'Google admin management (we act as admin)', null, null, 'monthly', 49, null, null, null, '{}', false, false, false, null, null, false, 20, 'Wir übernehmen die Rolle Ihres Workspace-Admins und kümmern uns um Konten und Einstellungen für Sie.', 'We act as your Workspace admin, handling accounts and settings for you.'),
-- Bring-Your-Own-Website-Leistungen (BYOW path only)
('byospage', 'byos', 'Zusätzliche Seite deployen (ohne Änderungen)', 'Deploy an additional page (no changes)', null, null, 'once', 120, null, '{"min":1,"max":25,"unit_de":"Seiten","unit_en":"pages"}', null, '{}', true, false, false, null, null, false, 10, null, null),
('byositer', 'byos', 'Änderungs-Iteration (pro Runde)', 'Change iteration (per round)', null, null, 'once', 190, null, '{"min":1,"max":10,"unit_de":"Runden","unit_en":"rounds"}', null, '{}', true, false, false, null, null, false, 20, null, null);

-- The two "combo" add-ons cover their individual counterparts: selecting one includes the
-- members at no extra cost (only the combo price counts).
update addons set bundle_members = '{seosetup,geosetup}' where id = 'seogeosetup';

-- A monthly marketing bundle also covers the one-time setup for the service it monitors,
-- so subscribers never pay a setup fee. Each bundle covers only its own side; the combo
-- covers both setups plus the setup combo.
update addons set bundle_members = '{seosetup}' where id = 'seostarter';
update addons set bundle_members = '{seosetup}' where id = 'seopro';
update addons set bundle_members = '{geosetup}' where id = 'geomon';
update addons set bundle_members = '{seostarter,geomon,seosetup,geosetup,seogeosetup}'
  where id = 'seogeokombi';

-- Widgets is priced per ticked option: the card shows one tickbox per entry and charges
-- price_now × the number ticked (minimum one). `id` is the stable key saved in a
-- customer's selection, so it must never be reused for a different option.
update addons set sub_addons = '[
  {"id":"whatsapp","name_de":"WhatsApp","name_en":"WhatsApp"},
  {"id":"reviews","name_de":"Bewertungen","name_en":"Reviews"},
  {"id":"clicktocall","name_de":"Click-to-Call","name_en":"Click-to-call"}
]'::jsonb where id = 'widgets';

-- ------------------------------------------------------------- care plans
insert into care_plans (id, name, price_monthly, desc_de, desc_en, short_de, short_en, recommended, sort) values
('basis', 'Basis', 55, 'Hosting DE/EU, SSL, Updates, Monitoring, Backups (monatlich)', 'Hosting DE/EU, SSL, updates, monitoring, backups (monthly)', 'Hosting, SSL, Updates, Monitoring', 'Hosting, SSL, updates, monitoring', false, 10),
('plus', 'Plus', 89, '+ Sicherheits-Checks, 2 Std. Änderungen, SEO-Monatsreview, Compliance-Updates (Backup wöchentlich)', '+ security checks, 2 hrs of changes, monthly SEO review, compliance updates (weekly backup)', '+ Security, 2 Std. Änderungen, SEO-Review', '+ security, 2 hrs of changes, SEO review', true, 20),
('pro', 'Pro', 179, '+ 5 Std. Änderungen, 24/7-Security, Reporting, schnellere Umsetzung, Cloudflare Shield inklusive (Backup täglich)', '+ 5 hrs of changes, 24/7 security, reporting, faster turnaround, Cloudflare Shield included (daily backup)', '+ 5 Std./Mon., 24/7-Security, CF Shield inkl.', '+ 5 hrs/mo., 24/7 security, CF Shield incl.', false, 30);

-- ------------------------------------------------------------- cloudflare plans
insert into cloudflare_plans (id, name_de, name_en, setup_price, monthly_price, desc_de, desc_en, recommended, included_when, sort) values
('none', 'Kein Cloudflare-Paket', 'No Cloudflare plan', null, null, 'Basisschutz über Hosting', 'Basic protection via hosting', false, null, 10),
('starter', 'CF Starter', 'CF Starter', 120, null, 'Proxy, SSL, Basis-DDoS, CDN — laufend im Pflegepaket inklusive', 'Proxy, SSL, basic DDoS, CDN — ongoing costs included in the care plan', false, null, 20),
('shield', 'CF Shield', 'CF Shield', 150, 39, 'Cloudflare Pro: WAF, Bot-Analyse, Cache-Analytics, Image-Optimierung', 'Cloudflare Pro: WAF, bot analysis, cache analytics, image optimization', true, '{"care":"pro","bundle":"platinum"}', 30),
('fortress', 'CF Fortress', 'CF Fortress', 200, 249, 'Cloudflare Business: Custom WAF-Rules, Priority Support, Log-Analyse', 'Cloudflare Business: custom WAF rules, priority support, log analysis', false, null, 40);

-- ------------------------------------------------------------- support plans
insert into support_plans (id, name_de, name_en, price_monthly, desc_de, desc_en, sort) values
('none', 'Kein Support-Plan', 'No support plan', null, 'Support nach Aufwand', 'Support billed by effort', 10),
('std', 'Standard', 'Standard', 49, 'SLA 2–3 Werktage · E-Mail', 'SLA 2–3 business days · email', 20),
('prio', 'Priority', 'Priority', 99, 'SLA 1–2 Werktage · E-Mail + Chat', 'SLA 1–2 business days · email + chat', 30),
('vip', 'VIP', 'VIP', 199, 'Gleicher Werktag · E-Mail, Chat, Telefon + Proaktiv-Check', 'Same business day · email, chat, phone + proactive check', 40);

-- ------------------------------------------------------------- personas
insert into personas (id, label_de, label_en, icon_path, default_answers, preselect_addons, sort) values
('handwerk', 'Handwerk & Betrieb', 'Trades & crafts', 'M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2.4-2.4 2.2-3.4z', '{"hasSite":"none","selfbuilt":null,"aiHas":[],"aiMissing":[],"pages":"58","langs":"1","contact":"form","fees":null,"shop":"nein","blog":"nein","assets":"teil"}', '{foto,localseo}', 10),
('gastro', 'Gastronomie & Hotellerie', 'Restaurants & hospitality', 'M7 3v7a2 2 0 0 0 2 2v9M7 3v4M11 3v4M11 3v7M17 3c-1.5 1.5-2 4-2 7h2v11M17 3v18', '{"hasSite":"none","selfbuilt":null,"aiHas":[],"aiMissing":[],"pages":"58","langs":"2","contact":"booking","fees":"nein","shop":"nein","blog":"nein","assets":"teil"}', '{maps,foto}', 20),
('praxis', 'Praxis & Gesundheit', 'Medical practices & health', 'M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z', '{"hasSite":"none","selfbuilt":null,"aiHas":[],"aiMissing":[],"pages":"58","langs":"1","contact":"booking","fees":"ja","shop":"nein","blog":"nein","assets":"teil"}', '{bfsg}', 30),
('kanzlei', 'Kanzlei & Beratung', 'Law firms & consulting', 'M12 3v18M8 21h8M6 6h12M6 6L3.5 12a3.2 3.2 0 0 0 5 0L6 6zM18 6l-2.5 6a3.2 3.2 0 0 0 5 0L18 6z', '{"hasSite":"none","selfbuilt":null,"aiHas":[],"aiMissing":[],"pages":"58","langs":"2","contact":"booking","fees":"ja","shop":"nein","blog":"ja","assets":"ja"}', '{seogeosetup}', 40),
('handel', 'Einzelhandel & Online-Shop', 'Retail & online shop', 'M6 7h12l1.2 13H4.8L6 7zM9 10V6.5a3 3 0 0 1 6 0V10', '{"hasSite":"none","selfbuilt":null,"aiHas":[],"aiMissing":[],"pages":"912","langs":"1","contact":"form","fees":null,"shop":"shop","blog":"nein","assets":"teil"}', '{ecom,foto,bfsg}', 50),
('coach', 'Coach & Dienstleister', 'Coaches & service providers', 'M12 3l2.2 5.6L20 10.8l-5.8 2.2L12 18.6l-2.2-5.6L4 10.8l5.8-2.2z', '{"hasSite":"none","selfbuilt":null,"aiHas":[],"aiMissing":[],"pages":"58","langs":"1","contact":"booking","fees":"ja","shop":"paar","blog":"ja","assets":"teil"}', '{newsletter}', 60),
('other', 'Etwas anderes', 'Something else', 'M5 12h.01M12 12h.01M19 12h.01', '{"hasSite":"none","selfbuilt":null,"aiHas":[],"aiMissing":[],"pages":"58","langs":"1","contact":"form","fees":null,"shop":"nein","blog":"nein","assets":"teil"}', '{}', 70);

-- ------------------------------------------------------------- settings
insert into app_settings (key, value) values
('yearly_discount_pct', '18'),
('ai_bundle', '{"setup_now":1509,"setup_later":2320,"monthly":499}'),
('ai_bundle_bullets', '[
  {"de":"KI-Chatbot / Concierge — beantwortet Kundenanfragen rund um die Uhr","en":"AI chatbot / concierge — answers customer inquiries around the clock"},
  {"de":"KI-Content-Engine — 4 AI-Drafts pro Monat, Review & Publish","en":"AI content engine — 4 AI drafts per month, review & publish"},
  {"de":"KI-Bewertungsantworten — Google & Yelp, automatisiert","en":"AI review responses — Google & Yelp, automated"},
  {"de":"GEO Monitoring — Sichtbarkeit bei ChatGPT, Perplexity & Gemini","en":"GEO monitoring — visibility on ChatGPT, Perplexity & Gemini"}
]'),
('trust_items', '[
  {"de":"DSGVO-konform","en":"GDPR-compliant"},
  {"de":"SSL-verschlüsselt (256-Bit)","en":"SSL-encrypted (256-bit)"},
  {"de":"Secured by Cloudflare","en":"Secured by Cloudflare"},
  {"de":"Server in DE/EU","en":"Servers in DE/EU"},
  {"de":"Live in 14 Tagen","en":"Live in 14 days"},
  {"de":"Festpreis","en":"Fixed price"}
]'),
('next_steps', '[
  {"de":"Wir melden uns persönlich bei Ihnen — meist noch am selben Tag.","en":"We will contact you personally — usually the same day."},
  {"de":"Wir stimmen Details & Anzahlung (50 %) gemeinsam ab.","en":"We align on details & the deposit (50%) together."},
  {"de":"Ihre Website ist in 14 Tagen live.","en":"Your website goes live in 14 days."}
]'),
('team_email', '"leads@intellipaas.io"'),
('calendly_event_url', '""');

-- ------------------------------------------------------------- voucher
insert into vouchers (code, percent, scope, active) values ('TKFF20', 20, 'both', true);
