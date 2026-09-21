import type { Locale } from '@/lib/types';
import type { OnbText } from './types';

/** CMS text by key for a locale, falling back to German (the default locale). */
export function textFor(texts: OnbText[], key: string, locale: Locale): OnbText | undefined {
  return texts.find((t) => t.key === key && t.locale === locale) ?? texts.find((t) => t.key === key && t.locale === 'de');
}

/** Replace `{name}`-style placeholders; unknown ones are left in place so they stay visible in the CMS. */
export function fillPlaceholders(template: string, params: Record<string, string | number | null | undefined>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    return value === undefined || value === null ? match : String(value);
  });
}

/** The lines of a markdown bullet list (`- …`), for CMS lists rendered as checkboxes. */
export function listItems(markdown: string): string[] {
  return markdown
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^[-*]\s+/.test(l))
    .map((l) => l.replace(/^[-*]\s+/, '').trim())
    .filter(Boolean);
}
