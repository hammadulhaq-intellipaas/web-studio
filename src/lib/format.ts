import type { Catalog, Locale } from './types';

const intlLocale = (locale: Locale) => (locale === 'de' ? 'de-DE' : 'en-IE');

/**
 * Convert price from EUR to USD if locale is 'en' and rate is provided.
 * Always rounds to 2 decimals: Math.round(n * rate * 100) / 100
 */
function convertPrice(n: number, locale: Locale, catalog?: Pick<Catalog, 'eurToUsdRate'>): number {
  if (locale === 'de' || !catalog?.eurToUsdRate) return n;
  return Math.round(n * catalog.eurToUsdRate * 100) / 100;
}

/**
 * Get currency symbol based on locale.
 */
function getCurrencySymbol(locale: Locale): string {
  return locale === 'de' ? '€' : '$';
}

/** One-time prices: whole euros, e.g. €1.990 (de) / $2,325 (en). */
export function fmt(n: number, locale: Locale, catalog?: Pick<Catalog, 'eurToUsdRate'>): string {
  const converted = convertPrice(n, locale, catalog);
  const symbol = getCurrencySymbol(locale);
  return symbol + Math.round(converted).toLocaleString(intlLocale(locale));
}

/** Recurring prices: two decimals, e.g. €72,98 (de) / $85.27 (en). */
export function mon(n: number, locale: Locale, catalog?: Pick<Catalog, 'eurToUsdRate'>): string {
  const converted = convertPrice(n, locale, catalog);
  const symbol = getCurrencySymbol(locale);
  return (
    symbol +
    converted.toLocaleString(intlLocale(locale), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
