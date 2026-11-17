import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fields, PAGE_OPTIONS, PROPOSAL_EXAMPLES, REFERENCE_SITES, retiredFieldIds } from '../supabase/seed/onboarding/fields.ts';
import { autoPending, AUTO_WINDOW_MS } from '@/lib/developer/auto-status';
import { chosenExamples, examplesRule, favouriteKeys, rowsFromPicks } from '@/lib/onboarding/examples';
import { displayValue } from '@/lib/onboarding/export';
import { buildQueue } from '@/lib/onboarding/followups/queue';
import { redactAnswers } from '@/lib/onboarding/guardrails';
import { computeGaps, entriesOf, listedPages, validateField, validateScreen } from '@/lib/onboarding/logic';
import type { Answers, OnbFollowup, OnboardingDefinition } from '@/lib/onboarding/types';
import gallery from '@/lib/onboarding/gallery-shots.json';

const a = <T,>(v: T) => ({ v });
const today = '2026-11-10';
const field = (id: string) => fields.find((f) => f.id === id)!;
const summary = field('favourite_examples');
const ctx = (answers: Answers, files: Record<string, number> = {}) => ({ answers, files, today, fields });

describe('the design examples', () => {
  it('counts gallery ticks, then own links, then all pictures as one, in that order', () => {
    const answers: Answers = {
      reference_sites: a(['graza']),
      references: a([
        { _id: 'r1', url: '', likes: '' },
        { _id: 'r2', url: 'https://www.example-yoga.de', likes: 'Klare Grafiken' },
      ]),
    };
    expect(chosenExamples(PROPOSAL_EXAMPLES, answers, { reference_screenshots: 3 })).toEqual([
      { kind: 'library', value: 'graza', key: 'site:graza' },
      { kind: 'link', index: 0, url: 'https://www.example-yoga.de', key: 'link:https://www.example-yoga.de' },
      { kind: 'pictures', count: 3, key: 'pictures' },
    ]);
  });

  it('puts the favourites first, in the order picked, and ignores one whose example is gone', () => {
    const answers: Answers = {
      reference_sites: a(['graza', 'rivian', 'devol']),
      references: a([{ _id: 'r1', url: 'https://www.example-yoga.de', liked: 'layout' }]),
      favourite_examples: a(['link:https://www.example-yoga.de', 'site:devol']),
    };
    expect(chosenExamples(PROPOSAL_EXAMPLES, answers, {}).map((e) => e.key)).toEqual([
      'link:https://www.example-yoga.de',
      'site:devol',
      'site:graza',
      'site:rivian',
    ]);
    const gone = { ...answers, favourite_examples: a(['site:lanserhof', 'site:rivian']) };
    expect(favouriteKeys(PROPOSAL_EXAMPLES, gone, {})).toEqual(['site:rivian']);
    expect(chosenExamples(PROPOSAL_EXAMPLES, gone, {})[0].key).toBe('site:rivian');
  });

  it('finds the rule on the favourites question of the seed', () => {
    expect(examplesRule(fields)?.field.id).toBe('favourite_examples');
    expect(examplesRule(fields)?.rule).toEqual({
      count: 2,
      picks: 'reference_sites',
      links: 'references',
      pictures: 'reference_screenshots',
      favourites: 'favourite_examples',
      likes: 'reference_likes',
    });
  });

  it('asks for at least two, and for two favourites when there are more', () => {
    expect(validateField(summary, ctx({}))).toEqual([{ field: summary.id, code: 'examples_min', params: { n: 0, count: 2, left: 2 } }]);
    expect(validateField(summary, ctx({ reference_sites: a(['graza']) }))[0].params).toMatchObject({ left: 1 });
    expect(validateField(summary, ctx({ reference_sites: a(['graza', 'rivian']) }))).toEqual([]);
    expect(validateField(summary, ctx({ reference_sites: a(['graza']) }, { reference_screenshots: 2 }))).toEqual([]);
    const three = { reference_sites: a(['graza', 'rivian', 'devol']) };
    expect(validateField(summary, ctx(three))).toEqual([{ field: summary.id, code: 'favourites', params: { n: 3, count: 2 } }]);
    expect(validateField(summary, ctx({ ...three, favourite_examples: a(['site:devol']) }))[0].code).toBe('favourites');
    expect(validateField(summary, ctx({ ...three, favourite_examples: a(['site:devol', 'site:graza']) }))).toEqual([]);
  });

  it('keeps the old rule, exactly two, for a definition without favourites', () => {
    const old = { ...summary, config: { proposal_examples: { count: 2, picks: 'reference_sites', links: 'references', pictures: 'reference_screenshots' } } };
    expect(validateField(old, ctx({ reference_sites: a(['graza', 'rivian', 'devol']) }))[0].code).toBe('examples_max');
  });

  it('reads the favourites back as plain text', () => {
    expect(displayValue(summary, a(['site:graza', 'link:https://www.example-yoga.de']), 'en')).toBe('graza (gallery), https://www.example-yoga.de');
    expect(displayValue(summary, a(['pictures']), 'de')).toBe('Eigene Bilder');
  });

  it('opens with two tiles and shows only the parts the client chose', () => {
    const definition = { fields } as Pick<OnboardingDefinition, 'fields'>;
    const tiles = field('example_sources');
    expect(tiles.config.display).toBe('tiles');
    expect(tiles.options.map((o) => o.value)).toEqual(['own', 'gallery']);
    const shown = (answers: Answers) => new Set(validateScreen(definition, 'design', answers, {}, today).map((e) => e.field));
    const none = shown({});
    expect(none.has('example_sources')).toBe(true);
    for (const id of ['references', 'reference_sites', 'reference_likes', 'favourite_examples']) expect(none.has(id), id).toBe(false);
    const own = shown({ example_sources: a(['own']) });
    expect(own.has('references')).toBe(true);
    expect(own.has('reference_sites')).toBe(false);
    const gallery = shown({ example_sources: a(['gallery']) });
    expect(gallery.has('reference_sites')).toBe(true);
    expect(gallery.has('references')).toBe(false);
  });

  it('asks what they like about every example: a tick per link, a row per gallery pick', () => {
    const definition = { fields } as Pick<OnboardingDefinition, 'fields'>;
    const errors = (answers: Answers) => validateScreen(definition, 'design', answers, {}, today);
    const answers: Answers = {
      example_sources: a(['own', 'gallery']),
      references: a([{ _id: 'r1', url: 'https://www.example-yoga.de' }]),
      reference_sites: a(['graza', 'devol']),
      reference_likes: a([{ _id: 'l1', site: 'graza', liked: 'colours' }]),
    };
    const likes = errors(answers).filter((e) => e.field === 'reference_likes' || e.field === 'references');
    expect(likes).toEqual([
      { field: 'references', code: 'required', row_id: 'r1', sub: 'liked' },
      { field: 'reference_likes', code: 'required', row_id: 'pick-devol', sub: 'liked' },
    ]);
    const done: Answers = {
      ...answers,
      references: a([{ _id: 'r1', url: 'https://www.example-yoga.de', liked: 'layout,fonts' }]),
      reference_likes: a([
        { _id: 'l1', site: 'graza', liked: 'colours' },
        { _id: 'l2', site: 'devol', liked: 'photos' },
      ]),
      favourite_examples: a(['site:devol', 'site:graza']),
    };
    expect(errors(done).filter((e) => ['references', 'reference_likes', 'favourite_examples'].includes(e.field))).toEqual([]);
    // A tick that is not one of the options is refused.
    const wrong = { ...done, references: a([{ _id: 'r1', url: 'https://www.example-yoga.de', liked: 'layout,price' }]) };
    expect(errors(wrong).find((e) => e.field === 'references')?.code).toBe('invalid_option');
  });

  it('reads the likes back with their labels', () => {
    expect(displayValue(field('reference_likes'), a([{ _id: 'l1', site: 'graza', liked: 'colours,fonts', dislikes: 'Zu gelb' }]), 'en')).toBe(
      'Website: Graza · What do you like about it: Colours, Fonts · Anything you do not like: Zu gelb',
    );
  });

  it('follows the gallery ticks: a row per pick in the order ticked, none for a site unticked', () => {
    const likes = field('reference_likes');
    const stored = [{ _id: 'l1', site: 'rivian', liked: 'layout' }, { _id: 'l2', site: 'graza', liked: 'colours' }];
    expect(rowsFromPicks(likes, stored, { reference_sites: a(['graza', 'devol']) })).toEqual([
      { _id: 'l2', site: 'graza', liked: 'colours' },
      { _id: 'pick-devol', site: 'devol' },
    ]);
    expect(likes.config.fields?.[0].options?.map((o) => o.value)).toEqual(REFERENCE_SITES.map((o) => o.value));
  });

  it('allows as many examples as the client likes', () => {
    expect(field('references').config.max_rows).toBe(5);
    expect(field('reference_sites').config.max_checked).toBeUndefined();
    expect(field('reference_screenshots').required).toBe(false);
  });
});

