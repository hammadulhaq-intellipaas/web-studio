'use client';

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

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

const TOOLTIP_HOVER_DELAY = 500;
const TOOLTIP_WIDTH = 260;
const TOOLTIP_MARGIN = 8;

/**
 * Small "i" info icon that reveals longer explainer copy in a bubble — on a
 * sustained hover (desktop), on tap (touch, toggled by tapping again or
 * elsewhere), or on keyboard focus. Renders nothing when `text` is empty, so no
 * icon appears for add-ons without tooltip copy.
 *
 * The bubble is portaled to `document.body` and positioned via
 * `getBoundingClientRect`, re-measured on scroll/resize while open — the
 * configurator's columns scroll independently (`[data-cfg-col]`), so a
 * position computed only once on open would drift from the icon.
 */
export function InfoTooltip({ text, label }: { text: string | null | undefined; label: string }) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  const clearHoverTimer = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  const updatePosition = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const width = Math.min(TOOLTIP_WIDTH, window.innerWidth - TOOLTIP_MARGIN * 2);
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(TOOLTIP_MARGIN, Math.min(left, window.innerWidth - width - TOOLTIP_MARGIN));
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placement: 'top' | 'bottom' = spaceAbove > 140 && spaceAbove > spaceBelow ? 'top' : 'bottom';
    const top = placement === 'top' ? rect.top - TOOLTIP_MARGIN : rect.bottom + TOOLTIP_MARGIN;
    setPos({ top, left, placement });
  }, []);

  const openTooltip = useCallback(() => {
    updatePosition();
    setOpen(true);
  }, [updatePosition]);

  const closeTooltip = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onReposition = () => updatePosition();
    const onOutside = (ev: PointerEvent) => {
      const target = ev.target as Node;
      if (btnRef.current?.contains(target) || bubbleRef.current?.contains(target)) return;
      closeTooltip();
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        closeTooltip();
        btnRef.current?.focus();
      }
    };
    // capture:true so this also catches scroll on the configurator's internal
    // [data-cfg-col] scroller, not just window-level scroll.
    window.addEventListener('scroll', onReposition, { capture: true, passive: true });
    window.addEventListener('resize', onReposition);
    document.addEventListener('pointerdown', onOutside, true);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
      document.removeEventListener('pointerdown', onOutside, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, updatePosition, closeTooltip]);

  useEffect(() => clearHoverTimer, []);

  if (!text) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        onClick={(ev) => {
          // Also fires for touch taps and keyboard Enter/Space — all three
          // should toggle the bubble; on desktop, hover already governs
          // open/close, so an incidental toggle-closed on click is harmless.
          ev.stopPropagation();
          setOpen((wasOpen) => {
            if (!wasOpen) updatePosition();
            return !wasOpen;
          });
        }}
        onPointerDown={(ev) => ev.stopPropagation()}
        onMouseEnter={(ev) => {
          ev.stopPropagation();
          setHighlighted(true);
          clearHoverTimer();
          hoverTimer.current = setTimeout(openTooltip, TOOLTIP_HOVER_DELAY);
        }}
        onMouseLeave={(ev) => {
          ev.stopPropagation();
          setHighlighted(false);
          clearHoverTimer();
          closeTooltip();
        }}
        onFocus={(ev) => {
          ev.stopPropagation();
          setHighlighted(true);
          openTooltip();
        }}
        onBlur={(ev) => {
          ev.stopPropagation();
          setHighlighted(false);
          closeTooltip();
        }}
        style={{
          flex: 'none',
          width: 15,
          height: 15,
          borderRadius: '50%',
          border: `1.3px solid ${highlighted || open ? BLUE : MUTED2}`,
          color: highlighted || open ? BLUE : MUTED2,
          background: 'transparent',
          fontFamily: 'Georgia, serif',
          fontSize: 10,
          fontStyle: 'italic',
          fontWeight: 700,
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          cursor: 'pointer',
          transition: 'color .15s, border-color .15s',
        }}
      >
        i
      </button>
      {open && pos && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={bubbleRef}
              id={tooltipId}
              role="tooltip"
              style={{
                position: 'fixed',
                top: pos.top,
                left: pos.left,
                transform: pos.placement === 'top' ? 'translateY(-100%)' : undefined,
                width: Math.min(TOOLTIP_WIDTH, typeof window !== 'undefined' ? window.innerWidth - TOOLTIP_MARGIN * 2 : TOOLTIP_WIDTH),
                background: '#ffffff',
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                boxShadow: '0 8px 24px rgba(15,36,64,.16)',
                padding: '10px 12px',
                fontSize: 12,
                lineHeight: 1.5,
                color: BODY,
                zIndex: 9999,
              }}
            >
              {text}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
