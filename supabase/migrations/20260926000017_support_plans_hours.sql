-- Support plans sell on what is included, not just on a price.
--
-- The cards used to carry one free-text line ("SLA 2-3 business days · email"), which left
-- nothing to upsell on: no hours, no worth, no way to mark the tier we want chosen. These
-- columns split that line apart and add the numbers the cards need.
--
-- Everything is nullable or defaulted, so the app runs unchanged until the rows are filled.

alter table support_plans
  add column if not exists included_hours numeric(4, 2) not null default 0,
  add column if not exists recommended boolean not null default false,
  add column if not exists sla_de text,
  add column if not exists sla_en text,
  add column if not exists channels_de text,
  add column if not exists channels_en text;

comment on column support_plans.included_hours is 'Support hours included each month. 0 means billed by effort.';
comment on column support_plans.recommended is 'Marks the tier the cards highlight. Expected on exactly one row.';
comment on column support_plans.sla_de is 'Response time on its own line, e.g. "SLA 1-2 Werktage". Null falls back to desc.';
comment on column support_plans.channels_de is 'How they reach us, e.g. "E-Mail + Chat". Null falls back to desc.';

-- The worth of the included hours, and what the no-plan tier is billed at. Kept in euros
-- like every other price in the catalogue; the English pages convert at the live rate.
insert into app_settings (key, value) values
  ('support_hourly_rate', '150'),
  ('support_day_rate', '1200'),
  ('support_rollover_months', '2')
on conflict (key) do nothing;

update support_plans set
  included_hours = 0,
  recommended = false,
  sla_de = 'Kein SLA', sla_en = 'No SLA',
  channels_de = 'Nach Aufwand abgerechnet', channels_en = 'Billed by effort'
where id = 'none';

update support_plans set
  included_hours = 1,
  recommended = false,
  sla_de = 'SLA 2-3 Werktage', sla_en = 'SLA 2-3 business days',
  channels_de = 'E-Mail', channels_en = 'Email'
where id = 'std';

update support_plans set
  included_hours = 2.5,
  recommended = true,
  sla_de = 'SLA 1-2 Werktage', sla_en = 'SLA 1-2 business days',
  channels_de = 'E-Mail + Chat', channels_en = 'Email + chat'
where id = 'prio';

update support_plans set
  included_hours = 5,
  recommended = false,
  sla_de = 'Gleicher Werktag', sla_en = 'Same business day',
  channels_de = 'E-Mail, Chat, Telefon + Proaktiv-Check', channels_en = 'Email, chat, phone + proactive check'
where id = 'vip';
