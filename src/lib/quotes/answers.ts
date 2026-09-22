import type { Answers, Locale, Stage2Data } from '@/lib/types';
import { isByow } from '@/lib/pricing/engine';
import { messagesFor } from '@/lib/messages';

export interface ReadableAnswer {
  id: string;
  question: string;
  answer: string;
}

/** The questionnaire's answer keys in the order the customer saw them. */
const ORDER: (keyof Answers)[] = [
  'hasSite',
  'selfbuilt',
  'aiHas',
  'aiMissing',
  'byowScope',
  'pages',
  'langs',
  'contact',
  'fees',
  'shop',
  'blog',
  'assets',
];

type QuestionMessages = Record<string, { title?: string; titleByow?: string; opts?: Record<string, string> } | string | undefined>;

/**
 * Questionnaire answers as the team reads them: the question text and the chosen option
 * label(s) from the message catalog, instead of `hasSite: website`. Unknown keys or values
 * fall back to the raw value; empty answers are skipped.
 */
export function readableAnswers(answers: Partial<Answers> | null | undefined, locale: Locale): ReadableAnswer[] {
  const questions = messagesFor(locale).questions as unknown as QuestionMessages;
  const a: Partial<Answers> = answers ?? {};
  const byow = isByow({ hasSite: null, selfbuilt: null, aiHas: [], aiMissing: [], pages: null, langs: null, contact: null, fees: null, shop: null, blog: null, assets: null, ...a });
  const out: ReadableAnswer[] = [];

  const keys: string[] = [...ORDER, ...Object.keys(a).filter((k) => !ORDER.includes(k as keyof Answers))];
  for (const key of keys) {
    const value = (a as Record<string, unknown>)[key];
    if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) continue;
    const def = questions[key];
    const q = typeof def === 'object' && def ? def : undefined;
    const title = (key === 'langs' && byow && q?.titleByow) || q?.title || key;
    const label = (v: unknown) => (q?.opts && typeof v === 'string' && q.opts[v]) || String(v);
    const answer = Array.isArray(value) ? value.map(label).join(', ') : label(value);
    out.push({ id: key, question: title, answer });
  }
  return out;
}

export interface ReadableField {
  key: string;
  label: string;
  value: string;
}

type Stage2Messages = {
  fields?: Record<string, { label?: string; ph?: string }>;
  goals?: Record<string, string>;
  goalLabel?: string;
};

/** Stage-2 content intake with the field labels the customer saw. */
export function readableStage2(stage2: Stage2Data | null | undefined, locale: Locale): ReadableField[] {
  if (!stage2) return [];
  const m = messagesFor(locale).stage2 as unknown as Stage2Messages;
  const out: ReadableField[] = [];
  for (const [key, raw] of Object.entries(stage2.fields ?? {})) {
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value) continue;
    out.push({ key, label: m.fields?.[key]?.label ?? key, value });
  }
  if (stage2.goal) {
    out.push({ key: 'goal', label: m.goalLabel ?? 'Primary goal', value: m.goals?.[stage2.goal] ?? stage2.goal });
  }
  if (stage2.driveLink) out.push({ key: 'driveLink', label: locale === 'de' ? 'Material-Link' : 'Material link', value: stage2.driveLink });
  return out;
}