describe('the design screen', () => {
  const order = fields.filter((f) => f.screen_id === 'design').map((f) => f.id);
  const before = (x: string, y: string) => order.indexOf(x) < order.indexOf(y);

  it('runs in four parts, each under its own heading', () => {
    const headings = fields.filter((f) => f.screen_id === 'design' && f.config.tone === 'heading').map((f) => f.id);
    expect(headings).toEqual(['design_part_business', 'design_part_feel', 'design_part_examples', 'design_part_look']);
    // Form B's brand question and the Sie/du question (17 Nov 2026) open the screen, before the first part.
    expect(order.slice(0, 3)).toEqual(['brand_keep', 'address_form', 'design_part_business']);
    for (const h of headings) expect(field(h).label_de && field(h).label_en && field(h).help_de && field(h).help_en, h).toBeTruthy();
  });

  it('puts each slider right before its own "what exactly do you mean"', () => {
    expect(order.indexOf('tone_note')).toBe(order.indexOf('tone_scale') + 1);
    expect(order.indexOf('personality_note')).toBe(order.indexOf('personality_scale') + 1);
  });

  it('asks for the examples after the feel: tiles, links, gallery, likes, pictures, favourites; then the look', () => {
    expect(before('personality_note', 'design_part_examples')).toBe(true);
    expect(order.slice(order.indexOf('design_part_examples'), order.indexOf('design_part_examples') + 8)).toEqual([
      'design_part_examples',
      'example_sources',
      'references',
      'reference_sites',
      'reference_likes',
      'reference_screenshots',
      'favourite_examples',
      'design_part_look',
    ]);
    expect(order[order.length - 1]).toBe('avoid');
  });

  it('has no em or en dashes in the new texts', () => {
    for (const id of ['design_part_business', 'design_part_feel', 'design_part_examples', 'example_sources', 'favourite_examples', 'design_part_look', 'reference_sites', 'reference_likes', 'references', 'reference_screenshots', 'page_list']) {
      const f = field(id);
      expect(`${f.label_de} ${f.label_en} ${f.help_de ?? ''} ${f.help_en ?? ''}`, id).not.toMatch(/[–—]/);
    }
  });
});

