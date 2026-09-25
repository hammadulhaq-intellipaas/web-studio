-- Onboarding files get their own bucket and their own table.
--
-- Until now the form's uploads and brief PDFs shared the funnel's `lead-uploads` bucket,
-- and their rows lived in `lead_files` next to the leads' files. The browser now uploads
-- straight to storage with a one-time signed URL (Vercel refuses request bodies over
-- 4.5 MB, so a photo could never pass through our route), and the route only records the
-- file once it is really there.

-- Private bucket: the team reads through signed URLs, the client never gets a read URL.
-- 25 MB matches the form's per-field total, so no single object can exceed it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'onboarding-uploads',
  'onboarding-uploads',
  false,
  26214400,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic', 'image/heif', 'image/svg+xml',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/postscript', 'application/zip'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "admin read onboarding uploads" on storage.objects
  for select to authenticated using (bucket_id = 'onboarding-uploads');

-- One row per uploaded file. `storage_path` is `<form id>/<field key>/<time>-<name>`
-- inside `bucket`; rows moved over from lead_files keep pointing at `lead-uploads`.
create table onboarding_files (
  id uuid primary key default gen_random_uuid(),
  form_id text not null references onboarding_forms(id) on delete cascade,
  field_key text not null,
  bucket text not null default 'onboarding-uploads',
  storage_path text not null,
  file_name text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  mime_type text not null,
  created_at timestamptz not null default now(),
  unique (bucket, storage_path)
);
create index onboarding_files_form_idx on onboarding_files (form_id, created_at);

alter table onboarding_files enable row level security;
create policy "admin all" on onboarding_files for all to authenticated using (true) with check (true);

-- Move the rows the form already wrote into lead_files. The objects stay where they are.
insert into onboarding_files (id, form_id, field_key, bucket, storage_path, file_name, size_bytes, mime_type, created_at)
select id, onboarding_form_id, coalesce(field_key, 'assets_upload'), 'lead-uploads', storage_path, file_name, size_bytes, mime_type, created_at
from lead_files
where onboarding_form_id is not null
on conflict do nothing;

delete from lead_files where onboarding_form_id is not null;
