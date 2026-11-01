-- Showcase, simpler form: one field each for the professional title and the review, the
-- screenshot taken automatically from the website link, and one "the owner agreed" tick
-- (date and who ticked it) instead of a date and a note. "What the website is about" goes.
-- Any text already entered is kept. Safe to run before or after the deploy, and more than once.

alter table showcase_items
  add column if not exists owner_title text not null default '',
  add column if not exists quote text not null default '',
  add column if not exists screenshot_at timestamptz,
  add column if not exists consent_by text;

-- Carry over what an entry already had, German first.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'showcase_items' and column_name = 'quote_de'
  ) then
    update showcase_items
    set owner_title = coalesce(nullif(owner_title, ''), nullif(owner_title_de, ''), owner_title_en, ''),
        quote = coalesce(nullif(quote, ''), nullif(quote_de, ''), quote_en, '');
  end if;
end $$;

alter table showcase_items drop constraint if exists showcase_items_publish_ready;

alter table showcase_items
  drop column if exists owner_title_de,
  drop column if exists owner_title_en,
  drop column if exists about_de,
  drop column if exists about_en,
  drop column if exists quote_de,
  drop column if exists quote_en,
  drop column if exists consent_note;

-- Nothing goes public without the owner's agreement and a complete card. The photo is
-- optional: without one the card shows the owner's initials.
alter table showcase_items add constraint showcase_items_publish_ready check (
  not published or (
    consent_at is not null
    and owner_name <> ''
    and site_url <> ''
    and owner_title <> ''
    and quote <> ''
    and screenshot_path is not null
  )
);
