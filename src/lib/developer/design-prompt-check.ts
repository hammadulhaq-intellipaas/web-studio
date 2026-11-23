import { stripDashes } from '@/lib/onboarding/guardrails';
import { codeWordsOutsideDeliverable } from './messages';
import { hexColours, type brandVariant } from './source-of-truth';

/**
 * Checks a design prompt the model wrote against its source of truth, in code: what a model may
 * get wrong without noticing. Any problem goes back to the model once, as one correction.
 */

/** The sections every design prompt has, in this order (DEV_DESIGN_PROMPT names them). */
export const PROMPT_SECTIONS = ['The client', 'Brand', 'Direction', 'Pages', 'Photos', 'Rules', 'Your freedom'] as const;

/** Above this the prompt says too much for Claude Design to keep its own judgement. */
export const PROMPT_MAX_WORDS = 3600;
/** A quote this long is the client's text, never new wording, so it must be in the source of truth. */
const QUOTE_MIN_WORDS = 8;

const QUOTE = /"([^"\n]+)"|“([^”\n]+)”|„([^“”\n]+)[“”]/g;

/** Letters and digits only, single spaces: dashes, quotes and punctuation never decide a match. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFC')
    .replace(/&#160;|&nbsp;/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();
}

export const wordCount = (text: string) => (text.match(/\S+/g) ?? []).length;

/** The quoted texts of a prompt with whether "(new)" follows them, which marks new wording. */
export function quotes(md: string): { text: string; marked: boolean }[] {
  const out: { text: string; marked: boolean }[] = [];
  for (const m of md.matchAll(QUOTE)) {
    const text = (m[1] ?? m[2] ?? m[3] ?? '').trim();
    const after = md.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 12);
    out.push({ text, marked: /^\s*\(new\)/i.test(after) });
  }
  return out;
}

/** Em and en dashes out of the model's own words; the client's quoted text keeps its own. */
export function stripDashesOutsideQuotes(md: string): string {
  let out = '';
  let last = 0;
  for (const m of md.matchAll(QUOTE)) {
    out += stripDashes(md.slice(last, m.index)) + m[0];
    last = (m.index ?? 0) + m[0].length;
  }
  return out + stripDashes(md.slice(last));
}

export interface PromptCheckInput {
  prompt: string;
  /** The whole source of truth the prompt was written from. */
  truth: string;
  variant: ReturnType<typeof brandVariant>;
  /** current-website.md, for a client who keeps their brand. */
  currentSite: string | null;
}

export function designPromptProblems({ prompt, truth, variant, currentSite }: PromptCheckInput): string[] {
  const problems: string[] = [];
  const headings = [...prompt.matchAll(/^## +(.+)$/gm)].map((m) => m[1].trim().toLowerCase());
  const missing = PROMPT_SECTIONS.filter((s) => !headings.some((h) => h.startsWith(s.toLowerCase())));
  if (missing.length) problems.push(`These sections are missing: ${missing.map((s) => `"## ${s}"`).join(', ')}.`);

  const source = normalizeText(truth);
  const notFound = quotes(prompt)
    .filter((q) => !q.marked && wordCount(q.text) >= QUOTE_MIN_WORDS && !source.includes(normalizeText(q.text)))
    .map((q) => q.text);
  if (notFound.length) {
    problems.push(
      `These quotes are not in the source of truth word for word. Copy the client's text exactly as it is written there, in its language, or mark short new wording with "(new)": ${notFound
        .slice(0, 8)
        .map((t) => `"${t.length > 90 ? `${t.slice(0, 90)}…` : t}"`)
        .join('; ')}.`,
    );
  }

  const files = [...new Set((prompt.match(/assets\/current-site\/[\w./-]+/g) ?? []).map((f) => f.replace(/[.,;:)]+$/, '')))];
  // By file name: the font files are listed by name after their folder ("in assets/current-site/fonts/: 400 (x.woff2)").
  const unknown = files.filter((f) => !truth.includes(f.split('/').pop() ?? f));
  if (unknown.length) problems.push(`These files do not exist; use only the file names in current-website.md: ${unknown.join(', ')}.`);

  if (variant === 'B-keep' && currentSite) {
    const theirs = new Set([...hexColours(currentSite), '#ffffff', '#000000']);
    const foreign = [...hexColours(prompt)].filter((h) => !theirs.has(h));
    if (foreign.length) {
      problems.push(`The client keeps their own colours, but the brief uses ${foreign.join(', ')}, which are not on their current website. Use only their colours.`);
    }
  }

  const words = wordCount(prompt);
  if (words > PROMPT_MAX_WORDS) problems.push(`The brief has ${words} words. Shorten it to under 3,000: fewer instructions, the same content and facts.`);

  const code = codeWordsOutsideDeliverable(prompt);
  if (code.length) problems.push(`Replace these technical words by describing the same thing visually: ${code.join(', ')}.`);
  return problems;
}

/** One correction for the model, or null when the prompt passes. */
export function designPromptCheck(input: PromptCheckInput): string | null {
  const problems = designPromptProblems(input);
  return problems.length ? `Fix these problems and write the whole brief again, complete:\n${problems.map((p) => `- ${p}`).join('\n')}` : null;
}
