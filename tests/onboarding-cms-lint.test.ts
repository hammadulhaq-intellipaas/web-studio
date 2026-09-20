import { describe, expect, it } from 'vitest';
import {
  briefSections,
  examples,
  fields,
  flagRules,
  followups,
  prompts,
  screens,
  texts,
} from '../supabase/seed/onboarding/index.ts';
import {
  DEFAULT_MAX_CHARS,
  DEFAULT_SUB_MAX_CHARS,
  DONT_KNOW_VALUE,
  MAX_ANSWERS_BYTES,
  SYSTEM_FLAGS,
} from '@/lib/onboarding/limits';
import type { OnbField } from '@/lib/onboarding/types';

/**
 * Consistency checks over the seed content. The runtime reads the same shapes from
 * Supabase, so anything caught here would otherwise surface as a broken screen.
 */

const fieldById = new Map(fields.map((f) => [f.id, f]));
const fieldIndex = new Map(fields.map((f, i) => [f.id, i]));
const screenIds = new Set(screens.map((s) => s.id));
const textKeys = new Set(texts.map((t) => t.key));

const CHOICE_TYPES = new Set(['radio', 'checkboxes', 'select']);

function optionValues(field: OnbField): Set<string> {
  return new Set(field.options.map((o) => o.value));
}

describe('screens', () => {
  it('have unique ids, sequential sort and exactly one review screen', () => {
    expect(new Set(screens.map((s) => s.id)).size).toBe(screens.length);
    const sorts = screens.map((s) => s.sort);
    expect(sorts).toEqual([...sorts].sort((a, b) => a - b));
    expect(screens.filter((s) => s.kind === 'review')).toHaveLength(1);
    expect(screens.at(-1)?.kind).toBe('review');
  });

  it('every question screen has at least one field', () => {
    for (const screen of screens.filter((s) => s.kind === 'questions')) {
      expect(fields.some((f) => f.screen_id === screen.id), screen.id).toBe(true);
    }
  });
});

