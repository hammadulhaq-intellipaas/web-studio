import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fields, REFERENCE_SITES } from '../supabase/seed/onboarding/fields.ts';
import { loadReferenceSpec } from '@/lib/developer/context';
import { isRequiredNow } from '@/lib/onboarding/logic';
import { understoodTokens } from '@/lib/onboarding/understood';
import type { Answers, OnboardingDefinition } from '@/lib/onboarding/types';

const root = join(__dirname, '..');
const picker = fields.find((f) => f.id === 'reference_sites')!;

describe('reference-site picker', () => {
  it('is a card multi-select on the design screen, just before "other websites"', () => {
    expect(picker.type).toBe('checkboxes');
    expect(picker.config.display).toBe('cards');
    expect(picker.screen_id).toBe('design');
    const order = fields.map((f) => f.id);
    expect(order.indexOf('reference_sites') + 1).toBe(order.indexOf('references'));
  });

  it('every site has a layout spec, a screenshot, a link and a group', () => {
    expect(REFERENCE_SITES).toHaveLength(11);
    for (const site of REFERENCE_SITES) {
      expect(existsSync(join(root, 'docs', 'reference-specs', `${site.value}.md`)), `spec for ${site.value}`).toBe(true);
      expect(site.image).toBe(`/onboarding/reference-sites/${site.value}.jpg`);
      expect(existsSync(join(root, 'public', site.image!)), `screenshot for ${site.value}`).toBe(true);
      expect(site.url).toMatch(/^https:\/\//);
      expect(site.group_de && site.group_en).toBeTruthy();
      expect(site.hint_de && site.hint_en).toBeTruthy();
    }
  });

  it('either the picker or "other websites" satisfies the requirement', () => {
    const ctx = (answers: Answers) => ({ answers, files: {}, fields });
    const other = fields.find((f) => f.id === 'references')!;
    // Neither answered: both are required.
    expect(isRequiredNow(picker, ctx({}))).toBe(true);
    expect(isRequiredNow(other, ctx({}))).toBe(true);
    // A pick makes "other websites" optional, and an own website makes the picker optional.
    expect(isRequiredNow(other, ctx({ reference_sites: { v: ['graza'] } }))).toBe(false);
    expect(isRequiredNow(picker, ctx({ references: { v: [{ _id: 'r1', url: 'https://example.com', likes: 'The calm layout' }] } }))).toBe(false);
  });

  it('loads each site\'s layout spec, and nothing outside the specs folder', async () => {
    for (const site of REFERENCE_SITES) {
      const spec = await loadReferenceSpec(site.value);
      expect(spec, site.value).toMatch(/^# .+: reference spec/);
    }
    expect(await loadReferenceSpec('../README')).toBeNull();
    expect(await loadReferenceSpec('no-such-site')).toBeNull();
  });

  it('reads the picked sites back by name', () => {
    const definition = { fields } as unknown as OnboardingDefinition;
    const tokens = understoodTokens(definition, { reference_sites: { v: ['graza', 'conductlaw'] } }, 'en');
    expect(tokens.reference_sites).toContain('Graza');
    expect(tokens.reference_sites).toContain('ConductLaw');
  });
});
