import type { Locale } from '@/lib/types';
import { bucketLabel, fieldLabel, optionLabel, rowsOf, sliderLabel, sliderPhrase, textOf, visibility } from './logic';
import type {
  Answer,
  Answers,
  OnbField,
  OnboardingBrief,
  OnboardingDefinition,
  OnboardingFormRecord,
} from './types';
import { loc } from './types';

/** A stored upload, as far as the export and the brief need to know about it. */
export interface FileSummary {
  field_key: string | null;
  file_name: string;
  size_bytes: number;
  mime_type: string;
}

/* ------------------------------------------------------------------ display */

/**
 * One answer rendered as plain text in one language — option labels instead of values,
 * slider captions instead of numbers, ranking as "bucket: items", repeater rows as lines.
 * Shared by the brief prompt, the fallback brief, the PDF and the admin.
 */
export function displayValue(field: OnbField, answer: Answer | undefined, locale: Locale, files: FileSummary[] = []): string {
  const base = displayBase(field, answer, locale, files);
  if (!answer?.note) return base;
  const noteLabel = locale === 'de' ? 'Nachfrage' : 'Follow-up';
  const notes = answer.note
    .split('\n\n')
    .map((n) => `${noteLabel}: ${n.replace(/\n→ /g, ' → ')}`)
    .join('\n');
  return base ? `${base}\n${notes}` : notes;
}

function displayBase(field: OnbField, answer: Answer | undefined, locale: Locale, files: FileSummary[]): string {
  if (field.type === 'upload') {
    const mine = files.filter((f) => f.field_key === field.id);
    return mine.length ? mine.map((f) => f.file_name).join(', ') : '';
  }
  if (!answer) return '';
  if (answer.dk) {
    const base = locale === 'de' ? 'Weiß ich nicht' : "Don't know";
    // Knowing WHEN they will know is what we plan around, so it travels with the answer.
    if (!answer.dk_date) return base;
    return locale === 'de' ? `${base} (weiß Bescheid ab ${answer.dk_date})` : `${base} (will know by ${answer.dk_date})`;
  }
  // An explicit "we don't have one" is an answer; an empty field is not. The CMS wrote the
  // wording for the tick, so read it back rather than inventing one.
  if (answer.none) {
    const ticked = locale === 'de' ? field.config.none_label_de : field.config.none_label_en;
    return ticked || (locale === 'de' ? 'Haben wir nicht' : 'We do not have one');
  }
  const v = answer.v;
  if (v == null) return '';

  switch (field.type) {
    case 'radio':
    case 'select':
      return typeof v === 'string' ? optionLabel(field, v, locale) : String(v);
    case 'checkboxes': {
      const list = Array.isArray(v) ? (v as string[]) : [];
      const labels = list.map((x) => optionLabel(field, x, locale));
      if (answer.other) labels.push(answer.other);
      return labels.join(', ');
    }
    case 'slider': {
      // Words only, as on the slider itself; the number stays in the structured export.
      const n = Number(v);
      return Number.isFinite(n) ? sliderPhrase(field, n, locale) || String(n) : '';
    }
    case 'ranking': {
      const map = (typeof v === 'object' && !Array.isArray(v) ? v : {}) as Record<string, string>;
      const fallback = (field.config.buckets ?? []).find((b) => b.default)?.value;
      const groups = new Map<string, string[]>();
      for (const option of field.options) {
        const bucket = map[option.value] ?? fallback ?? '';
        groups.set(bucket, [...(groups.get(bucket) ?? []), optionLabel(field, option.value, locale)]);
      }
      return (field.config.buckets ?? [])
        .filter((b) => groups.get(b.value)?.length)
        .map((b) => `${bucketLabel(field, b.value, locale)}: ${groups.get(b.value)!.join(', ')}`)
        .join('\n');
    }
    case 'repeater': {
      const subs = field.config.fields ?? [];
      return rowsOf(answer)
        .map((row) =>
          subs
            .map((s) => {
              const raw = row[s.key];
              if (raw == null || String(raw).trim() === '') return null;
              const label = locale === 'de' ? s.label_de : s.label_en;
              const option = s.type === 'select' ? (s.options ?? []).find((o) => o.value === String(raw)) : undefined;
              const value = option ? loc(option as unknown as Record<string, unknown>, 'label', locale) : String(raw);
              return `${label}: ${value}`;
            })
            .filter(Boolean)
            .join(' · '),
        )
        .filter(Boolean)
        .join('\n');
    }
    default:
      return typeof v === 'string' ? v : String(v);
  }
}