describe('fields', () => {
  it('have unique snake_case ids on existing question screens', () => {
    expect(new Set(fields.map((f) => f.id)).size).toBe(fields.length);
    for (const f of fields) {
      expect(f.id, f.id).toMatch(/^[a-z][a-z0-9_]{1,39}$/);
      expect(screenIds.has(f.screen_id), `${f.id} → ${f.screen_id}`).toBe(true);
      expect(screens.find((s) => s.id === f.screen_id)?.kind).toBe('questions');
    }
  });

  it('have labels in both languages (except notices) and unique option values', () => {
    for (const f of fields) {
      if (f.type !== 'notice') {
        expect(f.label_de.length, f.id).toBeGreaterThan(0);
        expect(f.label_en.length, f.id).toBeGreaterThan(0);
      }
      expect(optionValues(f).size, `${f.id} options`).toBe(f.options.length);
      for (const o of f.options) {
        expect(o.label_de.length, `${f.id}.${o.value}`).toBeGreaterThan(0);
        expect(o.label_en.length, `${f.id}.${o.value}`).toBeGreaterThan(0);
      }
    }
  });

  it('choice fields have options; free-text fields have none', () => {
    for (const f of fields) {
      if (CHOICE_TYPES.has(f.type) || f.type === 'ranking') {
        expect(f.options.length, f.id).toBeGreaterThanOrEqual(f.type === 'checkboxes' ? 1 : 2);
      } else {
        expect(f.options.length, f.id).toBe(0);
      }
    }
  });

  it('slider captions cover every step', () => {
    for (const f of fields.filter((x) => x.type === 'slider')) {
      const { min = 1, max = 5, captions = [], examples = [] } = f.config;
      expect(captions.length, f.id).toBe(max - min + 1);
      if (examples.length) expect(examples.length, f.id).toBe(max - min + 1);
      for (const c of captions) {
        expect(c.de.length).toBeGreaterThan(0);
        expect(c.en.length).toBeGreaterThan(0);
      }
    }
  });

  it('ranking fields define buckets with exactly one default and sane limits', () => {
    for (const f of fields.filter((x) => x.type === 'ranking')) {
      const buckets = f.config.buckets ?? [];
      expect(buckets.length, f.id).toBeGreaterThanOrEqual(2);
      expect(buckets.filter((b) => b.default).length, f.id).toBe(1);
      expect(new Set(buckets.map((b) => b.value)).size).toBe(buckets.length);
      const minSum = buckets.reduce((n, b) => n + (b.min ?? 0), 0);
      expect(minSum, `${f.id} min sum`).toBeLessThanOrEqual(f.options.length);
    }
  });

  it('repeaters have unique primitive sub-fields and row limits', () => {
    for (const f of fields.filter((x) => x.type === 'repeater')) {
      const subs = f.config.fields ?? [];
      expect(subs.length, f.id).toBeGreaterThan(0);
      expect(new Set(subs.map((s) => s.key)).size).toBe(subs.length);
      expect(f.config.max_rows, f.id).toBeGreaterThan(0);
      expect(f.config.initial_rows ?? 1).toBeLessThanOrEqual(f.config.max_rows!);
      for (const s of subs) {
        expect(s.key).not.toBe('_id');
        if (s.type === 'select') expect(s.options?.length ?? 0, `${f.id}.${s.key}`).toBeGreaterThan(0);
      }
    }
  });

  it('notices point at a text that exists in both locales', () => {
    for (const f of fields.filter((x) => x.type === 'notice')) {
      const key = f.config.text_key;
      expect(key, f.id).toBeTruthy();
      expect(texts.filter((t) => t.key === key).map((t) => t.locale).sort()).toEqual(['de', 'en']);
    }
  });

  it('show_when clauses reference earlier choice fields and valid option values', () => {
    for (const f of fields) {
      for (const clause of f.show_when) {
        const dep = fieldById.get(clause.key);
        expect(dep, `${f.id} depends on unknown ${clause.key}`).toBeDefined();
        expect(fieldIndex.get(clause.key)!, `${f.id} must come after ${clause.key}`).toBeLessThan(fieldIndex.get(f.id)!);
        expect(CHOICE_TYPES.has(dep!.type), `${f.id}: ${clause.key} is not a choice field`).toBe(true);
        const allowed = optionValues(dep!);
        for (const v of clause.values) {
          expect(v === DONT_KNOW_VALUE || allowed.has(v), `${f.id}: ${clause.key}=${v}`).toBe(true);
        }
      }
    }
  });

  it('required_unless and link_setting point at real fields / onb_ settings', () => {
    for (const f of fields) {
      if (f.config.required_unless) expect(fieldById.has(f.config.required_unless), f.id).toBe(true);
      if (f.config.link_setting) {
        expect(f.config.link_setting, f.id).toMatch(/^onb_/);
        expect(f.config.link_label_de, f.id).toBeTruthy();
        expect(f.config.link_label_en, f.id).toBeTruthy();
      }
      if (f.config.exclusive) {
        for (const v of f.config.exclusive) expect(optionValues(f).has(v), `${f.id} exclusive ${v}`).toBe(true);
      }
    }
  });

  it('worst-case answers stay under the size cap', () => {
    let bytes = 0;
    for (const f of fields) {
      const overhead = f.id.length + 30;
      switch (f.type) {
        case 'text':
        case 'textarea':
        case 'url':
        case 'email':
        case 'tel':
          bytes += overhead + (f.config.max_chars ?? DEFAULT_MAX_CHARS[f.type]!);
          break;
        case 'repeater': {
          const rows = f.config.max_rows ?? 1;
          const perRow = (f.config.fields ?? []).reduce(
            (n, s) => n + s.key.length + 8 + (s.max_chars ?? DEFAULT_SUB_MAX_CHARS),
            30,
          );
          bytes += overhead + rows * perRow;
          break;
        }
        case 'checkboxes':
        case 'ranking':
          bytes += overhead + f.options.length * 30 + 200;
          break;
        default:
          bytes += overhead + 40;
      }
    }
    expect(bytes).toBeLessThan(MAX_ANSWERS_BYTES);
  });
});

