'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { BLUE, BORDER, INK } from '@/components/funnel/ui';
import type { Locale } from '@/lib/types';
import type { FieldOption, OnbField } from '@/lib/onboarding/types';
import { loc } from '@/lib/onboarding/types';
import { DANGER } from './styles';

interface Props {
  field: OnbField;
  locale: Locale;
  invalid: boolean;
  value: string[];
  onChange: (v: string[]) => void;
}

/** Options in their CMS order, grouped under their (localised) group heading. */
function grouped(options: FieldOption[], locale: Locale): { heading: string; options: FieldOption[] }[] {
  const groups: { heading: string; options: FieldOption[] }[] = [];
  for (const o of options) {
    const heading = loc(o as unknown as Record<string, unknown>, 'group', locale);
    const last = groups[groups.length - 1];
    if (last && last.heading === heading) last.options.push(o);
    else groups.push({ heading, options: [o] });
  }
  return groups;
}

/**
 * A multi-select shown as website cards: a screenshot, the name, a one-line hint and a link
 * that opens the site. Same value as checkboxes (a list of option values), so validation,
 * the PDF and the brief treat it exactly like any other multi-select.
 */
export function ReferenceCards({ field, locale, invalid, value, onChange }: Props) {
  const t = useTranslations('onboarding.fields');
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <div role="group" data-testid={`f-${field.id}`} style={{ display: 'grid', gap: 22 }}>
      {grouped(field.options, locale).map((group) => (
        <div key={group.heading || '_'}>
          {group.heading && (
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: '#7A879B', marginBottom: 10 }}>
              {group.heading}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {group.options.map((o) => {
              const selected = value.includes(o.value);
              const label = loc(o as unknown as Record<string, unknown>, 'label', locale);
              const hint = loc(o as unknown as Record<string, unknown>, 'hint', locale);
              return (
                <div
                  key={o.value}
                  className="hov-blue-border"
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 14,
                    overflow: 'hidden',
                    background: '#ffffff',
                    border: `${selected ? 2 : 1.5}px solid ${selected ? BLUE : invalid ? DANGER : BORDER}`,
                    transition: 'border-color .15s',
                  }}
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    aria-label={label}
                    data-testid={`opt-${field.id}-${o.value}`}
                    onClick={() => toggle(o.value)}
                    style={{ all: 'unset', cursor: 'pointer', display: 'block' }}
                  >
                    {o.image && (
                      <Image
                        src={o.image}
                        alt=""
                        width={960}
                        height={600}
                        sizes="(max-width: 600px) 100vw, 300px"
                        style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: '16 / 10', objectFit: 'cover', borderBottom: `1px solid ${BORDER}` }}
                      />
                    )}
                    <span style={{ display: 'block', padding: '12px 14px 4px' }}>
                      <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: INK }}>{label}</span>
                      {hint && <span style={{ display: 'block', fontSize: 12.5, color: '#7A879B', lineHeight: 1.45, marginTop: 2 }}>{hint}</span>}
                    </span>
                  </button>
                  {selected && (
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        background: BLUE,
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: 800,
                      }}
                    >
                      ✓
                    </span>
                  )}
                  {o.url && (
                    <a
                      href={o.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`opt-${field.id}-${o.value}-link`}
                      style={{ padding: '4px 14px 12px', fontSize: 13, fontWeight: 600, color: BLUE, textDecoration: 'none', marginTop: 'auto' }}
                    >
                      {t('viewSite')} ↗
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
