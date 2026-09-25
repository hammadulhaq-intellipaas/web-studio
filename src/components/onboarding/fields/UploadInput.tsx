'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { FileSummary } from '@/lib/onboarding/export';
import type { OnbField } from '@/lib/onboarding/types';
import { BLUE, BODY, MUTED2 } from '@/components/funnel/ui';

export type PublicFile = FileSummary & { id: string };

type Reason = 'unsupported_type' | 'too_large' | 'over_total' | 'too_many' | 'upload_failed';

const DEFAULT_ACCEPT = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'heic', 'heif', 'svg', 'pdf', 'doc', 'docx', 'eps', 'ai', 'zip'];

/**
 * Drag-and-drop upload bound to the form (no sign-in). Mirrors the funnel's UploadZone;
 * files are owned by the form and this field, and can be removed again.
 */
export function UploadInput({
  field,
  formId,
  files,
  onFiles,
  disabled,
}: {
  field: OnbField;
  formId: string;
  files: PublicFile[];
  onFiles: (files: PublicFile[]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('onboarding.fields');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const accept = field.config.accept ?? DEFAULT_ACCEPT;
  const maxFiles = field.config.max_files ?? 10;
  const totalMb = field.config.max_total_mb ?? null;
  const maxMb = field.config.max_mb ?? totalMb ?? 25;
  const mine = files.filter((f) => f.field_key === field.id);
  const full = mine.length >= maxFiles;
  const MB = 1024 * 1024;
  const usedBytes = mine.reduce((sum, f) => sum + (f.size_bytes ?? 0), 0);
  const leftMb = (bytes: number) => (totalMb == null ? 0 : Math.max(0, Math.floor(((totalMb * MB - bytes) / MB) * 10) / 10));

  const describe = (name: string, reason: Reason, left = leftMb(usedBytes)) =>
    t(`uploadErr.${reason}`, { name, mb: totalMb ?? maxMb, left });

  const upload = async (list: FileList | null) => {
    if (!list || disabled) return;
    const picked = Array.from(list);
    if (!picked.length) return;
    const problems: string[] = [];
    const accepted: File[] = [];
    // Checked here too, so an oversize file never leaves the browser.
    let planned = usedBytes;
    for (const f of picked) {
      if (totalMb != null && planned + f.size > totalMb * MB) problems.push(describe(f.name, 'over_total', leftMb(planned)));
      else if (f.size > maxMb * MB) problems.push(describe(f.name, 'too_large'));
      else {
        accepted.push(f);
        planned += f.size;
      }
    }
    if (!accepted.length) return setErrors(problems);

    setBusy(true);
    setErrors([]);
    try {
      const form = new FormData();
      accepted.forEach((f) => form.append('files', f));
      form.append('field_key', field.id);
      const res = await fetch(`/api/onboarding/${formId}/uploads`, { method: 'POST', body: form });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { files: PublicFile[]; rejected: { name: string; reason: Reason }[] };
      onFiles(data.files);
      problems.push(...data.rejected.map((r) => describe(r.name, r.reason)));
    } catch {
      problems.push(...accepted.map((f) => describe(f.name, 'upload_failed')));
    } finally {
      setErrors(problems);
      setBusy(false);
    }
  };

  const remove = async (fileId: string) => {
    if (disabled) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/onboarding/${formId}/uploads?file=${fileId}`, { method: 'DELETE' });
      if (res.ok) onFiles(((await res.json()) as { files: PublicFile[] }).files);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid={`f-${field.id}`}>
      {!full && !disabled && (
        <div
          onDrop={(ev) => {
            ev.preventDefault();
            void upload(ev.dataTransfer.files);
          }}
          onDragOver={(ev) => ev.preventDefault()}
          className="hov-blue-border"
          data-testid={`upload-${field.id}`}
          style={{
            border: '1.5px dashed #B9C6DB',
            borderRadius: 12,
            padding: '18px 14px',
            textAlign: 'center',
            background: '#FAFBFE',
            transition: 'border-color .15s',
            opacity: busy ? 0.6 : 1,
          }}
        >
          <div style={{ fontSize: 13, color: BODY, marginBottom: 9 }}>{t('uploadDrag')}</div>
          <label
            style={{
              display: 'inline-block',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              color: BLUE,
              background: '#EDF3FF',
              borderRadius: 9,
              padding: '8px 16px',
            }}
          >
            {t('uploadPick')}
            <input
              type="file"
              multiple={maxFiles > 1}
              accept={accept.map((e) => `.${e}`).join(',')}
              disabled={busy}
              onChange={(ev) => {
                void upload(ev.target.files);
                ev.target.value = '';
              }}
              style={{ display: 'none' }}
            />
          </label>
          <div style={{ fontSize: 11, color: MUTED2, marginTop: 8 }}>
            {totalMb != null
              ? t('uploadHintTotal', { max: maxFiles, mb: totalMb, left: leftMb(usedBytes) })
              : t('uploadHint', { max: maxFiles, mb: maxMb })}{' '}
            · {accept.join(', ')}
          </div>
        </div>
      )}
      {errors.length > 0 && (
        <div data-testid={`upload-error-${field.id}`} style={{ marginTop: 8 }}>
          {errors.map((m, i) => (
            <div key={i} style={{ fontSize: 11.5, fontWeight: 600, color: '#D6493E' }}>
              {m}
            </div>
          ))}
        </div>
      )}
      {mine.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {mine.map((f) => (
            <span
              key={f.id}
              data-testid={`file-${field.id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 11.5,
                fontWeight: 600,
                background: '#EDF3FF',
                color: '#1E4FD6',
                borderRadius: 999,
                padding: '5px 8px 5px 11px',
              }}
            >
              📎 {f.file_name}
              {!disabled && (
                <button
                  type="button"
                  aria-label={t('uploadDelete')}
                  onClick={() => void remove(f.id)}
                  style={{
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    border: 'none',
                    background: '#ffffff',
                    color: '#1E4FD6',
                    borderRadius: '50%',
                    width: 18,
                    height: 18,
                    lineHeight: 1,
                    fontSize: 12,
                    fontWeight: 800,
                    padding: 0,
                  }}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
