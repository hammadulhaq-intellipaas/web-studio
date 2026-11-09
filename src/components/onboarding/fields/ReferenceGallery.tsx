'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BLUE, BORDER, INK, MUTED } from '@/components/funnel/ui';
import shots from '@/lib/onboarding/gallery-shots.json';
import type { Locale } from '@/lib/types';
import type { FieldOption } from '@/lib/onboarding/types';
import { loc } from '@/lib/onboarding/types';

interface Shot {
  src: string;
  width: number;
  height: number;
  /** The page went on below the picture. */
  cut?: boolean;
}
interface GalleryPage {
  name: string | null;
  url: string;
  laptop: Shot;
  phone: Shot | null;
}
const SITES = (shots as unknown as { sites: Record<string, GalleryPage[]> }).sites;

type Device = 'laptop' | 'phone';

interface Props {
  options: FieldOption[];
  locale: Locale;
  /** The site opened first; null opens the overview of all sites. Read once, on opening. */
  initial: string | null;
  selected: string[];
  /** How many more examples the client can still choose. */
  room: number;
  /** How many examples the form asks for; null: no limit and no counter (an older form definition). */
  count: number | null;
  chosenTotal: number;
  /** The form is confirmed: looking only. */
  disabled: boolean;
  onToggle: (value: string) => void;
  onClose: () => void;
  /** Keeps the address in step with what is open, so the browser's back button works. */
  onNavigate: (slug: string | null) => void;
}

const label = (o: FieldOption, key: string, locale: Locale) => loc(o as unknown as Record<string, unknown>, key, locale);

/**
 * The gallery of our example websites, full screen over the form. An overview of every site,
 * and for each one its pages as pictures, on a laptop and a phone, with a link to the real
 * website. Ticking a site here is the same tick as on the form's card.
 */
