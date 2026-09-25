import { describe, expect, it } from 'vitest';
import {
  answersBytes,
  clearHidden,
  computeFlags,
  computeGaps,
  hashAnswers,
  isRequiredNow,
  matches,
  mergePatch,
  sliderLabel,
  validateAll,
  validateField,
  validateScreen,
  visibility,
  type ValidationContext,
} from '@/lib/onboarding/logic';
import type { OnbField } from '@/lib/onboarding/types';
import { a, completeAnswers, dk, makeDefinition, TODAY } from './fixtures/onboarding';

const def = makeDefinition();
const field = (id: string): OnbField => def.fields.find((f) => f.id === id)!;
const ctx = (answers = completeAnswers(), files = {}): ValidationContext => ({
  answers,
  files,
  today: TODAY,
  fields: def.fields,
});

describe('visibility', () => {
  it('hides conditional fields until their trigger is answered', () => {
    const answers = completeAnswers();
    expect(visibility(def.fields, answers).hidden.has('existing_url')).toBe(true);
    answers.project_type = a('changes');
    expect(visibility(def.fields, answers).hidden.has('existing_url')).toBe(false);
  });

  it('treats a negated clause on an unanswered field as false', () => {
    const answers = completeAnswers();
    delete answers.languages;
    const { hidden } = visibility(def.fields, answers);
    expect(hidden.has('translation_by')).toBe(true);
    answers.languages = a('de_en');
    expect(visibility(def.fields, answers).hidden.has('translation_by')).toBe(false);
    expect(visibility(def.fields, answers).hidden.has('translation_approver')).toBe(false);
  });

  it('never lets a hidden field satisfy a clause, even negated', () => {
    const fields: OnbField[] = [
      { ...field('project_type'), id: 'gate', show_when: [] },
      { ...field('project_type'), id: 'inner', show_when: [{ key: 'gate', values: ['changes'] }] },
      { ...field('legal_name'), id: 'leaf', show_when: [{ key: 'inner', values: ['new'], negate: true }] },
    ];
    // gate=new hides inner; leaf depends on inner ≠ new — must stay hidden, not resurrect.
    const { hidden } = visibility(fields, { gate: a('new'), inner: a('changes') });
    expect(hidden.has('inner')).toBe(true);
    expect(hidden.has('leaf')).toBe(true);
  });

  it('matches multi-selects on intersection and "don\'t know" via the pseudo value', () => {
    expect(matches([{ key: 'integrations', values: ['crm'] }], { integrations: a(['maps', 'crm']) })).toBe(true);
    expect(matches([{ key: 'integrations', values: ['crm'] }], { integrations: a(['maps']) })).toBe(false);
    expect(matches([{ key: 'booked_package', values: ['__dont_know'] }], { booked_package: dk() })).toBe(true);
  });
});

describe('locale-only fields', () => {
  it('asks the German media-law question in German and not in English', () => {
    const de = visibility(def.fields, completeAnswers(), 'de').visible.map((f) => f.id);
    const en = visibility(def.fields, completeAnswers(), 'en').visible.map((f) => f.id);
    expect(de).toContain('content_responsible');
    expect(en).not.toContain('content_responsible');
    // Everything else is unaffected: the gate is opt-in per field.
    expect(en.length).toBe(de.length - 1);
  });

  it('does not block the screen in the locale where it is not asked', () => {
    const answers = { ...completeAnswers() };
    delete answers.content_responsible;
    const inEn = validateScreen(def, 'business', answers, {}, TODAY, 'en');
    const inDe = validateScreen(def, 'business', answers, {}, TODAY, 'de');
    expect(inEn.some((e) => e.field === 'content_responsible')).toBe(false);
    expect(inDe.some((e) => e.field === 'content_responsible')).toBe(true);
  });

  it('never deletes the answer when the client switches language', () => {
    // clearHidden is rule-based only, so a German answer survives a trip through English.
    const answers = completeAnswers();
    expect(clearHidden(def.fields, answers).answers.content_responsible).toBeDefined();
  });

  it('does not report an unasked question as a gap', () => {
    const answers = { ...completeAnswers() };
    delete answers.content_responsible;
    const en = computeGaps(def, answers, {}, 'en').map((g) => g.field);
    const de = computeGaps(def, answers, {}, 'de').map((g) => g.field);
    expect(en).not.toContain('content_responsible');
    expect(de).toContain('content_responsible');
  });
});

