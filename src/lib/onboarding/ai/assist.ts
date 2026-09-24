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
  'Task: rewrite one answer the client has just typed so it reads the way they would say it to a customer standing in front of them, in the client\'s own language.',
  '',
  'Rules, in order of importance:',
  '- Never add a fact. No number, date, price, duration, place, name, service or claim that is not already in their answer.',
  '- Drop filler rather than rewording it. Phrases like "and you know this and that", "and so on", "etc.", "all sorts of things", "and more" carry no information. Leave them out. Do not turn them into a phrase that reads like content. A shorter honest sentence beats a longer empty one.',
  '- Drop claims they cannot stand behind. "the best in the area", "unbeatable", "number one" are opinions, not facts about the business. Keep what they actually do.',
  '- Keep every concrete thing they did say, and keep their words wherever their words already work.',
  '- Plain language, short sentences, no marketing tone, no superlatives.',
  '- Do not address the client, do not ask them a question, do not explain what you changed.',
  '- Return the rewritten answer only: prose, no markdown, no surrounding quotation marks.',
  '- If the answer is already clear, return it with only small corrections.',
].join('\n');

export interface AssistResult {
  ok: boolean;
  text?: string;
  violations?: string[];
}

/**
 * "Help me say this better": one pass over a single answer. The model may only reshape
 * what the client wrote — no new facts, no prices, no durations — and the result is
 * checked against their own words before it is offered. It is a suggestion either way:
 * nothing is stored until the client accepts it.
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
