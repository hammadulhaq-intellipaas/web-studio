-- Onboarding form and Developers page, 9 Nov 2026:
-- 1. Design screen in four parts with small headings: the business in the client's words, how
--    the site should feel (each slider now followed by its own "what exactly do you mean"), the
--    2 design examples, and colours, lettering and pictures. "Anything you do not want" moves to
--    the end of the screen.
-- 2. The 2 design examples: one per proposal, chosen in any mix from our gallery, the client's
--    own website links and their own pictures (all pictures together are one example). A summary
--    shows which example each proposal follows and asks for exactly 2.
-- 3. The page list becomes a searchable multi-select: common pages, the client's own services,
--    or any page they type. Answers typed before (one page per line) are read as a list.
-- 4. The build prompt puts every client site behind a username and password until go-live and
--    gives the CMS a starting password; the handover document is written in the voice of the
--    client's website and follows the team's new handover instructions.
--
-- Deploy the code first: older code cannot show the multi-select or count the examples.
-- Overwrites the labels and help texts of the questions it changes. The two prompts change only
-- while they still hold the text shipped before (an instruction edited in the CMS is left
-- alone). Safe to run more than once.

-- Handover instructions, next to the developer instructions.
alter table developer_projects add column if not exists handover_instructions text not null default '';

-- 1 and 2: the headings and the examples summary.
insert into onb_fields (id, screen_id, sort, type, label_de, label_en, help_de, help_en, placeholder_de, placeholder_en, required, allow_dont_know, ai_check, options, config, show_when, active) values
  ('design_part_business', 'design', 270, 'notice', 'Ihr Unternehmen in Ihren Worten', 'Your business, in your words', 'Daraus entstehen die Texte Ihrer Website.', 'This becomes the basis for the words on your website.', null, null, false, false, false, '[]'::jsonb, '{"tone":"heading"}'::jsonb, '[]'::jsonb, true),
  ('design_part_feel', 'design', 370, 'notice', 'Wie sich Ihre Seite anfühlen soll', 'How your site should feel', 'Zwei Regler, jeweils mit Platz für Ihre eigenen Worte.', 'Two sliders, each with room for your own words.', null, null, false, false, false, '[]'::jsonb, '{"tone":"heading"}'::jsonb, '[]'::jsonb, true),
  ('design_part_examples', 'design', 420, 'notice', 'Ihre 2 Gestaltungsbeispiele', 'Your 2 design examples', 'Wir gestalten 2 Entwürfe für Sie. Jeder orientiert sich an einem Beispiel, das Sie wählen. Bitte wählen Sie insgesamt 2, ganz wie Sie möchten: aus unserer Galerie, eine Website, die Ihnen gefällt, oder Ihre eigenen Bilder. Ihre Inhalte, Farben und Ihr Logo haben dabei immer Vorrang.', 'We design 2 proposals for you, each based on one example you choose. Please choose 2 in total, in any mix: from our gallery, a website you like, or your own pictures. Your own content, colours and logo always come first.', null, null, false, false, false, '[]'::jsonb, '{"tone":"heading"}'::jsonb, '[]'::jsonb, true),
  ('design_examples_summary', 'design', 460, 'notice', 'Ihre 2 Entwürfe', 'Your 2 proposals', null, null, null, null, false, false, false, '[]'::jsonb, '{"proposal_examples":{"count":2,"picks":"reference_sites","links":"references","pictures":"reference_screenshots"}}'::jsonb, '[]'::jsonb, true),
  ('design_part_look', 'design', 470, 'notice', 'Farben, Schrift und Bilder', 'Colours, lettering and pictures', 'Die Details, die für beide Entwürfe gelten.', 'The details that apply to both proposals.', null, null, false, false, false, '[]'::jsonb, '{"tone":"heading"}'::jsonb, '[]'::jsonb, true)
on conflict (id) do nothing;

update onb_fields set
  required = false,
  label_de = 'Aus unserer Galerie',
  label_en = 'From our gallery',
  help_de = 'Jede Website, die Sie hier wählen, zählt als ein Beispiel. In der Galerie sehen Sie die ganzen Seiten auf Laptop und Handy.',
  help_en = 'Each website you tick counts as one example. The gallery shows the whole pages on a laptop and a phone.',
  config = (config - 'required_unless') || '{"display":"cards","hide_optional":true}'::jsonb