describe('clearHidden', () => {
  it('drops the answer of a field that became hidden and reports it', () => {
    const answers = { ...completeAnswers(), project_type: a('changes'), existing_url: a('https://alt.de') };
    const back = { ...answers, project_type: a('new') };
    const { answers: cleared, removed } = clearHidden(def.fields, back);
    expect(cleared.existing_url).toBeUndefined();
    expect(removed.existing_url?.v).toBe('https://alt.de');
  });

  it('cascades: unticking an integration clears its whole sub-block', () => {
    const answers = {
      ...completeAnswers(),
      integrations: a(['crm']),
      crm_provider: a('HubSpot'),
      crm_url: a('https://app.hubspot.com/x'),
    };
    const { answers: cleared, removed } = clearHidden(def.fields, { ...answers, integrations: a(['none']) });
    expect(cleared.crm_provider).toBeUndefined();
    expect(cleared.crm_url).toBeUndefined();
    // "none" also hides the shared contact question and every other block.
    expect(Object.keys(removed).sort()).toEqual(
      ['crm_provider', 'crm_url', 'gbp_link', 'booking_provider', 'booking_url', 'integrations_contact'].sort(),
    );
  });

  it('drops answers for keys the definition no longer has', () => {
    const { answers, removed } = clearHidden(def.fields, { ...completeAnswers(), ghost: a('x') });
    expect(answers.ghost).toBeUndefined();
    expect(removed.ghost).toBeDefined();
  });
});

