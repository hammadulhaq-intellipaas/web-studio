'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useFunnel } from '@/stores/funnel';
import { backButton, BLUE, BODY, BORDER, gradButton, INK, MUTED, MUTED2 } from './ui';

interface FieldDef {
  key: string;
  full?: boolean;
  multi?: boolean;
}

interface SectionDef {
  id: string;
  fields: FieldDef[];
  uploads?: boolean;
  goals?: boolean;
  hasNote?: boolean;
}

const SECTIONS: SectionDef[] = [
  {
    id: 'unternehmen',
    hasNote: true,
    fields: [
      { key: 'firmenname' },
      { key: 'rechtsform' },
      { key: 'anschrift', full: true },
      { key: 'inhaber' },
      { key: 'ustid' },
      { key: 'oeffnung' },
      { key: 'gebiet' },
    ],
  },
  { id: 'marke', uploads: true, fields: [{ key: 'farben', full: true }] },
  {
    id: 'geschichte',
    fields: [
      { key: 'einsatz', full: true, multi: true },
      { key: 'leistungen', full: true, multi: true },
      { key: 'usps', full: true, multi: true },
      { key: 'zertifikate', full: true },
    ],
  },
  {
    id: 'social',
    fields: [{ key: 'gprofil' }, { key: 'socialp' }, { key: 'bewertungen', full: true, multi: true }],
  },
  { id: 'ziel', goals: true, fields: [{ key: 'beispiele', full: true, multi: true }] },
];

const GOALS = ['anrufe', 'termine', 'verkaeufe', 'anfragen'];
const MAX_FILE = 25 * 1024 * 1024;

function UploadZone({ kind, label }: { kind: 'logo' | 'foto'; label: string }) {
  const t = useTranslations('stage2');
  const store = useFunnel();
  const files = kind === 'logo' ? store.logoFiles : store.fotoFiles;
  const [busy, setBusy] = useState(false);

  const upload = async (list: FileList | null) => {
    if (!list || !store.leadId) return;
    const accepted = Array.from(list).filter((f) => f.size <= MAX_FILE);
    if (!accepted.length) return;
    setBusy(true);
    try {
      const form = new FormData();
      accepted.forEach((f) => form.append('files', f));
      form.append('kind', kind);
      const res = await fetch(`/api/leads/${store.leadId}/uploads`, {
        method: 'POST',
        body: form,
      });
      if (res.ok) {
        const data = await res.json();
        store.addFiles(kind, (data.files as { name: string }[]) ?? []);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minWidth: 0 }}>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 5 }}>
        {label}
      </label>
      <div
        onDrop={(ev) => {
          ev.preventDefault();
          upload(ev.dataTransfer.files);
        }}
        onDragOver={(ev) => ev.preventDefault()}
        className="hov-blue-border"
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
            multiple
            accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
            onChange={(ev) => {
              upload(ev.target.files);
              ev.target.value = '';
            }}
            style={{ display: 'none' }}
          />
        </label>
        <div style={{ fontSize: 11, color: MUTED2, marginTop: 8 }}>{t('uploadAccept')}</div>
      </div>
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