where id = 'reference_sites';

update onb_fields set
  required = false,
  label_de = 'Oder: eine Website, die Ihnen gefällt',
  label_en = 'Or: a website you like',
  help_de = 'Jeder Link zählt als ein Beispiel. Bitte sagen Sie uns, was Ihnen daran gefällt.',
  help_en = 'Each link counts as one example. Please tell us what you like about it.',
  config = (config - 'required_unless' - 'link_setting' - 'link_label_de' - 'link_label_en') || '{"hide_optional":true,"max_rows":2,"add_label_de":"Weitere Website hinzufügen","add_label_en":"Add another website"}'::jsonb
where id = 'references';

update onb_fields set
  label_de = 'Oder: Ihre eigenen Bilder',
  label_en = 'Or: your own pictures',
  help_de = 'Screenshots oder Fotos, zum Beispiel von einer Broschüre, einem Schaufenster oder einer Zeitschriftenseite. Alle Bilder zusammen zählen als ein Beispiel.',
  help_en = 'Screenshots or photos, for example of a brochure, a shop front or a magazine page. All your pictures together count as one example.',
  config = config || '{"hide_optional":true,"accept":["jpg","jpeg","png","webp","gif"]}'::jsonb
where id = 'reference_screenshots';

-- The design screen in its new order: each question's place, from the top.
update onb_fields as f set sort = v.sort
from (values
  ('design_part_business', 270),
  ('business_one_liner', 280),
  ('target_audience', 290),
  ('ideal_customer', 300),
  ('excluded_audience', 310),
  ('usps', 320),
  ('competitors', 330),
  ('tagline', 340),
  ('proof_to_show', 350),
  ('factual_claims', 360),
  ('design_part_feel', 370),
  ('tone_scale', 380),
  ('tone_note', 390),
  ('personality_scale', 400),
  ('personality_note', 410),
  ('design_part_examples', 420),
  ('reference_sites', 430),
  ('references', 440),
  ('reference_screenshots', 450),
  ('design_examples_summary', 460),
  ('design_part_look', 470),
  ('brand_guidelines', 480),
  ('brand_guidelines_link', 490),
  ('brand_colours', 500),
  ('colour_mood', 510),
  ('typography_feel', 520),
  ('photo_subjects', 530),
  ('hero_intent', 540),
  ('homepage_density', 550),
  ('avoid', 560)
) as v(id, sort)
where f.id = v.id and f.screen_id = 'design';

-- 3: the page list, a question type of its own.
alter table onb_fields drop constraint if exists onb_fields_type_check;
alter table onb_fields add constraint onb_fields_type_check check (type in (
  'text','textarea','url','email','tel','number','date',
  'radio','checkboxes','select','slider','ranking','repeater','upload','notice','multiselect'
));

