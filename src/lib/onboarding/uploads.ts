import 'server-only';
import type { OnbField } from './types';

/** Everything the form stores: client uploads and the brief PDFs. Private. */
export const ONB_BUCKET = 'onboarding-uploads';

const DEFAULT_MAX_MB = 25;
const DEFAULT_MAX_FILES = 10;
const MB = 1024 * 1024;

/**
 * Same rule as the session uploads: the extension decides, the browser-reported MIME is
 * only advisory. A field's `config.accept` narrows this list, never widens it. The bucket
 * allows exactly these types too.
 */
export const KNOWN_EXT = new Map<string, string>([
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['png', 'image/png'],
  ['webp', 'image/webp'],
  ['gif', 'image/gif'],
  ['avif', 'image/avif'],
  ['heic', 'image/heic'],
  ['heif', 'image/heif'],
  ['svg', 'image/svg+xml'],
  ['pdf', 'application/pdf'],
  ['doc', 'application/msword'],
  ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['eps', 'application/postscript'],
  ['ai', 'application/postscript'],
  ['zip', 'application/zip'],
]);

export type RejectionReason = 'unsupported_type' | 'too_large' | 'over_total' | 'too_many' | 'upload_failed';

export interface UploadLimits {
  accept: Set<string>;
  maxBytes: number;
  /** All of the field's files together; null when only the per-file cap applies. */
  totalBytes: number | null;
  maxFiles: number;
}

export function uploadLimits(field: OnbField): UploadLimits {
  const cfg = field.config;
  return {
    accept: new Set((cfg.accept ?? Array.from(KNOWN_EXT.keys())).map((e) => e.toLowerCase())),
    maxBytes: (cfg.max_mb ?? cfg.max_total_mb ?? DEFAULT_MAX_MB) * MB,
    totalBytes: cfg.max_total_mb != null ? cfg.max_total_mb * MB : null,
    maxFiles: cfg.max_files ?? DEFAULT_MAX_FILES,
  };
}

/** What the field already holds; checks add to it as files are accepted. */
export interface Usage {
  count: number;
  bytes: number;
}

/** The MIME type to store, or why the file cannot be stored. */
export function checkFile(
  file: { name: string; size: number },
  limits: UploadLimits,
  used: Usage,
): { ok: true; contentType: string } | { ok: false; reason: RejectionReason } {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const contentType = KNOWN_EXT.get(ext);
  if (!contentType || !limits.accept.has(ext)) return { ok: false, reason: 'unsupported_type' };
  if (!Number.isFinite(file.size) || file.size <= 0) return { ok: false, reason: 'upload_failed' };
  if (file.size > limits.maxBytes) return { ok: false, reason: limits.totalBytes != null ? 'over_total' : 'too_large' };
  if (limits.totalBytes != null && used.bytes + file.size > limits.totalBytes) return { ok: false, reason: 'over_total' };
  if (used.count >= limits.maxFiles) return { ok: false, reason: 'too_many' };
  return { ok: true, contentType };
}

/** `<form id>/<field key>/<time>-<safe name>`: the form's folder holds all of its files. */
export function uploadPath(formId: string, fieldKey: string, name: string): string {
  const safeName = name.replace(/[^\w.\-()\s]/g, '_').slice(0, 150);
  return `${formId}/${fieldKey}/${Date.now()}-${safeName}`;
}

/** A path the confirm call may claim: inside this form's folder for this field, nothing clever. */
export function ownsPath(formId: string, fieldKey: string, path: string): boolean {
  const prefix = `${formId}/${fieldKey}/`;
  return path.startsWith(prefix) && !path.includes('..') && !path.slice(prefix.length).includes('/');
}
