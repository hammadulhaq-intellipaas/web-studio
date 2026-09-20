-- Client onboarding form — the interactive replacement for the post-deposit Google Form
-- (spec: web-studio-onboarding-form-spec, 16 Sep 2026). Two groups of tables:
--
--   onb_*             the form DEFINITION. Screens, fields, conditional reveals, follow-up
--                     questions, sales flags, brief sections, long-form texts, AI prompts and
--                     worked examples are all data, edited under /admin/catalog like the
--                     catalog. The public form is rendered from these rows; nothing about the
--                     question set is hard-coded. Seeded by 20260921000011_onboarding_seed.sql.
--
--   onboarding_*      RUNTIME records. One `onboarding_forms` row per client run, addressed by
--                     an unguessable 21-char id that is also the resume link
--                     (/onboardingform/<id>). Briefs are versioned in `onboarding_briefs`;
--                     every model prompt/response lands in `onboarding_ai_log`.
--
-- Access model matches the rest of the app: definition tables are publicly readable via the
-- anon key ("catalog read") except prompts/examples, which only the service role reads;
-- runtime tables are admin-only through RLS and reached publicly only via service-role route
-- handlers that key on the unguessable form id.

-- ================================================================ definition

create table onb_screens (
  id text primary key,
  sort int not null default 0,
  kind text not null default 'questions' check (kind in ('questions','review')),
  title_de text not null,
  title_en text not null,
  short_de text,
  short_en text,
  intro_de text,
  intro_en text,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table onb_fields (
  id text primary key,                      -- the field key, e.g. legal_name
  screen_id text not null references onb_screens(id),
  sort int not null default 0,
  type text not null check (type in (
    'text','textarea','url','email','tel','number','date',
    'radio','checkboxes','select','slider','ranking','repeater','upload','notice'
  )),
  label_de text not null default '',
  label_en text not null default '',
  help_de text,
  help_en text,
  placeholder_de text,
  placeholder_en text,
  required boolean not null default false,
  allow_dont_know boolean not null default false,
  ai_check boolean not null default false,
  options jsonb not null default '[]',      -- [{value, label_de, label_en, hint_de?, hint_en?, min?, max?}]
  config jsonb not null default '{}',       -- per-type knobs, see src/lib/onboarding/types.ts FieldConfig
  show_when jsonb not null default '[]',    -- [{key, values[], negate?}] — same shape as bundle_rules
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
create index onb_fields_screen_idx on onb_fields (screen_id, sort);

create table onb_followups (
  id text primary key,
  sort int not null default 0,
  trigger jsonb not null,                   -- {field?, when, value?, sub?, flag?}
  question_de text not null,
  question_en text not null,
  quick_replies jsonb not null default '[]',-- [{value, label_de, label_en}]
  writes_to text,                           -- field key the answer is written to; null = history only
  mode text not null default 'set' check (mode in ('set','append','acknowledge')),
  raises jsonb,                             -- {"<reply value>": {code, detail}}
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table onb_flag_rules (
  id text primary key,
  code text not null,                       -- needs_quote | interest | bfsg | ...
  detail text,                              -- member_area | social_embed | ...
  severity text not null default 'sales' check (severity in ('info','sales','warn')),
  conditions jsonb not null default '[]',   -- [{key, values[], negate?}]
  note_de text,
  note_en text,
  sort int not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table onb_brief_sections (
  id text primary key,
  sort int not null default 0,
  title_de text not null,
  title_en text not null,
  instructions text,                        -- internal, English: what this section must cover
  source_fields text[] not null default '{}',
  generated_by text not null default 'llm' check (generated_by in ('llm','system')),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Long-form copy: landing, terms, notices, email bodies, PDF footer. Same shape as
-- legal_pages; `key` + `locale` address a text, the surrogate id keeps the generic editor happy.
create table onb_texts (
  id text primary key,
  key text not null,
  locale text not null check (locale in ('de','en')),
  title text not null default '',
  content_markdown text not null default '',
  updated_at timestamptz not null default now(),
  unique (key, locale)
);

create table onb_prompts (
  id text primary key check (id in ('system','completeness','brief','rewrite')),
  content text not null,
  note text,
  updated_at timestamptz not null default now()
);

create table onb_examples (
  id text primary key,
  title text not null default '',
  answers jsonb not null default '{}',
  brief jsonb not null default '{}',
  sort int not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ================================================================ runtime

create table onboarding_forms (
  id text primary key,                      -- 21-char unguessable id, generated server-side
  locale text not null default 'de' check (locale in ('de','en')),
  status text not null default 'in_progress'
    check (status in ('in_progress','review','brief','confirmed')),
  rev int not null default 0,               -- optimistic concurrency for field-level PATCHes
  current_step text,
  name text,
  company text,
  email text,
  answers jsonb not null default '{}',      -- { "<field key>": { v, dk?, src?, other? } }
  flags jsonb not null default '[]',        -- [{code, detail, severity, source, data?}]
  review jsonb,                             -- follow-up queue + history, see ReviewState
  brief_version int,
  confirmed jsonb,                          -- {name, at, terms_version}
  delivery jsonb,                           -- pdf path + email delivery state
  ai_calls int not null default 0,
  save_link_sent_at timestamptz,
  lead_id uuid references leads(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index onboarding_forms_updated_idx on onboarding_forms (updated_at desc);
create index onboarding_forms_status_idx on onboarding_forms (status);
create index onboarding_forms_email_idx on onboarding_forms (email);

create table onboarding_briefs (
  id uuid primary key default gen_random_uuid(),
  form_id text not null references onboarding_forms(id) on delete cascade,
  version int not null,
  source text not null check (source in ('llm','fallback','rewrite','client_edit')),
  model text,
  sections jsonb not null,                  -- { "<section id>": { content_markdown, still_needed[], sources[] } }
  created_at timestamptz not null default now(),
  unique (form_id, version)
);

create table onboarding_ai_log (
  id uuid primary key default gen_random_uuid(),
  form_id text not null references onboarding_forms(id) on delete cascade,
  job text not null,                        -- completeness | brief | rewrite
  attempt int not null default 1,
  model text not null,
  prompt jsonb not null,
  response jsonb,
  ok boolean not null,
  violations jsonb,
  usage jsonb,
  duration_ms int,
  created_at timestamptz not null default now()
);
create index onboarding_ai_log_form_idx on onboarding_ai_log (form_id, created_at);

-- Uploads made from the form reuse lead_files / the lead-uploads bucket. The row is owned
-- by the form; `field_key` says which upload field it belongs to.
alter table lead_files add column onboarding_form_id text references onboarding_forms(id) on delete cascade;
alter table lead_files add column field_key text;
alter table lead_files drop constraint lead_files_kind_check;
alter table lead_files add constraint lead_files_kind_check
  check (kind in ('logo','photo','concept','website','onboarding'));
alter table lead_files drop constraint lead_files_owner_check;
alter table lead_files add constraint lead_files_owner_check
  check (lead_id is not null or session_id is not null or onboarding_form_id is not null);
create index lead_files_onboarding_idx on lead_files (onboarding_form_id);

-- ================================================================ RLS

alter table onb_screens enable row level security;
alter table onb_fields enable row level security;
alter table onb_followups enable row level security;
alter table onb_flag_rules enable row level security;
alter table onb_brief_sections enable row level security;
alter table onb_texts enable row level security;
alter table onb_prompts enable row level security;
alter table onb_examples enable row level security;
alter table onboarding_forms enable row level security;
alter table onboarding_briefs enable row level security;
alter table onboarding_ai_log enable row level security;

create policy "catalog read" on onb_screens for select using (true);
create policy "catalog read" on onb_fields for select using (true);
create policy "catalog read" on onb_followups for select using (true);
create policy "catalog read" on onb_flag_rules for select using (true);
create policy "catalog read" on onb_brief_sections for select using (true);
create policy "catalog read" on onb_texts for select using (true);

create policy "admin write" on onb_screens for all to authenticated using (true) with check (true);
create policy "admin write" on onb_fields for all to authenticated using (true) with check (true);
create policy "admin write" on onb_followups for all to authenticated using (true) with check (true);
create policy "admin write" on onb_flag_rules for all to authenticated using (true) with check (true);
create policy "admin write" on onb_brief_sections for all to authenticated using (true) with check (true);
create policy "admin write" on onb_texts for all to authenticated using (true) with check (true);

-- Prompts and examples steer the model; they are not for the anon key.
create policy "admin all" on onb_prompts for all to authenticated using (true) with check (true);
create policy "admin all" on onb_examples for all to authenticated using (true) with check (true);

create policy "admin all" on onboarding_forms for all to authenticated using (true) with check (true);
create policy "admin all" on onboarding_briefs for all to authenticated using (true) with check (true);
create policy "admin all" on onboarding_ai_log for all to authenticated using (true) with check (true);

-- ================================================================ settings

insert into app_settings (key, value) values
  ('onb_model',             '"gpt-4o"'),
  ('onb_max_followups',     '12'),
  ('onb_max_rounds',        '2'),
  ('onb_max_rewrites',      '9'),
  ('onb_max_ai_calls',      '20'),
  ('onb_build_weeks_min',   '3'),
  ('onb_build_weeks_max',   '6'),
  ('onb_estimated_minutes', '20'),
  ('onb_terms_version',     '"v2"'),
  ('onb_examples_url',      '""'),
  ('onb_folder_help_url',   '"https://support.google.com/drive/answer/2494822"'),
  ('onb_team_email',        '""')
on conflict (key) do nothing;