/* ------------------------------------------------------------------ export */

export interface ExportedAnswer {
  screen: string;
  type: string;
  label: { de: string; en: string };
  /** The stored value, untouched (slider gets its caption alongside). */
  value: unknown;
  /** Human-readable rendering in both languages. */
  display: { de: string; en: string };
  dont_know: boolean;
  /** When they said they would know, if they gave a date with "I don't know". */
  known_by: string | null;
  /** They ticked "we don't have one" rather than leaving the field empty. */
  none: boolean;
  source: 'client' | 'followup' | 'edit' | 'lead';
  /** Follow-up "question → answer" lines attached to this field, if any. */
  note: string | null;
}

export interface ExportedRecord {
  form_id: string;
  locale: Locale;
  status: string;
  created_at: string;
  updated_at: string;
  client: { company: string | null; contact_name: string | null; email: string | null };
  quote: { package: unknown; page_band: unknown };
  answers: Record<string, ExportedAnswer>;
  files: FileSummary[];
  flags: OnboardingFormRecord['flags'];
  followups: NonNullable<OnboardingFormRecord['review']>['history'];
  gaps: NonNullable<OnboardingFormRecord['review']>['gaps'];
  brief: { version: number; source: string; sections: OnboardingBrief['sections'] } | null;
  confirmed: OnboardingFormRecord['confirmed'];
}

function exportedValue(field: OnbField, answer: Answer): unknown {
  if (answer.dk) return null;
  if (field.type === 'slider' && typeof answer.v === 'number') {
    return { value: answer.v, label: sliderLabel(field, answer.v, 'en'), label_de: sliderLabel(field, answer.v, 'de') };
  }
  if (field.type === 'repeater') return rowsOf(answer).map(({ _id, ...rest }) => ({ id: _id, ...rest }));
  if (field.type === 'checkboxes' && answer.other) return { values: answer.v, other: answer.other };
  return answer.v;
}

/**
 * The JSON that reaches the team with every confirmed brief (spec §05). Answers are keyed
 * by field, ordered as in the form, with labels resolved in both languages so nothing
 * downstream has to know the CMS.
 */
export function exportRecord(
  definition: Pick<OnboardingDefinition, 'fields'>,
  record: OnboardingFormRecord,
  brief: OnboardingBrief | null,
  files: FileSummary[],
): ExportedRecord {
  const { visible } = visibility(definition.fields, record.answers);
  const answers: Record<string, ExportedAnswer> = {};
  for (const field of visible) {
    if (field.type === 'notice') continue;
    const answer = record.answers[field.id];
    const hasFiles = field.type === 'upload' && files.some((f) => f.field_key === field.id);
    if (!answer && !hasFiles) continue;
    answers[field.id] = {
      screen: field.screen_id,
      type: field.type,
      label: { de: fieldLabel(field, 'de'), en: fieldLabel(field, 'en') },
      value: answer ? exportedValue(field, answer) : null,
      display: {
        de: displayValue(field, answer, 'de', files),
        en: displayValue(field, answer, 'en', files),
      },
      dont_know: !!answer?.dk,
      known_by: answer?.dk_date ?? null,
      none: !!answer?.none,
      source: answer?.src ?? 'client',
      note: answer?.note ?? null,
    };
  }

  return {
    form_id: record.id,
    locale: record.locale,
    status: record.status,
    created_at: record.created_at,
    updated_at: record.updated_at,
    client: {
      company: record.company ?? (textOf(record.answers.contact_company) || null),
      contact_name: record.name ?? (textOf(record.answers.contact_name) || null),
      email: record.email ?? (textOf(record.answers.contact_email) || null),
    },
    quote: {
      package: answers.booked_package?.value ?? null,
      page_band: answers.booked_page_band?.value ?? null,
    },
    answers,
    files,
    flags: record.flags,
    followups: record.review?.history ?? [],
    gaps: record.review?.gaps ?? [],
    brief: brief ? { version: brief.version, source: brief.source, sections: brief.sections } : null,
    confirmed: record.confirmed,
  };
}

/** Contact details the record mirrors from Screen 1 (for lists, emails and the PDF header). */
export function contactFrom(answers: Answers): { name: string | null; company: string | null; email: string | null } {
  const pick = (key: string) => textOf(answers[key]).trim() || null;
  return { name: pick('contact_name'), company: pick('contact_company'), email: pick('contact_email') };
}
