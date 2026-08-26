-- Reprice the SEO & GEO setups so the USD figures are the round ones.
--
-- 20260729000008 stored 420 / 420 / 800 as EUR, which the /en page converted to
-- $491 / $491 / $936. Fizra wants 420 / 420 / 800 to be what English customers read,
-- so the stored euro values become 360 / 360 / 685 (~$421 / $421 / $801 at 1.17).
--
-- Note this only holds at today's rate: the /en figures move with the live EUR->USD
-- rate, so the dollar amounts drift while the euro amounts stay fixed. The euro price
-- is what the business invoices.
--
-- `price_later` keeps the x1.5 uplift agreed for these three, which also preserves the
-- combo's saving at the same ~4.9% on both the now and later lines:
--   now   360 + 360 = 720 vs 685  -> saves 35
--   later 540 + 540 = 1080 vs 1030 -> saves 50

update addons set price_now = 360, price_later = 540 where id = 'seosetup';
update addons set price_now = 360, price_later = 540 where id = 'geosetup';
update addons set price_now = 685, price_later = 1030 where id = 'seogeosetup';
