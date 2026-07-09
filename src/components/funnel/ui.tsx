'use client';

import type { CSSProperties } from 'react';

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

export function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }}>
      <circle cx="12" cy="12" r="10" fill="#E8F0FF" />
      <path
        d="M8 12.5l2.6 2.6L16 9.5"
        stroke={BLUE}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GreenCheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flex: 'none', marginTop: 1 }}>
      <circle cx="12" cy="12" r="11" fill="#E7F3EC" />
      <path
        d="M7 12.3l3.2 3.2L17 8.7"
        stroke={GREEN}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LockIcon({ size = 11, color = GREEN }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }}>
      <rect x="4" y="10" width="16" height="11" rx="2.5" stroke={color} strokeWidth="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke={color} strokeWidth="2" />
    </svg>
  );
}

export function Toggle({ on }: { on: boolean }) {
  return (
    <span
      style={{
        flex: 'none',
        width: 40,
        height: 23,
        borderRadius: 999,
        background: on ? BLUE : '#CBD5E4',
        position: 'relative',
        transition: 'background .2s',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2.5,
          left: on ? 19 : 3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,.3)',
          transition: 'left .2s cubic-bezier(.4,0,.2,1)',
        }}
      />
    </span>
  );
}
