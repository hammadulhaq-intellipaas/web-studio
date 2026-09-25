import type { Answers, RepeaterRow } from './types';

/* ------------------------------------------------------------------ secrets */

export const REDACTED = '[entfernt / redacted]';

/**
 * Credential-looking strings are stripped before anything is stored, logged or sent to
 * the model (spec §06: never ask for a password — and if a client pastes one, don't store
 * it). Two-stage, keyword-anchored patterns: no entropy heuristics, so ordinary text like
 * a register number or a hex colour is never touched.
 */
const KEYWORD = String.raw`passw(?:or)?d|passwort|kennwort|pwd|pin|secret(?:\s?key)?|token|api[-_ ]?key|zugangscode|access code`;
const VALUE = String.raw`["'„“‚‘]?([^\s"'„“”‚‘’]{3,})`;

const SECRET_PATTERNS = {
  // "Passwort: Sommer2026!", "password = hunter2", "Kennwort lautet xyz" — an explicit separator
  withSeparator: new RegExp(String.raw`\b(${KEYWORD})\b\s*(?:ist|is|lautet|:|=)\s*${VALUE}`, 'gi'),
  // "PIN 4711", "Passwort Sommer2026!" — whitespace only, so the value must look like a credential
  bare: new RegExp(String.raw`\b(${KEYWORD})\b\s+${VALUE}`, 'gi'),
  // "Login: max / geheim", "Benutzer: max, geheim"
  loginPair: /\b(login|zugang|benutzer(?:name)?|username|user)\s*[:=]\s*([^\s/,;|:@]+)\s*[/,;|]\s*(\S+)/gi,
  // user:pass@host inside URLs
  urlCredentials: /(https?:\/\/[^\s:@/]+):([^\s@/]+)@/gi,
};

const LOOKS_LIKE_CREDENTIAL = /[\d!@#$%^&*_\-+=?]/;

export function redactSecrets(text: string): { text: string; count: number } {
  let count = 0;
  let out = text;
  out = out.replace(SECRET_PATTERNS.withSeparator, (_m, keyword: string) => {
    count += 1;
    return `${keyword}: ${REDACTED}`;
  });
  out = out.replace(SECRET_PATTERNS.bare, (m, keyword: string, value: string) => {
    if (value.length < 4 || !LOOKS_LIKE_CREDENTIAL.test(value)) return m;
    count += 1;
    return `${keyword}: ${REDACTED}`;
  });
  out = out.replace(SECRET_PATTERNS.loginPair, (_m, keyword: string, user: string) => {
    count += 1;
    return `${keyword}: ${user} / ${REDACTED}`;
  });
  out = out.replace(SECRET_PATTERNS.urlCredentials, (_m, prefix: string) => {
    count += 1;
    return `${prefix}:${REDACTED}@`;
  });
  return { text: out, count };
}

/** Redact every string inside an answers map (values, repeater cells, "other" text). */
export function redactAnswers(answers: Answers): { answers: Answers; count: number } {
  let count = 0;
  const clean = (s: string) => {
    const r = redactSecrets(s);
    count += r.count;
    return r.text;
  };
  const out: Answers = {};
  for (const [key, answer] of Object.entries(answers)) {
    if (!answer) continue;
    let v = answer.v;
    if (typeof v === 'string') v = clean(v);
    else if (Array.isArray(v) && v.length && typeof v[0] === 'object') {
      v = (v as RepeaterRow[]).map((row) => {
        const next: RepeaterRow = { _id: row._id };
        for (const [k, cell] of Object.entries(row)) {
          if (k === '_id') continue;
          next[k] = typeof cell === 'string' ? clean(cell) : cell;
        }
        return next;
      });
    }
    out[key] = {
      ...answer,
      v,
      ...(answer.other ? { other: clean(answer.other) } : {}),
      ...(answer.note ? { note: clean(answer.note) } : {}),
    };
  }
  return { answers: out, count };
}

/* ------------------------------------------------------------------ corpus */

function collectStrings(value: unknown, into: string[]): void {
  if (value == null) return;
  if (typeof value === 'string') into.push(value);
  else if (typeof value === 'number') into.push(String(value));
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, into));
  else if (typeof value === 'object') Object.values(value as Record<string, unknown>).forEach((v) => collectStrings(v, into));
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[„“”‚‘’"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface Corpus {
  /** Lower-cased, whitespace-collapsed concatenation of every answer string. */
  text: string;
  /** Digits only — phone numbers survive any formatting difference. */
  digits: string;
}

/** Everything the client wrote, in one searchable blob (plus caption text the brief may echo). */
export function buildCorpus(answers: Answers, extra: string[] = []): Corpus {
  const parts: string[] = [];
  for (const answer of Object.values(answers)) {
    collectStrings(answer?.v, parts);
    if (answer?.other) parts.push(answer.other);
    if (answer?.note) parts.push(answer.note);
  }
  parts.push(...extra);
  const text = normalizeText(parts.join(' \n '));
  return { text, digits: text.replace(/\D/g, '') };
}

