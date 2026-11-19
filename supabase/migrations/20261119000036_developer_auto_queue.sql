-- The automatic chain's waiting steps, 19 Nov 2026.
-- Every step of the automatic chain (reading a client's website, writing the design prompts, a
-- design made in the app) starts the next one with a request to our own app. Vercel's recursion
-- protection refuses the fifth such request in a row (508), which stopped the Bloom (Test)
-- website read at its photos step. A refused step is now stored here, and a Vercel Cron job
-- (/api/developer/auto/queue, every minute) starts it again as a new chain.
--
-- Only the server reads and writes it (service role): row level security on, no policies.
-- Safe to run more than once.

create table if not exists developer_auto_queue (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  step jsonb not null,
  reason text,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists developer_auto_queue_created_at on developer_auto_queue (created_at);

alter table developer_auto_queue enable row level security;
