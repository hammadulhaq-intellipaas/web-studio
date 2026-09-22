-- IntelliPaaS Web Studio — quotes pipeline.
--
-- Permanent customer links (a lead keeps its funnel session instead of deleting it),
-- quote version history, team-created draft quotes, archive ("Remove") instead of delete,
-- notes / owner / agreed amount on a lead.
--
-- Invariant from here on: leads.config / total_* hold the LATEST submitted snapshot and
-- change only together with a lead_versions row; every earlier snapshot lives in
-- lead_versions. The application detects whether this migration has been applied
-- (src/lib/quotes/schema.ts) and keeps the legacy behaviour until it has.

-- ---------------------------------------------------------------- leads
alter table leads add column session_id text references funnel_sessions(id) on delete set null;
alter table leads add constraint leads_session_id_key unique (session_id);
alter table leads add column source text not null default 'customer'
  check (source in ('customer','team'));
alter table leads add column owner_email text;
alter table leads add column archived_at timestamptz;
alter table leads add column archived_by text;
alter table leads add column submitted_at timestamptz;   -- last submit by the customer
alter table leads add column agreed_version_id uuid;      -- FK added below
alter table leads add column agreed_one_time numeric;
alter table leads add column agreed_monthly numeric;
alter table leads add column agreed_at timestamptz;
alter table leads add column agreed_by text;

-- Team-created drafts have no phone and no consent until the customer submits themselves.
alter table leads alter column telefon drop not null;
alter table leads alter column consent_at drop not null;

alter table leads drop constraint leads_status_check;
alter table leads add constraint leads_status_check
  check (status in ('draft','new','contacted','agreed','won','lost'));

create index leads_archived_idx on leads (archived_at);

-- ---------------------------------------------------------------- lead_versions
create table lead_versions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  version int not null,
  actor text not null,               -- 'customer' | 'team:<email>' | 'system'
  reason text not null
    check (reason in ('submit','idle','actor_change','manual','restore','backfill')),
  state jsonb,                       -- SessionState at that moment (null on backfill)
  config jsonb not null,             -- LeadConfig, repriced server-side
  totals jsonb not null,             -- Totals (backfill: the three effective figures only)
  locale text not null default 'de',
  eur_to_usd_rate numeric,           -- rate at capture time, so EN figures stay reproducible
  state_hash text,                   -- sha-256 of the canonical selection; null never matches
  created_at timestamptz not null default now(),
  unique (lead_id, version)
);
create index lead_versions_lead_idx on lead_versions (lead_id, created_at desc);

alter table leads add constraint leads_agreed_version_id_fkey
  foreign key (agreed_version_id) references lead_versions(id) on delete set null;

-- ---------------------------------------------------------------- lead_activity
-- Notes written by the team plus the automatic timeline (status, versions, emails, links,
-- onboarding hand-off, archive, owner, agreed). `kind` is free text on purpose.
create table lead_activity (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  kind text not null,
  actor text,
  body text not null default '',
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index lead_activity_lead_idx on lead_activity (lead_id, created_at desc);

-- ---------------------------------------------------------------- funnel_sessions
alter table funnel_sessions add column last_actor text;   -- 'customer' | 'team:<email>'

-- ---------------------------------------------------------------- RLS
alter table lead_versions enable row level security;
alter table lead_activity enable row level security;
create policy "admin all" on lead_versions for all to authenticated using (true) with check (true);
create policy "admin all" on lead_activity for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------- settings
insert into app_settings (key, value) values ('quote_idle_minutes', '10'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------- backfill (idempotent)
-- Every existing lead gets its submitted snapshot as version 1 and a timeline start.
insert into lead_versions (lead_id, version, actor, reason, state, config, totals, locale, state_hash, created_at)
select
  id, 1, 'customer', 'backfill', null, config,
  jsonb_build_object(
    'oneTimeEffective', total_one_time,
    'monthlyEffective', total_monthly,
    'yearlyEffective', total_yearly
  ),
  locale, null, created_at
from leads
on conflict (lead_id, version) do nothing;

update leads set submitted_at = created_at where submitted_at is null;

insert into lead_activity (lead_id, kind, actor, body, meta, created_at)
select l.id, 'version', 'customer', 'Submitted v1', jsonb_build_object('version', 1), l.created_at
from leads l
where not exists (
  select 1 from lead_activity a where a.lead_id = l.id and a.kind = 'version' and a.meta->>'version' = '1'
);
