-- Marketing held one "SEO & GEO" section mixing the monthly marketing bundles with the
-- one-time setup work, and the three setup add-ons had been deactivated entirely — so
-- there was no way to buy the setup on its own. Split the section in two:
--
--   SEO & GEO Setup             (top of Marketing) — the three one-time setups
--   SEO & GEO Marketing Bundles                    — the monthly bundles, unchanged
--
-- The setup is free for customers who take the matching monthly bundle, expressed with
-- the existing bundle_members mechanism: a selected add-on covers its members at no cost.
--
-- Prices are EUR, as everywhere in this catalog; the EN site converts at the live rate.
-- Confirmed with Fizra 2026-08-26: SEO 420, GEO 420, combo 800.
--
-- NOTE on the combo price: first specified as 900, but 420 + 420 = 840 means 900 would cost
-- MORE than buying both singles, making its "Best value" badge false. Settled at 800 —
-- a real, if slim, 40 saving. If it is ever raised above 840, clear badge_de/badge_en at
-- the same time or the card contradicts itself.

-- 1. The bundles move into a category that says what they are; the setups keep the
--    seogeo_setup id, which now finally matches its contents.
insert into addon_categories (id, parent_id, name_de, name_en, note_de, note_en, sort)
values (
  'seogeo_bundles', 'marketing',
  'SEO & GEO Marketing-Bundles', 'SEO & GEO Marketing Bundles',
  'Monatlich, 12 Monate Mindestlaufzeit.', 'Monthly, 12-month minimum term.',
  20
)
on conflict (id) do update set
  parent_id = excluded.parent_id,
  name_de   = excluded.name_de,
  name_en   = excluded.name_en,
  note_de   = excluded.note_de,
  note_en   = excluded.note_en,
  sort      = excluded.sort;

update addons set category_id = 'seogeo_bundles'
  where id in ('seostarter', 'seopro', 'geomon', 'seogeokombi', 'localseo', 'citation');

-- 2. seogeo_setup keeps sort 10, so Setup sits above Bundles at the top of Marketing.
update addon_categories set
  name_de = 'SEO & GEO Setup',
  name_en = 'SEO & GEO Setup',
  sort    = 10
  where id = 'seogeo_setup';

-- 3. Bring the three setups back, repriced. `price_later` follows the catalog's usual
--    ~1.5x uplift and is equal for the two equally-priced setups.
update addons set
  active = true, price_now = 420, price_later = 630, sort = 10,
  note_de = 'Kostenlos bei SEO Starter, SEO Pro oder dem SEO + GEO Kombi.',
  note_en = 'Free with SEO Starter, SEO Pro or the SEO + GEO combo.'
  where id = 'seosetup';

update addons set
  active = true, price_now = 420, price_later = 630, sort = 20,
  note_de = 'Kostenlos bei GEO Monitoring oder dem SEO + GEO Kombi.',
  note_en = 'Free with GEO monitoring or the SEO + GEO combo.'
  where id = 'geosetup';

update addons set
  active = true, price_now = 800, price_later = 1200, sort = 30,
  note_de = 'Einmalige Einrichtungsgebühr — kostenlos beim SEO + GEO Kombi.',
  note_en = 'One-time setup fee — free with the SEO + GEO combo.',
  -- The old tooltip claimed ~20% off, which was never true. At 800 against 420 + 420 the
  -- saving is 40, so the claim is dropped rather than restated as a thin percentage.
  tooltip_de = 'Bündelt SEO- und GEO-Setup in einer einmaligen Gebühr — günstiger als beides einzeln, gefunden bei Google und bei ChatGPT.',
  tooltip_en = 'Bundles the SEO and GEO setup in one one-time fee — cheaper than booking them separately, and found on both Google and ChatGPT.'
  where id = 'seogeosetup';

-- 4. Free setup with the matching bundle. Each bundle covers only the setup for the
--    service it actually monitors; the combo covers both plus the combo setup.
--    seogeokombi keeps its existing coverage of seostarter/geomon.
update addons set bundle_members = '{seosetup}' where id = 'seostarter';
update addons set bundle_members = '{seosetup}' where id = 'seopro';
update addons set bundle_members = '{geosetup}' where id = 'geomon';
update addons set bundle_members = '{seostarter,geomon,seosetup,geosetup,seogeosetup}'
  where id = 'seogeokombi';

notify pgrst, 'reload schema';
