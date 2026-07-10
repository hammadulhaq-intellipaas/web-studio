-- IntelliPaaS Web Studio — CMS rules engine, shareable funnel sessions, legal pages.
--
-- Moves the previously hardcoded recommendation/auto-selection logic into two rule
-- tables so it is editable from /admin, adds server-side funnel state (shareable
-- links + pre-lead file uploads) and CMS-managed legal copy.

-- ---------------------------------------------------------------- funnel sessions
create table funnel_sessions (
  id text primary key,          -- nanoid(21), generated client-side
  state jsonb not null,         -- full funnel store snapshot
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index funnel_sessions_updated_idx on funnel_sessions (updated_at desc);

-- ---------------------------------------------------------------- pre-lead uploads
-- A file may be attached to a funnel session before a lead exists; on submission the
-- rows are re-parented to the created lead.
alter table lead_files alter column lead_id drop not null;
alter table lead_files add column session_id text references funnel_sessions(id) on delete set null;
alter table lead_files drop constraint lead_files_kind_check;
alter table lead_files add constraint lead_files_kind_check
  check (kind in ('logo','photo','concept','website'));
alter table lead_files add constraint lead_files_owner_check
  check (lead_id is not null or session_id is not null);
create index lead_files_session_idx on lead_files (session_id);

-- ---------------------------------------------------------------- rule conditions
-- Both rule tables share one condition shape:
--   conditions: [{"key": <k>, "values": [<v>, ...], "negate": <bool?>}]
-- Every entry must match for the rule to fire (AND); an empty array always matches.
-- `key` is any Answers field, or a derived key:
--   'byow' → 'true' | 'false'   (hasSite=website AND selfbuilt=ja)
--   'url'  → '__set'            (the customer supplied a source URL)
-- Array answers (aiHas / aiMissing) match when they intersect `values`.

-- ---------------------------------------------------------------- bundle rules
-- 'base' picks the starting bundle (highest matching priority wins); every matching
-- 'upgrade' rule then escalates the bundle if its target ranks higher in bundles.sort.
-- `result_bundle` is intentionally not a foreign key: rules are seeded before the catalog
-- exists on a fresh database, and the evaluator already ignores rules whose target bundle
-- is unknown or inactive.
create table bundle_rules (
  id text primary key,
  rule_kind text not null check (rule_kind in ('base','upgrade')),
  conditions jsonb not null default '[]',
  result_bundle text not null,
  -- base rules: overrides the i18n baseKey (else the bundle id is used)
  -- upgrade rules: i18n key under reasons.why.* explaining the escalation
  reason_key text,
  priority int not null default 0,
  active boolean not null default true
);
create index bundle_rules_active_idx on bundle_rules (active, priority desc);

-- ---------------------------------------------------------------- addon rules
-- Additive rules run first (with persona preselect_addons), then remove_addon_ids
-- suppressions are applied.
create table addon_rules (
  id text primary key,
  conditions jsonb not null default '[]',
  add_addon_ids text[] not null default '{}',
  remove_addon_ids text[] not null default '{}',
  note text,
  active boolean not null default true,
  sort int not null default 0
);
create index addon_rules_active_idx on addon_rules (active, sort);

-- ---------------------------------------------------------------- addon bundle members
-- When a "bundle" addon (e.g. seogeosetup) is selected, its members are treated as
-- included: shown as selected, priced at zero — only the parent's price counts.
alter table addons add column bundle_members text[] not null default '{}';

-- ---------------------------------------------------------------- legal pages
-- `id` is a surrogate key (e.g. 'privacy_de') so the generic admin entity editor,
-- which addresses every catalog row by `id`, can manage these rows too.
create table legal_pages (
  id text primary key,
  page_key text not null,       -- 'privacy' | 'consent'
  locale text not null check (locale in ('de','en')),
  title text not null default '',
  content_markdown text not null,
  updated_at timestamptz not null default now(),
  unique (page_key, locale)
);

-- ---------------------------------------------------------------- FK semantics
-- Catalog rows must be deletable from the admin CMS without destroying lead history
-- (leads.config keeps an immutable snapshot of what was purchased).
alter table leads drop constraint leads_persona_id_fkey;
alter table leads add constraint leads_persona_id_fkey
  foreign key (persona_id) references personas(id) on delete set null;
alter table leads drop constraint leads_voucher_id_fkey;
alter table leads add constraint leads_voucher_id_fkey
  foreign key (voucher_id) references vouchers(id) on delete set null;

-- ---------------------------------------------------------------- RLS
alter table funnel_sessions enable row level security;
alter table bundle_rules enable row level security;
alter table addon_rules enable row level security;
alter table legal_pages enable row level security;

-- Funnel sessions carry contact details: admins read, public access only via
-- service-role route handlers.
create policy "admin all" on funnel_sessions for all to authenticated using (true) with check (true);

create policy "catalog read" on bundle_rules for select using (true);
create policy "catalog read" on addon_rules for select using (true);
create policy "catalog read" on legal_pages for select using (true);

create policy "admin write" on bundle_rules for all to authenticated using (true) with check (true);
create policy "admin write" on addon_rules for all to authenticated using (true) with check (true);
create policy "admin write" on legal_pages for all to authenticated using (true) with check (true);

-- ================================================================ data
-- Seeded here (not seed.sql) so the already-provisioned cloud project picks it up.

-- ---------------------------------------------------------------- bundle rules
-- 1:1 port of the former hardcoded recommend() in src/lib/pricing/recommend.ts.
-- The BYOW path short-circuited before the upgrade rules, so every non-BYOW rule
-- carries an explicit byow=false condition.
insert into bundle_rules (id, rule_kind, conditions, result_bundle, reason_key, priority) values
('base_byow_changes', 'base',
  '[{"key":"byow","values":["true"]},{"key":"byowScope","values":["changes"]}]', 'gold', 'byowChanges', 210),
('base_byow_live', 'base',
  '[{"key":"byow","values":["true"]}]', 'byow', 'byowLive', 200),
('base_pages_14', 'base',
  '[{"key":"byow","values":["false"]},{"key":"pages","values":["14"]}]', 'silver', null, 100),
('base_pages_58', 'base',
  '[{"key":"byow","values":["false"]},{"key":"pages","values":["58"]}]', 'gold', null, 100),
('base_pages_912', 'base',
  '[{"key":"byow","values":["false"]},{"key":"pages","values":["912","12p"]}]', 'platinum', null, 100),
('up_langs_2', 'upgrade',
  '[{"key":"byow","values":["false"]},{"key":"langs","values":["2"]}]', 'gold', 'twoLangs', 90),
('up_langs_3', 'upgrade',
  '[{"key":"byow","values":["false"]},{"key":"langs","values":["3"]}]', 'platinum', 'threeLangs', 89),
('up_blog', 'upgrade',
  '[{"key":"byow","values":["false"]},{"key":"blog","values":["ja"]}]', 'gold', 'blog', 80),
('up_shop', 'upgrade',
  '[{"key":"byow","values":["false"]},{"key":"shop","values":["shop"]}]', 'platinum', 'shop', 70)
on conflict (id) do nothing;

-- ---------------------------------------------------------------- addon rules
-- 1:1 port of the former hardcoded recSet(), plus the assets='ja' suppression rule
-- so a customer who already has a logo & imagery never gets the photo/logo package
-- auto-selected (persona preselects included).
insert into addon_rules (id, conditions, add_addon_ids, remove_addon_ids, note, sort) values
('always_cookie',      '[]', '{cookie}', '{}', 'Cookie consent is always recommended.', 10),
('contact_booking',    '[{"key":"contact","values":["booking"]}]', '{bookembed}', '{}', null, 20),
('fees_ja',            '[{"key":"fees","values":["ja"]}]', '{bookpay}', '{}', null, 30),
('shop_any',           '[{"key":"shop","values":["paar","shop"]}]', '{ecom}', '{}', null, 40),
('assets_nein',        '[{"key":"assets","values":["nein"]}]', '{logo,foto}', '{}', null, 50),
('assets_teil',        '[{"key":"assets","values":["teil"]}]', '{foto}', '{}', null, 60),
('url_dsgvo',          '[{"key":"url","values":["__set"]},{"key":"byow","values":["false"]}]', '{dsgvocheck}', '{}', null, 70),
('byow_seo',           '[{"key":"byow","values":["true"]},{"key":"aiMissing","values":["seo"]}]', '{seosetup}', '{}', null, 80),
('byow_email',         '[{"key":"byow","values":["true"]},{"key":"aiMissing","values":["email"]}]', '{gws}', '{}', null, 90),
('byow_perf',          '[{"key":"byow","values":["true"]},{"key":"aiMissing","values":["perf"]}]', '{perf}', '{}', null, 100),
('byow_legal',         '[{"key":"byow","values":["true"]},{"key":"aiMissing","values":["legal"]}]', '{dsgvocheck}', '{}', null, 110),
-- Suppressions run after every additive rule (including persona preselect_addons).
('assets_ja_suppress', '[{"key":"assets","values":["ja"]}]', '{}', '{logo,foto}', 'Customer already has logo & imagery — never auto-select the photo/image package.', 900)
on conflict (id) do nothing;

-- ---------------------------------------------------------------- addon bundle members
-- Backfills already-provisioned databases. A fresh database has no add-ons yet at this
-- point, so seed.sql carries the same values for the catalog it inserts.
update addons set bundle_members = '{seosetup,geosetup}'   where id = 'seogeosetup';
update addons set bundle_members = '{seostarter,geomon}'   where id = 'seogeokombi';

-- ---------------------------------------------------------------- settings
insert into app_settings (key, value) values
('default_bundle',          '"gold"'),
('default_care_plan',       '"plus"'),
('default_cloudflare_plan', '"shield"'),
('ai_bundle_category',      '"ki"')
on conflict (key) do nothing;

-- ---------------------------------------------------------------- legal pages
insert into legal_pages (id, page_key, locale, title, content_markdown) values
('privacy_en', 'privacy', 'en', 'Privacy Policy', $md$**Effective date:** 10 July 2026

### 1. Controller

IntelliPaaS Inc.
A company incorporated in Delaware, United States
Email: privacy@intellipaas.io

IntelliPaaS Inc. is established in the United States and offers its services to businesses in the European Union. This processing falls within the scope of the GDPR pursuant to Art. 3(2) GDPR.

### 2. EU Representative (Art. 27 GDPR)

Our representative in the Union, whom EU data subjects may contact on all matters relating to the processing of their personal data, is:

Jamaine Arhin
Alsterdorfer Str. 570
22337 Hamburg, Germany

### 3. What data we collect and why

When you submit the feature-interest form, we process:

- Your name (if provided)
- Your email address
- The feature interests and preferences you select or enter
- Technical metadata generated at submission (timestamp and consent record)

We use this data solely to:

- Contact you about the features and website you expressed interest in
- Understand which features are most requested so we can prioritise them
- Respond to any question you send us through the form

### 4. Legal basis

We process this data on the basis of your consent (Art. 6(1)(a) GDPR), given by ticking the consent box. Where we subsequently contact you about a product or service you requested, processing may also rest on pre-contractual steps taken at your request (Art. 6(1)(b) GDPR).

### 5. Recipients and processors

Your data is hosted and stored within the EU using:

- Microsoft Azure, Germany (Berlin region)
- Supabase, EU (Frankfurt region)

Each processor acts on our instructions under a data-processing agreement pursuant to Art. 28 GDPR. We do not sell your data and do not share it with third parties for their own purposes.

### 6. International transfers

Your personal data is stored and processed on servers located within the EU. As the controller is established in the United States, limited access from the US may occur for the purposes described above. Any such transfer is carried out on the basis of the EU Standard Contractual Clauses (Art. 46(2)(c) GDPR) together with supplementary technical and organisational measures. You may request a copy of these safeguards by emailing privacy@intellipaas.io.

### 7. Retention

We retain your data for 24 months from your last interaction with us, or until you withdraw your consent, whichever is earlier. After that it is deleted or anonymised.

### 8. Your rights

Under the GDPR you have the right to: access (Art. 15), rectification (Art. 16), erasure (Art. 17), restriction (Art. 18), data portability (Art. 20), objection (Art. 21) and to withdraw consent at any time with effect for the future (Art. 7(3)) – withdrawal does not affect processing carried out before it.

To exercise any right, email privacy@intellipaas.io or contact our EU representative in Section 2. You also have the right to lodge a complaint with a supervisory authority in your EU member state of residence or work.

### 9. Is providing data mandatory?

No. Submitting the form is voluntary. Without the data we cannot register your feature interests or follow up with you.

### 10. Changes

We may update this policy. The current version is always available here with its effective date.$md$),
('privacy_de', 'privacy', 'de', 'Datenschutzerklärung', $md$**Gültig ab:** 10. Juli 2026

### 1. Verantwortlicher

IntelliPaaS Inc.
Eine Gesellschaft nach dem Recht des US-Bundesstaates Delaware, USA
E-Mail: privacy@intellipaas.io

Die IntelliPaaS Inc. hat ihren Sitz in den Vereinigten Staaten und bietet ihre Dienste Unternehmen in der Europäischen Union an. Die Verarbeitung fällt daher gemäß Art. 3 Abs. 2 DSGVO in den Anwendungsbereich der DSGVO.

### 2. Vertreter in der Union (Art. 27 DSGVO)

Unser Vertreter in der Union, an den sich betroffene Personen in der EU in allen Fragen der Verarbeitung ihrer personenbezogenen Daten wenden können, ist:

Jamaine Arhin
Alsterdorfer Str. 570
22337 Hamburg, Deutschland

### 3. Welche Daten wir erheben und warum

Wenn Sie das Formular zu den gewünschten Funktionen absenden, verarbeiten wir:

- Ihren Namen (sofern angegeben)
- Ihre E-Mail-Adresse
- Die von Ihnen ausgewählten oder eingegebenen Funktionswünsche und Präferenzen
- Technische Metadaten beim Absenden (Zeitstempel sowie Einwilligungsnachweis)

Wir verwenden diese Daten ausschließlich, um:

- Sie zu den von Ihnen gewünschten Funktionen und der Website zu kontaktieren
- Nachzuvollziehen, welche Funktionen am häufigsten gewünscht werden, um diese zu priorisieren
- Ihre über das Formular gestellten Fragen zu beantworten

### 4. Rechtsgrundlage

Wir verarbeiten diese Daten auf Grundlage Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die Sie durch Setzen des Häkchens erteilen. Soweit wir Sie anschließend zu einem von Ihnen angefragten Produkt oder einer Leistung kontaktieren, kann die Verarbeitung auch auf vorvertraglichen Maßnahmen auf Ihre Anfrage hin beruhen (Art. 6 Abs. 1 lit. b DSGVO).

### 5. Empfänger und Auftragsverarbeiter

Ihre Daten werden innerhalb der EU gehostet und gespeichert über:

- Microsoft Azure, Deutschland (Region Berlin)
- Supabase, EU (Region Frankfurt)

Jeder Auftragsverarbeiter handelt auf unsere Weisung im Rahmen eines Auftragsverarbeitungsvertrags nach Art. 28 DSGVO. Wir verkaufen Ihre Daten nicht und geben sie nicht zu eigenen Zwecken Dritter weiter.

### 6. Datenübermittlung in Drittländer

Ihre personenbezogenen Daten werden auf Servern innerhalb der EU gespeichert und verarbeitet. Da der Verantwortliche seinen Sitz in den Vereinigten Staaten hat, kann ein begrenzter Zugriff aus den USA zu den oben beschriebenen Zwecken erfolgen. Eine solche Übermittlung erfolgt auf Grundlage der EU-Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO) sowie ergänzender technischer und organisatorischer Maßnahmen. Eine Kopie dieser Garantien können Sie unter privacy@intellipaas.io anfordern.

### 7. Speicherdauer

Wir speichern Ihre Daten für 24 Monate ab Ihrer letzten Interaktion mit uns oder bis zum Widerruf Ihrer Einwilligung, je nachdem, was früher eintritt. Danach werden sie gelöscht oder anonymisiert.

### 8. Ihre Rechte

Nach der DSGVO haben Sie das Recht auf: Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit (Art. 20), Widerspruch (Art. 21) sowie jederzeitigen Widerruf Ihrer Einwilligung mit Wirkung für die Zukunft (Art. 7 Abs. 3) – der Widerruf berührt nicht die zuvor erfolgte Verarbeitung.

Zur Ausübung Ihrer Rechte schreiben Sie an privacy@intellipaas.io oder wenden Sie sich an unseren Vertreter in Abschnitt 2. Ihnen steht zudem ein Beschwerderecht bei einer Aufsichtsbehörde in Ihrem EU-Mitgliedstaat zu.

### 9. Besteht eine Pflicht zur Bereitstellung der Daten?

Nein. Das Absenden des Formulars ist freiwillig. Ohne diese Daten können wir Ihre Funktionswünsche nicht erfassen und uns nicht bei Ihnen melden.

### 10. Änderungen

Wir können diese Erklärung anpassen. Die jeweils aktuelle Fassung ist hier mit Gültigkeitsdatum verfügbar.$md$),
('consent_en', 'consent', 'en', '', $md$I consent to IntelliPaaS Inc. processing the personal data I have entered in order to contact me about my feature interests, as described in the [Privacy Policy](/datenschutz). I understand my data is handled by a US-based controller and that I can withdraw this consent at any time.$md$),
('consent_de', 'consent', 'de', '', $md$Ich willige ein, dass die IntelliPaaS Inc. die von mir eingegebenen personenbezogenen Daten verarbeitet, um mich zu meinen Funktionswünschen zu kontaktieren, wie in der [Datenschutzerklärung](/datenschutz) beschrieben. Mir ist bekannt, dass meine Daten von einem in den USA ansässigen Verantwortlichen verarbeitet werden und dass ich diese Einwilligung jederzeit widerrufen kann.$md$)
on conflict (id) do nothing;
