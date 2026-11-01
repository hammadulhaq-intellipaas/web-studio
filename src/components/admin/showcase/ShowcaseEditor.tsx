'use client';

import Image from 'next/image';
import { useRef, useState, useTransition } from 'react';
import { deleteShowcase, discardShowcaseUploads, saveShowcase, startShowcaseUpload } from '@/app/admin/showcase/actions';
import { ShowcaseCard } from '@/components/showcase/ShowcaseCard';
import {
  EMPTY_SHOWCASE_INPUT,
  IMAGE_TYPES,
  LINE_MAX,
  MAX_IMAGE_BYTES,
  missingForPublish,
  normalizeSiteUrl,
  publicImageUrl,
  QUOTE_MAX,
  siteDomain,
  type ShowcaseInput,
  type ShowcaseItem,
} from '@/lib/showcase/shared';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Locale } from '@/lib/types';

const input = 'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none';
const labelCls = 'mb-1 block text-xs font-bold text-slate-500';
const sectionCls = 'mb-3 text-sm font-bold uppercase tracking-wide text-slate-500';

/** The editable fields of an entry; a new entry starts empty. */
const toInput = (item: ShowcaseItem | null): ShowcaseInput =>
  item
    ? (Object.fromEntries(Object.keys(EMPTY_SHOWCASE_INPUT).map((k) => [k, item[k as keyof ShowcaseInput]])) as ShowcaseInput)
    : { ...EMPTY_SHOWCASE_INPUT };

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

