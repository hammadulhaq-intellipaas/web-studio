'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/types';
import type { OnbField } from '@/lib/onboarding/types';
import { addDays, earliestDate, isWeekend } from '@/lib/onboarding/logic';
import { BLUE, BORDER, INK, MUTED } from '@/components/funnel/ui';
import { inputStyle } from './styles';

const DAY_MS = 86_400_000;

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Monday-first weekday index, because both our locales start the week on Monday. */
function mondayIndex(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

function monthStart(value: string): string {
  return `${value.slice(0, 7)}-01`;
}

/**
 * A calendar for `date` fields, rather than the browser's own input.
 *
 * A native date input can only enforce a range, so a rule like "no weekends" would let the
 * client pick a Saturday and only then be told off. Here the days we cannot accept are
 * simply not clickable, which is the difference between a form that refuses an answer and
 * one that never invites it.
 */
export function DateInput({
  field,
  locale,
  invalid,
  inputId,
  value,
  today,
  onChange,
}: {
  field: OnbField;
  locale: Locale;
  invalid: boolean;
  inputId: string;
  value: string | null;
  /** ISO today, passed in so the server and the client agree on what "today" is. */
  today: string;
  onChange: (v: string | null) => void;
}) {
  const t = useTranslations('onboarding.date');
  const min = earliestDate(field.config, today);
  const noWeekends = !!field.config.no_weekends;
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => monthStart(value || min || today));

  const locales = locale === 'de' ? 'de-DE' : 'en-GB';
  const weekdays = useMemo(() => {
    // 5 Jan 1970 was a Monday, so this walks Monday → Sunday.
    const fmt = new Intl.DateTimeFormat(locales, { weekday: 'short', timeZone: 'UTC' });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(1970, 0, 5 + i))));
  }, [locales]);

  const monthLabel = new Intl.DateTimeFormat(locales, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${cursor}T00:00:00Z`),
  );

  const days = useMemo(() => {
    const first = new Date(`${cursor}T00:00:00Z`);
    const lead = mondayIndex(first);
    const start = new Date(first.getTime() - lead * DAY_MS);
    // Six weeks always covers a month, whichever weekday it starts on.
    return Array.from({ length: 42 }, (_, i) => new Date(start.getTime() + i * DAY_MS));
  }, [cursor]);

  const blocked = (day: string) => (min != null && day < min) || (noWeekends && isWeekend(day));

  const shown = value
    ? new Intl.DateTimeFormat(locales, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
        new Date(`${value}T00:00:00Z`),
      )
    : '';

  return (
    <div style={{ maxWidth: 480 }}>
      <button
        type="button"
        id={inputId}
        data-testid={`f-${field.id}`}
        data-value={value ?? ''}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          ...inputStyle(invalid),
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          color: shown ? INK : MUTED,
        }}
      >
        <span>{shown || t('placeholder')}</span>
        <CalendarIcon color={shown ? INK : MUTED} />
      </button>

      {/* Said once, up front, so the greyed-out days are not a mystery. */}
      {(min || noWeekends) && (
        <div style={{ fontSize: 12, color: MUTED, marginTop: 6, lineHeight: 1.45 }} data-testid={`date-rule-${field.id}`}>
          {min && noWeekends
            ? t('ruleBoth', { date: shownDate(min, locales) })
            : min
              ? t('ruleEarliest', { date: shownDate(min, locales) })
              : t('ruleWeekdays')}
        </div>
      )}

      {open && (
        <div
          data-testid={`cal-${field.id}`}
          style={{
            marginTop: 8,
            padding: 12,
            border: `1.5px solid ${BORDER}`,
            borderRadius: 12,
            background: '#ffffff',
            boxShadow: '0 8px 24px rgba(15,36,64,.10)',
            maxWidth: 320,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <button type="button" onClick={() => setCursor(shiftMonth(cursor, -1))} data-testid={`cal-prev-${field.id}`} style={navStyle} aria-label={t('prevMonth')}>
              ‹
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: INK }} data-testid={`cal-month-${field.id}`}>
              {monthLabel}
            </span>
            <button type="button" onClick={() => setCursor(shiftMonth(cursor, 1))} data-testid={`cal-next-${field.id}`} style={navStyle} aria-label={t('nextMonth')}>
              ›
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {weekdays.map((w) => (
              <div key={w} style={{ fontSize: 11, fontWeight: 700, color: MUTED, textAlign: 'center', padding: '4px 0' }}>
                {w}
              </div>
            ))}
            {days.map((d) => {
              const day = iso(d);
              const outside = day.slice(0, 7) !== cursor.slice(0, 7);
              const off = blocked(day);
              const selected = day === value;
              return (
                <button
                  key={day}
                  type="button"
                  disabled={off}
                  data-testid={`cal-day-${day}`}
                  data-blocked={off ? '' : undefined}
                  onClick={() => {
                    onChange(day);
                    setOpen(false);
                  }}
                  style={{
                    fontFamily: 'inherit',
                    fontSize: 13,
                    fontWeight: selected ? 800 : 600,
                    padding: '7px 0',
                    borderRadius: 8,
                    border: '1px solid transparent',
                    background: selected ? BLUE : 'transparent',
                    color: selected ? '#ffffff' : off ? '#C3CBD8' : outside ? MUTED : INK,
                    cursor: off ? 'not-allowed' : 'pointer',
                    opacity: off ? 0.65 : 1,
                  }}
                >
                  {d.getUTCDate()}
                </button>
              );
            })}
          </div>

          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              data-testid={`cal-clear-${field.id}`}
              style={{ ...navStyle, width: '100%', marginTop: 8, fontSize: 12.5, color: MUTED }}
            >
              {t('clear')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Same line weight as the funnel's own icons, so it sits with the rest of the form. */
function CalendarIcon({ size = 16, color = MUTED }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden style={{ flex: 'none' }}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" stroke={color} strokeWidth="2" />
      <path d="M3 10h18M8 3v4M16 3v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const navStyle = {
  fontFamily: 'inherit',
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  fontSize: 18,
  fontWeight: 700,
  color: INK,
  padding: '2px 10px',
  borderRadius: 8,
} as const;

function shiftMonth(cursor: string, by: number): string {
  const d = new Date(`${cursor}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + by, 1);
  return iso(d);
}

function shownDate(day: string, locales: string): string {
  return new Intl.DateTimeFormat(locales, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${day}T00:00:00Z`),
  );
}

export { addDays };
