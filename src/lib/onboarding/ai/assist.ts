import 'server-only';
import { z } from 'zod';
import type { Locale } from '@/lib/types';
import { buildCorpus, findForbidden, findUngrounded, redactSecrets } from '../guardrails';
import { loc, type OnbField, type OnboardingDefinition, type OnboardingFormRecord, type OnboardingSecrets } from '../types';
import { callModel, promptText } from './client';

const schema = z.object({ text: z.string().min(1).max(3000) });

/**
 * Used until `onb_prompts.assist` exists (its id check has to be widened first, see the
 * v2 migration). The CMS row wins as soon as it is there.
 */
const DEFAULT_PROMPT = [
  'Task: rewrite one answer the client has just typed so it reads like polished, premium copy from a high-end brand, in the client\'s own language. The client sees it as a suggestion and can reject it.',
  '',
  'For this task only, the "no marketing language" tone rule does not apply: the aim here is elevated, confident, refined wording that makes the business sound established and worth paying for.',
  '',
  'Rules, in order of importance:',
  '- Never add a fact. No number, date, price, duration, place, name, service, award, guarantee or claim that is not already in their answer. Elevate how it is said, never what is said.',
  '- Turn modest, blunt or negative wording into its most favourable honest equivalent. "We are cheap" becomes "exceptional value for every euro you invest". "We are a small team" becomes "a dedicated, hands-on team". "We fix things" becomes "expert repairs, carried out with care".',
  '- Use rich, confident, sophisticated vocabulary (refined, considered, crafted, tailored, meticulous, exceptional) while keeping it natural and easy to read. Avoid hollow hype and clichés such as "world-class", "unbeatable", "number one", "best in the area", and never use exclamation marks.',
  '- Drop filler ("and so on", "etc.", "all sorts of things", "and more") rather than dressing it up.',
  '- Keep every concrete thing they said. Keep company, product and service names exactly as they wrote them.',
  '- Match the shape of the question: a slogan or tagline becomes one short, memorable line of about eight words at most; a one-sentence answer stays one sentence; a list stays a list, one item per line.',
  '- In German write natural, elegant German with "Sie", never a word-for-word translation of English marketing phrases.',
  '- Do not address the client, do not ask them a question, do not explain what you changed.',
  '- Return the rewritten answer only: prose, no markdown, no surrounding quotation marks.',
].join('\n');

export interface AssistResult {
  ok: boolean;
  text?: string;
  violations?: string[];
}

/**
 * "Help me say this better": one pass over a single answer, lifted into premium wording.
 * The model may only reshape what the client wrote (no new facts, no prices, no
 * durations), and the result is checked against their own words before it is offered.
 * It is a suggestion either way: nothing is stored until the client accepts it.
 */
export async function assistField({
  definition,
  secrets,
  record,
  field,
  text,
}: {
  definition: OnboardingDefinition;
  secrets: OnboardingSecrets;
  record: OnboardingFormRecord;
  field: OnbField;
  text: string;
}): Promise<AssistResult> {
  const locale = record.locale as Locale;
  const clean = redactSecrets(text).text.trim();
  if (!clean) return { ok: false, violations: ['empty'] };

  const label = loc(field as unknown as Record<string, unknown>, 'label', locale);
  const help = loc(field as unknown as Record<string, unknown>, 'help', locale);
  const language = locale === 'de' ? 'German' : 'English';

  const result = await callModel({
    formId: record.id,
    job: 'assist',
    attempt: 1,
    settings: definition.settings,
    system: promptText(secrets.prompts, 'system'),
    prompt: [
      promptText(secrets.prompts, 'assist') || DEFAULT_PROMPT,
      '',
      `Question: ${label}`,
      help ? `Guidance shown to the client: ${help}` : '',
      `Answer language: ${language}`,
      '',
      'The client wrote:',
      clean,
    ]
      .filter(Boolean)
      .join('\n'),
    schema,
    fixture: () => ({ text: `${clean} We work fast, we tidy up, and we finish on the day we said we would.` }),
  });

  if (!result.ok) return { ok: false, violations: [result.error] };

  const suggestion = result.object.text.trim();
  // The client's own words are the only ground truth for this field.
  const corpus = buildCorpus({ [field.id]: { v: clean } });
  const violations = [...findForbidden(suggestion, corpus), ...findUngrounded(suggestion, corpus)];
  if (violations.length) return { ok: false, violations };
  return { ok: true, text: suggestion };
}
