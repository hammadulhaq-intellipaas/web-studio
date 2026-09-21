'use client';

import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/types';
import type { OnbScreen } from '@/lib/onboarding/types';
import { loc } from '@/lib/onboarding/types';
import { BLUE, BORDER, INK, MUTED } from '@/components/funnel/ui';

/**
 * Numbered dots with labels and connecting bars — one per screen, the closing node being
 * "Review". Done nodes are clickable (jumping back is always allowed); a node beyond the
 * furthest screen reached is not. On phones the row collapses to "Step n of N · Title".
 */
export function Stepper({
  steps,
  activeIndex,
  maxReached,
  locale,
  onSelect,
}: {
  steps: OnbScreen[];
  activeIndex: number;
  maxReached: number;
  locale: Locale;
  onSelect: (index: number) => void;
}) {
  const t = useTranslations('onboarding.shell');
  const active = steps[activeIndex];

  return (
    <>
      <ol className="onb-stepper" data-testid="onb-stepper" style={{ listStyle: 'none', margin: '0 0 30px', padding: 0, display: 'flex', alignItems: 'flex-start' }}>
        {steps.map((step, i) => {
          const done = i < activeIndex;
          const isActive = i === activeIndex;
          const reachable = i <= maxReached;
          const label = loc(step as unknown as Record<string, unknown>, 'short', locale) || loc(step as unknown as Record<string, unknown>, 'title', locale);
          return (
            <li key={step.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', minWidth: 0 }}>
              {i > 0 && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: 14,
                    right: '50%',
                    width: '100%',
                    height: 2,
                    background: i <= activeIndex ? BLUE : BORDER,
                    zIndex: 0,
                    transition: 'background .3s',
                  }}
                />
              )}
              <button
                type="button"
                data-testid={`step-${step.id}`}
                aria-current={isActive ? 'step' : undefined}
                disabled={!reachable}
                onClick={() => reachable && onSelect(i)}
                title={label}
                style={{
                  fontFamily: 'inherit',
                  cursor: reachable ? 'pointer' : 'default',
                  position: 'relative',
                  zIndex: 1,
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  border: `2px solid ${done || isActive ? BLUE : BORDER}`,
                  background: done ? BLUE : '#ffffff',
                  color: done ? '#ffffff' : isActive ? BLUE : MUTED,
                  fontSize: 12.5,
                  fontWeight: 800,
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: isActive ? '0 0 0 4px #E8F0FF' : 'none',
                  transition: 'all .2s',
                  padding: 0,
                }}
              >
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M5 13l4.5 4.5L19 8" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  i + 1
                )}
              </button>
              <span
                style={{
                  marginTop: 7,
                  fontSize: 11.5,
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? INK : done ? '#4A5872' : MUTED,
                  textAlign: 'center',
                  lineHeight: 1.25,
                  maxWidth: 96,
                  padding: '0 4px',
                }}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="onb-stepper-compact" data-testid="onb-stepper-compact" style={{ display: 'none', marginBottom: 18, fontSize: 13, fontWeight: 700, color: MUTED }}>
        {t('stepOf', { num: activeIndex + 1, total: steps.length })}
        {active && <span style={{ color: INK }}> · {loc(active as unknown as Record<string, unknown>, 'title', locale)}</span>}
      </div>
    </>
  );
}
