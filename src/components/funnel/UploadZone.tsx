'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useFunnel, type FileKind } from '@/stores/funnel';
import { BLUE, BODY, MUTED2 } from './ui';

const MAX_FILE = 25 * 1024 * 1024;

/** lead_files.kind written on the server for each client-side bucket. */
export type ServerFileKind = 'logo' | 'photo' | 'concept' | 'website';

type RejectionReason = 'unsupported_type' | 'too_large' | 'upload_failed';
interface RejectedFile {
  name: string;
  reason: RejectionReason;
}

/**
 * Drag-and-drop upload bound to the funnel session, so files can be attached before a
 * lead exists. On submission the server re-parents them to the created lead.
 */
export function UploadZone({
  storeKind,
  serverKind,
  label,
  compact,
}: {
  storeKind: FileKind;
  serverKind: ServerFileKind;
  label: string;
  compact?: boolean;
}) {
  const t = useTranslations('stage2');
  const store = useFunnel();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const files =
    storeKind === 'logo' ? store.logoFiles : storeKind === 'foto' ? store.fotoFiles : store.siteFiles;

  const describe = (rejection: RejectedFile) =>
    t(`uploadErr.${rejection.reason}`, { name: rejection.name });

  const upload = async (list: FileList | null) => {
    if (!list) return;
    const picked = Array.from(list);
    if (!picked.length) return;

    // No session means the visitor never started the questionnaire — nothing to attach to.
    if (!store.sessionId) {
      setErrors([t('uploadErr.upload_failed', { name: picked[0].name })]);
      return;
    }

    // Oversize files are caught here so a 25 MB upload never leaves the browser.
    const tooLarge = picked.filter((f) => f.size > MAX_FILE);
    const accepted = picked.filter((f) => f.size <= MAX_FILE);
    const problems = tooLarge.map((f) => describe({ name: f.name, reason: 'too_large' }));

    if (!accepted.length) {
      setErrors(problems);
      return;
    }

    setBusy(true);
    setErrors([]);
    try {
      const form = new FormData();
      accepted.forEach((f) => form.append('files', f));
      form.append('kind', serverKind);
      const res = await fetch(`/api/sessions/${store.sessionId}/uploads`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw new Error(`upload failed: ${res.status}`);

      const data = (await res.json()) as { files?: { name: string }[]; rejected?: RejectedFile[] };
      store.addFiles(storeKind, data.files ?? []);
      problems.push(...(data.rejected ?? []).map(describe));
    } catch {
      problems.push(...accepted.map((f) => describe({ name: f.name, reason: 'upload_failed' })));
    } finally {
      setErrors(problems);
      setBusy(false);
    }
  };

  return (
    <div style={{ minWidth: 0 }}>
      {label && (
        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 5 }}>
          {label}
        </label>
      )}
      <div
        onDrop={(ev) => {
          ev.preventDefault();
          upload(ev.dataTransfer.files);
        }}
        onDragOver={(ev) => ev.preventDefault()}
        className="hov-blue-border"
        data-testid={`upload-${serverKind}`}
        style={{
          border: '1.5px dashed #B9C6DB',
          borderRadius: 12,
          padding: compact ? '13px 12px' : '18px 14px',
          textAlign: 'center',
          background: '#FAFBFE',
          transition: 'border-color .15s',
          opacity: busy ? 0.6 : 1,
        }}
      >
        {!compact && (
          <div style={{ fontSize: 13, color: BODY, marginBottom: 9 }}>{t('uploadDrag')}</div>
        )}
        <label
          style={{
            display: 'inline-block',
            cursor: 'pointer',
            fontSize: compact ? 12.5 : 13,
            fontWeight: 700,
            color: BLUE,
            background: '#EDF3FF',
            borderRadius: 9,
            padding: compact ? '7px 14px' : '8px 16px',
          }}
        >
          {t('uploadPick')}
          <input
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.gif,.avif,.heic,.heif,.svg,.pdf,.doc,.docx"
            onChange={(ev) => {
              upload(ev.target.files);
              ev.target.value = '';
            }}
            style={{ display: 'none' }}
          />
        </label>
        <div style={{ fontSize: 11, color: MUTED2, marginTop: 8 }}>{t('uploadAccept')}</div>
      </div>
      {errors.length > 0 && (
        <div data-testid={`upload-error-${serverKind}`} style={{ marginTop: 8 }}>
          {errors.map((message, i) => (
            <div key={i} style={{ fontSize: 11.5, fontWeight: 600, color: '#D6493E' }}>
              {message}
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {files.map((f, i) => (
          <span
            key={`${f.name}-${i}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11.5,
              fontWeight: 600,
              background: '#EDF3FF',
              color: '#1E4FD6',
              borderRadius: 999,
              padding: '5px 11px',
            }}
          >
            📎 {f.name}
          </span>
        ))}
      </div>
    </div>
  );
}
