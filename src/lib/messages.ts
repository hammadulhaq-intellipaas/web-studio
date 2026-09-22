import deMessages from '../../messages/de.json';
import enMessages from '../../messages/en.json';
import type { Locale } from './types';
import type { SummaryLabels } from './pricing/summary';

/**
 * The UI message catalogs, readable outside next-intl (route handlers, server actions,
 * admin pages, tests). Pure JSON — safe to import anywhere.
 */
export function messagesFor(locale: Locale) {
  return locale === 'de' ? deMessages : enMessages;
}

/** The translated fragments the receipt builder needs. */
export function summaryLabelsFor(locale: Locale): SummaryLabels {
  return messagesFor(locale).summaryLabels;
}
