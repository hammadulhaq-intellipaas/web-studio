-- Quote page logic, October 2026.
--
--   1. SEO Lite, a cheaper monthly SEO tier: keyword monitoring and monthly reports.
--   2. Care plan Plus no longer promises a monthly SEO review.
--   3. CMS setup is part of Gold, and the Gold card says so.
--   4. Silver gets CMS setup as an add-on, and Blog setup too when they asked for a blog.
--   5. Payment at booking (Stripe) needs paid appointments AND online booking.
--
-- Every statement is a no-op on an empty catalogue, so a fresh database built from the
-- migrations and then seed.sql (which carries the same rows) is not broken by it.

-- 1. SEO Lite ------------------------------------------------------------------------------
-- Sits first in SEO & GEO Marketing Bundles as the entry tier. It does not cover the
-- on-page SEO setup for free; Starter and Pro do.
insert into addons (
  id, category_id, name_de, name_en, note_de, note_en, billing, price_now, price_later,
  qty, tiers, included_in, bundle_members, byow_only, not_byow, ai_bundle_member,
  badge_de, badge_en, highlight, sort, tooltip_de, tooltip_en, active
)
select
  'seolite', 'seogeo_bundles',
  'SEO Lite — Keyword-Monitoring und monatliche Reports',
  'SEO Lite — keyword monitoring and monthly reports',
  null, null, 'monthly', 180, null,
  null, null, '{}', '{}', false, false, false,
  null, null, false, 5,
  'Wir verfolgen jeden Monat Ihre Keyword-Rankings und schicken Ihnen einen kurzen Report: wo Sie stehen und was sich verändert hat. Ohne Artikel, die kommen mit SEO Starter dazu.',
  'We track your keyword rankings every month and send a short report on where you rank and what changed. No articles; SEO Starter adds those.',
  true
where exists (select 1 from addons where id = 'seostarter')
on conflict (id) do nothing;

-- 2. Care plan Plus -----------------------------------------------------------------------
update care_plans set
  desc_de  = '+ Sicherheits-Checks, 2 Std. Änderungen, Compliance-Updates (Backup wöchentlich)',
  desc_en  = '+ security checks, 2 hrs of changes, compliance updates (weekly backup)',
  short_de = '+ Security, 2 Std. Änderungen',
  short_en = '+ security, 2 hrs of changes'
where id = 'plus';

-- 3. CMS setup is part of Gold ----------------------------------------------------------
update addons
set included_in = array_append(included_in, 'gold')
where id = 'cms' and not ('gold' = any(included_in));

-- The "Included in the Gold package" card is the bundle's chips: CMS setup goes right after
-- Blog setup. Written out in full rather than spliced, so it reads as exactly what the card
-- will say. Skipped if the card already mentions a CMS.
update bundles set chips = '[
  {"de":"Alles in Silver","en":"Everything in Silver"},
  {"de":"Bis 8 Seiten","en":"Up to 8 pages"},
  {"de":"2 Sprachen","en":"2 languages"},
  {"de":"Blog-Setup","en":"Blog setup"},
  {"de":"CMS-Einrichtung (Seiten, Blog & Events selbst verwalten)","en":"CMS setup (manage pages, blog & events yourself)"},
  {"de":"SEO-Basis (Meta, Sitemap, Search Console)","en":"SEO basics (meta, sitemap, Search Console)"},
  {"de":"Erweiterte Formularlogik","en":"Advanced form logic"},
  {"de":"Bis 3 E-Mail-Adressen","en":"Up to 3 email addresses"},
  {"de":"Wöchentliches Backup","en":"Weekly backup"}
]'::jsonb
where id = 'gold' and chips::text not like '%CMS%';

-- 4. Silver: CMS setup always, Blog setup when they asked for a blog -------------------
-- `bundle` is the package in front of the customer. These re-apply when they switch
-- package, so Gold shows CMS as included and Silver adds it back as an add-on.
insert into addon_rules (id, conditions, add_addon_ids, remove_addon_ids, note, active, sort) values
  ('silver_cms',
   '[{"key":"bundle","values":["silver"]}]',
   '{cms}', '{}',
   'Silver does not include a CMS, so it is added as an add-on. Gold and Platinum include it.',
   true, 120),
  ('silver_blog',
   '[{"key":"bundle","values":["silver"]},{"key":"blog","values":["ja"]}]',
   '{blogsetup}', '{}',
   'Silver with a blog: Blog setup is an add-on there. Gold and Platinum include it.',
   true, 130)
on conflict (id) do update set
  conditions = excluded.conditions,
  add_addon_ids = excluded.add_addon_ids,
  remove_addon_ids = excluded.remove_addon_ids,
  note = excluded.note,
  active = excluded.active,
  sort = excluded.sort;

-- 5. Stripe only with payment intent ----------------------------------------------------
-- "Are the appointments paid?" only shows with online booking, but an earlier Yes survives
-- switching back to "contact form only". Requiring both keeps Stripe off for anyone with
-- no booking system. Without payment intent it is simply not pre-selected; it can still be
-- ticked by hand.
update addon_rules set
  conditions = '[{"key":"fees","values":["ja"]},{"key":"contact","values":["booking"]}]',
  note = 'Payment intent: paid appointments with online booking.'
where id = 'fees_ja';