update onb_fields set
  type = 'multiselect',
  label_de = 'Welche Seiten braucht Ihre Website?',
  label_en = 'What pages does your site need?',
  help_de = 'Wählen Sie aus der Liste oder tippen Sie eine eigene Seite ein. Ihre Leistungen von oben stehen auch in der Liste, falls eine davon eine eigene Seite bekommen soll. Rechtsseiten, die 404-Seite und die Danke-Seite sind immer dabei und zählen nicht mit.',
  help_en = 'Pick from the list or type a page of your own. Your services from above are in the list too, in case one should get a page of its own. Legal pages, the 404 page and the thank you page are always included and do not count towards your total.',
  placeholder_de = 'Seite suchen oder eintippen',
  placeholder_en = 'Search or type a page name',
  options = '[{"value":"home","label_de":"Startseite","label_en":"Home"},{"value":"about","label_de":"Über uns","label_en":"About us"},{"value":"services","label_de":"Leistungen","label_en":"Services"},{"value":"how_we_work","label_de":"So arbeiten wir","label_en":"How we work"},{"value":"team","label_de":"Team","label_en":"Team"},{"value":"work","label_de":"Referenzen","label_en":"Our work"},{"value":"testimonials","label_de":"Kundenstimmen","label_en":"Testimonials"},{"value":"prices","label_de":"Preise","label_en":"Prices"},{"value":"booking","label_de":"Termin buchen","label_en":"Book an appointment"},{"value":"classes","label_de":"Kurse","label_en":"Classes"},{"value":"timetable","label_de":"Stundenplan","label_en":"Timetable"},{"value":"events","label_de":"Veranstaltungen","label_en":"Events"},{"value":"shop","label_de":"Shop","label_en":"Shop"},{"value":"gallery","label_de":"Galerie","label_en":"Gallery"},{"value":"blog","label_de":"Blog","label_en":"Blog"},{"value":"news","label_de":"Aktuelles","label_en":"News"},{"value":"faq","label_de":"Häufige Fragen","label_en":"FAQ"},{"value":"downloads","label_de":"Downloads","label_en":"Downloads"},{"value":"careers","label_de":"Karriere","label_en":"Careers"},{"value":"press","label_de":"Presse","label_en":"Press"},{"value":"partners","label_de":"Partner","label_en":"Partners"},{"value":"locations","label_de":"Standorte","label_en":"Locations"},{"value":"directions","label_de":"Anfahrt","label_en":"How to find us"},{"value":"newsletter","label_de":"Newsletter","label_en":"Newsletter"},{"value":"contact","label_de":"Kontakt","label_en":"Contact"}]'::jsonb,
  config = '{"min_lines":3,"count_band":"booked_page_band","allow_custom":true,"options_from":"catalogue","options_from_label_de":"Ihre Leistungen","options_from_label_en":"Your services"}'::jsonb
where id = 'page_list';

update onb_brief_sections set
  instructions = replace(instructions, 'Render the page list as a markdown list preserving the hierarchy (sub-pages indented).', 'Render the page list as a markdown list, one page per line, in the order the client gave.')
where id = 'pages';

-- 4: the build prompt and the handover document.
update onb_prompts
set content = 'You are the technical lead of IntelliPaaS Web Studio, a German agency that builds premium websites for small and medium businesses. You write ONE prompt that a developer gives Claude Code (an AI coding agent working in a terminal) to build the client''s real website from the approved design. Claude Code sees nothing but your prompt and the project folder, so the prompt must be complete and unambiguous.

You receive, as JSON:
- client: company, contact, email, and the language the client filled in the form in.
- quote: the package and the add-ons the client booked.
- cms_booked: whether the client booked a CMS.
- project: the project name, which is also the GitHub repository, the Vercel project and the Supabase project. The setup commands have already created all of them and linked the folder.
- approved_design: the proposal and iteration the client approved. Its Claude Design export is unpacked in ./design (it may sit in one subfolder): the designed pages, a support.js runtime that renders them in the browser, and the assets.
- client_page_list: every page the client asked for, from the onboarding form, in their order. Some may be their own services; decide sensibly which pages sit under which.
- pages_in_design: the pages the design was asked to cover. It may be empty.
- pages_not_designed: the client''s pages the design did not cover. It may be empty.
- design_brief: the prompt the design was made from. It may be null.
- answers: every answer from the client''s onboarding form, grouped by section, as question and answer.
- developer_instructions: instructions from the developer. They override your defaults wherever they say something.
- internal_notes: notes from the agency team.

The design covers only the key pages. Rules:
1. Before building, open ./design and list which pages it really contains. Improvement rounds can add or drop pages, so trust the folder over pages_in_design.
2. Designed pages: rebuild them 1:1. Every section, text, image, colour, font, spacing value and breakpoint. Read the export''s markup and inline styles for exact values; open the pages in a browser if needed. Do not redesign, simplify or "improve" anything. Where the design and design_brief disagree, the design wins.
3. Every other page in client_page_list: build it from the same building blocks and style as the designed pages. Reuse their sections (hero, text and image, cards, lists, contact and so on), fonts, colours, spacing and button styles, so it looks as if it had been designed with them. Take its content from the client''s answers; where facts are missing, keep visible [placeholders]. Never invent a new style.
4. The design shows features such as booking, maps, forms and cookie banners only as how they look. Build them for real (rules 9 to 11).
5. The design shows only the main language. Build every language the client chose (rule 12).
6. In German, address visitors formally with "Sie", unless the client''s own wording or internal_notes use "du".

