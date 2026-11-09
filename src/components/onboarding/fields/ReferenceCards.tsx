'use client';

import Image from 'next/image';
import { useCallback, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { BLUE, BORDER, INK } from '@/components/funnel/ui';
import type { Locale } from '@/lib/types';
import type { FieldOption, OnbField } from '@/lib/onboarding/types';
import { loc } from '@/lib/onboarding/types';
import { ReferenceGallery } from './ReferenceGallery';
import { DANGER } from './styles';

interface Props {
  field: OnbField;
  locale: Locale;
  invalid: boolean;
  value: string[];
  onChange: (v: string[]) => void;
  /** How many more design examples the client can choose (all three example questions together). */
  room: number;
  /** How many examples the form asks for (null: no limit, an older form definition), and how many are chosen. */
  count: number | null;
  chosenTotal: number;
  /** A confirmed form: the cards and the gallery can be looked at, not changed. */
  disabled: boolean;
}

/** Options in their CMS order, grouped under their (localised) group heading. */
function grouped(options: FieldOption[], locale: Locale): { heading: string; options: FieldOption[] }[] {
  const groups: { heading: string; options: FieldOption[] }[] = [];
  for (const o of options) {
    const heading = loc(o as unknown as Record<string, unknown>, 'group', locale);
    const last = groups[groups.length - 1];
    if (last && last.heading === heading) last.options.push(o);
    else groups.push({ heading, options: [o] });
  }
  return groups;
}

/**
 * The gallery's place in the address: "#gallery" for the overview, "#gallery=graza" for one site.
 * A hash and not a query parameter: Next.js treats a changed query as another page and, on the
 * back button, would rebuild the form from its first load and drop a tick not yet saved.
 */
const HASH = /^#gallery(?:=([a-z0-9-]*))?$/;
/** Fired after the gallery changes the address itself (pushState does not fire popstate). */
const CHANGED = 'onb-gallery-change';
const CLOSED = '\u0000closed';

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener('hashchange', onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener('hashchange', onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}
/** '' for the overview, a slug for one site, CLOSED when the address has no gallery. */
function snapshot(): string {
  const m = HASH.exec(window.location.hash);
  return m ? (m[1] ?? '') : CLOSED;
}
const serverSnapshot = () => CLOSED;
const announce = () => window.dispatchEvent(new Event(CHANGED));

function urlWith(slug: string | null | undefined): string {
  const base = window.location.pathname + window.location.search;
  if (slug === undefined) return base;
  return slug ? `${base}#gallery=${slug}` : `${base}#gallery`;
}

/**
 * A multi-select shown as website cards: a screenshot, the name and a one-line hint. "View
 * layouts" opens the gallery over the form, with its own address so the browser's back button
 * returns to the form; a tick in the gallery is the same tick as on the card. Same value as
 * checkboxes (a list of option values, in the order ticked), so validation, the PDF and the
 * brief treat it like any other multi-select.
 */
export function ReferenceCards({ field, locale, invalid, value, onChange, room, count, chosenTotal, disabled }: Props) {
  const t = useTranslations('onboarding.fields');
  // The address says whether the gallery is open, so the browser's back button closes it and a
  // shared link (#gallery=graza) opens it. undefined: closed; null: the overview; a slug: that site.
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const gallery = raw === CLOSED ? undefined : raw || null;

  const toggle = useCallback(
    (v: string) => {
      if (disabled) return;
      if (value.includes(v)) onChange(value.filter((x) => x !== v));
      else if (room > 0) onChange([...value, v]);
    },
    [disabled, onChange, room, value],
  );

  const openGallery = (slug: string | null) => {
    // Keep the form's own history entry (its step) and add the gallery on top of it. The flag
    // says this entry is ours, so closing may go back to the form.
    window.history.pushState(
      {
        ...(window.history.state ?? {}),
        gallery: slug ?? '',
        galleryPushed: true,
      },
      '',
      urlWith(slug),
    );
    announce();
  };
  // Moving between sites inside the gallery only updates the address; the gallery keeps its own
  // place, so this does not announce a change.
  const navigate = useCallback((slug: string | null) => {
    window.history.replaceState({ ...(window.history.state ?? {}), gallery: slug ?? '' }, '', urlWith(slug));
  }, []);
  const close = useCallback(() => {
    const state = window.history.state as {
      gallery?: string;
      galleryPushed?: boolean;
    } | null;
    if (state?.galleryPushed) {
      window.history.back();
    } else {
      // Opened straight from an address: there is no form entry to go back to.
      window.history.replaceState({ ...(state ?? {}), gallery: undefined, galleryPushed: undefined }, '', urlWith(undefined));
      announce();
    }
  }, []);

  const full = count !== null && room <= 0;

  return (
    <div role="group" data-testid={`f-${field.id}`} style={{ display: 'grid', gap: 22 }}>
      <div>
        <button
          type="button"
          data-testid="gallery-open"
          onClick={() => openGallery(null)}
          style={{
            fontFamily: 'inherit',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 700,
            padding: '10px 16px',
            borderRadius: 10,
            border: `1.5px solid ${BLUE}`,
            background: '#ffffff',
            color: BLUE,
          }}
        >
          {t('gallery.open')} →
        </button>
        {!disabled && full && (
          <div
            data-testid="examples-full"
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: '#4A5872',
              marginTop: 8,
            }}
          >
            {t('examples.full', { count: chosenTotal })}
          </div>
        )}
      </div>
      {grouped(field.options, locale).map((group) => (
        <div key={group.heading || '_'}>
          {group.heading && (
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                color: '#7A879B',
                marginBottom: 10,
              }}
            >
              {group.heading}
            </div>
          )}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 14,
            }}
          >
            {group.options.map((o) => {
              const selected = value.includes(o.value);
              const blocked = !selected && (full || disabled);
              const label = loc(o as unknown as Record<string, unknown>, 'label', locale);
              const hint = loc(o as unknown as Record<string, unknown>, 'hint', locale);
              return (
                <div
                  key={o.value}
                  className={blocked ? undefined : 'hov-blue-border'}
                  data-blocked={blocked || undefined}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 14,
                    overflow: 'hidden',
                    background: '#ffffff',
                    border: `${selected ? 2 : 1.5}px solid ${selected ? BLUE : invalid ? DANGER : BORDER}`,
                    transition: 'border-color .15s',
                  }}
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    aria-disabled={blocked || undefined}
                    aria-label={label}
                    data-testid={`opt-${field.id}-${o.value}`}
                    onClick={() => toggle(o.value)}
                    style={{
                      all: 'unset',
                      cursor: blocked ? 'not-allowed' : 'pointer',
                      display: 'block',
                      opacity: blocked && !disabled ? 0.55 : 1,
                    }}
                  >
                    {o.image && (
                      <Image
                        src={o.image}
                        alt=""
                        width={960}
                        height={600}
                        sizes="(max-width: 600px) 100vw, 300px"
                        style={{
                          display: 'block',
                          width: '100%',
                          height: 'auto',
                          aspectRatio: '16 / 10',
                          objectFit: 'cover',
                          borderBottom: `1px solid ${BORDER}`,
                        }}
                      />
                    )}
                    <span style={{ display: 'block', padding: '12px 14px 4px' }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 14.5,
                          fontWeight: 700,
                          color: INK,
                        }}
                      >
                        {label}
                      </span>
                      {hint && (
                        <span
                          style={{
                            display: 'block',
                            fontSize: 12.5,
                            color: '#7A879B',
                            lineHeight: 1.45,
                            marginTop: 2,
                          }}
                        >
                          {hint}
                        </span>
                      )}
                    </span>
                  </button>
                  {selected && (
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        background: BLUE,
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: 800,
                      }}
                    >
                      ✓
                    </span>
                  )}
                  <button
                    type="button"
                    data-testid={`opt-${field.id}-${o.value}-link`}
                    onClick={() => openGallery(o.value)}
                    style={{
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      textAlign: 'left',
                      border: 'none',
                      background: 'none',
                      padding: '4px 14px 12px',
                      fontSize: 13,
                      fontWeight: 600,
                      color: BLUE,
                      marginTop: 'auto',
                    }}
                  >
                    {t('gallery.viewLayouts')} →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {/* Rendered straight into the page body: the form's cards animate in with a transform, and
          a full-screen layer inside one would be held within that card instead of the window. */}
      {gallery !== undefined &&
        createPortal(
          <ReferenceGallery
            options={field.options}
            locale={locale}
            initial={gallery}
            selected={value}
            room={room}
            count={count}
            chosenTotal={chosenTotal}
            disabled={disabled}
            onToggle={toggle}
            onClose={close}
            onNavigate={navigate}
          />,
          document.body,
        )}
    </div>
  );
}
