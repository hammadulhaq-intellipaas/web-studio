-- IntelliPaaS Web Studio — initial schema
-- Catalog tables are anon-readable (public configurator); everything else is admin-only.
-- All public writes go through Next.js route handlers using the service-role key.

create table addon_categories (
  id text primary key,
  name_de text not null,
  name_en text not null,
  note_de text,
  note_en text,
  sort int not null default 0
);

create table bundles (
  id text primary key,
  name text not null,
  tag_de text not null,
  tag_en text not null,
  price numeric not null,
  chips jsonb not null default '[]', -- [{de,en}]
  backup_upgrade_price numeric,      -- null = no backup upgrade (BYOW)
  backup_upgrade_label_de text,
  backup_upgrade_label_en text,
  backup_base_label_de text,         -- e.g. "monatlich" (current backup cadence)
  backup_base_label_en text,
  sort int not null default 0,
  active boolean not null default true
);

create table addons (
  id text primary key,
  category_id text not null references addon_categories(id),
  name_de text not null,
  name_en text not null,
  note_de text,
  note_en text,
  billing text not null default 'once' check (billing in ('once','monthly','yearly')),
  price_now numeric not null,
  price_later numeric,
  qty jsonb,   -- {min,max,unit_de,unit_en}
  tiers jsonb, -- [{n,price,label_de,label_en}]
  included_in text[] not null default '{}',
  byow_only boolean not null default false,
  not_byow boolean not null default false,
  ai_bundle_member boolean not null default false,
  sort int not null default 0,
  active boolean not null default true
);

create table care_plans (
  id text primary key,
  name text not null,
  price_monthly numeric not null,
  desc_de text not null,
  desc_en text not null,
  short_de text not null,
  short_en text not null,
  recommended boolean not null default false,
  sort int not null default 0
);

create table cloudflare_plans (
  id text primary key,
  name_de text not null,
  name_en text not null,
  setup_price numeric,
  monthly_price numeric,
  desc_de text not null,
  desc_en text not null,
  recommended boolean not null default false,
  -- when non-null, this plan is included at no cost if care plan or bundle matches
  included_when jsonb,
  sort int not null default 0
);

create table support_plans (
  id text primary key,
  name_de text not null,
  name_en text not null,
  price_monthly numeric,
  desc_de text not null,
  desc_en text not null,
  sort int not null default 0
);

create table personas (
  id text primary key,
  label_de text not null,
  label_en text not null,
  icon_path text not null,
  default_answers jsonb not null default '{}',
  preselect_addons text[] not null default '{}',
  sort int not null default 0
);

create table app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table vouchers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  percent int not null check (percent > 0 and percent <= 100),
  scope text not null default 'both' check (scope in ('one_time','recurring','both')),
  valid_from timestamptz,
  valid_until timestamptz,
  max_redemptions int,
  redemption_count int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  locale text not null default 'de',
  vorname text not null default '',
  nachname text not null default '',
  firma text not null default '',
  email text not null,
  telefon text not null,
  ziel text,
  consent_at timestamptz not null,
  persona_id text references personas(id),
  source_url text,
  config jsonb not null,          -- immutable snapshot incl. resolved price lines
  total_one_time numeric not null default 0,
  total_monthly numeric not null default 0,
  total_yearly numeric not null default 0,
  voucher_id uuid references vouchers(id),
  stage2 jsonb,
  drive_link text,
  goal text,
  status text not null default 'new' check (status in ('new','contacted','won','lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_created_at_idx on leads (created_at desc);
create index leads_status_idx on leads (status);
create index leads_email_idx on leads (email);

create table lead_files (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  kind text not null check (kind in ('logo','photo')),
  file_name text not null,
  size_bytes bigint not null,
  mime_type text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);
create index lead_files_lead_idx on lead_files (lead_id);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete set null,
  calendly_event_uri text not null unique,
  calendly_invitee_uri text,
  invitee_name text,
  invitee_email text,
  start_time timestamptz not null,
  end_time timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled','canceled')),
  cancel_reason text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index appointments_start_idx on appointments (start_time);
create index appointments_lead_idx on appointments (lead_id);

create table suggested_plans (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  version int not null default 1,
  model text not null,
  status text not null default 'generated' check (status in ('generated','edited')),
  phases jsonb not null, -- [{key,title,tool,prompt_markdown,inputs}]
  created_at timestamptz not null default now(),
  unique (lead_id, version)
);

-- ---------------------------------------------------------------- RLS
alter table addon_categories enable row level security;
alter table bundles enable row level security;
alter table addons enable row level security;
alter table care_plans enable row level security;
alter table cloudflare_plans enable row level security;
alter table support_plans enable row level security;
alter table personas enable row level security;
alter table app_settings enable row level security;
alter table vouchers enable row level security;
alter table leads enable row level security;
alter table lead_files enable row level security;
alter table appointments enable row level security;
alter table suggested_plans enable row level security;

-- Catalog: anyone may read; only authenticated admins may write.
create policy "catalog read" on addon_categories for select using (true);
create policy "catalog read" on bundles for select using (true);
create policy "catalog read" on addons for select using (true);
create policy "catalog read" on care_plans for select using (true);
create policy "catalog read" on cloudflare_plans for select using (true);
create policy "catalog read" on support_plans for select using (true);
create policy "catalog read" on personas for select using (true);
create policy "catalog read" on app_settings for select using (true);

create policy "admin write" on addon_categories for all to authenticated using (true) with check (true);
create policy "admin write" on bundles for all to authenticated using (true) with check (true);
create policy "admin write" on addons for all to authenticated using (true) with check (true);
create policy "admin write" on care_plans for all to authenticated using (true) with check (true);
create policy "admin write" on cloudflare_plans for all to authenticated using (true) with check (true);
create policy "admin write" on support_plans for all to authenticated using (true) with check (true);
create policy "admin write" on personas for all to authenticated using (true) with check (true);
create policy "admin write" on app_settings for all to authenticated using (true) with check (true);

-- Sensitive tables: admins only (public writes go through service-role route handlers).
create policy "admin all" on vouchers for all to authenticated using (true) with check (true);
create policy "admin all" on leads for all to authenticated using (true) with check (true);
create policy "admin all" on lead_files for all to authenticated using (true) with check (true);
create policy "admin all" on appointments for all to authenticated using (true) with check (true);
create policy "admin all" on suggested_plans for all to authenticated using (true) with check (true);

-- Private bucket for stage-2 uploads (served to admins via signed URLs).
insert into storage.buckets (id, name, public)
values ('lead-uploads', 'lead-uploads', false)
on conflict (id) do nothing;

create policy "admin read uploads" on storage.objects
  for select to authenticated using (bucket_id = 'lead-uploads');