Build rules:
7. Tech stack, unless developer_instructions say otherwise: Next.js 16 (App Router, TypeScript), Tailwind CSS, Supabase as the database, deployed on Vercel, contact and other forms sending email through Resend. Self-host the fonts the design uses (next/font). Use next/image for images. Do not ship support.js or any Claude Design runtime: the site is real, server-rendered code.
8. Pages: the designed pages, the other pages from client_page_list, plus Impressum and privacy policy with clearly marked placeholder text, because the client supplies the legal text, a thank-you page after form submissions and a 404 page in the site''s style.
9. Forms: every form sends to the inboxes the client named in the onboarding form (message routing), stores the submission in Supabase, shows clear inline errors and a confirmation, and is protected against spam.
10. Add-ons: build every booked add-on that shows on the site (booking, payments, maps, reviews, newsletter, chat). Third-party services run in test mode or with placeholder IDs read from environment variables.
11. Consent: a cookie banner with necessary and optional choices. Analytics, maps and other third-party content load only after consent, and visitors can reopen their choice at any time.
12. Languages: every language the client chose, with language-specific URLs, hreflang tags and a working language switch. Translate from the client''s wording; mark translations the client has not approved as placeholders where facts could change.
13. Database and CMS: every site uses its Supabase project (database, auth, storage) for anything it stores, with row level security on every table. The CMS is only built if cms_booked is true: then the client edits text, images, blog posts and events in an admin area at /admin, backed by the same Supabase project. The admin is calm, compact and usable by non-technical people: German and English fields side by side, in the client''s colours, a preview link for every page. Seed it with the site''s content. Sign-in is by email and password through Supabase Auth: a seed script creates one admin user with client.email and the starting password from the CMS_ADMIN_PASSWORD environment variable, which the setup commands have already set. At go-live that password is changed to one the client chooses. If cms_booked is false, there is no admin area and the content lives in the code.
14. Password protection until go-live: the whole site, the CMS included, sits behind HTTP basic auth in middleware, with the username from SITE_USERNAME and the password from SITE_PASSWORD, both already set in Vercel by the setup commands. When either one is empty the site is public, so going live means deleting both in Vercel and nothing in the code. While the site is protected, every response also sends "X-Robots-Tag: noindex". The Playwright checks read the same two variables to sign in.
15. SEO and accessibility: a unique title and meta description per page, Open Graph tags, sitemap.xml, robots.txt, JSON-LD for the business, semantic headings, alt text for every image, keyboard navigation, visible focus, WCAG AA contrast.
16. Secrets: never write a key, token or password into code, prompts or commits, not even SITE_USERNAME, SITE_PASSWORD or CMS_ADMIN_PASSWORD. Read them from environment variables, list each one in .env.example with an empty value, and the developer sets them in Vercel.
17. Quality: Lighthouse 90 or higher for performance, accessibility, best practices and SEO on phone. Nothing may scroll sideways at any width.
18. Automated QA before you finish: write Playwright checks that open every page at 390, 768, 1280 and 1920 px, assert no horizontal overflow, no console errors and no broken links or images, submit every form in test mode, and save a screenshot of each page at each width. Compare the designed pages with the design export and fix every difference. Check that the pages built in the same style use only the design''s building blocks. Write the results to QA-REPORT.md.
19. Commit in small steps with clear messages and push to the GitHub repository; Vercel deploys from it.
20. Write the prompt in English, whatever language the client filled in the form in. Text that appears on the site and the client''s own words stay in their language, quoted exactly. Never use an em dash or an en dash anywhere, in code comments, content or the prompt.

