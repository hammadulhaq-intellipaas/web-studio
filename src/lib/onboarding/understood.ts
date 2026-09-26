import type { Locale } from '@/lib/types';
import { textFor } from './texts';
import { linesOf, sliderPhrase, textOf } from './logic';
import { stripDashes } from './guardrails';
import { loc, type Answers, type OnbField, type OnboardingDefinition, type RepeaterRow } from './types';

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
  return sliderPhrase(field, value, locale);
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
  const styleNotes = [text('tone_note'), text('personality_note')].filter(Boolean).join('; ');

  return {
    business_one_liner: text('business_one_liner'),
    target_audience: text('target_audience'),
    ideal_customer: text('ideal_customer'),
    excluded_audience: text('excluded_audience'),
    usps: text('usps'),
    style_notes: styleNotes,
    service_area: text('regions_served') || pick('service_scope'),
    service_scope: pick('service_scope'),
    visitor_action: pick('visitor_action'),
    tone_caption: captionOf(field('tone_scale'), value('tone_scale'), locale),
    boldness_caption: captionOf(field('personality_scale'), value('personality_scale'), locale),
    colour_mood: picks('colour_mood'),
    brand_colours: colours,
    typography_feel: pick('typography_feel'),
    photo_subjects: picks('photo_subjects'),
    hero_intent: pick('hero_intent'),
    homepage_density: pick('homepage_density'),
    reference_1_link: String(firstReference?.url ?? ''),
    reference_1_likes: inline(String(firstReference?.likes ?? '')),
    do_not_want: avoid,
    proof_to_show: picks('proof_to_show'),
  };
}

const TOKEN = /\{(\w+)\}/g;

/** Upper-case the first letter of a bullet's value ("- **Label:** value"). */
function capitaliseBullet(line: string): string {
  return line.replace(/^(\s*[-*]\s+\*\*[^*]+\*\*\s*)(\p{Ll})/u, (_, head: string, first: string) => head + first.toLocaleUpperCase());
}

/**
 * The CMS read-back text with its tokens filled in. It is read line by line: a line whose
 * tokens have no answer is left out rather than shown with a gap, so nothing is invented
 * and nothing reads as broken. Every value is the client's own; no dashes survive.
 */
export function understoodText(definition: OnboardingDefinition, answers: Answers, locale: Locale): string {
  const tokens = understoodTokens(definition, answers, locale);
  const template = textFor(definition.texts, 'understood', locale)?.content_markdown ?? '';
  const lines = template.split('\n').flatMap((line) => {
    const keys = Array.from(line.matchAll(TOKEN), (m) => m[1]);
    if (keys.length && keys.some((k) => !tokens[k]?.trim())) return [];
    return [capitaliseBullet(line.replace(TOKEN, (_, key: string) => tokens[key].trim()))];
  });
  return stripDashes(lines.join('\n').replace(/\n{3,}/g, '\n\n').trim());
}
