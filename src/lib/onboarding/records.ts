import 'server-only';
import type { Locale } from '@/lib/types';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { generateSessionId } from '@/lib/session-id';
import { contactFrom, type FileSummary } from './export';
import { redactAnswers } from './guardrails';
import { MAX_ANSWERS_BYTES } from './limits';
import {
  answersBytes,
  clearHidden,
  computeFlags,
  mergeFlags,
  mergePatch,
  type FileCounts,
} from './logic';
import type {
  Answer,
  Answers,
  FormFlag,
  OnboardingBrief,
  OnboardingDefinition,
  OnboardingFormRecord,
} from './types';

/* ------------------------------------------------------------------ loading */

export interface StoredFile extends FileSummary {
  id: string;
  storage_path: string;
  created_at: string;
}

export async function createForm(locale: Locale): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const id = generateSessionId();
  const { error } = await supabase
    .from('onboarding_forms')
    .insert({ id, locale, status: 'in_progress', current_step: null });
  if (error) throw new Error(`Failed to create onboarding form: ${error.message}`);
  return id;
}

export async function loadForm(id: string): Promise<OnboardingFormRecord | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from('onboarding_forms').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Failed to load onboarding form: ${error.message}`);
  return (data as OnboardingFormRecord | null) ?? null;
}

export async function loadFiles(formId: string): Promise<StoredFile[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('lead_files')
    .select('id, field_key, file_name, size_bytes, mime_type, storage_path, created_at')
    .eq('onboarding_form_id', formId)
    .order('created_at');
  if (error) throw new Error(`Failed to load onboarding files: ${error.message}`);
  return (data ?? []) as StoredFile[];
}

export function fileCounts(files: FileSummary[]): FileCounts {
  const counts: FileCounts = {};
  for (const f of files) if (f.field_key) counts[f.field_key] = (counts[f.field_key] ?? 0) + 1;
  return counts;
}

export async function loadBrief(formId: string, version: number | null): Promise<OnboardingBrief | null> {
  if (version == null) return null;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('onboarding_briefs')
    .select('*')
    .eq('form_id', formId)
    .eq('version', version)
    .maybeSingle();
  if (error) throw new Error(`Failed to load brief: ${error.message}`);
  return (data as OnboardingBrief | null) ?? null;
}

/** Files the client sees: no storage paths. */
export function publicFiles(files: StoredFile[]): (FileSummary & { id: string })[] {
  return files.map(({ id, field_key, file_name, size_bytes, mime_type }) => ({ id, field_key, file_name, size_bytes, mime_type }));
}

/* ------------------------------------------------------------------ patching */

export interface PatchInput {
  changes?: Record<string, Answer | null>;
  current_step?: string | null;
  locale?: Locale;
}

export interface PatchResult {
  ok: true;
  update: Partial<OnboardingFormRecord>;
  removed: Answers;
  redactions: number;
}

export interface PatchRejected {
  ok: false;
  status: 413;
  error: 'answers_too_large';
}

/**
 * Everything a field-level patch does to a record, as data: redact secrets, merge, clear
 * hidden fields, recompute flags, mirror the contact block. Shared by the PATCH route
 * and the follow-up write-back so both paths can never disagree.
 */
export function applyPatch(
  definition: OnboardingDefinition,
  record: OnboardingFormRecord,
  input: PatchInput,
): PatchResult | PatchRejected {
  const { answers: redactedChanges, count } = input.changes
    ? redactAnswers(Object.fromEntries(Object.entries(input.changes).filter(([, v]) => v !== null)) as Answers)
    : { answers: {}, count: 0 };
  const deletions = Object.fromEntries(Object.entries(input.changes ?? {}).filter(([, v]) => v === null));
  const merged = mergePatch(record.answers, { ...deletions, ...redactedChanges });
  const { answers, removed } = clearHidden(definition.fields, merged);

  if (answersBytes(answers) > MAX_ANSWERS_BYTES) return { ok: false, status: 413, error: 'answers_too_large' };

  const previousRedactions = Number(record.flags.find((f) => f.code === 'credentials_redacted')?.data?.count ?? 0);
  const flags = mergeFlags(record.flags, computeFlags(definition, answers, { redactions: previousRedactions + count }));
  const contact = contactFrom(answers);

  const update: Partial<OnboardingFormRecord> = {
    answers,
    flags,
    name: contact.name,
    company: contact.company,
    email: contact.email,
  };
  if (input.current_step !== undefined) update.current_step = input.current_step;
  if (input.locale) update.locale = input.locale;

  return { ok: true, update, removed, redactions: count };
}

export type SaveOutcome =
  | { ok: true; record: OnboardingFormRecord }
  | { ok: false; status: 409; error: 'stale' | 'status'; record: OnboardingFormRecord | null };

/**
 * A write for data the server derives from the answers, such as the completeness report.
 * It deliberately does NOT bump `rev`: the client's revision is its optimistic-concurrency
 * token for its own edits, and invalidating it from the server would make every open tab
 * lose a save it was in the middle of.
 */
export async function saveDerived(id: string, update: Partial<OnboardingFormRecord>): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from('onboarding_forms').update(update).eq('id', id);
  if (error) throw new Error(`Failed to save derived onboarding data: ${error.message}`);
}

/**
 * Optimistic write: bumps `rev` only if the row still carries the client's `base_rev`.
 * Zero rows updated means another tab won; the caller re-applies its pending changes on
 * top of the returned current row and retries once.
 */
export async function saveWithRev(
  id: string,
  baseRev: number,
  update: Partial<OnboardingFormRecord>,
  expectedStatus?: OnboardingFormRecord['status'] | OnboardingFormRecord['status'][],
): Promise<SaveOutcome> {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from('onboarding_forms')
    .update({ ...update, rev: baseRev + 1, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('rev', baseRev);
  if (expectedStatus) {
    query = Array.isArray(expectedStatus) ? query.in('status', expectedStatus) : query.eq('status', expectedStatus);
  }
  const { data, error } = await query.select('*').maybeSingle();
  if (error) throw new Error(`Failed to save onboarding form: ${error.message}`);
  if (data) return { ok: true, record: data as OnboardingFormRecord };

  const current = await loadForm(id);
  const statusMismatch =
    !!current && !!expectedStatus && !(Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus]).includes(current.status);
  return { ok: false, status: 409, error: statusMismatch ? 'status' : 'stale', record: current };
}

/** Flags helper for routes that add a flag outside the recompute path. */
export function withFlag(flags: FormFlag[], flag: FormFlag): FormFlag[] {
  const key = `${flag.code}|${flag.detail ?? ''}`;
  return flags.some((f) => `${f.code}|${f.detail ?? ''}` === key) ? flags : [...flags, flag];
}
