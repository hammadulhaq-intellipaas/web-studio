import type { Locale } from '@/lib/types';
import { displayValue, type FileSummary } from '../export';
import { fieldLabel, isEmpty, visibility } from '../logic';
import type { Answers, Gap, OnbField, OnboardingDefinition, OnboardingFormRecord } from '../types';
import { loc } from '../types';

/** One line per answered, visible field — what the model is allowed to know. */
export function renderAnswers(
  definition: Pick<OnboardingDefinition, 'fields' | 'screens'>,
  answers: Answers,
  files: FileSummary[],
  locale: Locale,
  opts: { onlyFields?: Set<string>; markGaps?: Gap[] } = {},
): string {
  const { visible } = visibility(definition.fields, answers);
  const gapKinds = new Map((opts.markGaps ?? []).filter((g) => !g.row_id).map((g) => [g.field, g.kind]));
  const lines: string[] = [];
  let currentScreen = '';
  for (const field of visible) {
    if (field.type === 'notice') continue;
    if (opts.onlyFields && !opts.onlyFields.has(field.id)) continue;
    const answer = answers[field.id];
    const text = displayValue(field, answer, locale, files);
    const state = answer?.dk ? 'DONT_KNOW' : text ? null : field.type === 'upload' ? 'NO_FILES' : 'UNANSWERED';
    if (field.screen_id !== currentScreen) {
      currentScreen = field.screen_id;
      const screen = definition.screens.find((s) => s.id === currentScreen);
      lines.push('', `## ${screen ? loc(screen as unknown as Record<string, unknown>, 'title', locale) : currentScreen}`);
    }
    const gap = gapKinds.get(field.id);
    const suffix = state ? ` [${state}]` : gap === 'thin' ? ' [THIN]' : '';
    lines.push(`- ${field.id} · ${fieldLabel(field, locale)}: ${text ? text.replace(/\n/g, ' / ') : '—'}${suffix}`);
  }
  return lines.join('\n').trim();
}

/** Fields the completeness pass may question: ai_check free text plus everything thin. */
export function completenessCandidates(
  definition: Pick<OnboardingDefinition, 'fields'>,
  answers: Answers,
  gaps: Gap[],
): OnbField[] {
  const { visible } = visibility(definition.fields, answers);
  const thin = new Set(gaps.filter((g) => g.kind === 'thin').map((g) => g.field));
  return visible.filter((f) => {
    if (f.type === 'notice' || f.type === 'upload') return false;
    if (thin.has(f.id)) return true;
    return f.ai_check && !isEmpty(answers[f.id]) && !answers[f.id]?.dk;
  });
}

export function localeName(locale: Locale): string {
  return locale === 'de' ? 'German (de)' : 'English (en)';
}

export function clientHeader(record: OnboardingFormRecord): string {
  return [
    `locale: ${record.locale}`,
    record.company ? `company: ${record.company}` : null,
    record.name ? `contact: ${record.name}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}
