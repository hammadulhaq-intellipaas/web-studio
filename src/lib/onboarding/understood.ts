import type { Locale } from '@/lib/types';
import { textFor } from './texts';
import { linesOf, textOf } from './logic';
import { loc, type Answers, type OnbField, type OnboardingDefinition, type RepeaterRow } from './types';

/** Shown in place of an answer we do not have, so the read-back never invents one. */
const MISSING = { de: '…', en: '…' };

function labelOf(field: OnbField | undefined, value: unknown, locale: Locale): string {
  if (!field || typeof value !== 'string') return '';
  const option = field.options.find((o) => o.value === value);
  return option ? loc(option as unknown as Record<string, unknown>, 'label', locale) : value;
}

function labelsOf(field: OnbField | undefined, value: unknown, locale: Locale): string {
  if (!field || !Array.isArray(value)) return '';
  return value
    .map((v) => labelOf(field, v, locale))
    .filter(Boolean)
    .join(', ');
}

function captionOf(field: OnbField | undefined, value: unknown, locale: Locale): string {
  if (!field || typeof value !== 'number') return '';
  const caption = field.config.captions?.[value - (field.config.min ?? 1)];
  return caption ? caption[locale] : '';
}

/** Free text read back inline: lines become a comma-separated list, no trailing stop. */
function inline(text: string): string {
  return linesOf(text)
    .map((l) => l.replace(/[.;]\s*$/, '').trim())
    .filter(Boolean)
    .join(', ');
}

/**
 * The tokens of the "Here is what we have understood" text (`onb_texts.understood`),
 * resolved from the client's own answers. Every value is something they typed or picked:
 * nothing here is generated, which is what makes it safe to read back to them.
 */
export function understoodTokens(definition: OnboardingDefinition, answers: Answers, locale: Locale): Record<string, string> {
  const byId = new Map(definition.fields.map((f) => [f.id, f]));
  const field = (id: string) => byId.get(id);
  const value = (id: string) => answers[id]?.v;
  const text = (id: string) => inline(textOf(answers[id]));
  const pick = (id: string) => labelOf(field(id), value(id), locale);
  const picks = (id: string) => labelsOf(field(id), value(id), locale);

  const references = Array.isArray(value('references')) ? (value('references') as RepeaterRow[]) : [];
  const firstReference = references.find((r) => String(r.url ?? '').trim()) ?? references[0];
  const noneTicked = (id: string) => !!answers[id]?.none;
  const avoid = noneTicked('avoid') ? (locale === 'de' ? 'nichts Bestimmtes' : 'nothing in particular') : text('avoid');
  const colours = noneTicked('brand_colours') ? '' : text('brand_colours');

  return {
    business_one_liner: text('business_one_liner'),
    target_audience: text('target_audience'),
    usps: text('usps'),
    service_scope: pick('service_scope').toLocaleLowerCase(locale === 'de' ? 'de-DE' : 'en-GB'),
    visitor_action: pick('visitor_action').toLocaleLowerCase(locale === 'de' ? 'de-DE' : 'en-GB'),
    tone_caption: captionOf(field('tone_scale'), value('tone_scale'), locale).toLocaleLowerCase(locale === 'de' ? 'de-DE' : 'en-GB'),
    boldness_caption: captionOf(field('personality_scale'), value('personality_scale'), locale).toLocaleLowerCase(locale === 'de' ? 'de-DE' : 'en-GB'),
    colour_mood: picks('colour_mood').toLocaleLowerCase(locale === 'de' ? 'de-DE' : 'en-GB'),
    brand_colours: colours || (locale === 'de' ? 'Ihren Farben' : 'your colours'),
    typography_feel: pick('typography_feel').toLocaleLowerCase(locale === 'de' ? 'de-DE' : 'en-GB'),
    photo_subjects: picks('photo_subjects').toLocaleLowerCase(locale === 'de' ? 'de-DE' : 'en-GB'),
    hero_intent: pick('hero_intent').toLocaleLowerCase(locale === 'de' ? 'de-DE' : 'en-GB'),
    homepage_density: pick('homepage_density'),
    reference_1_link: String(firstReference?.url ?? ''),
    reference_1_likes: inline(String(firstReference?.likes ?? '')),
    do_not_want: avoid,
    proof_to_show: picks('proof_to_show').toLocaleLowerCase(locale === 'de' ? 'de-DE' : 'en-GB'),
  };
}

/** The CMS read-back text with its tokens filled in. */
export function understoodText(definition: OnboardingDefinition, answers: Answers, locale: Locale): string {
  const tokens = understoodTokens(definition, answers, locale);
  const template = textFor(definition.texts, 'understood', locale)?.content_markdown ?? '';
  return template.replace(/\{(\w+)\}/g, (_, key: string) => tokens[key]?.trim() || MISSING[locale]);
}