describe('validateField', () => {
  it('requires required fields and accepts "don\'t know" only where allowed', () => {
    expect(validateField(field('legal_name'), ctx({}))).toEqual([{ field: 'legal_name', code: 'required' }]);
    expect(validateField(field('booked_package'), ctx({ booked_package: dk() }))).toEqual([]);
    expect(validateField(field('legal_name'), ctx({ legal_name: dk() }))).toEqual([{ field: 'legal_name', code: 'invalid_option' }]);
  });

  it('accepts the "we do not have one" tick as a complete answer, but only where it is offered', () => {
    // It carries no value of its own, so it has to pass before the type checks run.
    expect(validateField(field('avoid'), ctx({ avoid: { v: null, none: true } }))).toEqual([]);
    expect(validateField(field('legal_name'), ctx({ legal_name: { v: null, none: true } }))).toEqual([
      { field: 'legal_name', code: 'invalid_option' },
    ]);
  });

  it('checks emails, urls (bare domains allowed), phones and lengths', () => {
    expect(validateField(field('contact_email'), ctx({ contact_email: a('nope') }))[0].code).toBe('invalid_email');
    expect(validateField(field('contact_email'), ctx({ contact_email: a('a@b.de') }))).toEqual([]);
    expect(validateField(field('existing_url'), ctx({ existing_url: a('www.firma.de/start') }))).toEqual([]);
    expect(validateField(field('existing_url'), ctx({ existing_url: a('not a url') }))[0].code).toBe('invalid_url');
    expect(validateField(field('public_phone'), ctx({ public_phone: a('12') }))[0].code).toBe('invalid_tel');
    expect(validateField(field('legal_form'), ctx({ legal_form: a('x'.repeat(301)) }))[0]).toMatchObject({ code: 'max_chars', params: { max: 300 } });
  });

  it('checks numbers, dates and options', () => {
    expect(validateField(field('launch_date'), ctx({ launch_date: a('2026-01-01') }))[0].code).toBe('date_min');
    expect(validateField(field('launch_date'), ctx({ launch_date: a('garbage') }))[0].code).toBe('invalid_date');
    expect(validateField(field('project_type'), ctx({ project_type: a('maybe') }))[0].code).toBe('invalid_option');
    expect(validateField(field('tone_scale'), ctx({ tone_scale: a(7) }))[0].code).toBe('invalid_option');
    expect(validateField(field('tone_scale'), ctx({ tone_scale: a(4) }))).toEqual([]);
  });

  it('takes one main visitor action and caps the colour mood at two', () => {
    expect(validateField(field('visitor_action'), ctx({ visitor_action: a('booking') }))).toEqual([]);
    expect(validateField(field('visitor_action'), ctx({ visitor_action: a('teleport') }))[0].code).toBe('invalid_option');
    expect(validateField(field('visitor_action'), ctx({}))).toEqual([{ field: 'visitor_action', code: 'required' }]);
    const three = ctx({ colour_mood: a(['light', 'warm', 'bold']) });
    expect(validateField(field('colour_mood'), three)[0]).toMatchObject({ code: 'checkboxes_max', params: { max: 2 } });
  });

  it('enforces checkbox rules incl. an exclusive "none" option', () => {
    expect(validateField(field('integrations'), ctx({ integrations: a([]) }))[0].code).toBe('required');
    expect(validateField(field('integrations'), ctx({ integrations: a(['none', 'crm']) }))[0].code).toBe('checkboxes_exclusive');
    expect(validateField(field('integrations'), ctx({ integrations: a(['none']) }))).toEqual([]);
    expect(validateField(field('integrations'), ctx({ integrations: a(['bogus']) }))[0].code).toBe('invalid_option');
  });

  it('validates repeater rows and their sub-fields', () => {
    const f = field('references');
    expect(validateField(f, ctx({ references: a([]) }))).toEqual([{ field: 'references', code: 'required' }]);
    const missingLikes = ctx({ references: a([{ _id: 'r1', url: 'https://x.de', likes: '' }]) });
    expect(validateField(f, missingLikes)).toEqual([{ field: 'references', code: 'required', row_id: 'r1', sub: 'likes' }]);
    const badUrl = ctx({ references: a([{ _id: 'r1', url: 'nope', likes: 'Schöne Farben überall' }]) });
    expect(validateField(f, badUrl)[0]).toMatchObject({ code: 'invalid_url', row_id: 'r1', sub: 'url' });
    const tooMany = ctx({
      references: a([1, 2, 3, 4].map((i) => ({ _id: `r${i}`, url: 'https://x.de', likes: 'Schöne Farben überall' }))),
    });
    expect(validateField(f, tooMany)[0]).toMatchObject({ code: 'rows_max', params: { max: 3 } });
    const badEmail = ctx({ notification_routing: a([{ _id: 'n1', type: 'Anfrage', address: 'not-an-email' }]) });
    expect(validateField(field('notification_routing'), badEmail)[0]).toMatchObject({ code: 'invalid_email', sub: 'address' });
  });

  it('makes the assets folder optional once files were uploaded', () => {
    const f = field('assets_folder');
    expect(isRequiredNow(f, ctx({}))).toBe(true);
    expect(isRequiredNow(f, ctx({}, { assets_upload: 2 }))).toBe(false);
    expect(validateField(f, ctx({}, { assets_upload: 2 }))).toEqual([]);
    expect(validateField(field('reference_screenshots'), ctx({}))).toEqual([]);
  });

  it('lets the sliders stop between the numbers, on the tenth grid', () => {
    const f = field('tone_scale');
    const check = (v: number) => validateField(f, ctx({ ...completeAnswers(), tone_scale: a(v) }));
    expect(check(2.3)).toEqual([]);
    expect(check(4.5)).toEqual([]);
    expect(check(5)).toEqual([]);
    expect(check(2.35)).toEqual([{ field: 'tone_scale', code: 'invalid_option' }]);
    expect(check(5.1)).toEqual([{ field: 'tone_scale', code: 'invalid_option' }]);
  });
});

describe('sliderLabel', () => {
  it('reads a fractional value as the nearest caption', () => {
    const f = field('personality_scale');
    expect(sliderLabel(f, 1, 'en')).toBe('Clean and minimal');
    expect(sliderLabel(f, 2.3, 'en')).toBe('Understated');
    expect(sliderLabel(f, 2.5, 'en')).toBe('Balanced');
    expect(sliderLabel(f, 4.9, 'de')).toBe('Markant');
  });
});