describe('follow-ups', () => {
  it('reference existing fields, sub-fields, flags and write-back targets', () => {
    const flagCodes = new Set<string>([...SYSTEM_FLAGS, ...flagRules.map((r) => r.code)]);
    expect(new Set(followups.map((f) => f.id)).size).toBe(followups.length);
    for (const fu of followups) {
      const t = fu.trigger;
      if (t.when === 'flag') {
        expect(t.flag && flagCodes.has(t.flag), `${fu.id} flag ${t.flag}`).toBe(true);
      } else if (t.when === 'dont_know' && !t.field) {
        // generic: applies to any field answered with "don't know"
      } else {
        expect(t.field && fieldById.has(t.field), `${fu.id} field ${t.field}`).toBe(true);
        if (t.when === 'equals') {
          const dep = fieldById.get(t.field!)!;
          expect(optionValues(dep).has(String(t.value)), `${fu.id} value ${t.value}`).toBe(true);
        }
        if (t.sub) {
          const dep = fieldById.get(t.field!)!;
          expect(dep.type).toBe('repeater');
          expect((dep.config.fields ?? []).some((s) => s.key === t.sub), `${fu.id} sub ${t.sub}`).toBe(true);
        }
      }
      if (fu.writes_to) expect(fieldById.has(fu.writes_to), `${fu.id} writes_to ${fu.writes_to}`).toBe(true);
      if (fu.mode === 'acknowledge') expect(fu.writes_to).toBeNull();
      expect(fu.question_de.length).toBeGreaterThan(0);
      expect(fu.question_en.length).toBeGreaterThan(0);
      expect(new Set(fu.quick_replies.map((q) => q.value)).size).toBe(fu.quick_replies.length);
    }
  });
});

describe('flag rules', () => {
  it('use existing choice fields and valid values', () => {
    expect(new Set(flagRules.map((r) => r.id)).size).toBe(flagRules.length);
    for (const rule of flagRules) {
      expect(rule.conditions.length, rule.id).toBeGreaterThan(0);
      for (const clause of rule.conditions) {
        const dep = fieldById.get(clause.key);
        expect(dep, `${rule.id}: ${clause.key}`).toBeDefined();
        const allowed = optionValues(dep!);
        for (const v of clause.values) {
          expect(v === DONT_KNOW_VALUE || allowed.has(v), `${rule.id}: ${clause.key}=${v}`).toBe(true);
        }
      }
    }
  });
});

describe('brief sections', () => {
  it('draw on existing fields and have exactly one system section', () => {
    expect(new Set(briefSections.map((s) => s.id)).size).toBe(briefSections.length);
    expect(briefSections.filter((s) => s.generated_by === 'system')).toHaveLength(1);
    for (const s of briefSections) {
      for (const key of s.source_fields) expect(fieldById.has(key), `${s.id}: ${key}`).toBe(true);
      if (s.generated_by === 'llm') expect(s.source_fields.length, s.id).toBeGreaterThan(0);
    }
  });

  it('cover every non-notice field somewhere', () => {
    const covered = new Set(briefSections.flatMap((s) => s.source_fields));
    const uncovered = fields
      .filter((f) => f.type !== 'notice' && !f.id.startsWith('contact_'))
      .filter((f) => !covered.has(f.id))
      .map((f) => f.id);
    expect(uncovered).toEqual([]);
  });
});

describe('texts, prompts, examples', () => {
  it('every text key exists in both locales', () => {
    for (const key of textKeys) {
      expect(texts.filter((t) => t.key === key).map((t) => t.locale).sort(), key).toEqual(['de', 'en']);
    }
    expect(new Set(texts.map((t) => t.id)).size).toBe(texts.length);
  });

  it('the texts the runtime renders are present', () => {
    for (const key of [
      'landing', 'landing_what_you_get', 'review_intro', 'review_nothing', 'brief_intro', 'terms',
      'confirm_checks', 'done', 'email_save_link', 'email_brief_client', 'email_brief_team', 'pdf_footer',
    ]) {
      expect(textKeys.has(key), key).toBe(true);
    }
  });

  it('the four prompts exist and the system prompt carries the hard rules', () => {
    expect(prompts.map((p) => p.id).sort()).toEqual(['brief', 'completeness', 'rewrite', 'system']);
    const system = prompts.find((p) => p.id === 'system')!.content;
    expect(system).toMatch(/never invent/i);
    expect(system).toMatch(/price/i);
    expect(system).toMatch(/password/i);
  });

  it('examples only use known field keys and section ids', () => {
    const sectionIds = new Set(briefSections.map((s) => s.id));
    for (const ex of examples) {
      for (const key of Object.keys(ex.answers)) {
        expect(key === 'locale' || fieldById.has(key), `${ex.id}: ${key}`).toBe(true);
      }
      for (const key of Object.keys(ex.brief)) expect(sectionIds.has(key), `${ex.id}: ${key}`).toBe(true);
    }
  });
});
