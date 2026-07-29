-- Matt couldn't find the blog-subscription box on the live site — it was rendering
-- before the one-time Blog Starter Bundle instead of after, which is why it got
-- scrolled past. Reorder it, and add the 4-articles/month tier he expected to see.
--
-- NOTE: the 4-tier price (145) is a PLACEHOLDER — Matt has not confirmed it. It was
-- picked to sit between the existing 3-tier (110) and 5-tier (175) prices on the
-- same curve, but needs explicit sign-off before being treated as final.

update addons set
  sort = 35,
  tiers = '[{"n":1,"price":40},{"n":3,"price":110},{"n":4,"price":145},{"n":5,"price":175},{"n":10,"price":320}]'
  where id = 'blogabo';