export function Stage2Step() {
  const t = useTranslations('stage2');
  const store = useFunnel();
  void backButton;

  const countFilled = (def: SectionDef) => {
    let n = def.fields.filter((f) => (store.s2[f.key] || '').trim()).length;
    if (def.uploads)
      n +=
        (store.logoFiles.length ? 1 : 0) +
        (store.fotoFiles.length ? 1 : 0) +
        (store.drive.trim() ? 1 : 0);
    if (def.goals) n += store.goal ? 1 : 0;
    return n;
  };
  const totalFields = (def: SectionDef) =>
    def.fields.length + (def.uploads ? 3 : 0) + (def.goals ? 1 : 0);

  let filledAll = 0;
  let totalAll = 0;
  SECTIONS.forEach((d) => {
    filledAll += countFilled(d);
    totalAll += totalFields(d);
  });
  const readiness = Math.min(100, Math.round(25 + (filledAll / totalAll) * 75));
  const readinessHint =
    readiness < 40 ? t('readinessLow') : readiness < 70 ? t('readinessMid') : t('readinessHigh');

  const persistAndFinish = async () => {
    if (store.leadId) {
      try {
        await fetch(`/api/leads/${store.leadId}/stage2`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: store.s2,
            goal: store.goal,
            driveLink: store.drive,
          }),
        });
      } catch {
        // Stage 2 is optional enrichment — never block completion on it.
      }
    }
    store.go('done');
  };

  return (
    <section
      data-screen="stage2"
      style={{ animation: 'ipFade .4s ease both', padding: '52px 0 80px', maxWidth: 760 }}
    >
      <div
        style={{
          background: 'linear-gradient(115deg,#0F2440,#1E4FD6 95%)',
          borderRadius: 20,
          padding: '26px 28px',
          color: '#ffffff',
          marginBottom: 26,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4 }}>{t('banner')}</div>
        <p
          style={{
            margin: '10px 0 0',
            fontSize: 14.5,
            lineHeight: 1.55,
            color: '#C7D6F2',
            maxWidth: 600,
          }}
        >
          {t('bannerSub')}
        </p>
      </div>
      <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.6, margin: '0 0 18px' }}>
        {t('title')}
      </h2>

      {/* Readiness meter */}
      <div
        style={{
          background: '#ffffff',
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          padding: '16px 20px',
          marginBottom: 22,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 9,
          }}
        >
          <span style={{ fontSize: 13.5, fontWeight: 700 }}>{t('readiness')}</span>
          <span
            data-testid="readiness"
            style={{ fontSize: 15, fontWeight: 800, color: BLUE, fontVariantNumeric: 'tabular-nums' }}
          >
            {readiness}%
          </span>
        </div>
        <div style={{ height: 9, borderRadius: 999, background: BORDER, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              borderRadius: 999,
              background: 'linear-gradient(90deg,#1E4FD6,#22B8D8)',
              width: `${readiness}%`,
              transition: 'width .5s cubic-bezier(.4,0,.2,1)',
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>{readinessHint}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {SECTIONS.map((def) => {
          const open = store.openSec === def.id;
          const note =
            def.id === 'unternehmen'
              ? t('notes.unternehmen')
              : def.id === 'marke' && store.url
                ? t('notes.markeWithUrl', { url: store.url })
                : null;
          return (
            <div
              key={def.id}
              style={{
                background: '#ffffff',
                border: `1px solid ${BORDER}`,
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => store.setOpenSec(open ? null : def.id)}
                data-testid={`s2-section-${def.id}`}
                style={{
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: 'none',
                  border: 'none',
                  padding: '17px 20px',
                  textAlign: 'left',
                }}
              >
                <span style={{ flex: 1, fontSize: 15, fontWeight: 800 }}>
                  {t(`sections.${def.id}`)}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: MUTED }}>
                  {t('filled', { filled: countFilled(def), total: totalFields(def) })}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: BLUE,
                    fontWeight: 800,
                    transform: `rotate(${open ? 180 : 0}deg)`,
                    transition: 'transform .2s',
                    display: 'inline-block',
                  }}
                >
                  ▾
                </span>
              </button>
              {open && (
                <div
                  style={{
                    padding: '2px 20px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}
                >
                  {note && (
                    <div
                      style={{
                        fontSize: 12.5,
                        color: BODY,
                        background: '#F5F7FB',
                        borderRadius: 9,
                        padding: '9px 13px',
                      }}
                    >
                      {note}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
                    {def.fields.map((f) => (
                      <div
                        key={f.key}
                        style={{ gridColumn: f.full ? '1 / -1' : 'auto', minWidth: 0 }}
                      >
                        <label
                          style={{
                            display: 'block',
                            fontSize: 12.5,
                            fontWeight: 700,
                            marginBottom: 5,
                          }}
                        >
                          {t(`fields.${f.key}.label`)}
                        </label>
                        {f.multi ? (
                          <textarea
                            value={store.s2[f.key] ?? ''}
                            onChange={(ev) => store.setS2(f.key, ev.target.value)}
                            rows={3}
                            placeholder={t(`fields.${f.key}.ph`)}
                            style={s2InputStyle}
                          />
                        ) : (
                          <input
                            value={store.s2[f.key] ?? ''}
                            data-testid={`s2-${f.key}`}
                            onChange={(ev) => store.setS2(f.key, ev.target.value)}
                            placeholder={t(`fields.${f.key}.ph`)}
                            style={s2InputStyle}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  {def.uploads && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
                        <UploadZone kind="logo" label={t('uploadLogo')} />
                        <UploadZone kind="foto" label={t('uploadFotos')} />
                      </div>
                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: 12.5,
                            fontWeight: 700,
                            marginBottom: 5,
                          }}
                        >
                          {t('driveLabel')}
                        </label>
                        <input
                          value={store.drive}
                          onChange={(ev) => store.setDrive(ev.target.value)}
                          placeholder={t('drivePh')}
                          style={s2InputStyle}
                        />
                      </div>
                    </>
                  )}
                  {def.goals && (
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: 12.5,
                          fontWeight: 700,
                          marginBottom: 8,
                        }}
                      >
                        {t('goalLabel')}
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
                        {GOALS.map((g) => {
                          const selected = store.goal === g;
                          return (
                            <button
                              key={g}
                              onClick={() => store.setGoal(selected ? null : g)}
                              className="hov-blue-border"
                              style={{
                                fontFamily: 'inherit',
                                cursor: 'pointer',
                                fontSize: 13.5,
                                fontWeight: 600,
                                padding: '10px 18px',
                                borderRadius: 999,
                                border: `1.5px solid ${selected ? BLUE : BORDER}`,
                                background: selected ? BLUE : '#ffffff',
                                color: selected ? '#ffffff' : INK,
                                transition: 'all .15s',
                              }}
                            >
                              {t(`goals.${g}`)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 28, alignItems: 'center' }}
      >
        <button
          onClick={persistAndFinish}
          data-testid="s2-finish"
          className="hov-lift1"
          style={{
            ...gradButton,
            borderRadius: 12,
            padding: '15px 32px',
            fontSize: 15,
            fontWeight: 700,
            boxShadow: '0 10px 22px -8px rgba(30,79,214,.5)',
          }}
        >
          {t('ctaSend')}
        </button>
        <button
          onClick={persistAndFinish}
          className="hov-blue-text"
          style={{
            fontFamily: 'inherit',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            color: MUTED,
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          {t('ctaLater')}
        </button>
      </div>
    </section>
  );
}

const s2InputStyle: React.CSSProperties = {
  width: '100%',
  fontFamily: 'inherit',
  fontSize: 14,
  padding: '11px 12px',
  border: `1.5px solid ${BORDER}`,
  borderRadius: 10,
  background: '#ffffff',
  color: INK,
  resize: 'vertical',
};
