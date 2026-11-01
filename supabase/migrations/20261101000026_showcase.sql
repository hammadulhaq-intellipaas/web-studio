-- Showcase: websites we have built, each with the owner's photo, name, professional title,
-- a line of review and a screenshot of the site. Edited on /admin/showcase. The homepage does
-- not show them yet; when it does, it reads only published entries.
-- Safe to run before or after the deploy, and more than once.

-- Public bucket: the homepage shows the owner photos and screenshots straight from storage.
-- Images only, at most 5 MB each.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('showcase', 'showcase', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create table if not exists showcase_items (
  id uuid primary key default gen_random_uuid(),
  owner_name text not null default '',
  -- What the owner does, e.g. "Physiotherapeutin" / "Physiotherapist".
  owner_title_de text not null default '',
  owner_title_en text not null default '',
  business_name text not null default '',
  -- One line on what the website is for.
  about_de text not null default '',
  about_en text not null default '',
  -- The owner's review, a sentence or two.
  quote_de text not null default '',
  quote_en text not null default '',
  site_url text not null default '',
  -- Paths in the showcase bucket.
  photo_path text,
  screenshot_path text,
  -- When and how the owner agreed to their name, photo and words being shown.
  consent_at date,
  consent_note text not null default '',
  published boolean not null default false,
  sort int not null default 0,
  -- The client's quote, for a later "add to showcase" from the Developers handover.
  lead_id uuid references leads(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text,
  -- Nothing goes public without consent and a complete card.
  constraint showcase_items_publish_ready check (
    not published or (
      consent_at is not null
      and owner_name <> ''
      and site_url <> ''
      and (owner_title_de <> '' or owner_title_en <> '')
      and (quote_de <> '' or quote_en <> '')
      and photo_path is not null
      and screenshot_path is not null
    )
  )
);

alter table showcase_items enable row level security;
drop policy if exists "showcase read published" on showcase_items;
create policy "showcase read published" on showcase_items for select using (published);
drop policy if exists "admin all" on showcase_items;
create policy "admin all" on showcase_items for all to authenticated using (true) with check (true);
