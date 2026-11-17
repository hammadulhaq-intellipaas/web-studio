import { describe, expect, it } from 'vitest';
import { BRAND_FIELDS, fields, FORM_A_ONLY } from '../supabase/seed/onboarding/fields';
import { isRequiredNow, listedPages, matches, redesignPageList, visibility } from '@/lib/onboarding/logic';
import { menuFromHtml } from '@/lib/onboarding/site-menu';
import type { Answers } from '@/lib/onboarding/types';

const a = (v: unknown) => ({ v }) as Answers[string];
const shown = (answers: Answers, locale: 'de' | 'en' = 'de') => new Set(visibility(fields, answers, locale).visible.map((f) => f.id));

describe('the two funnels', () => {
  const formB = { project_type: a('redesign'), existing_url: a('https://www.example-yoga.de') };

  it('Form B leaves out what the old website answers, and asks its own questions', () => {
    const b = shown(formB);
    for (const id of FORM_A_ONLY) expect(b.has(id), id).toBe(false);
    for (const id of ['redesign_reasons', 'current_site_notes', 'page_review', 'pages_to_add', 'brand_keep', 'legal_current', 'files_from_site']) expect(b.has(id), id).toBe(true);
  });

  it('Form A asks everything it asked before, and none of Form B', () => {
    const forA = shown({ project_type: a('new') });
    for (const id of ['business_one_liner', 'catalogue', 'page_list', 'legal_pages', 'content_ready_date']) expect(forA.has(id), id).toBe(true);
    for (const id of ['page_review', 'brand_keep', 'legal_current', 'redesign_reasons']) expect(forA.has(id), id).toBe(false);
  });

  it('a form that chose the retired "changes" answer keeps the full form and its website address', () => {
    const old = shown({ project_type: a('changes'), existing_url: a('https://alt.de') });
    for (const id of ['existing_url', 'business_one_liner', 'page_list', 'legal_pages', 'seo_pages']) expect(old.has(id), id).toBe(true);
    expect(old.has('page_review')).toBe(false);
  });

  it('hides the brand questions only when a Form B client keeps their brand', () => {
    const keep = shown({ ...formB, brand_keep: a('keep') });
    const fresh = shown({ ...formB, brand_keep: a('fresh') });
    const forA = shown({ project_type: a('new') });
    for (const id of ['colour_mood', 'typography_feel', 'brand_guidelines']) {
      expect(keep.has(id), id).toBe(false);
      expect(fresh.has(id), id).toBe(true);
      expect(forA.has(id), id).toBe(true);
    }
    expect(BRAND_FIELDS).toContain('brand_colours');
  });

  it('asks Sie or du in German forms only', () => {
    expect(shown({ project_type: a('new') }, 'de').has('address_form')).toBe(true);
    expect(shown({ project_type: a('new') }, 'en').has('address_form')).toBe(false);
  });

  it('offers only the two current answers; the retired one stays valid', () => {
    const type = fields.find((f) => f.id === 'project_type')!;
    expect(type.options.filter((o) => !o.retired).map((o) => o.value)).toEqual(['new', 'redesign']);
    expect(type.options.find((o) => o.value === 'changes')?.retired).toBe(true);
  });

  it('makes the photo folder optional in Form B only', () => {
    const folder = fields.find((f) => f.id === 'assets_folder')!;
    const ctx = (answers: Answers) => ({ answers, files: {}, fields });
    expect(isRequiredNow(folder, ctx(formB))).toBe(false);
    expect(isRequiredNow(folder, ctx({ project_type: a('new') }))).toBe(true);
  });
});

describe('ifMissing', () => {
  const clause = [{ key: 'brand_keep', values: ['keep'], negate: true, ifMissing: true }];
  it('passes when the field is hidden or unanswered, and decides normally once answered', () => {
    expect(matches(clause, {}, new Set(['brand_keep']))).toBe(true);
    expect(matches(clause, {})).toBe(true);
    expect(matches(clause, { brand_keep: a('keep') })).toBe(false);
    expect(matches(clause, { brand_keep: a('fresh') })).toBe(true);
  });
  it('leaves clauses without it as they were', () => {
    expect(matches([{ key: 'x', values: ['y'], negate: true }], {})).toBe(false);
  });
});

describe('Form B page list', () => {
  const answers: Answers = {
    page_review: a([
      { _id: '1', page: 'Kurse', decision: 'keep' },
      { _id: '2', page: 'Über Nina', decision: 'change', note: 'mit Team' },
      { _id: '3', page: 'Free Resources', decision: 'drop' },
    ]),
    pages_to_add: a('Online-Kurse\nFAQ'),
  };
  it('keeps and changes the old pages, then adds the new ones', () => {
    expect(redesignPageList(answers)).toEqual(['Kurse', 'Über Nina (change: mit Team)', 'Online-Kurse (new)', 'FAQ (new)']);
    expect(listedPages(answers)).toBe(4);
  });
  it('is null for Form A, which counts page_list', () => {
    expect(redesignPageList({ page_list: a(['Start', 'Kontakt']) })).toBeNull();
    expect(listedPages({ page_list: a(['Start', 'Kontakt']) })).toBe(2);
  });
});

describe('menuFromHtml', () => {
  const html = `<html><head><script>var a = '<a href="/x">X</a>';</script></head><body>
    <header><a href="/"><img alt="Logo"></a>
      <nav><a href="/kurse">Kurse</a> <a href="https://www.bloom.de/uber-nina/">&Uuml;ber Nina</a>
      <a href="/kurse#termine">Termine</a> <a href="mailto:hi@bloom.de">Mail</a>
      <a href="https://kartra.com/page">Kartra</a> <a href="/impressum">Impressum</a>
      <a href="/en">EN</a> <a href="/flyer.pdf">Flyer</a> <a href="/kurse">Kurse again</a></nav>
    </header><main><a href="/blog/post-1">A post</a></main></body></html>`;
  it('reads the menu: same site only, no home, legal pages, languages, files or duplicates', () => {
    expect(menuFromHtml(html, 'https://bloom.de/')).toEqual([
      { name: 'Kurse', path: '/kurse' },
      { name: 'Über Nina', path: '/uber-nina' },
    ]);
  });
  it('falls back to the whole page when there is no header or nav', () => {
    expect(menuFromHtml('<body><a href="/about">About</a></body>', 'https://x.de')).toEqual([{ name: 'About', path: '/about' }]);
  });
});
