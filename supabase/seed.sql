-- Seed: 1:1 port of the prototype catalog (IntelliPaaS Web Konfigurator v2)
-- German texts verbatim from the design export; English authored here.

-- ------------------------------------------------------------- categories
insert into addon_categories (id, name_de, name_en, note_de, note_en, sort) values
('byos',         'Bring-Your-Own-Website-Leistungen', 'Bring Your Own Website services', null, null, 10),
('inhalte',      'Inhalte & Funktionen', 'Content & features', null, null, 20),
('compliance',   'Compliance', 'Compliance', null, null, 30),
('blogabo',      'Blog-Abo', 'Blog subscription', 'Mindestlaufzeit 12 Monate — im Abo deutlich günstiger als Einzelartikel (60 €).', 'Minimum term 12 months — much cheaper in a subscription than single articles (€60).', 40),
('seogeo_setup', 'SEO & GEO — Setup', 'SEO & GEO — setup', null, null, 50),
('seogeo_mon',   'SEO & GEO — laufend', 'SEO & GEO — ongoing', 'Monatlich, 12 Monate Mindestlaufzeit.', 'Monthly, 12-month minimum term.', 60),
('marketing',    'Marketing — laufend', 'Marketing — ongoing', null, null, 70),
('email_admin',  'E-Mail & Verwaltung', 'Email & administration', null, null, 80),
('ki',           'KI-Einzelbausteine', 'AI building blocks', null, null, 90);

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
insert into addons (id, category_id, name_de, name_en, note_de, note_en, billing, price_now, price_later, qty, tiers, included_in, byow_only, not_byow, ai_bundle_member, sort) values
-- BYOW services
('byospage', 'byos', 'Zusätzliche Seite deployen (ohne Änderungen)', 'Deploy an additional page (no changes)', null, null, 'once', 120, null, '{"min":1,"max":25,"unit_de":"Seiten","unit_en":"pages"}', null, '{}', true, false, false, 10),
('byositer', 'byos', 'Änderungs-Iteration (pro Runde)', 'Change iteration (per round)', null, null, 'once', 190, null, '{"min":1,"max":10,"unit_de":"Runden","unit_en":"rounds"}', null, '{}', true, false, false, 20),
-- Content & features
('page',        'inhalte', 'Zusätzliche Website-Seiten', 'Additional website pages', null, null, 'once', 190, 290, '{"min":1,"max":25,"unit_de":"Seiten","unit_en":"pages"}', null, '{}', false, true, false, 10),
('blogsetup',   'inhalte', 'Blog-Einrichtung', 'Blog setup', null, null, 'once', 200, 350, null, null, '{gold,platinum}', false, false, false, 20),
('blogstarter', 'inhalte', 'Blog Starter Bundle (Einrichtung + 3 Artikel)', 'Blog starter bundle (setup + 3 articles)', 'Nur im Erstauftrag — impliziert 33 €/Artikel.', 'First order only — implies €33/article.', 'once', 299, null, null, null, '{}', false, false, false, 30),
('cms',         'inhalte', 'CMS-Einrichtung (Seiten, Blog & Events selbst verwalten)', 'CMS setup (manage pages, blog & events yourself)', null, null, 'once', 490, 790, null, null, '{platinum}', false, false, false, 40),
('cmsmon',      'inhalte', 'CMS laufend (Hosting, Updates, User-Support)', 'CMS ongoing (hosting, updates, user support)', null, null, 'monthly', 39, 59, null, null, '{platinum}', false, false, false, 50),
('foto',        'inhalte', 'Foto-/Bildpaket', 'Photo/image package', null, null, 'once', 290, 440, null, null, '{}', false, false, false, 60),
('logo',        'inhalte', 'Logo-/Branding-Auffrischung', 'Logo/branding refresh', null, null, 'once', 490, 790, null, null, '{}', false, false, false, 70),
('lang',        'inhalte', 'Weitere Sprache', 'Additional language', 'Mehr als Übersetzung: Struktur, URLs, hreflang.', 'More than translation: structure, URLs, hreflang.', 'once', 790, 1190, '{"min":1,"max":3,"unit_de":"Sprachen","unit_en":"languages"}', null, '{}', false, false, false, 80),
('bookembed',   'inhalte', 'Online-Buchungssystem (Calendly/SimplyBook)', 'Online booking system (Calendly/SimplyBook)', null, null, 'once', 490, 790, null, null, '{}', false, false, false, 90),
('bookcustom',  'inhalte', 'Online-Buchungssystem (Custom Build)', 'Online booking system (custom build)', null, null, 'once', 990, 1490, null, null, '{}', false, false, false, 100),
('bookpay',     'inhalte', 'Bezahlung bei Terminbuchung (Stripe)', 'Payment at booking (Stripe)', 'Für kostenpflichtige Termine — sichere Vorkasse direkt bei der Buchung.', 'For paid appointments — secure prepayment right at booking.', 'once', 490, 790, null, null, '{}', false, false, false, 110),
('newsletter',  'inhalte', 'Newsletter-Anbindung (Brevo)', 'Newsletter integration (Brevo)', null, null, 'once', 390, 590, null, null, '{}', false, false, false, 120),
('form',        'inhalte', 'Weitere Kontaktformulare', 'Additional contact forms', null, null, 'once', 290, 450, null, null, '{}', false, false, false, 130),
('ecom',        'inhalte', 'eCommerce / Stripe-Checkout', 'eCommerce / Stripe checkout', null, null, 'once', 1490, 2090, null, null, '{}', false, false, false, 140),
('maps',        'inhalte', 'Google-Maps-Einbindung', 'Google Maps embed', null, null, 'once', 190, 290, null, null, '{}', false, false, false, 150),
('widgets',     'inhalte', 'Widgets (WhatsApp, Bewertungen, Click-to-Call)', 'Widgets (WhatsApp, reviews, click-to-call)', null, null, 'once', 190, 290, null, null, '{}', false, false, false, 160),
('gws',         'inhalte', 'E-Mail-Einrichtung Google Workspace (bis 3 Adressen)', 'Google Workspace email setup (up to 3 addresses)', 'Google-Lizenzgebühren nicht inbegriffen — Abrechnung separat direkt durch Google.', 'Google license fees not included — billed separately by Google.', 'once', 290, 450, null, null, '{}', false, false, false, 170),
('perf',        'inhalte', 'Performance-Optimierung (Core Web Vitals)', 'Performance optimization (Core Web Vitals)', null, null, 'once', 290, 490, null, null, '{platinum}', false, false, false, 180),
('socialfeed',  'inhalte', 'Social-Media-Feed-Integration', 'Social media feed integration', null, null, 'once', 150, 250, null, null, '{}', false, false, false, 190),
('chatwidget',  'inhalte', 'Telefon-/Chat-Widget (Tidio, LiveChat)', 'Phone/chat widget (Tidio, LiveChat)', null, null, 'once', 150, 250, null, null, '{}', false, false, false, 200),
-- Compliance
('cookie',     'compliance', 'Cookie-Consent + Analytics (GA4, DSGVO-konform)', 'Cookie consent + analytics (GA4, GDPR-compliant)', null, null, 'once', 350, 590, null, null, '{}', false, false, false, 10),
('bfsg',       'compliance', 'BFSG-Barrierefreiheitspaket (Audit + Umsetzung)', 'BFSG accessibility package (audit + implementation)', 'Gesetzespflicht seit 28.06.2025.', 'Legal requirement since 28 Jun 2025.', 'once', 699, 990, null, null, '{}', false, false, false, 20),
('dsgvocheck', 'compliance', 'DSGVO-/Abmahn-Check Bestandssite', 'GDPR/legal-risk check for existing site', null, null, 'once', 490, 790, null, null, '{}', false, false, false, 30),
('dsgvoyear',  'compliance', 'DSGVO-Jahresupdate', 'Annual GDPR update', null, null, 'yearly', 199, 299, null, null, '{}', false, false, false, 40),
-- Blog subscription
('blogabo', 'blogabo', 'Blogartikel-Abo, SEO-optimiert', 'Blog article subscription, SEO-optimized', 'Mindestlaufzeit 12 Monate. Einzelartikel außerhalb des Abos: 60 €/Artikel.', 'Minimum term 12 months. Single articles outside the subscription: €60/article.', 'monthly', 40, null, null, '[{"n":1,"price":40},{"n":3,"price":110},{"n":5,"price":175},{"n":10,"price":320}]', '{}', false, false, false, 10),
-- SEO & GEO setup
('seosetup',    'seogeo_setup', 'SEO-Onpage-Setup (Meta, Sitemap, Search Console)', 'SEO on-page setup (meta, sitemap, Search Console)', null, null, 'once', 450, 690, null, null, '{}', false, false, false, 10),
('geosetup',    'seogeo_setup', 'GEO-Basis-Setup (Schema.org, AI-Sichtbarkeit)', 'GEO basic setup (Schema.org, AI visibility)', null, null, 'once', 390, 590, null, null, '{}', false, false, false, 20),
('seogeosetup', 'seogeo_setup', 'SEO + GEO Setup Bundle', 'SEO + GEO setup bundle', 'Gefunden bei Google und bei ChatGPT.', 'Found on Google and on ChatGPT.', 'once', 765, 1090, null, null, '{}', false, false, false, 30),
('localseo',    'seogeo_setup', 'Lokale SEO-Einrichtung (Google Business Profile)', 'Local SEO setup (Google Business Profile)', null, null, 'once', 350, 550, null, null, '{}', false, false, false, 40),
('citation',    'seogeo_setup', 'Lokale Zitationsbereinigung (NAP, Verzeichnisse)', 'Local citation cleanup (NAP, directories)', null, null, 'once', 250, 390, null, null, '{}', false, false, false, 50),
-- SEO & GEO ongoing
('seostarter',  'seogeo_mon', 'SEO Starter — Keyword-Monitoring, Reports, 1 Artikel/Mon.', 'SEO Starter — keyword monitoring, reports, 1 article/mo.', null, null, 'monthly', 269, null, null, null, '{}', false, false, false, 10),
('seopro',      'seogeo_mon', 'SEO Pro — + 2 Artikel/Mon., Wettbewerbs-Monitoring, Call', 'SEO Pro — + 2 articles/mo., competitor monitoring, call', null, null, 'monthly', 399, null, null, null, '{}', false, false, false, 20),
('geomon',      'seogeo_mon', 'GEO Monitoring — AI-Sichtbarkeit (ChatGPT, Perplexity, Gemini)', 'GEO monitoring — AI visibility (ChatGPT, Perplexity, Gemini)', null, null, 'monthly', 149, null, null, null, '{}', false, false, true, 30),
('seogeokombi', 'seogeo_mon', 'SEO + GEO Kombi (~17 % Rabatt)', 'SEO + GEO combo (~17% off)', null, null, 'monthly', 349, null, null, null, '{}', false, false, false, 40),
-- Marketing ongoing
('ads',         'marketing', 'Google/Meta Ads Management (zzgl. Werbebudget)', 'Google/Meta ads management (ad budget extra)', null, null, 'monthly', 390, null, null, null, '{}', false, false, false, 10),
('newscare',    'marketing', 'Newsletter-Betreuung (2 Newsletter/Mon., Brevo)', 'Newsletter management (2 newsletters/mo., Brevo)', null, null, 'monthly', 179, null, null, null, '{}', false, false, false, 20),
('socialbasic', 'marketing', 'Social Media Basic (4 Posts/Mon., 1 Plattform)', 'Social media basic (4 posts/mo., 1 platform)', null, null, 'monthly', 149, null, null, null, '{}', false, false, false, 30),
('ga4',         'marketing', 'GA4 + Search Console Report (monatlich)', 'GA4 + Search Console report (monthly)', null, null, 'monthly', 59, null, null, null, '{}', false, false, false, 40),
-- Email & administration
('gadmin', 'email_admin', 'Google-Admin-Betreuung (wir als Admin)', 'Google admin management (we act as admin)', null, null, 'monthly', 49, null, null, null, '{}', false, false, false, 10),
-- AI building blocks
('aichatbot', 'ki', 'KI-Chatbot / Concierge (Setup, Wissensbasis, CRM)', 'AI chatbot / concierge (setup, knowledge base, CRM)', null, null, 'once', 1290, 1990, null, null, '{}', false, false, true, 10),
('aichatmon', 'ki', 'KI-Chatbot laufend (Hosting, Updates, Monitoring)', 'AI chatbot ongoing (hosting, updates, monitoring)', null, null, 'monthly', 249, null, null, null, '{}', false, false, true, 20),
('aicontent', 'ki', 'KI-Content-Engine (4 AI-Drafts/Mon.)', 'AI content engine (4 AI drafts/mo.)', null, null, 'monthly', 299, null, null, null, '{}', false, false, true, 30),
('aireviews', 'ki', 'KI-Bewertungsantworten (Google/Yelp, automatisiert)', 'AI review responses (Google/Yelp, automated)', null, null, 'monthly', 129, null, null, null, '{}', false, false, true, 40);

-- The two "combo" add-ons cover their individual counterparts: selecting one includes the
-- members at no extra cost (only the combo price counts).
update addons set bundle_members = '{seosetup,geosetup}' where id = 'seogeosetup';
update addons set bundle_members = '{seostarter,geomon}' where id = 'seogeokombi';

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
