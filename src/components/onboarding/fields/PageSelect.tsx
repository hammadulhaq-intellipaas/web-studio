'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BLUE, BORDER, INK, MUTED } from '@/components/funnel/ui';
import type { Locale } from '@/lib/types';
import { MAX_ENTRY_CHARS } from '@/lib/onboarding/logic';
import type { OnbField } from '@/lib/onboarding/types';
import { loc } from '@/lib/onboarding/types';
import { inputStyle } from './styles';

interface Choice {
  name: string;
  group: 'common' | 'services';
}

const norm = (s: string) => s.trim().toLocaleLowerCase();

/**
 * A searchable multi-select for the client's pages: type to filter, click or Enter to add, the
 * cross on a chosen page removes it. The list offers common pages (the field's options) and the
 * client's own services from the question above; anything else can be typed and added as is.
 * The answer is the list of page names, in the order added.
 */
export function PageSelect({
  field,
  locale,
  invalid,
  inputId,
  value,
  services,
  onChange,
}: {
  field: OnbField;
  locale: Locale;
  invalid: boolean;
  inputId: string;
  value: string[];
  /** The client's own services (lines of `options_from`), offered as pages. */
  services: string[];
  onChange: (v: string[]) => void;
}) {
  const t = useTranslations('onboarding.fields.pages');
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const allowCustom = field.config.allow_custom !== false;

  const chosen = useMemo(() => new Set(value.map(norm)), [value]);
  const choices = useMemo<Choice[]>(() => {
    const seen = new Set<string>();
    const out: Choice[] = [];
    const push = (name: string, group: Choice['group']) => {
      const key = norm(name);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push({ name: name.trim(), group });
    };
    for (const o of field.options) push(loc(o as unknown as Record<string, unknown>, 'label', locale), 'common');
    for (const s of services) push(s, 'services');
    return out;
  }, [field.options, locale, services]);

  const q = norm(query);
  const matches = choices.filter((c) => !chosen.has(norm(c.name)) && (!q || norm(c.name).includes(q)));
  const exact = choices.some((c) => norm(c.name) === q) || chosen.has(q);
  const typed = query.trim().slice(0, MAX_ENTRY_CHARS);
  // The typed name as its own entry, after the matches: Enter takes the first match ("kont" adds
  // "Kontakt"), and only with no match at all the typed text itself.
  const rows: { name: string; custom: boolean }[] = [
    ...matches.map((m) => ({ name: m.name, custom: false })),
    ...(allowCustom && typed && !exact ? [{ name: typed, custom: true }] : []),
  ];
  const servicesLabel = loc(field.config as unknown as Record<string, unknown>, 'options_from_label', locale) || t('services');

  const add = (name: string) => {
    const clean = name.trim().slice(0, MAX_ENTRY_CHARS);
    if (!clean || chosen.has(norm(clean))) return;
    onChange([...value, clean]);
    setQuery('');
    setActive(0);
    inputRef.current?.focus();
  };
  const remove = (name: string) => onChange(value.filter((v) => v !== name));

  const onKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(rows.length - 1, 0)));
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      const row = open ? rows[active] : undefined;
      if (row) add(row.name);
      else if (allowCustom && typed) add(typed);
    } else if (ev.key === 'Escape') {
      setOpen(false);
    } else if (ev.key === 'Backspace' && !query && value.length) {
      remove(value[value.length - 1]);
    }
  };

  // A group heading above the first row of each group (the typed entry has none).
  const headings: (string | null)[] = [];
  for (const [i, row] of rows.entries()) {
    const choice = row.custom ? null : choices.find((c) => c.name === row.name);
    const group = choice ? (choice.group === 'services' ? servicesLabel : t('common')) : null;
    const previous = i > 0 && !rows[i - 1].custom ? choices.find((c) => c.name === rows[i - 1].name)?.group : undefined;
    headings.push(group && (!choice || previous !== choice.group) ? group : null);
  }

  return (
    <div style={{ position: 'relative' }} data-testid={`ms-${field.id}`}>
      {value.length > 0 && (
        <ul aria-label={t('chosen', { n: value.length })} style={{ listStyle: 'none', margin: '0 0 8px', padding: 0, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {value.map((name, i) => (
            <li
              key={`${i}:${name}`}
              data-testid={`ms-chip-${field.id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13.5,
                fontWeight: 600,
                color: INK,
                background: '#EEF3FF',
                border: `1px solid #D3DFFB`,
                borderRadius: 8,
                padding: '5px 6px 5px 10px',
                maxWidth: '100%',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
              <button
                type="button"
                aria-label={t('remove', { name })}
                onClick={() => remove(name)}
                style={{ fontFamily: 'inherit', cursor: 'pointer', border: 'none', background: 'none', color: MUTED, fontSize: 15, lineHeight: 1, padding: '0 4px' }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={inputRef}
        id={inputId}
        data-testid={`f-${field.id}`}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && rows[active] ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        autoComplete="off"
        value={query}
        maxLength={MAX_ENTRY_CHARS}
        placeholder={loc(field as unknown as Record<string, unknown>, 'placeholder', locale) || t('search')}
        onChange={(ev) => {
          setQuery(ev.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        style={inputStyle(invalid, { maxWidth: 480 })}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          data-testid={`ms-list-${field.id}`}
          style={{
            position: 'absolute',
            zIndex: 20,
            left: 0,
            top: '100%',
            marginTop: 4,
            width: 'min(480px, 100%)',
            maxHeight: 300,
            overflowY: 'auto',
            listStyle: 'none',
            padding: 6,
            background: '#ffffff',
            border: `1.5px solid ${BORDER}`,
            borderRadius: 10,
            boxShadow: '0 12px 28px -12px rgba(16,24,40,.3)',
          }}
        >
          {rows.length === 0 && allowCustom && <li style={{ fontSize: 13, color: MUTED, padding: '8px 10px' }}>{t('noMatch')}</li>}
          {rows.map((row, i) => {
            const heading = headings[i];
            return (
              <li key={`${row.custom ? '+' : ''}${row.name}`} role="presentation">
                {heading && (
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: '#7A879B', padding: '8px 10px 4px' }}>
                    {heading}
                  </div>
                )}
                <div
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  data-testid={row.custom ? `ms-add-${field.id}` : `ms-option-${field.id}`}
                  onMouseDown={(ev) => ev.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => add(row.name)}
                  style={{
                    cursor: 'pointer',
                    fontSize: 14,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: i === active ? '#EEF3FF' : 'transparent',
                    color: row.custom ? BLUE : INK,
                    fontWeight: row.custom ? 700 : 500,
                  }}
                >
                  {row.custom ? t('add', { name: row.name }) : row.name}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
