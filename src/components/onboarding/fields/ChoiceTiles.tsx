'use client';

import { BLUE, BORDER, INK } from '@/components/funnel/ui';
import type { Locale } from '@/lib/types';
import type { OnbField } from '@/lib/onboarding/types';
import { loc } from '@/lib/onboarding/types';
import { DANGER } from './styles';

/**
 * A multi-select shown as large tiles, each with its hint: the first step of the design examples
 * ("I have websites I like" / "Show me examples"). Same value as checkboxes: the ticked option
 * values, in the CMS order.
 */
export function ChoiceTiles({
  field,
  locale,
  invalid,
  value,
  onChange,
}: {
  field: OnbField;
  locale: Locale;
  invalid: boolean;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const options = field.options.filter((o) => !o.retired || value.includes(o.value));
  const toggle = (v: string) => {
    const next = value.includes(v) ? value.filter((x) => x !== v) : [...value, v];
    onChange(options.map((o) => o.value).filter((x) => next.includes(x)));
  };
  return (
    <div
      role="group"
      data-testid={`f-${field.id}`}
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: 12 }}
    >
      {options.map((o) => {
        const on = value.includes(o.value);
        const label = loc(o as unknown as Record<string, unknown>, 'label', locale);
        const hint = loc(o as unknown as Record<string, unknown>, 'hint', locale);
        return (
          <button
            key={o.value}
            type="button"
            role="checkbox"
            aria-checked={on}
            data-testid={`opt-${field.id}-${o.value}`}
            onClick={() => toggle(o.value)}
            className={on ? undefined : 'hov-blue-border'}
            style={{
              fontFamily: 'inherit',
              cursor: 'pointer',
              textAlign: 'left',
              position: 'relative',
              padding: '18px 48px 18px 18px',
              borderRadius: 14,
              border: `${on ? 2 : 1.5}px solid ${on ? BLUE : invalid ? DANGER : BORDER}`,
              background: on ? '#F3F6FF' : '#ffffff',
            }}
          >
            <span style={{ display: 'block', fontSize: 16, fontWeight: 800, color: INK }}>{label}</span>
            {hint && <span style={{ display: 'block', fontSize: 13.5, color: '#5A6780', lineHeight: 1.45, marginTop: 4 }}>{hint}</span>}
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 22,
                height: 22,
                borderRadius: 6,
                border: `1.5px solid ${on ? BLUE : BORDER}`,
                background: on ? BLUE : '#ffffff',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {on ? '✓' : ''}
            </span>
          </button>
        );
      })}
    </div>
  );
}
