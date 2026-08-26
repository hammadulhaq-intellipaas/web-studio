-- Widgets was a single on/off toggle whose name listed all three options in brackets,
-- so a customer who only wanted the WhatsApp button still paid for the lot. Give add-ons
-- an optional list of tickable sub-options: the card renders one tickbox per option and
-- charges `price_now` per tick (minimum one), so 2 widgets cost twice 1 widget.
--
-- `sub_addons` is [{id,name_de,name_en}]. `id` is the stable key stored in a customer's
-- saved selection — renaming an option is safe, changing its id is not.

alter table addons add column if not exists sub_addons jsonb;

-- The three options move out of the name and into tickboxes; keeping them in the name
-- would print them twice on the card, once as text and once as the boxes below it.
update addons set
  name_de = 'Widgets',
  name_en = 'Widgets',
  sub_addons = '[
    {"id":"whatsapp","name_de":"WhatsApp","name_en":"WhatsApp"},
    {"id":"reviews","name_de":"Bewertungen","name_en":"Reviews"},
    {"id":"clicktocall","name_de":"Click-to-Call","name_en":"Click-to-call"}
  ]'::jsonb
  where id = 'widgets';
