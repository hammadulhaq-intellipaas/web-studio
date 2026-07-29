-- Matt: SimplyBook isn't actually integrated/offered — rename to Cal.com, the tool
-- he wants named instead. Pure content fix on the existing bookembed row.

update addons set
  name_de = 'Online-Buchungssystem (Calendly/Cal.com)',
  name_en = 'Online booking system (Calendly/Cal.com)'
  where id = 'bookembed';
