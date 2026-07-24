-- Recategorize the add-on catalog into a 2-level tree and add static badge/highlight flags.
-- FK-safe order: schema first, then insert parents before children, then repoint add-ons.
-- Every existing category id is reused (repurposed); none is deleted.

-- ------------------------------------------------------------- 1. schema
alter table addon_categories
  add column parent_id text references addon_categories(id),
  add constraint addon_categories_no_self_parent check (parent_id is null or parent_id <> id);

alter table addons
  add column badge_de text,
  add column badge_en text,
  add column highlight boolean not null default false;

-- ------------------------------------------------------------- 2. new parents + children
insert into addon_categories (id, parent_id, name_de, name_en, sort) values
  ('content',       null,        'Website-Inhalte & Funktionen', 'Website content & functionality', 10),
  ('content_pages', 'content',   'Seiten & Inhalte',             'Pages & content',                 10),
  ('mkt_social',    'marketing', 'Social Media',                 'Social media',                    30),
  ('mkt_ads',       'marketing', 'Werbung & Reporting',          'Advertising & reporting',         50);

-- ------------------------------------------------------------- 3. repurpose existing categories
update addon_categories set parent_id='content', name_de='Funktionen & Integrationen', name_en='Features & integrations', sort=20 where id='inhalte';
update addon_categories set name_de='Marketing', name_en='Marketing', note_de=null, note_en=null, sort=20 where id='marketing';
update addon_categories set parent_id='marketing', sort=10 where id='seogeo_setup';
update addon_categories set parent_id='marketing', sort=20 where id='seogeo_mon';
update addon_categories set parent_id='marketing', name_de='Blog & Newsletter', name_en='Blog & newsletter', note_de=null, note_en=null, sort=40 where id='blogabo';
update addon_categories set name_de='KI-Services', name_en='AI services', sort=30 where id='ki';
update addon_categories set sort=40 where id='compliance';
update addon_categories set sort=60 where id='email_admin';
update addon_categories set sort=70 where id='byos';

-- ------------------------------------------------------------- 4. repoint + re-sort add-ons
-- content › Seiten & Inhalte
update addons set category_id='content_pages', sort=10 where id='page';
update addons set category_id='content_pages', sort=20 where id='foto';
update addons set category_id='content_pages', sort=30 where id='logo';
update addons set category_id='content_pages', sort=40 where id='lang';
-- content › Funktionen & Integrationen (stays in 'inhalte', re-sorted)
update addons set sort=10  where id='cms';
update addons set sort=15  where id='cmsmon';
update addons set sort=20  where id='bookembed';
update addons set sort=30  where id='bookcustom';
update addons set sort=40  where id='bookpay';
update addons set sort=50  where id='ecom';
update addons set sort=60  where id='form';
update addons set sort=70  where id='maps';
update addons set sort=80  where id='widgets';
update addons set sort=90  where id='chatwidget';
update addons set sort=100 where id='perf';
-- marketing › Social Media
update addons set category_id='mkt_social', sort=10 where id='socialbasic';
update addons set category_id='mkt_social', sort=20 where id='socialfeed';
-- marketing › Blog & Newsletter
update addons set category_id='blogabo', sort=10 where id='blogabo';
update addons set category_id='blogabo', sort=20 where id='blogsetup';
update addons set category_id='blogabo', sort=30 where id='blogstarter';
update addons set category_id='blogabo', sort=40 where id='newsletter';
update addons set category_id='blogabo', sort=50 where id='newscare';
-- marketing › Werbung & Reporting
update addons set category_id='mkt_ads', sort=10 where id='ads';
update addons set category_id='mkt_ads', sort=20 where id='ga4';
-- E-Mail & Verwaltung (gws moves here from 'inhalte')
update addons set category_id='email_admin', sort=10 where id='gws';
update addons set sort=20 where id='gadmin';

-- ------------------------------------------------------------- 5. highlights / static badges
update addons set highlight=true, badge_de='Bestes Preis-Leistung', badge_en='Best value'
  where id in ('seogeosetup','seogeokombi');
