import { z } from 'zod';
import { HARD_MAX_ROWS } from './limits';

/** Anything a field can hold; the exact shape per type is checked by validateField later. */
const primitive = z.union([z.string().max(20_000), z.number(), z.null()]);

export const valueSchema = z.union([
  z.string().max(20_000),
  z.number(),
  z.array(z.string().max(200)).max(50),
  z.record(z.string().max(64), z.string().max(64)),
  z.array(z.object({ _id: z.string().min(1).max(32) }).catchall(primitive)).max(HARD_MAX_ROWS),
]);

export const answerSchema = z.object({
  v: valueSchema.nullable(),
  dk: z.literal(true).optional(),
  dk_date: z.string().max(10).optional(),
  none: z.literal(true).optional(),
  src: z.enum(['followup', 'edit', 'lead']).optional(),
  other: z.string().max(500).optional(),
  note: z.string().max(4000).optional(),
});

export const FIELD_KEY_RE = /^[a-z][a-z0-9_]{1,39}$/;

export const patchSchema = z.object({
  base_rev: z.number().int().min(0),
  changes: z.record(z.string().regex(FIELD_KEY_RE), answerSchema.nullable()).optional(),
  current_step: z.string().max(40).nullable().optional(),
  locale: z.enum(['de', 'en']).optional(),
});

export type PatchBody = z.infer<typeof patchSchema>;
