'use client';

import { useEffect, useRef, useState } from 'react';
import type { Locale } from '@/lib/types';
import type { FieldError } from '@/lib/onboarding/logic';
import type { OnbField, RepeaterRow } from '@/lib/onboarding/types';
import { MUTED } from '@/components/funnel/ui';
import { newRowId, RepeaterInput } from './RepeaterInput';
import { subtleButton } from './styles';

const TEXT = {
  de: {
    loading: 'Wir lesen die Seiten aus dem Menü Ihrer Website …',
    found: (n: number) => `Wir haben ${n} ${n === 1 ? 'Seite' : 'Seiten'} in Ihrem Menü gefunden. Alle bleiben, bis Sie etwas anderes wählen.`,
    none: 'Wir konnten das Menü Ihrer Website nicht lesen. Bitte tragen Sie Ihre Seiten selbst ein.',
    reload: 'Seiten erneut von meiner Website holen',
  },
  en: {
    loading: 'We are reading the pages in the menu of your website …',
    found: (n: number) => `We found ${n} ${n === 1 ? 'page' : 'pages'} in your menu. They all stay unless you choose otherwise.`,
    none: 'We could not read the menu of your website. Please add your pages yourself.',
    reload: 'Get the pages from my website again',
  },
};

const blank = (rows: RepeaterRow[]) => rows.every((r) => Object.entries(r).every(([k, v]) => k === '_id' || v == null || String(v).trim() === ''));

/**
 * Form B's page list: the rows start as the pages in the menu of the client's current website
 * (read on the server, no AI), each marked "keep", so the owner only changes the exceptions.
 * Rows the client already filled in are never replaced without them asking.
 */
export function SiteMenuPages({
  field,
  locale,
  rows,
  errors,
  siteUrl,
  formId,
  disabled,
  onChange,
}: {
  field: OnbField;
  locale: Locale;
  rows: RepeaterRow[];
  errors: FieldError[];
  siteUrl: string;
  formId: string;
  disabled?: boolean;
  onChange: (rows: RepeaterRow[]) => void;
}) {
  const t = TEXT[locale === 'en' ? 'en' : 'de'];
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'done'; count: number }>({ status: 'idle', count: 0 });
  const tried = useRef<string | null>(null);

  const load = async () => {
    if (!siteUrl) return;
    tried.current = siteUrl;
    setState({ status: 'loading', count: 0 });
    try {
      const res = await fetch(`/api/onboarding/${formId}/site-menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: siteUrl }),
      });
      const out = res.ok ? ((await res.json()) as { pages?: { name: string; path: string }[] }) : { pages: [] };
      const pages = out.pages ?? [];
      if (pages.length) onChange(pages.map((p) => ({ _id: newRowId(), page: p.name, path: p.path, decision: 'keep' })));
      setState({ status: 'done', count: pages.length });
    } catch {
      setState({ status: 'done', count: 0 });
    }
  };

  // Once per address: when the screen opens with an empty list and a website to read.
  useEffect(() => {
    if (disabled || !siteUrl || tried.current === siteUrl || !blank(rows)) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteUrl, disabled]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {state.status === 'loading' && <div style={{ fontSize: 13, color: MUTED }} data-testid={`menu-loading-${field.id}`}>{t.loading}</div>}
      {state.status === 'done' && (
        <div style={{ fontSize: 13, color: MUTED }} data-testid={`menu-result-${field.id}`}>
          {state.count ? t.found(state.count) : t.none}
        </div>
      )}
      <RepeaterInput field={field} locale={locale} rows={rows} errors={errors} onChange={onChange} />
      {siteUrl && !disabled && state.status !== 'loading' && (
        <button type="button" onClick={() => void load()} style={{ ...subtleButton, alignSelf: 'flex-start', fontSize: 12.5 }} data-testid={`menu-reload-${field.id}`}>
          {t.reload}
        </button>
      )}
    </div>
  );
}