describe('the page list', () => {
  const pageList = field('page_list');

  it('is a searchable multi-select with common pages and the client services', () => {
    expect(pageList.type).toBe('multiselect');
    expect(pageList.options).toBe(PAGE_OPTIONS);
    expect(pageList.config).toMatchObject({ allow_custom: true, options_from: 'catalogue', count_band: 'booked_page_band', min_lines: 3 });
    expect(PAGE_OPTIONS.map((o) => o.label_de)).toEqual(expect.arrayContaining(['Startseite', 'Kontakt', 'Über uns']));
    expect(PAGE_OPTIONS.some((o) => /impressum|datenschutz|privacy/i.test(o.label_de + o.label_en))).toBe(false);
  });

  it('reads a list, and a list typed before as lines without the sub-page dashes', () => {
    expect(entriesOf(a(['Startseite', ' Kontakt ', '']))).toEqual(['Startseite', 'Kontakt']);
    expect(entriesOf(a('Startseite\nLeistungen\n- Badsanierung\n\nKontakt'))).toEqual(['Startseite', 'Leistungen', 'Badsanierung', 'Kontakt']);
    expect(listedPages({ page_list: a(['Startseite', 'Kontakt']) })).toBe(2);
    expect(listedPages({ page_list: a('Startseite\n- Team\nKontakt') })).toBe(3);
  });

  it('is required, rejects a paragraph posing as a page, and is thin under three pages', () => {
    expect(validateField(pageList, ctx({}))[0].code).toBe('required');
    expect(validateField(pageList, ctx({ page_list: a(['Startseite', 'x'.repeat(81)]) }))[0].code).toBe('max_chars');
    expect(validateField(pageList, ctx({ page_list: a(['Startseite', 'Ein Kurs']) }))).toEqual([]);
    const definition = { fields } as Pick<OnboardingDefinition, 'fields'>;
    expect(computeGaps(definition, { page_list: a(['Startseite', 'Kontakt']) }, {})).toContainEqual({ field: 'page_list', kind: 'thin' });
    expect(computeGaps(definition, { page_list: a(['Startseite', 'Team', 'Kontakt']) }, {}).some((g) => g.field === 'page_list')).toBe(false);
  });

  it('reads back one page per line, so the brief and the build prompt get a list', () => {
    expect(displayValue(pageList, a(['Startseite', 'Kurse', 'Kontakt']), 'de')).toBe('Startseite\nKurse\nKontakt');
  });

  it('still asks whether each service gets a page when the list is short', () => {
    const followup: OnbFollowup = {
      id: 'fu_page_list_thin',
      sort: 1,
      active: true,
      trigger: { field: 'page_list', when: 'lt_lines', value: 3 },
      question_de: 'Soll jede Leistung eine eigene Seite erhalten?',
      question_en: 'Should each service have a page of its own?',
      quick_replies: [],
      writes_to: 'page_relationships',
      mode: 'append',
      raises: null,
    };
    const definition = { fields, followups: [followup], screens: [] };
    const asked = (answers: Answers) =>
      buildQueue({ definition, answers, files: {}, flags: [], gaps: [], history: [], llmQuestions: [], budget: 10 }).some((q) => q.followup_id === 'fu_page_list_thin');
    expect(asked({ page_list: a(['Startseite', 'Kontakt']) })).toBe(true);
    expect(asked({ page_list: a(['Startseite', 'Team', 'Kontakt']) })).toBe(false);
  });
});

