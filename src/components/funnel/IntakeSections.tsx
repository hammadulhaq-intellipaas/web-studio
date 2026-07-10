'use client';

import { useTranslations } from 'next-intl';
import { useFunnel } from '@/stores/funnel';
import { UploadZone } from './UploadZone';
import { BLUE, BODY, BORDER, INK, MUTED } from './ui';

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

/** The former stage-2 intake, now optional collapsed sections of the inquiry form. */
export const SECTIONS: SectionDef[] = [
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

export function IntakeSections() {
  const t = useTranslations('stage2');
  const store = useFunnel();

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
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
                padding: '15px 18px',
                textAlign: 'left',
              }}
            >
              <span style={{ flex: 1, fontSize: 14, fontWeight: 800 }}>
                {t(`sections.${def.id}`)}
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: MUTED }}>
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
                  padding: '2px 18px 18px',
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
                    <div key={f.key} style={{ gridColumn: f.full ? '1 / -1' : 'auto', minWidth: 0 }}>
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
                          style={intakeInputStyle}
                        />
                      ) : (
                        <input
                          value={store.s2[f.key] ?? ''}
                          data-testid={`s2-${f.key}`}
                          onChange={(ev) => store.setS2(f.key, ev.target.value)}
                          placeholder={t(`fields.${f.key}.ph`)}
                          style={intakeInputStyle}
                        />
                      )}
                    </div>
                  ))}
                </div>
                {def.uploads && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
                      <UploadZone storeKind="logo" serverKind="logo" label={t('uploadLogo')} />
                      <UploadZone storeKind="foto" serverKind="photo" label={t('uploadFotos')} />
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
                        style={intakeInputStyle}
                      />
                    </div>
                  </>
                )}
                {def.goals && (
                  <div>
                    <label
                      style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}
                    >
                      {t('goalLabel')}
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
                      {GOALS.map((g) => {
                        const selected = store.goal === g;
                        return (
                          <button
                            key={g}
                            type="button"
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
  );
}

const intakeInputStyle: React.CSSProperties = {
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