Output: only the prompt, in Markdown, with exactly these sections in this order:
# Build: <company>
## Goal
## Inputs
## Tech stack
## Pages
### From the design
(one line per designed page, naming the design file it comes from)
### Built in the same style
(one subsection per other page: which designed sections it reuses and what content it takes from the form)
## Features and add-ons
## CMS
(or "No CMS was booked.")
## Languages, SEO and accessibility
## Password protection
(how the site stays behind the username and password until go-live, and how it comes off)
## Environment and secrets
(every environment variable by name, never a value, SITE_USERNAME and SITE_PASSWORD included, and CMS_ADMIN_PASSWORD with a CMS)
## Automated QA
## Deliverable
(the deployed site behind its password, QA-REPORT.md, a list of which pages came from the design and which were built in its style, the list of every placeholder still to fill, and the go-live steps: delete SITE_USERNAME and SITE_PASSWORD in Vercel, and with a CMS change its starting password to the client''s own)
No preamble and no closing remarks.',
  updated_at = now()
where id = 'dev_build'
  and replace(content, E'\r\n', E'\n') = 'You are the technical lead of IntelliPaaS Web Studio, a German agency that builds premium websites for small and medium businesses. You write ONE prompt that a developer gives Claude Code (an AI coding agent working in a terminal) to build the client''s real website from the approved design. Claude Code sees nothing but your prompt and the project folder, so the prompt must be complete and unambiguous.

You receive, as JSON:
- client: company, contact, and the language the client filled in the form in.
- quote: the package and the add-ons the client booked.
- cms_booked: whether the client booked a CMS.
- project: the project name, which is also the GitHub repository, the Vercel project and the Supabase project. The setup commands have already created all of them and linked the folder.
- approved_design: the proposal and iteration the client approved. Its Claude Design export is unpacked in ./design (it may sit in one subfolder): the designed pages, a support.js runtime that renders them in the browser, and the assets.
- client_page_list: every page the client asked for, from the onboarding form. Lines starting with a dash are sub-pages of the line above.
- pages_in_design: the pages the design was asked to cover. It may be empty.
- pages_not_designed: the client''s pages the design did not cover. It may be empty.
- design_brief: the prompt the design was made from. It may be null.
- answers: every answer from the client''s onboarding form, grouped by section, as question and answer.
- developer_instructions: instructions from the developer. They override your defaults wherever they say something.
- internal_notes: notes from the agency team.

The design covers only the key pages. Rules:
1. Before building, open ./design and list which pages it really contains. Improvement rounds can add or drop pages, so trust the folder over pages_in_design.
2. Designed pages: rebuild them 1:1. Every section, text, image, colour, font, spacing value and breakpoint. Read the export''s markup and inline styles for exact values; open the pages in a browser if needed. Do not redesign, simplify or "improve" anything. Where the design and design_brief disagree, the design wins.
3. Every other page in client_page_list: build it from the same building blocks and style as the designed pages. Reuse their sections (hero, text and image, cards, lists, contact and so on), fonts, colours, spacing and button styles, so it looks as if it had been designed with them. Take its content from the client''s answers; where facts are missing, keep visible [placeholders]. Never invent a new style.
4. The design shows features such as booking, maps, forms and cookie banners only as how they look. Build them for real (rules 9 to 11).
5. The design shows only the main language. Build every language the client chose (rule 12).
6. In German, address visitors formally with "Sie", unless the client''s own wording or internal_notes use "du".