describe('the gallery pictures', () => {
  const sites = (gallery as unknown as { sites: Record<string, { name: string | null; laptop: { src: string }; phone: { src: string } | null }[]> }).sites;

  it('has the homepage of every example website, and every picture exists', () => {
    for (const site of REFERENCE_SITES) {
      const pages = sites[site.value];
      expect(pages?.[0]?.name, site.value).toBeNull();
      for (const p of pages) {
        expect(existsSync(join(process.cwd(), 'public', p.laptop.src)), p.laptop.src).toBe(true);
        if (p.phone) expect(existsSync(join(process.cwd(), 'public', p.phone.src)), p.phone.src).toBe(true);
      }
    }
  });
});

describe('the automatic design prompts', () => {
  it('count as being written for a few minutes after the client confirms, until they exist', () => {
    const at = '2026-11-10T10:00:00Z';
    const t = Date.parse(at);
    expect(autoPending(at, 0, t + 60_000)).toBe(true);
    expect(autoPending(at, 2, t + 60_000)).toBe(false);
    expect(autoPending(at, 0, t + AUTO_WINDOW_MS + 1)).toBe(false);
    expect(autoPending(null, 0, t)).toBe(false);
  });
});

describe('migration 030', () => {
  const sql = readFileSync(join(process.cwd(), 'supabase/migrations/20261109000030_onboarding_examples_pages.sql'), 'utf8');

  it('adds the question type, the headings, the summary and the handover instructions', () => {
    expect(sql).toMatch(/'notice','multiselect'/);
    for (const id of ['design_part_business', 'design_part_feel', 'design_part_examples', 'design_examples_summary', 'design_part_look']) expect(sql).toContain(`'${id}'`);
    expect(sql).toMatch(/add column if not exists handover_instructions/);
    expect(sql).toMatch(/type = 'multiselect'/);
  });

  it('only replaces the two prompts while they still hold the old text', () => {
    expect(sql.match(/and replace\(content, E'\\r\\n', E'\\n'\) = '/g)).toHaveLength(2);
  });

  it('put every design question of its time in order, whatever sort numbers the database held', () => {
    const block = sql.slice(sql.indexOf('update onb_fields as f set sort = v.sort'));
    const placed = [...block.matchAll(/\('([a-z_]+)', (\d+)\)/g)].map((m) => ({ id: m[1], sort: Number(m[2]) }));
    // The design questions have changed since (the two funnels and the examples wizard, 17 Nov
    // 2026): each one it placed is still in the seed, or was retired since.
    const design = new Set(fields.filter((f) => f.screen_id === 'design').map((f) => f.id));
    for (const p of placed) expect(design.has(p.id) || retiredFieldIds.includes(p.id), p.id).toBe(true);
    expect(placed.length).toBeGreaterThan(20);
    expect(placed.every((p, i) => i === 0 || p.sort > placed[i - 1].sort)).toBe(true);
  });

  it('lets the pictures question take pictures only', () => {
    expect(sql).toContain('"accept":["jpg","jpeg","png","webp","gif"]');
    expect(field('reference_screenshots').config.accept).toEqual(['jpg', 'jpeg', 'png', 'webp', 'gif']);
  });
});

describe('page list safety', () => {
  it('takes a password out of a typed page name, as it does for every typed text', () => {
    const { answers, count } = redactAnswers({ page_list: a(['Startseite', 'Admin: user admin password Sommer2026!']) });
    expect(count).toBeGreaterThan(0);
    expect((answers.page_list.v as string[])[1]).not.toContain('Sommer2026!');
    expect((answers.page_list.v as string[])[0]).toBe('Startseite');
  });

  it('does not block an old typed list with a long line, only long entries made in the list', () => {
    const long = 'Leistungen mit allen Unterpunkten zur Physiotherapie, Massage, Lymphdrainage und Rückenschule';
    expect(validateField(field('page_list'), ctx({ page_list: a(`Startseite\n${long}\nKontakt`) }))).toEqual([]);
    expect(validateField(field('page_list'), ctx({ page_list: a(['Startseite', long]) }))[0].code).toBe('max_chars');
  });
});
