import type { Locale } from './types';

const intlLocale = (locale: Locale) => (locale === 'de' ? 'de-DE' : 'en-IE');

/** One-time prices: whole euros, e.g. €1.990 (de) / €1,990 (en). */
export function fmt(n: number, locale: Locale): string {
  return '€' + Math.round(n).toLocaleString(intlLocale(locale));
}

/** Recurring prices: two decimals, e.g. €72,98 (de) / €72.98 (en). */
export function mon(n: number, locale: Locale): string {
  return (
    '€' +
    n.toLocaleString(intlLocale(locale), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
