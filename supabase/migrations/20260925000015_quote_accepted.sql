-- The customer can now accept their own quote from their permanent link, which is a
-- different event from the team agreeing a price on the phone. `agreed` keeps meaning the
-- latter; `accepted` means the customer pressed the button themselves.
--
-- An accepted quote is locked to the customer (the team can still edit in team mode), and
-- accepting is what creates their onboarding form.

alter table leads drop constraint leads_status_check;
alter table leads add constraint leads_status_check
  check (status in ('draft', 'new', 'contacted', 'accepted', 'agreed', 'won', 'lost'));

-- When they accepted, so the team can see it in the timeline and the list.
alter table leads add column if not exists accepted_at timestamptz;

create index if not exists leads_accepted_idx on leads (accepted_at);