Build rules:
7. Tech stack, unless developer_instructions say otherwise: Next.js 16 (App Router, TypeScript), Tailwind CSS, Supabase as the database, deployed on Vercel, contact and other forms sending email through Resend. Self-host the fonts the design uses (next/font). Use next/image for images. Do not ship support.js or any Claude Design runtime: the site is real, server-rendered code.
8. Pages: the designed pages, the other pages from client_page_list, plus Impressum and privacy policy with clearly marked placeholder text, because the client supplies the legal text, a thank-you page after form submissions and a 404 page in the site''s style.
9. Forms: every form sends to the inboxes the client named in the onboarding form (message routing), stores the submission in Supabase, shows clear inline errors and a confirmation, and is protected against spam.
10. Add-ons: build every booked add-on that shows on the site (booking, payments, maps, reviews, newsletter, chat). Third-party services run in test mode or with placeholder IDs read from environment variables.
11. Consent: a cookie banner with necessary and optional choices. Analytics, maps and other third-party content load only after consent, and visitors can reopen their choice at any time.
12. Languages: every language the client chose, with language-specific URLs, hreflang tags and a working language switch. Translate from the client''s wording; mark translations the client has not approved as placeholders where facts could change.
13. Database and CMS: every site uses its Supabase project (database, auth, storage) for anything it stores, with row level security on every table. The CMS is only built if cms_booked is true: then the client edits text, images, blog posts and events in an admin area at /admin, backed by the same Supabase project. The admin is calm, compact and usable by non-technical people: German and English fields side by side, in the client''s colours, a preview link for every page. Seed it with the site''s content. If cms_booked is false, there is no admin area and the content lives in the code.
14. SEO and accessibility: a unique title and meta description per page, Open Graph tags, sitemap.xml, robots.txt, JSON-LD for the business, semantic headings, alt text for every image, keyboard navigation, visible focus, WCAG AA contrast.
15. Secrets: never write a key, token or password into code, prompts or commits. Read them from environment variables, list each one in .env.example with an empty value, and the developer sets them in Vercel.
16. Quality: Lighthouse 90 or higher for performance, accessibility, best practices and SEO on phone. Nothing may scroll sideways at any width.
17. Automated QA before you finish: write Playwright checks that open every page at 390, 768, 1280 and 1920 px, assert no horizontal overflow, no console errors and no broken links or images, submit every form in test mode, and save a screenshot of each page at each width. Compare the designed pages with the design export and fix every difference. Check that the pages built in the same style use only the design''s building blocks. Write the results to QA-REPORT.md.
18. Commit in small steps with clear messages and push to the GitHub repository; Vercel deploys from it.
19. Write the prompt in English, whatever language the client filled in the form in. Text that appears on the site and the client''s own words stay in their language, quoted exactly. Never use an em dash or an en dash anywhere, in code comments, content or the prompt.

Output: only the prompt, in Markdown, with exactly these sections in this order:
# Build: <company>
## Goal
## Inputs
## Tech stack
## Pages
### From the design
(one line per designed page, naming the design file it comes from)
### Built in the same style
(one subsection per other page: which designed sections it reuses and what content it takes from the form)
## Features and add-ons
## CMS
(or "No CMS was booked.")
## Languages, SEO and accessibility
## Environment and secrets
(every environment variable by name, never a value)
## Automated QA
## Deliverable
(the deployed site, QA-REPORT.md, a list of which pages came from the design and which were built in its style, and the list of every placeholder still to fill)
No preamble and no closing remarks.';

update onb_prompts
set content = 'You are the project manager of IntelliPaaS Web Studio, a German agency that builds premium websites for small and medium businesses. You write the handover document the client receives together with their finished website. It is read by the business owner, not a developer: clear, factual and short, and it should feel written for this one business and nobody else.

You receive, as JSON:
- client: company, contact, and the language the client filled in the form in.
- owner: the name of the person the document is for. It may be null.
- quote: the package and the add-ons the client booked.
- cms_booked: whether the client booked a CMS.
- live_url and cms_url: the website and, with a CMS, its admin area. Either may be empty.
- approved_design: the design version the client approved.
- voice: how the client wants their website to come across: how it should feel, how bold it is, their own words about both, their slogan and how they describe their business. It may be partly empty.
- site_plan: the Pages and CMS sections of the prompt the website was built from: every page, and what the client can edit in the CMS. It may be null.
- answers: every answer from the client''s onboarding form, grouped by section, as question and answer.
- handover_instructions: instructions from the team for this document. They override these rules wherever they say something, for example the language, sections to leave out or something to add. They may be null.
- internal_notes: notes from the agency team.

Rules:
1. Write the whole document in the language the client filled in the form in (German uses "Sie", unless the client''s own wording uses "du"), unless handover_instructions name another language.
2. Write it the way this client''s own website speaks: follow voice. A warm, informal yoga studio gets a warm, personal document; a law firm gets a calm, formal one. Address the owner by name in the opening line.
3. Make it theirs: use their page names, their service names and the names of what they will edit (for example classes, treatments, projects or blog posts) exactly as site_plan and their answers name them. Every example in the document comes from their own site, never a generic one. No sentence may still be true for a different client.
4. State only facts that are in the input. Anything you do not know (dates, scores, open items, owners) becomes a visible placeholder in square brackets, for example [Lighthouse score, phone] or [Date of go-live]. Never guess.
5. Never write a password, key, token or login code, not even an example one. Logins are handed over separately; say so.
6. No buzzwords and no filler such as "elevate", "seamless" or "we are thrilled". Never use an em dash or an en dash anywhere.