/* ------------------------------------------------------------------ forbidden content */

const FORBIDDEN_PATTERNS: RegExp[] = [
  // money: symbol or code before or after the amount
  /(?:€|\$|£)\s?\d[\d.,]*/g,
  /\d[\d.,]*\s?(?:€|\$|£)/g,
  /\d[\d.,]*\s?(?:eur|euro|usd|chf)\b/gi,
  /\b(?:eur|usd|chf)\s?\d[\d.,]*/gi,
  // durations the agency must not promise
  /\b\d+\s?(?:-|–|bis|to)?\s?\d*\s?(?:wochen?|weeks?|tagen?|days?|monate?n?|months?|werktagen?|working days|arbeitstagen?|kw)\b/gi,
  /\b(?:innerhalb|within|in)\s+(?:von\s+)?(?:einer|einem|eines|ein|zwei|drei|vier|fünf|sechs|one|two|three|four|five|six|a)\s+(?:woche|wochen|tag|tagen|monat|monaten|week|weeks|day|days|month|months)\b/gi,
];

/**
 * Prices, currency amounts and duration promises are never allowed in model output —
 * unless the exact phrase came from the client (a "we answer within one week" USP may be
 * repeated). Returns the offending snippets.
 */
export function findForbidden(text: string, corpus: Corpus): string[] {
  const hits: string[] = [];
  for (const pattern of FORBIDDEN_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const snippet = match[0];
      if (!corpus.text.includes(normalizeText(snippet))) hits.push(snippet);
    }
  }
  return Array.from(new Set(hits));
}

/* ------------------------------------------------------------------ grounding */

const URL_RE = /https?:\/\/[^\s)>\]]+|www\.[^\s)>\]]+/gi;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE_RE = /(?:\+|0)[\d\s/().-]{6,}\d/g;
const NUMBER_RE = /\b\d{2,}\b/g;

/**
 * Every URL, email address, phone number and number with two or more digits in the prose
 * must occur in the client's answers. Anything else is an invention. Single digits are
 * skipped (slider "3 von 5", list numbering).
 */
export function findUngrounded(text: string, corpus: Corpus): string[] {
  const hits: string[] = [];
  const lower = text.toLowerCase();
  for (const m of lower.matchAll(URL_RE)) {
    const clean = m[0].replace(/[.,;:]+$/, '');
    if (!corpus.text.includes(clean)) hits.push(m[0]);
  }
  for (const m of lower.matchAll(EMAIL_RE)) {
    const clean = m[0].replace(/[.,;:]+$/, '');
    if (!corpus.text.includes(clean)) hits.push(clean);
  }
  const stripped = lower.replace(URL_RE, ' ').replace(EMAIL_RE, ' ');
  for (const m of stripped.matchAll(PHONE_RE)) {
    const digits = m[0].replace(/\D/g, '');
    if (digits.length >= 6 && !corpus.digits.includes(digits)) hits.push(m[0].trim());
  }
  for (const m of stripped.matchAll(NUMBER_RE)) {
    if (!corpus.digits.includes(m[0]) && !corpus.text.includes(m[0])) hits.push(m[0]);
  }
  return Array.from(new Set(hits));
}

/* ------------------------------------------------------------------ dashes */

/**
 * No em or en dashes anywhere the client reads in the review, including model output: a
 * dash used as punctuation becomes a comma, and a dash between numbers ("10–12") a hyphen.
 * Hyphens inside words are untouched.
 */
export function stripDashes(text: string): string {
  return text
    .replace(/(\d)\s*[–—]\s*(\d)/g, '$1-$2')
    .replace(/\s*[–—]+\s*(?=[.,;:!?)]|$)/gm, '')
    .replace(/(^|\n)\s*[–—]+\s*/g, '$1')
    .replace(/\s*[–—]+\s*/g, ', ')
    .replace(/,\s*,/g, ',');
}

/** stripDashes over every string in a structured value (model objects, brief sections). */
export function stripDashesDeep<T>(value: T): T {
  if (typeof value === 'string') return stripDashes(value) as T;
  if (Array.isArray(value)) return value.map((v) => stripDashesDeep(v)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, stripDashesDeep(v)])) as T;
  }
  return value;
}

/* ------------------------------------------------------------------ PDF */

/**
 * The PDF uses a WinAnsi font: emoji and most symbols would render as boxes. Umlauts,
 * ß, €, typographic quotes, en/em dashes and the ellipsis are all in WinAnsi and stay.
 */
export function sanitizeForPdf(text: string): string {
  return text
    .replace(/[\u200B-\u200D\uFEFF\u2028\u2029]/g, '')
    .replace(/\u2192/g, '->')
    .replace(/[\u2713\u2714\u2611]/g, '+')
    .replace(/[\u2022\u25AA\u25CF]/g, '-')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\u{1F3FB}-\u{1F3FF}\uFE0F\u200D]/gu, '');
}