describe('validateScreen / validateAll', () => {
  it('only reports visible fields of the requested screen', () => {
    const answers = completeAnswers();
    delete answers.legal_name;
    delete answers.catalogue;
    const business = validateScreen(def, 'business', answers, {}, TODAY);
    expect(business.map((e) => e.field)).toEqual(['legal_name']);
    expect(validateScreen(def, 'pages', answers, {}, TODAY).map((e) => e.field)).toEqual(['catalogue']);
    // a hidden required field (regions_served when nationwide) is not an error
    answers.legal_name = a('X GmbH');
    answers.service_scope = a('national');
    delete answers.regions_served;
    expect(validateScreen(def, 'business', answers, {}, TODAY)).toEqual([]);
  });

  it('the fixture answers are a valid complete form', () => {
    expect(validateAll(def, completeAnswers(), {}, TODAY)).toEqual([]);
  });
});

describe('computeGaps', () => {
  it('reports don\'t-know, thin and missing-file gaps but not hidden fields', () => {
    const answers = {
      ...completeAnswers(),
      booked_package: dk(),
      page_list: a('Startseite\nKontakt'),
      references: a([{ _id: 'r1', url: 'https://x.de', likes: 'schön', dislikes: '' }]),
      assets_folder: a(''),
    };
    const gaps = computeGaps(def, answers, {});
    expect(gaps).toContainEqual({ field: 'booked_package', kind: 'dont_know' });
    expect(gaps).toContainEqual({ field: 'page_list', kind: 'thin' });
    expect(gaps).toContainEqual({ field: 'references', kind: 'thin', row_id: 'r1', sub: 'likes' });
    expect(gaps).toContainEqual({ field: 'assets_folder', kind: 'empty' });
    expect(gaps.some((g) => g.field === 'existing_url')).toBe(false);
  });

  it('is empty for the complete fixture', () => {
    expect(computeGaps(def, completeAnswers(), {})).toEqual([]);
  });
});

describe('computeFlags', () => {
  it('raises CMS rule flags from answers', () => {
    const flags = computeFlags(def, { ...completeAnswers(), private_content: a('yes'), private_content_detail: a('Preislisten für Händler') });
    expect(flags).toContainEqual(expect.objectContaining({ code: 'needs_quote', detail: 'member_area', source: 'rule' }));
  });

  it('raises scope_flag when the listed pages exceed the booked band, with the numbers', () => {
    const answers = {
      ...completeAnswers(),
      page_list: a(Array.from({ length: 11 }, (_, i) => `Seite ${i + 1}`).join('\n')),
    };
    const scope = computeFlags(def, answers).find((f) => f.code === 'scope_flag');
    expect(scope).toMatchObject({ detail: 'over', severity: 'sales', data: { quoted: '58', listed: 11, quoted_max: 8 } });
    expect(computeFlags(def, completeAnswers()).some((f) => f.code === 'scope_flag')).toBe(false);
  });

  it('raises date_conflict when content arrives less than the minimum build time before launch', () => {
    const answers = { ...completeAnswers(), launch_date: a('2026-11-01'), content_ready_date: a('2026-10-20') };
    const flag = computeFlags(def, answers).find((f) => f.code === 'date_conflict');
    expect(flag).toMatchObject({ severity: 'warn', data: { build_weeks_min: 3 } });
    expect(computeFlags(def, completeAnswers()).some((f) => f.code === 'date_conflict')).toBe(false);
  });

  it('raises credentials_redacted and the don\'t-know package flag', () => {
    const flags = computeFlags(def, { ...completeAnswers(), booked_package: dk() }, { redactions: 2 });
    expect(flags).toContainEqual(expect.objectContaining({ code: 'credentials_redacted', data: { count: 2 } }));
    expect(flags).toContainEqual(expect.objectContaining({ code: 'info', detail: 'package_unknown' }));
  });
});

describe('merge & hash', () => {
  it('mergePatch sets and deletes keys', () => {
    const next = mergePatch({ x: a('1'), y: a('2') }, { x: a('9'), y: null, z: a('3') });
    expect(next).toEqual({ x: a('9'), z: a('3') });
  });

  it('hashAnswers ignores key order and reacts to values', () => {
    expect(hashAnswers({ x: a('1'), y: a('2') })).toBe(hashAnswers({ y: a('2'), x: a('1') }));
    expect(hashAnswers({ x: a('1') })).not.toBe(hashAnswers({ x: a('2') }));
  });

  it('answersBytes counts UTF-8 bytes', () => {
    expect(answersBytes({ x: a('ä') })).toBe(JSON.stringify({ x: a('ä') }).length + 1);
  });
});