export function ReferenceGallery({ options, locale, initial, selected, room, count, chosenTotal, disabled, onToggle, onClose, onNavigate }: Props) {
  const t = useTranslations('onboarding.fields.gallery');
  const [slug, setSlug] = useState<string | null>(initial);
  const [pageIndex, setPageIndex] = useState(0);
  const [device, setDevice] = useState<Device>('laptop');
  const backRef = useRef<HTMLButtonElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    backRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const open = useCallback(
    (next: string | null) => {
      setSlug(next);
      setPageIndex(0);
      onNavigate(next);
      viewerRef.current?.scrollTo({ top: 0 });
    },
    [onNavigate],
  );

  const index = slug ? options.findIndex((o) => o.value === slug) : -1;
  const site = index >= 0 ? options[index] : null;
  const step = useCallback(
    (by: number) => {
      if (index < 0) return;
      open(options[(index + by + options.length) % options.length].value);
    },
    [index, open, options],
  );

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        if (slug) open(null);
        else onClose();
      } else if (slug && ev.key === 'ArrowRight') step(1);
      else if (slug && ev.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slug, open, onClose, step]);

  const pages = site ? SITES[site.value] ?? [] : [];
  const page = pages[Math.min(pageIndex, pages.length - 1)];
  const shot = page ? (device === 'phone' ? page.phone ?? page.laptop : page.laptop) : null;
  const showsPhone = device === 'phone' && !!page?.phone;

  const choose = (value: string) => {
    const isChosen = selected.includes(value);
    if (disabled || (!isChosen && room <= 0)) return;
    onToggle(value);
  };
  const chooseButton = (value: string, compact = false) => {
    if (disabled) return null;
    const isChosen = selected.includes(value);
    const blocked = !isChosen && room <= 0;
    return (
      <button
        type="button"
        data-testid={`gallery-choose-${value}`}
        aria-pressed={isChosen}
        disabled={blocked}
        title={blocked && count !== null ? t('counter', { n: chosenTotal, count }) : undefined}
        onClick={(ev) => {
          ev.stopPropagation();
          choose(value);
        }}
        style={{
          fontFamily: 'inherit',
          cursor: blocked ? 'not-allowed' : 'pointer',
          fontSize: compact ? 13 : 14,
          fontWeight: 700,
          padding: compact ? '7px 12px' : '10px 16px',
          borderRadius: 10,
          border: `1.5px solid ${isChosen ? BLUE : BORDER}`,
          background: isChosen ? BLUE : '#ffffff',
          color: isChosen ? '#ffffff' : blocked ? '#A8B2C3' : INK,
          whiteSpace: 'nowrap',
        }}
      >
        {isChosen ? `✓ ${t('chosen')}` : t('choose')}
      </button>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('title')}
      data-testid="reference-gallery"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#F5F7FB', display: 'flex', flexDirection: 'column' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          background: '#ffffff',
          borderBottom: `1px solid ${BORDER}`,
          flexWrap: 'wrap',
        }}
      >
        <button
          ref={backRef}
          type="button"
          data-testid="gallery-back"
          onClick={() => (slug ? open(null) : onClose())}
          style={{
            fontFamily: 'inherit',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 700,
            padding: '9px 14px',
            borderRadius: 10,
            border: `1.5px solid ${BORDER}`,
            background: '#ffffff',
            color: INK,
          }}
        >
          ← {slug ? t('all') : t('back')}
        </button>
        <div style={{ fontSize: 16, fontWeight: 800, color: INK, flex: 1, minWidth: 160 }}>{t('title')}</div>
        {(disabled || count !== null) && (
          <div data-testid="gallery-counter" style={{ fontSize: 13, fontWeight: 700, color: count !== null && chosenTotal >= count ? BLUE : MUTED }}>
            {disabled ? t('viewOnly') : t('counter', { n: chosenTotal, count: count ?? 0 })}
          </div>
        )}
        {slug && (
          <button
            type="button"
            data-testid="gallery-close"
            onClick={onClose}
            style={{ fontFamily: 'inherit', cursor: 'pointer', fontSize: 13, fontWeight: 700, border: 'none', background: 'none', color: BLUE }}
          >
            {t('back')}
          </button>
        )}
      </div>

      <div ref={viewerRef} style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {!site ? (
          <Overview options={options} locale={locale} selected={selected} onOpen={open} chooseButton={chooseButton} intro={t('intro')} viewLabel={t('viewLayouts')} />
        ) : (
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 16px 40px' }} data-testid={`gallery-site-${site.value}`}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.4, margin: 0, color: INK }}>{label(site, 'label', locale)}</h2>
                <div style={{ fontSize: 14, color: MUTED, marginTop: 2 }}>{label(site, 'hint', locale)}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {chooseButton(site.value)}
                {site.url && (
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="gallery-visit"
                    style={{ fontSize: 14, fontWeight: 700, color: BLUE, textDecoration: 'none', padding: '10px 4px' }}
                  >
                    {t('visit')} ↗
                  </a>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <div role="tablist" aria-label={label(site, 'label', locale)} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                {pages.map((p, i) => (
                  <button
                    key={p.url + i}
                    type="button"
                    role="tab"
                    aria-selected={i === pageIndex}
                    data-testid={`gallery-page-${i}`}
                    onClick={() => {
                      setPageIndex(i);
                      viewerRef.current?.scrollTo({ top: 0 });
                    }}
                    style={tabStyle(i === pageIndex)}
                  >
                    {p.name ?? t('homepage')}
                  </button>
                ))}
              </div>
              <div role="group" style={{ display: 'flex', border: `1.5px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden', background: '#ffffff' }}>
                {(['laptop', 'phone'] as const).map((d) => {
                  const unavailable = d === 'phone' && !page?.phone;
                  // What is on screen: a page without a phone picture shows the laptop one.
                  const shown = (showsPhone ? 'phone' : 'laptop') === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      data-testid={`gallery-device-${d}`}
                      aria-pressed={shown}
                      disabled={unavailable}
                      onClick={() => setDevice(d)}
                      style={{
                        fontFamily: 'inherit',
                        cursor: unavailable ? 'not-allowed' : 'pointer',
                        fontSize: 13,
                        fontWeight: 700,
                        padding: '8px 14px',
                        border: 'none',
                        background: shown ? INK : 'transparent',
                        color: shown ? '#ffffff' : unavailable ? '#A8B2C3' : INK,
                      }}
                    >
                      {t(d)}
                    </button>
                  );
                })}
              </div>
            </div>

            {shot ? (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div
                  data-testid="gallery-picture"
                  style={
                    showsPhone
                      ? { width: 'min(390px, 100%)', border: '10px solid #1B2433', borderRadius: 30, overflow: 'hidden', background: '#ffffff' }
                      : { width: '100%', maxWidth: 1100, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden', background: '#ffffff', boxShadow: '0 8px 24px -16px rgba(16,24,40,.35)' }
                  }
                >
                  {/* Long, already compressed pictures: shown as they are rather than resized again. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={shot.src}
                    src={shot.src}
                    width={shot.width}
                    height={shot.height}
                    alt={`${label(site, 'label', locale)}: ${page?.name ?? t('homepage')} (${t(showsPhone ? 'phone' : 'laptop')})`}
                    style={{ display: 'block', width: '100%', height: 'auto' }}
                  />
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 14, color: MUTED, textAlign: 'center', padding: '40px 0' }}>{t('noPictures')}</p>
            )}
            {shot?.cut && <p style={{ fontSize: 13, color: MUTED, textAlign: 'center', margin: '12px 0 0' }}>{t('cut')}</p>}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 24 }}>
              <button type="button" data-testid="gallery-previous" onClick={() => step(-1)} style={tabStyle(false)}>
                ← {t('previous')}
              </button>
              <button type="button" data-testid="gallery-next" onClick={() => step(1)} style={tabStyle(false)}>
                {t('next')} →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    fontFamily: 'inherit',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 700,
    padding: '8px 13px',
    borderRadius: 10,
    border: `1.5px solid ${active ? INK : BORDER}`,
    background: active ? INK : '#ffffff',
    color: active ? '#ffffff' : INK,
  };
}

/** Every site as a tile, under its style group, in the CMS order. */
function Overview({
  options,
  locale,
  selected,
  onOpen,
  chooseButton,
  intro,
  viewLabel,
}: {
  options: FieldOption[];
  locale: Locale;
  selected: string[];
  onOpen: (slug: string) => void;
  chooseButton: (value: string, compact?: boolean) => React.ReactNode;
  intro: string;
  viewLabel: string;
}) {
  const groups: { heading: string; options: FieldOption[] }[] = [];
  for (const o of options) {
    const heading = label(o, 'group', locale);
    const last = groups[groups.length - 1];
    if (last && last.heading === heading) last.options.push(o);
    else groups.push({ heading, options: [o] });
  }
  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 16px 40px' }}>
      <p style={{ fontSize: 14.5, lineHeight: 1.55, color: '#4A5872', margin: '0 0 18px', maxWidth: 760 }}>{intro}</p>
      <div style={{ display: 'grid', gap: 26 }}>
        {groups.map((g) => (
          <section key={g.heading || '_'}>
            {g.heading && (
              <h3 style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: '#7A879B', margin: '0 0 10px' }}>{g.heading}</h3>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
              {g.options.map((o) => {
                const isChosen = selected.includes(o.value);
                return (
                  <div
                    key={o.value}
                    data-testid={`gallery-tile-${o.value}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      background: '#ffffff',
                      borderRadius: 14,
                      overflow: 'hidden',
                      border: `${isChosen ? 2 : 1.5}px solid ${isChosen ? BLUE : BORDER}`,
                    }}
                  >
                    <button
                      type="button"
                      data-testid={`gallery-open-${o.value}`}
                      onClick={() => onOpen(o.value)}
                      aria-label={`${label(o, 'label', locale)}: ${viewLabel}`}
                      style={{ all: 'unset', cursor: 'pointer', display: 'block' }}
                    >
                      {o.image && (
                        <Image
                          src={o.image}
                          alt=""
                          width={960}
                          height={600}
                          sizes="(max-width: 600px) 100vw, 320px"
                          style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: '16 / 10', objectFit: 'cover', borderBottom: `1px solid ${BORDER}` }}
                        />
                      )}
                      <span style={{ display: 'block', padding: '12px 14px 6px' }}>
                        <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: INK }}>{label(o, 'label', locale)}</span>
                        <span style={{ display: 'block', fontSize: 12.5, color: '#7A879B', lineHeight: 1.45, marginTop: 2 }}>{label(o, 'hint', locale)}</span>
                      </span>
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 14px 14px', marginTop: 'auto' }}>
                      <button
                        type="button"
                        onClick={() => onOpen(o.value)}
                        style={{
                          fontFamily: 'inherit',
                          cursor: 'pointer',
                          border: 'none',
                          background: 'none',
                          padding: 0,
                          fontSize: 13,
                          fontWeight: 700,
                          color: BLUE,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {viewLabel} →
                      </button>
                      {chooseButton(o.value, true)}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
