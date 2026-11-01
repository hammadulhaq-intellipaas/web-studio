import { BORDER, INK, MUTED } from './funnel/tokens';

/**
 * The DE / EN switch as the site shows it: two pills, the active one dark. Only the look; the
 * caller decides what a switch does (the site changes its route, the review page its texts).
 */
export function LanguagePills({ value, onChange }: { value: 'de' | 'en'; onChange: (locale: 'de' | 'en') => void }) {
  const pill = (target: 'de' | 'en') => {
    const active = value === target;
    return (
      <button
        key={target}
        type="button"
        onClick={() => onChange(target)}
        aria-label={target === 'de' ? 'Deutsch' : 'English'}
        aria-pressed={active}
        style={{
          fontFamily: 'inherit',
          cursor: 'pointer',
          border: 'none',
          padding: '5px 10px',
          fontSize: 11.5,
          fontWeight: 800,
          letterSpacing: 0.5,
          background: active ? INK : 'transparent',
          color: active ? '#ffffff' : MUTED,
          transition: 'all .15s',
        }}
      >
        {target.toUpperCase()}
      </button>
    );
  };

  return (
    <span
      data-testid="language-toggle"
      className="lang-toggle"
      style={{
        display: 'inline-flex',
        border: `1px solid ${BORDER}`,
        borderRadius: 999,
        overflow: 'hidden',
        flex: 'none',
      }}
    >
      {pill('de')}
      {pill('en')}
    </span>
  );
}
