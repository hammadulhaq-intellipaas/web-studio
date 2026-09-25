'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/types';
import type { OnbField } from '@/lib/onboarding/types';
import { cap } from '@/lib/onboarding/types';
import { SLIDER_STEP, sliderCaptionIndex } from '@/lib/onboarding/logic';
import { BLUE, BORDER, BODY, INK, MUTED } from '@/components/funnel/ui';

const THUMB = 22;

/**
 * A scale whose stops are its captions ("Fun and playful" … "Formal and serious"), not
 * numbers. The handle stops anywhere between two captions (spec §02: "a bare 2 means
 * nothing downstream", so the client only ever sees words). Hovering the track previews
 * the nearest caption in a bubble, and dragging shows it live. Unanswered shows the
 * midpoint but stores nothing until the client moves it or taps a caption.
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
  const t = useTranslations('onboarding.fields');
  const min = field.config.min ?? 1;
  const max = field.config.max ?? 5;
  const step = field.config.step ?? SLIDER_STEP;
  const decimals = step < 1 ? Math.min(2, String(step).split('.')[1]?.length ?? 1) : 0;
  const snap = (n: number) => Number(Math.min(max, Math.max(min, Math.round((n - min) / step) * step + min)).toFixed(decimals));
  const pct = (n: number) => ((n - min) / (max - min)) * 100;
  const captionAt = (i: number) => cap(field.config.captions?.[i], locale);

  const trackRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [active, setActive] = useState(false);

  const shown = value ?? (min + max) / 2;
  const stops = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const nearest = sliderCaptionIndex(field, shown);
  const onStop = Math.abs(shown - Math.round(shown)) < 0.05;
  const lower = Math.floor(shown) - min;
  const heading = onStop ? captionAt(nearest) : t('sliderBetween', { a: captionAt(lower), b: captionAt(lower + 1) });
  const example = cap(field.config.examples?.[nearest], locale);

  // While dragging the bubble follows the value; otherwise it previews the pointer.
  const bubble = active && value != null ? value : hover;

  const fromPointer = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return snap(min + ratio * (max - min));
  };

  // The track is inset by half a column, so every caption column is centred on its point.
  const inset = `calc(50% / ${stops.length})`;

  return (
    <div data-testid={`f-${field.id}`}>
      <style>{`
        .onb-slider { -webkit-appearance: none; appearance: none; background: transparent; }
        /* Beats the global ".funnel input:focus" ring; focus shows on the thumb instead. */
        .funnel .onb-slider:focus { outline: none; }
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

      {/* Track, fill, stop marks, bubble and the real range input stacked on one line. */}
      <div
        ref={trackRef}
        style={{ position: 'relative', height: THUMB, margin: `40px ${inset} 10px` }}
        onPointerMove={(ev) => setHover(fromPointer(ev.clientX))}
        onPointerLeave={() => setHover(null)}
      >
        <div
          aria-hidden
          style={{ position: 'absolute', left: -THUMB / 2, right: -THUMB / 2, top: THUMB / 2 - 4, height: 8, borderRadius: 999, background: '#E6ECF5' }}
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
        {stops.map((n) => (
          <span
            key={n}
            aria-hidden
            style={{
              position: 'absolute',
              left: `${pct(n)}%`,
              top: THUMB / 2 - 3,
              width: 6,
              height: 6,
              marginLeft: -3,
              borderRadius: '50%',
              background: value != null && value >= n ? '#ffffff' : '#C3CFE2',
              pointerEvents: 'none',
            }}
          />
        ))}
        {bubble != null && (
          <div
            aria-hidden
            data-testid={`slider-bubble-${field.id}`}
            style={{
              position: 'absolute',
              left: `${pct(bubble)}%`,
              bottom: THUMB + 8,
              transform: `translateX(-${pct(bubble)}%)`,
              background: INK,
              color: '#ffffff',
              fontSize: 12.5,
              fontWeight: 700,
              padding: '5px 10px',
              borderRadius: 8,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: '0 4px 12px rgba(15, 23, 42, .18)',
            }}
          >
            {captionAt(sliderCaptionIndex(field, bubble))}
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
          aria-valuetext={heading}
          style={{
            position: 'absolute',
            left: -THUMB / 2,
            width: `calc(100% + ${THUMB}px)`,
            top: 0,
            height: THUMB,
            margin: 0,
            padding: 0,
            border: 'none',
            boxShadow: 'none',
            cursor: 'pointer',
          }}
        />
      </div>

      {/* The captions are the scale: each sits under its point and jumps there when tapped. */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stops.length}, 1fr)`, columnGap: 4 }}>
        {stops.map((n) => {
          const i = n - min;
          const on = value != null && nearest === i;
          return (
            <button
              key={n}
              type="button"
              data-testid={`opt-${field.id}-${n}`}
              onClick={() => onChange(n)}
              style={{
                fontFamily: 'inherit',
                textAlign: 'center',
                textWrap: 'balance',
                // Long captions ("Professional and restrained") break at syllables on phones.
                hyphens: 'auto',
                WebkitHyphens: 'auto',
                cursor: 'pointer',
                border: 'none',
                background: 'transparent',
                padding: '2px 0',
                fontSize: 'clamp(10.5px, 2.9vw, 12px)',
                lineHeight: 1.3,
                fontWeight: on ? 700 : 600,
                color: on ? BLUE : MUTED,
                transition: 'color .15s',
              }}
            >
              {captionAt(i)}
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
        <span style={{ fontSize: 14, fontWeight: 700, color: INK }}>{heading}</span>
        {example && <span style={{ fontSize: 12.5, color: BODY }}>{example}</span>}
      </div>
    </div>
  );
}
