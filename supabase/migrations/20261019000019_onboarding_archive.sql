-- "Remove" for onboarding forms in the admin, the same way leads work: the form leaves the
-- CMS list but nothing is deleted. The row, its answers, briefs, files and the client's own
-- link all stay; "Restore" brings it back.

alter table onboarding_forms add column if not exists archived_at timestamptz;
alter table onboarding_forms add column if not exists archived_by text;

create index if not exists onboarding_forms_archived_idx on onboarding_forms (archived_at);
