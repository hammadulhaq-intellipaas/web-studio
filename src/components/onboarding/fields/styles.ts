import type { CSSProperties } from 'react';
import { BLUE, BORDER, INK } from '@/components/funnel/ui';

export const DANGER = '#D6493E';

/** Same input treatment as the inquiry form (LeadStep), with an error state. */
export function inputStyle(invalid: boolean, extra: CSSProperties = {}): CSSProperties {
  return {
    width: '100%',
    fontFamily: 'inherit',
    fontSize: 14.5,
    padding: '12px 13px',
    border: `1.5px solid ${invalid ? DANGER : BORDER}`,
    borderRadius: 10,
    background: '#ffffff',
    color: INK,
    ...extra,
  };
}

/** Pill option, as in the questionnaire step. */
export function pillStyle(selected: boolean, invalid = false): CSSProperties {
  return {
    fontFamily: 'inherit',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    fontSize: 14,
    fontWeight: 600,
    padding: '10px 16px',
    borderRadius: 999,
    border: `1.5px solid ${selected ? BLUE : invalid ? DANGER : BORDER}`,
    background: selected ? BLUE : '#ffffff',
    color: selected ? '#ffffff' : INK,
    transition: 'all .15s',
    textAlign: 'left',
    lineHeight: 1.3,
  };
}

export const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.4,
  color: INK,
  marginBottom: 6,
};

export const helpStyle: CSSProperties = {
  fontSize: 12.5,
  color: '#7A879B',
  lineHeight: 1.5,
  margin: '-2px 0 8px',
};

export const errorStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: DANGER,
  marginTop: 6,
};

export const subtleButton: CSSProperties = {
  fontFamily: 'inherit',
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  padding: 0,
  color: BLUE,
  fontSize: 13,
  fontWeight: 600,
};
