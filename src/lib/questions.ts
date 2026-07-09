import type { Answers } from './types';
import { isByow } from './pricing/engine';

export interface QuestionDef {
  /** Answer field this question writes to; also the i18n namespace `questions.<id>.*`. */
  id: keyof Answers;
  /** Option values; labels resolved via i18n key `questions.<id>.opts.<value>`. */
  opts: string[];
  multi?: boolean;
  /** Shows the URL input when hasSite != 'none'. */
  link?: boolean;
  hasHint?: boolean;
}

/** Dynamic question list — ported 1:1 from the prototype's buildQuestions(). */
export function buildQuestions(answers: Answers): QuestionDef[] {
  const q: QuestionDef[] = [];

  q.push({ id: 'hasSite', opts: ['none', 'website', 'social', 'concept'], link: true, hasHint: true });

  if (answers.hasSite === 'website') {
    q.push({ id: 'selfbuilt', opts: ['nein', 'ja'], hasHint: true });
  }

  const byow = isByow(answers);
  if (byow) {
    q.push({
      id: 'aiHas',
      multi: true,
      hasHint: true,
      opts: ['home', 'sub', 'form', 'blog', 'shop', 'booking', 'multilang', 'domain'],
    });
    q.push({
      id: 'aiMissing',
      multi: true,
      hasHint: true,
      opts: ['domain', 'hosting', 'ssl', 'legal', 'seo', 'email', 'perf', 'design'],
    });
    q.push({ id: 'byowScope', opts: ['live', 'changes'], hasHint: true });
    q.push({ id: 'langs', opts: ['1', '2', '3'] });
  } else {
    q.push({ id: 'pages', opts: ['14', '58', '912', '12p'], hasHint: true });
    q.push({ id: 'langs', opts: ['1', '2', '3'] });
  }

  q.push({ id: 'contact', opts: ['form', 'booking'] });
  if (answers.contact === 'booking') {
    q.push({ id: 'fees', opts: ['nein', 'ja'], hasHint: true });
  }
  if (!byow) {
    q.push({ id: 'shop', opts: ['nein', 'paar', 'shop'], hasHint: true });
    q.push({ id: 'blog', opts: ['ja', 'nein'] });
  }
  q.push({ id: 'assets', opts: ['ja', 'teil', 'nein'] });

  return q;
}

export const EMPTY_ANSWERS: Answers = {
  hasSite: null,
  selfbuilt: null,
  aiHas: [],
  aiMissing: [],
  byowScope: null,
  pages: null,
  langs: null,
  contact: null,
  fees: null,
  shop: null,
  blog: null,
  assets: null,
};

/** Apply an answer pick (single or multi), incl. the hasSite→selfbuilt reset rule. */
export function pickAnswer(answers: Answers, q: QuestionDef, val: string): Answers {
  const next: Answers = { ...answers };
  if (q.multi) {
    const cur = Array.isArray(next[q.id]) ? ([...(next[q.id] as string[])] as string[]) : [];
    const i = cur.indexOf(val);
    if (i >= 0) cur.splice(i, 1);
    else cur.push(val);
    (next[q.id] as string[]) = cur;
  } else {
    (next[q.id] as string | null) = val;
    if (q.id === 'hasSite' && val !== 'website') next.selfbuilt = null;
  }
  return next;
}