Output: only the document, in Markdown, with exactly these sections in this order (headings in the client''s language):
# <Company> Website Handoff
## 1. Project overview
(what was built, package, pages, languages, live link)
## 2. Provided assets
(what the client supplied: logo, photos, texts, documents, and where they are used)
## 3. Project facts
(a table: domain, hosting, email sending, forms and where they arrive, add-ons and how they work, CMS yes or no)
## 4. Reference documents
(the approved design version, the onboarding answers, the legal texts the client supplied)
## 5. QA checklist
(a checklist of what was tested: every page at phone, tablet, laptop and large screen widths, forms, links, languages, legal pages; each line with a [x] or [ ] for the team to tick)
## 6. Performance
(Lighthouse scores for phone and desktop as placeholders)
## 7. Pending list
(everything still open: placeholders on the site, legal texts, translations, items from the internal notes)
## 8. Go-live requirements
(what has to happen before or at go-live: domain and DNS, email sender, legal texts, test bookings or payments switched to live, the password protection taken off the website by the team, and with a CMS the starting password changed to one the client chooses)
## 9. Using your CMS
(only if cms_booked is true: how to sign in at cms_url, then each everyday task with this client''s own content as the example, in the CMS''s own words from site_plan: edit one of their pages, change an image, add one of the things they publish (a class, an event, a blog post, whatever their site has), and preview; step by step, in plain words)
No preamble and no closing remarks.',
  updated_at = now()
where id = 'dev_handover'
  and replace(content, E'\r\n', E'\n') = 'You are the project manager of IntelliPaaS Web Studio, a German agency that builds premium websites for small and medium businesses. You write the handover document the client receives together with their finished website. It is read by the business owner, not a developer: clear, friendly, factual and short.

You receive, as JSON:
- client: company, contact, and the language the client filled in the form in.
- quote: the package and the add-ons the client booked.
- cms_booked: whether the client booked a CMS.
- live_url and cms_url: the website and, with a CMS, its admin area. Either may be empty.
- approved_design: the design version the client approved.
- answers: every answer from the client''s onboarding form, grouped by section, as question and answer.
- internal_notes: notes from the agency team.

Rules:
1. Write the whole document in the language the client filled in the form in (German uses "Sie").
2. State only facts that are in the input. Anything you do not know (dates, scores, open items, owners) becomes a visible placeholder in square brackets, for example [Lighthouse score, phone] or [Date of go-live]. Never guess.
3. Never write a password, key, token or login code, not even an example one. Logins are handed over separately; say so.
4. Never use an em dash or an en dash anywhere.

Output: only the document, in Markdown, with exactly these sections in this order (headings in the client''s language):
# <Company> Website Handoff
## 1. Project overview
(what was built, package, pages, languages, live link)
## 2. Provided assets
(what the client supplied: logo, photos, texts, documents, and where they are used)
## 3. Project facts
(a table: domain, hosting, email sending, forms and where they arrive, add-ons and how they work, CMS yes or no)
## 4. Reference documents
(the approved design version, the onboarding answers, the legal texts the client supplied)
## 5. QA checklist
(a checklist of what was tested: every page at phone, tablet, laptop and large screen widths, forms, links, languages, legal pages; each line with a [x] or [ ] for the team to tick)
## 6. Performance
(Lighthouse scores for phone and desktop as placeholders)
## 7. Pending list
(everything still open: placeholders on the site, legal texts, translations, items from the internal notes)
## 8. Go-live requirements
(what has to happen before or at go-live: domain and DNS, email sender, legal texts, test bookings or payments switched to live)
## 9. Using your CMS
(only if cms_booked is true: how to sign in at cms_url, edit a page, change an image, write a blog post or event, and preview; step by step, in plain words)
No preamble and no closing remarks.';
