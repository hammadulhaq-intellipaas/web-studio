'use client';

import { useId, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { card, BLUE, INK, MUTED } from './ui';

/**
 * A collapsible top-level category card for the configurator's extras stack.
 * Open by default; collapse state is local (not persisted). When collapsed it
 * surfaces how many add-ons inside are selected, so a folded section never
 * hides a choice the user already made.
 */
export function CategorySection({
  title,
  note,
  selectedCount,
  defaultOpen = true,
  children,
}: {
  title: string;
  note?: string | null;
  selectedCount: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations('configurator');
  const [open, setOpen] = useState(defaultOpen);
  const regionId = useId();

  return (
    // flexShrink:0 keeps the card at its natural height inside the flex-column
    // scroller; without it a flex item is free to shrink and (with overflow) would
    // clip its own contents. The column scrolls, the section does not.
    <section style={{ ...card, padding: 0, flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={regionId}
        aria-label={open ? t('catCollapse') : t('catExpand')}
        className="hov-fade"
        style={{
          fontFamily: 'inherit',
          cursor: 'pointer',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'none',
          border: 'none',
          textAlign: 'left',
          padding: '18px 26px',
        }}
      >
        <span
          style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}
        >
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3, color: INK }}>{title}</span>
          {!open && selectedCount > 0 && (
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                letterSpacing: 0.3,
                background: '#EDF3FF',
                color: BLUE,
                borderRadius: 999,
                padding: '2px 9px',
              }}
            >
              {t('catSelectedCount', { count: selectedCount })}
            </span>
          )}
        </span>
        <span
          className="cat-chevron"
          aria-hidden
          style={{ flex: 'none', color: MUTED, fontSize: 13, transform: open ? 'none' : 'rotate(-90deg)' }}
        >
          ▾
        </span>
      </button>
      <div id={regionId} hidden={!open} style={{ padding: '0 26px 24px' }}>
        {note && (
          <div style={{ fontSize: 12.5, color: MUTED, margin: '-4px 0 14px', lineHeight: 1.5 }}>{note}</div>
        )}
        {children}
      </div>
    </section>
  );
}
