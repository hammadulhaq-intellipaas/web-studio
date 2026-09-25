import type { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/types';
import type { FieldError } from '@/lib/onboarding/logic';
import type { Answers } from '@/lib/onboarding/types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-10-26" → "26 October 2026" / "26. Oktober 2026" inside error messages. */
function readableDate(value: string, locale: Locale): string {
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * The message for one error, the same wording inline and in the review's summary. A date
 * that was fine when it was picked and has since gone by says so, rather than "too soon".
 */
export function errorText(
  te: ReturnType<typeof useTranslations>,
  error: FieldError,
  answers: Answers,
  locale: Locale,
): string {
  const params: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(error.params ?? {})) params[k] = typeof v === 'string' && ISO_DATE.test(v) ? readableDate(v, locale) : v;
  if (error.code === 'date_min' && !error.row_id) {
    const given = answers[error.field]?.v;
    const today = new Date().toISOString().slice(0, 10);
    if (typeof given === 'string' && ISO_DATE.test(given) && given < today) return te('date_past', params);
  }
  return te(error.code, params);
}
