-- Developers page: the design and build prompts are always written in English, whatever language
-- the client filled in the onboarding form in. Only the text that appears on the pages stays in
-- the site's language. (The improvement prompt and the reference spec already say so; the
-- handover document is for the client and stays in their language.)
-- Each row only changes while it still holds the old rule: an instruction edited in the CMS is
-- left alone. Safe to run before or after the deploy, and more than once.

update onb_prompts
set content = replace(
  content,
  '9. Design the pages in the site''s main language: German if the client filled in the form in German, otherwise the form''s language. If the site has a second language, show the language switch in the header, but do not design the second language.',
  '9. Write the whole prompt in English, whatever language the client filled in the form in. Only the words that will appear on the pages are in the site''s main language, quoted exactly: headlines, body text, buttons, navigation, form labels and placeholders. The site''s main language is German if the client filled in the form in German, otherwise the form''s language. Page names keep the client''s wording from their page list; everything else in the two page lists, such as the reason for each page, is in English. If the site has a second language, show the language switch in the header, but do not design the second language.'
),
updated_at = now()
where id = 'dev_design'
  and position('9. Design the pages in the site''s main language:' in content) > 0;

update onb_prompts
set content = replace(
  content,
  '(the chosen pages, one per line as "- <page name>: <one short reason>")',
  '(the chosen pages, one per line as "- <page name>: <one short reason, in English>")'
),
updated_at = now()
where id = 'dev_design'
  and position('<one short reason>")' in content) > 0;

update onb_prompts
set content = replace(
  content,
  '19. Never use an em dash or an en dash anywhere, in code comments, content or the prompt.',
  '19. Write the prompt in English, whatever language the client filled in the form in. Text that appears on the site and the client''s own words stay in their language, quoted exactly. Never use an em dash or an en dash anywhere, in code comments, content or the prompt.'
),
updated_at = now()
where id = 'dev_build'
  and position('19. Never use an em dash or an en dash anywhere, in code comments, content or the prompt.' in content) > 0;
