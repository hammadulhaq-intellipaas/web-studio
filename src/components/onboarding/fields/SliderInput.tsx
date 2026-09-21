'use client';

import type { Locale } from '@/lib/types';
import type { OnbField } from '@/lib/onboarding/types';
import { cap } from '@/lib/onboarding/types';
import { BLUE, BORDER, BODY, INK, MUTED } from '@/components/funnel/ui';

/**
 * 1–5 scale with a live caption and example line (spec §02: "a bare 2 means nothing
 * downstream"). Unanswered shows the midpoint but stores nothing until the client moves
 * it or taps a step.
 */
export function SliderInput({
  field,
  locale,
  value,
  onChange,
  inputId,
}: {
  field: OnbField;
  locale: Locale;
  value: number | null;
  onChange: (v: number) => void;
  inputId: string;
}) {
  const min = field.config.min ?? 1;
  const max = field.config.max ?? 5;
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const shown = value ?? Math.round((min + max) / 2);
  const caption = cap(field.config.captions?.[shown - min], locale);
  const example = cap(field.config.examples?.[shown - min], locale);

  return (
    <div data-testid={`f-${field.id}`}>
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={1}
        value={shown}
        onChange={(ev) => onChange(Number(ev.target.value))}
        aria-valuetext={caption}
        style={{ width: '100%', accentColor: BLUE, cursor: 'pointer', margin: '6px 0 4px' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
        {steps.map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              data-testid={`opt-${field.id}-${n}`}
              onClick={() => onChange(n)}
              aria-label={cap(field.config.captions?.[n - min], locale)}
              style={{
                fontFamily: 'inherit',
                cursor: 'pointer',
                width: 30,
                height: 30,
                borderRadius: '50%',
                border: `1.5px solid ${active ? BLUE : BORDER}`,
                background: active ? BLUE : '#ffffff',
                color: active ? '#ffffff' : MUTED,
                fontSize: 12.5,
                fontWeight: 700,
                transition: 'all .15s',
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div
        data-testid={`slider-caption-${field.id}`}
        style={{
          marginTop: 12,
          background: value == null ? '#F5F7FB' : '#EDF3FF',
          border: `1px solid ${value == null ? BORDER : '#CBD9EE'}`,
          borderRadius: 10,
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          opacity: value == null ? 0.75 : 1,
          transition: 'all .15s',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: INK }}>{caption}</span>
        {example && <span style={{ fontSize: 12.5, color: BODY }}>{example}</span>}
      </div>
    </div>
  );
}
