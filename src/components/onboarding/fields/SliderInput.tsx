'use client';

import { useRef, useState } from 'react';
import type { Locale } from '@/lib/types';
import type { OnbField } from '@/lib/onboarding/types';
import { cap } from '@/lib/onboarding/types';
import { sliderCaptionIndex } from '@/lib/onboarding/logic';
import { BLUE, BORDER, BODY, INK, MUTED } from '@/components/funnel/ui';

const THUMB = 22;

/**
 * Scale with a live caption and example line (spec §02: "a bare 2 means nothing
 * downstream"). With `config.step` below 1 the client can stop between two captions
 * (2.3, 4.5); the caption shown is the nearest one. Hovering the track previews the value
 * under the pointer in a bubble, and dragging shows the value being set. Unanswered shows
 * the midpoint but stores nothing until the client moves it or taps a number.
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
  const step = field.config.step ?? 1;
  const decimals = step < 1 ? Math.min(2, String(step).split('.')[1]?.length ?? 1) : 0;
  const snap = (n: number) => Number(Math.min(max, Math.max(min, Math.round((n - min) / step) * step + min)).toFixed(decimals));
  const format = (n: number) => n.toLocaleString(locale === 'de' ? 'de-DE' : 'en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const pct = (n: number) => ((n - min) / (max - min)) * 100;

  const trackRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [active, setActive] = useState(false);

  const shown = value ?? (min + max) / 2;
  const ticks = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const index = sliderCaptionIndex(field, shown);
  const caption = cap(field.config.captions?.[index], locale);
  const example = cap(field.config.examples?.[index], locale);

  // While dragging the bubble follows the value; otherwise it previews the pointer.
  const bubble = active && value != null ? value : hover;

  const fromPointer = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return snap(min + ratio * (max - min));
  };

  return (
    <div data-testid={`f-${field.id}`}>
      <style>{`
        .onb-slider { -webkit-appearance: none; appearance: none; background: transparent; }
        .onb-slider:focus { outline: none; }
        .onb-slider::-webkit-slider-runnable-track { height: ${THUMB}px; background: transparent; }
        .onb-slider::-moz-range-track { height: ${THUMB}px; background: transparent; }
        .onb-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none; width: ${THUMB}px; height: ${THUMB}px; border-radius: 50%;
          background: #ffffff; border: 3px solid ${BLUE}; box-shadow: 0 2px 8px rgba(30, 79, 214, .28);
          cursor: grab; transition: transform .12s;
        }
        .onb-slider::-moz-range-thumb {
          width: ${THUMB - 6}px; height: ${THUMB - 6}px; border-radius: 50%;
          background: #ffffff; border: 3px solid ${BLUE}; box-shadow: 0 2px 8px rgba(30, 79, 214, .28); cursor: grab;
        }
        .onb-slider:active::-webkit-slider-thumb, .onb-slider:focus-visible::-webkit-slider-thumb { transform: scale(1.15); cursor: grabbing; }
        .onb-slider.unset::-webkit-slider-thumb { border-color: #B9C6DB; box-shadow: none; }
        .onb-slider.unset::-moz-range-thumb { border-color: #B9C6DB; box-shadow: none; }
      `}</style>

      {/* Track, fill, bubble and the real range input stacked on one line. */}
      <div
        ref={trackRef}
        style={{ position: 'relative', height: THUMB, margin: `34px ${THUMB / 2}px 6px` }}
        onPointerMove={(ev) => setHover(fromPointer(ev.clientX))}
        onPointerLeave={() => setHover(null)}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: -THUMB / 2,
            right: -THUMB / 2,
            top: THUMB / 2 - 4,
            height: 8,
            borderRadius: 999,
            background: '#E6ECF5',
          }}
        />
        {value != null && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: -THUMB / 2,
              width: `calc(${pct(value)}% + ${THUMB / 2}px)`,
              top: THUMB / 2 - 4,
              height: 8,
              borderRadius: 999,
              background: `linear-gradient(90deg, #9DB8F5, ${BLUE})`,
              transition: active ? 'none' : 'width .15s',
            }}
          />
        )}
        {bubble != null && (
          <div
            aria-hidden
            data-testid={`slider-bubble-${field.id}`}
            style={{
              position: 'absolute',
              left: `${pct(bubble)}%`,
              bottom: THUMB + 8,
              transform: 'translateX(-50%)',
              background: INK,
              color: '#ffffff',
              fontSize: 12.5,
              fontWeight: 700,
              padding: '4px 9px',
              borderRadius: 8,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: '0 4px 12px rgba(15, 23, 42, .18)',
            }}
          >
            {format(bubble)}
            <span
              style={{
                position: 'absolute',
                left: '50%',
                bottom: -4,
                width: 8,
                height: 8,
                background: INK,
                transform: 'translateX(-50%) rotate(45deg)',
              }}
            />
          </div>
        )}
        <input
          id={inputId}
          type="range"
          className={`onb-slider${value == null ? ' unset' : ''}`}
          min={min}
          max={max}
          step={step}
          value={shown}
          onChange={(ev) => onChange(snap(Number(ev.target.value)))}
          onPointerDown={() => setActive(true)}
          onPointerUp={() => setActive(false)}
          onFocus={() => setActive(true)}
          onBlur={() => setActive(false)}
          aria-valuetext={`${format(shown)} · ${caption}`}
          style={{
            position: 'absolute',
            left: -THUMB / 2,
            width: `calc(100% + ${THUMB}px)`,
            top: 0,
            height: THUMB,
            margin: 0,
            cursor: 'pointer',
          }}
        />
      </div>

      {/* Whole-number shortcuts, placed under their point on the track. */}
      <div style={{ position: 'relative', height: 30, margin: `0 ${THUMB / 2}px` }}>
        {ticks.map((n) => {
          const on = value != null && Math.abs(value - n) < 1e-9;
          return (
            <button
              key={n}
              type="button"
              data-testid={`opt-${field.id}-${n}`}
              onClick={() => onChange(n)}
              aria-label={cap(field.config.captions?.[n - min], locale)}
              style={{
                position: 'absolute',
                left: `${pct(n)}%`,
                transform: 'translateX(-50%)',
                fontFamily: 'inherit',
                cursor: 'pointer',
                width: 30,
                height: 30,
                borderRadius: '50%',
                border: `1.5px solid ${on ? BLUE : BORDER}`,
                background: on ? BLUE : '#ffffff',
                color: on ? '#ffffff' : MUTED,
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
        <span style={{ fontSize: 14, fontWeight: 700, color: INK }}>
          {caption}
          {value != null && (
            <span style={{ fontWeight: 600, color: MUTED, marginLeft: 8 }}>
              {format(value)} / {max}
            </span>
          )}
        </span>
        {example && <span style={{ fontSize: 12.5, color: BODY }}>{example}</span>}
      </div>
    </div>
  );
}