/** One image (the owner's photo or the screenshot): uploaded straight to storage, then shown. */
function ImageField({
  label,
  hint,
  path,
  round,
  testId,
  onChange,
}: {
  label: string;
  hint: string;
  path: string | null;
  round?: boolean;
  testId: string;
  onChange: (path: string | null, uploaded?: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setError(null);
    if (!IMAGE_TYPES[file.type]) return setError('Please use a JPG, PNG or WebP image.');
    if (file.size > MAX_IMAGE_BYTES) return setError('The image is larger than 5 MB.');
    setBusy(true);
    try {
      const started = await startShowcaseUpload(file.type, file.size);
      if (!started.ok || !started.ticket) throw new Error(started.error ?? 'Preparing the upload failed');
      const { ticket } = started;
      const { error: uploadError } = await createSupabaseBrowserClient()
        .storage.from(ticket.bucket)
        .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
      if (uploadError) throw new Error(`Uploading failed: ${uploadError.message}`);
      onChange(ticket.path, ticket.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      if (picker.current) picker.current.value = '';
    }
  };

  return (
    <div data-testid={testId}>
      <span className={labelCls}>{label}</span>
      <div className="flex items-center gap-4">
        <div
          className={`relative flex-none overflow-hidden border border-slate-200 bg-slate-100 ${round ? 'h-16 w-16 rounded-full' : 'h-16 w-[102px] rounded-lg'}`}
        >
          {path && <Image src={publicImageUrl(path)} alt="" fill sizes="102px" className="object-cover object-top" />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => picker.current?.click()}
            disabled={busy}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold hover:border-blue-500 disabled:opacity-60"
          >
            {busy ? 'Uploading…' : path ? 'Replace' : 'Upload'}
          </button>
          {path && !busy && (
            <button type="button" onClick={() => onChange(null)} className="text-sm font-semibold text-slate-500 hover:text-red-600">
              Remove
            </button>
          )}
          <input
            ref={picker}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        </div>
      </div>
      <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      {error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}
    </div>
  );
}

function ShowcaseForm({ item, onClose, onCreated }: { item: ShowcaseItem | null; onClose: () => void; onCreated: (id: string) => void }) {
  const [values, setValues] = useState<ShowcaseInput>(() => toInput(item));
  const [saved, setSaved] = useState<ShowcaseInput>(() => toInput(item));
  const [previewLocale, setPreviewLocale] = useState<Locale>('de');
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // Every image uploaded while this form is open, so the ones never saved can be removed.
  const [uploaded, setUploaded] = useState<string[]>([]);

  const set = <K extends keyof ShowcaseInput>(key: K, value: ShowcaseInput[K]) => setValues((prev) => ({ ...prev, [key]: value }));
  const missing = missingForPublish(values);
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  const setImage = (key: 'photo_path' | 'screenshot_path', path: string | null, fresh?: string) => {
    if (fresh) setUploaded((prev) => [...prev, fresh]);
    set(key, path);
    // An entry cannot stay published without its images.
    if (!path) set('published', false);
  };

  const save = () =>
    startTransition(async () => {
      setMsg(null);
      const result = await saveShowcase(item?.id ?? null, values);
      if (!result.ok || !result.id) {
        setMsg({ ok: false, text: result.error ?? 'Saving failed' });
        return;
      }
      const unused = uploaded.filter((p) => p !== values.photo_path && p !== values.screenshot_path);
      setUploaded([]);
      if (unused.length) void discardShowcaseUploads(unused);
      setSaved(values);
      setMsg({ ok: true, text: 'Saved ✓' });
      if (!item) onCreated(result.id);
    });

  const cancel = () => {
    if (dirty && !confirm('Close without saving your changes?')) return;
    if (uploaded.length) void discardShowcaseUploads(uploaded);
    onClose();
  };

  const remove = () =>
    startTransition(async () => {
      if (!item || !confirm(`Delete the entry for ${item.owner_name || 'this website'}? Its photo and screenshot are deleted too.`)) return;
      const result = await deleteShowcase(item.id);
      if (!result.ok) return setMsg({ ok: false, text: result.error ?? 'Deleting failed' });
      if (uploaded.length) void discardShowcaseUploads(uploaded);
      onClose();
    });

  const pair = (label: string, de: keyof ShowcaseInput, en: keyof ShowcaseInput, opts: { max: number; long?: boolean; placeholder?: [string, string] }) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {(['de', 'en'] as const).map((lang) => {
        const key = lang === 'de' ? de : en;
        const value = String(values[key] ?? '');
        const props = {
          value,
          maxLength: opts.max,
          placeholder: opts.placeholder?.[lang === 'de' ? 0 : 1],
          onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.target.value as never),
          className: input,
          'data-testid': `showcase-${String(key)}`,
        };
        return (
          <Field key={lang} label={`${label} (${lang.toUpperCase()})`}>
            {opts.long ? <textarea rows={3} {...props} /> : <input {...props} />}
            {opts.long && (
              <span className="mt-0.5 block text-right text-xs text-slate-400">
                {value.length}/{opts.max}
              </span>
            )}
          </Field>
        );
      })}
    </div>
  );

  return (
    <div className="grid gap-6 border-t border-slate-100 bg-slate-50/50 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_380px]" data-testid="showcase-form">
      <div className="space-y-6">
        <section>
          <h3 className={sectionCls}>Website</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Website address" hint={values.site_url && !normalizeSiteUrl(values.site_url) ? 'This does not look like a web address.' : undefined}>
              <input value={values.site_url} onChange={(e) => set('site_url', e.target.value)} placeholder="praxis-x.de" className={input} data-testid="showcase-site_url" />
            </Field>
            <Field label="Business name">
              <input value={values.business_name} maxLength={LINE_MAX} onChange={(e) => set('business_name', e.target.value)} placeholder="Praxis X" className={input} data-testid="showcase-business_name" />
            </Field>
          </div>
          <div className="mt-3">
            {pair('What the website is about', 'about_de', 'about_en', {
              max: LINE_MAX,
              placeholder: ['Termine und Leistungen einer Physiotherapie-Praxis', 'Bookings and treatments for a physiotherapy practice'],
            })}
          </div>
        </section>

        <section>
          <h3 className={sectionCls}>Owner</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name" hint="First and last name, as they want to be shown.">
              <input value={values.owner_name} maxLength={LINE_MAX} onChange={(e) => set('owner_name', e.target.value)} className={input} data-testid="showcase-owner_name" />
            </Field>
            <ImageField
              label="Photo"
              hint="A real photo of the owner, square, at least 200 × 200 px. JPG, PNG or WebP, up to 5 MB."
              path={values.photo_path}
              round
              testId="showcase-photo"
              onChange={(path, fresh) => setImage('photo_path', path, fresh)}
            />
          </div>
          <div className="mt-3">{pair('Professional title', 'owner_title_de', 'owner_title_en', { max: LINE_MAX, placeholder: ['Physiotherapeutin', 'Physiotherapist'] })}</div>
        </section>

        <section>
          <h3 className={sectionCls}>Review</h3>
          {pair('Review', 'quote_de', 'quote_en', { max: QUOTE_MAX, long: true })}
          <p className="mt-1 text-xs text-slate-500">
            The owner&apos;s own words, a sentence or two, without quotation marks. One language is enough: when the other is empty, the card shows
            this one.
          </p>
        </section>

        <section>
          <h3 className={sectionCls}>Screenshot</h3>
          <ImageField
            label="Homepage screenshot"
            hint="The top of the homepage at 1440 × 900 (16:10). JPG, PNG or WebP, up to 5 MB."
            path={values.screenshot_path}
            testId="showcase-screenshot"
            onChange={(path, fresh) => setImage('screenshot_path', path, fresh)}
          />
        </section>

        <section>
          <h3 className={sectionCls}>Consent</h3>
          <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
            <Field label="Date they agreed">
              <input
                type="date"
                value={values.consent_at ?? ''}
                onChange={(e) => {
                  set('consent_at', e.target.value || null);
                  if (!e.target.value) set('published', false);
                }}
                className={input}
                data-testid="showcase-consent_at"
              />
            </Field>
            <Field label="How">
              <input
                value={values.consent_note}
                maxLength={500}
                onChange={(e) => set('consent_note', e.target.value)}
                placeholder="WhatsApp to Thorsten: yes to name, photo, review and screenshot"
                className={input}
                data-testid="showcase-consent_note"
              />
            </Field>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Needed before publishing: the owner&apos;s written yes to showing their name, photo and words (GDPR, and § 22 KUG for the photo). Keep
            the message, and take the entry down if they ask.
          </p>
        </section>

        <section>
          <h3 className={sectionCls}>Publishing</h3>
          <div className="flex flex-wrap items-start gap-6">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={values.published}
                disabled={!values.published && missing.length > 0}
                onChange={(e) => set('published', e.target.checked)}
                data-testid="showcase-published"
              />
              Published
            </label>
            <Field label="Order">
              <input type="number" value={values.sort} onChange={(e) => set('sort', Number(e.target.value))} className={input.replace('w-full', 'w-24')} data-testid="showcase-sort" />
            </Field>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {missing.length > 0 && !values.published
              ? `To publish, add: ${missing.join(', ')}. `
              : ''}
            Lower numbers come first. The homepage does not show the showcase yet; published entries appear there once it does.
          </p>
        </section>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
          <button
            onClick={save}
            disabled={pending}
            data-testid="showcase-save"
            className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {pending ? 'Saving…' : item ? 'Save' : 'Create'}
          </button>
          <button onClick={cancel} disabled={pending} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Close
          </button>
          {msg && <span className={`text-sm font-semibold ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</span>}
          {item && (
            <button onClick={remove} disabled={pending} className="ml-auto text-sm font-semibold text-red-600 hover:underline" data-testid="showcase-delete">
              Delete entry
            </button>
          )}
        </div>
      </div>

      <div>
        <div className="sticky top-20">
          <div className="mb-2 flex items-center gap-2">
            <span className={labelCls + ' mb-0'}>Preview</span>
            <span className="ml-auto inline-flex overflow-hidden rounded-full border border-slate-300">
              {(['de', 'en'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setPreviewLocale(l)}
                  className={`px-2.5 py-0.5 text-xs font-bold ${previewLocale === l ? 'bg-slate-900 text-white' : 'text-slate-500'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </span>
          </div>
          <ShowcaseCard item={values} locale={previewLocale} />
        </div>
      </div>
    </div>
  );
}

function Status({ item }: { item: ShowcaseItem }) {
  if (item.published) return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Published</span>;
  const missing = missingForPublish(item);
  return (
    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600" title={missing.length ? `Missing: ${missing.join(', ')}` : undefined}>
      Draft{missing.length ? ` · ${missing.length} missing` : ''}
    </span>
  );
}

export function ShowcaseEditor({ items }: { items: ShowcaseItem[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-4 flex items-center">
        <button
          onClick={() => setOpen('new')}
          disabled={open === 'new'}
          data-testid="showcase-add"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          Add a website
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {open === 'new' && (
          <div className="border-b border-slate-100">
            <div className="px-5 py-3 text-sm font-bold">New entry</div>
            <ShowcaseForm item={null} onClose={() => setOpen(null)} onCreated={(id) => setOpen(id)} />
          </div>
        )}
        {items.length === 0 && open !== 'new' ? (
          <div className="p-6 text-sm text-slate-500">No websites yet. Add the first one with its owner&apos;s photo, review and a screenshot.</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="border-b border-slate-100 last:border-0">
              <button
                onClick={() => setOpen(open === item.id ? null : item.id)}
                className="flex w-full items-center gap-4 px-5 py-3 text-left text-sm hover:bg-slate-50"
                data-testid={`showcase-row-${item.id}`}
              >
                <span className="relative h-10 w-16 flex-none overflow-hidden rounded border border-slate-200 bg-slate-100">
                  {item.screenshot_path && <Image src={publicImageUrl(item.screenshot_path)} alt="" fill sizes="64px" className="object-cover object-top" />}
                </span>
                <span className="min-w-0">
                  <span className="block font-bold">{item.owner_name || 'Unnamed'}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {[item.business_name, item.site_url ? siteDomain(item.site_url) : ''].filter(Boolean).join(' · ') || 'No website yet'}
                  </span>
                </span>
                <Status item={item} />
                <span className="ml-auto text-xs text-slate-400">#{item.sort}</span>
                <span className="text-slate-400">{open === item.id ? '▴' : '▾'}</span>
              </button>
              {open === item.id && <ShowcaseForm key={item.id} item={item} onClose={() => setOpen(null)} onCreated={() => undefined} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
