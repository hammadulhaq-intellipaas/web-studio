import type { CSSProperties } from 'react';

/**
 * Design tokens and shared style objects of the public site. Kept in a module WITHOUT
 * 'use client' so server components can import the values: importing a plain object
 * from a client module only yields a client reference, and `{...gradButton}` spreads nothing.
 */
export const INK = '#0F2440';
export const BLUE = '#1E5EFF';
export const GRAD = 'linear-gradient(100deg,#1E4FD6,#22B8D8)';
export const BORDER = '#E4E9F2';
export const MUTED = '#7A879B';
export const MUTED2 = '#9AA7BC';
export const BODY = '#4A5872';
export const GOLD_BG = '#C9A227';
export const GREEN = '#2E8B57';

export const gradButton: CSSProperties = {
  fontFamily: 'inherit',
  cursor: 'pointer',
  border: 'none',
  color: '#ffffff',
  background: GRAD,
  transition: 'transform .15s,box-shadow .15s',
};

export const backButton: CSSProperties = {
  fontFamily: 'inherit',
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  color: MUTED,
  fontSize: 13.5,
  fontWeight: 600,
  padding: 0,
  marginBottom: 22,
};

export const sectionLabel: CSSProperties = {
  fontSize: 11.5,
  fontWeight: 800,
  letterSpacing: 1.4,
  textTransform: 'uppercase',
  color: MUTED,
};

export const card: CSSProperties = {
  background: '#ffffff',
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
  padding: '24px 26px',
};
