import type { FieldType } from './types';

/** Upper bound of the serialized `answers` jsonb; the PATCH route answers 413 above it. */
export const MAX_ANSWERS_BYTES = 200 * 1024;

/** Default `max_chars` per text-like field type when the CMS config sets none. */
export const DEFAULT_MAX_CHARS: Partial<Record<FieldType, number>> = {
  text: 300,
  url: 2000,
  email: 320,
  tel: 50,
  textarea: 3000,
};

/** Default `max_chars` for a repeater sub-field when the config sets none. */
export const DEFAULT_SUB_MAX_CHARS = 600;

/** Upper bound of repeater rows regardless of config. */
export const HARD_MAX_ROWS = 20;

/** Flags computed in code (as opposed to `onb_flag_rules`). */
export const SYSTEM_FLAGS = ['scope_flag', 'date_conflict', 'credentials_redacted'] as const;

/** Pseudo-value a condition can match to target an "I don't know" answer. */
export const DONT_KNOW_VALUE = '__dont_know';

/** Follow-up answer length cap (free text). */
export const MAX_FOLLOWUP_CHARS = 2000;
