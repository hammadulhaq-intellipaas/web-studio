'use client';

import Image from 'next/image';
import { useRef, useState, useTransition } from 'react';
import { deleteShowcase, discardShowcaseUploads, moveShowcase, saveShowcase, startShowcaseUpload } from '@/app/admin/showcase/actions';
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

const input = 'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none';
const labelCls = 'mb-1 block text-xs font-bold text-slate-500';
const sectionCls = 'mb-3 text-sm font-bold uppercase tracking-wide text-slate-500';
const linkButton = 'font-semibold text-blue-700 hover:underline disabled:opacity-60';

/** The editable fields of an entry; a new entry starts empty. */
const toInput = (item: ShowcaseItem | null): ShowcaseInput =>
  item
    ? (Object.fromEntries(Object.keys(EMPTY_SHOWCASE_INPUT).map((k) => [k, item[k as keyof ShowcaseInput]])) as ShowcaseInput)
    : { ...EMPTY_SHOWCASE_INPUT };

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** Today as yyyy-mm-dd in the team member's own time zone. */
function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const formatDate = (value: string, withTime = false) =>
  new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });

/** Uploads one image straight to storage through a signed URL and returns its path. */
async function uploadImage(file: File): Promise<string> {
  if (!IMAGE_TYPES[file.type]) throw new Error('Please use a JPG, PNG or WebP image.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('The image is larger than 5 MB.');
  const started = await startShowcaseUpload(file.type, file.size);
  if (!started.ok || !started.ticket) throw new Error(started.error ?? 'Preparing the upload failed');
  const { ticket } = started;
  const { error } = await createSupabaseBrowserClient()
    .storage.from(ticket.bucket)
    .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
  if (error) throw new Error(`Uploading failed: ${error.message}`);
  return ticket.path;
}

/** Has the server open the link and take the screenshot. */
async function takeScreenshot(url: string): Promise<{ path: string; siteName: string; takenAt: string }> {
  const res = await fetch('/api/showcase/screenshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const data = (await res.json().catch(() => ({}))) as { path?: string; siteName?: string; takenAt?: string; error?: string };
  if (!res.ok || !data.path) throw new Error(data.error ?? 'The screenshot failed.');
  return { path: data.path, siteName: data.siteName ?? '', takenAt: data.takenAt ?? new Date().toISOString() };
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

/** The owner's photo: optional, uploaded straight to storage. */
function PhotoField({ path, onChange }: { path: string | null; onChange: (path: string | null, uploaded?: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const uploaded = await uploadImage(file);
      onChange(uploaded, uploaded);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
      if (picker.current) picker.current.value = '';
    }
  };

  return (
    <div data-testid="showcase-photo">
      <span className={labelCls}>Photo (optional)</span>
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 flex-none overflow-hidden rounded-full border border-slate-200 bg-slate-100">
          {path && <Image src={publicImageUrl(path)} alt="" fill sizes="56px" className="object-cover" />}
        </div>
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
      <span className="mt-1 block text-xs text-slate-500">A real photo of the owner, square. Without one the card shows their initials.</span>
      {error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}
    </div>
  );
}

function ShowcaseForm({ item, onClose, onCreated }: { item: ShowcaseItem | null; onClose: () => void; onCreated: (id: string) => void }) {
  const [values, setValues] = useState<ShowcaseInput>(() => toInput(item));
  const [saved, setSaved] = useState<ShowcaseInput>(() => toInput(item));
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // Every image added while this form is open, so the ones never saved can be removed.
  const [uploaded, setUploaded] = useState<string[]>([]);
  // The link the current screenshot was taken from; leaving the link field with a different one retakes it.
  const [shotUrl, setShotUrl] = useState<string | null>(() => (item?.screenshot_path ? normalizeSiteUrl(item.site_url) : null));
  const [shot, setShot] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const fallbackPicker = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ShowcaseInput>(key: K, value: ShowcaseInput[K]) => setValues((prev) => ({ ...prev, [key]: value }));
  const url = normalizeSiteUrl(values.site_url);
  const missing = missingForPublish(values);
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  const capture = async () => {
    if (!url || shot.busy) return;
    setShot({ busy: true, error: null });
    try {
      const result = await takeScreenshot(url);
      setUploaded((prev) => [...prev, result.path]);
      setValues((prev) => ({
        ...prev,
        screenshot_path: result.path,
        screenshot_at: result.takenAt,
        business_name: prev.business_name || result.siteName,
      }));
      setShotUrl(url);
      setShot({ busy: false, error: null });
    } catch (err) {
      // A new link whose screenshot failed must not keep the old site's picture.
      if (url !== shotUrl) setValues((prev) => ({ ...prev, screenshot_path: null, screenshot_at: null, published: false }));
      setShot({ busy: false, error: message(err) });
    }
  };

  const uploadInstead = async (file: File) => {
    setShot({ busy: true, error: null });
    try {
      const path = await uploadImage(file);
      setUploaded((prev) => [...prev, path]);
      setValues((prev) => ({ ...prev, screenshot_path: path, screenshot_at: new Date().toISOString() }));
      setShotUrl(url);
      setShot({ busy: false, error: null });
    } catch (err) {
      setShot({ busy: false, error: message(err) });
    } finally {
      if (fallbackPicker.current) fallbackPicker.current.value = '';
    }
  };

  const setPhoto = (path: string | null, fresh?: string) => {
    if (fresh) setUploaded((prev) => [...prev, fresh]);
    set('photo_path', path);
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

  return (
    <div className="grid gap-6 border-t border-slate-100 bg-slate-50/50 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_380px]" data-testid="showcase-form">
      <div className="space-y-6">
        <section>
          <h3 className={sectionCls}>Website</h3>
          <Field label="Website link">
            <input
              value={values.site_url}
              onChange={(e) => set('site_url', e.target.value)}
              onBlur={() => {
                if (url && url !== shotUrl) void capture();
              }}
              disabled={shot.busy}
              placeholder="praxis-x.de"
              className={input}
              data-testid="showcase-site_url"
            />
          </Field>
          <div className="mt-2 text-xs text-slate-600" data-testid="showcase-shot-status">
            {shot.busy ? (
              <span className="font-semibold text-slate-700">
                Taking a screenshot of {url ? siteDomain(url) : 'the website'}… The first one can take up to half a minute.
              </span>
            ) : shot.error ? (
              <span>
                <span className="font-semibold text-red-600">{shot.error}</span>{' '}
                <button type="button" onClick={() => void capture()} disabled={!url} className={linkButton}>
                  Try again
                </button>{' '}
                or{' '}
                <button type="button" onClick={() => fallbackPicker.current?.click()} className={linkButton} data-testid="showcase-shot-upload">
                  upload a picture instead
                </button>
                .
              </span>
            ) : values.screenshot_path ? (
              <span>
                Screenshot {values.screenshot_at ? `taken ${formatDate(values.screenshot_at, true)}` : 'added'}.{' '}
                <button type="button" onClick={() => void capture()} disabled={!url} className={linkButton} data-testid="showcase-shot-retake">
                  Retake screenshot
                </button>
              </span>
            ) : url ? (
              <button type="button" onClick={() => void capture()} className={linkButton} data-testid="showcase-shot-take">
                Take the screenshot
              </button>
            ) : (
              'Paste the link: the screenshot is taken when you leave the field.'
            )}
            <input
              ref={fallbackPicker}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadInstead(file);
              }}
            />
          </div>
          <div className="mt-3">
            <Field label="Business name" hint="Filled in from the website; correct it if needed.">
              <input
                value={values.business_name}
                maxLength={LINE_MAX}
                onChange={(e) => set('business_name', e.target.value)}
                className={input}
                data-testid="showcase-business_name"
              />
            </Field>
          </div>
        </section>

        <section>
          <h3 className={sectionCls}>Owner</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-3">
              <Field label="Full name">
                <input
                  value={values.owner_name}
                  maxLength={LINE_MAX}
                  onChange={(e) => set('owner_name', e.target.value)}
                  className={input}
                  data-testid="showcase-owner_name"
                />
              </Field>
              <Field label="Professional title">
                <input
                  value={values.owner_title}
                  maxLength={LINE_MAX}
                  onChange={(e) => set('owner_title', e.target.value)}
                  placeholder="Physiotherapeutin"
                  className={input}
                  data-testid="showcase-owner_title"
                />
              </Field>
            </div>
            <PhotoField path={values.photo_path} onChange={setPhoto} />
          </div>
        </section>

        <section>
          <h3 className={sectionCls}>Review</h3>
          <textarea
            rows={3}
            value={values.quote}
            maxLength={QUOTE_MAX}
            onChange={(e) => set('quote', e.target.value)}
            className={input}
            data-testid="showcase-quote"
          />
          <p className="mt-1 flex gap-3 text-xs text-slate-500">
            <span>The owner&apos;s own words, a sentence or two, without quotation marks. Shown as written on the German and the English page.</span>
            <span className="ml-auto flex-none text-slate-400">
              {values.quote.length}/{QUOTE_MAX}
            </span>
          </p>
        </section>

        <section className="space-y-3">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={!!values.consent_at}
              onChange={(e) => {
                set('consent_at', e.target.checked ? today() : null);
                if (!e.target.checked) set('published', false);
              }}
              data-testid="showcase-consent"
            />
            <span>
              <span className="font-semibold">The owner agreed to be shown here</span>
              <span className="block text-xs text-slate-500">
                With their name, photo, review and website. Get their yes in writing (WhatsApp or email is fine) and keep it; if they ask,
                unpublish or delete the entry.
              </span>
              {values.consent_at && (
                <span className="block text-xs font-semibold text-emerald-700">
                  Recorded {formatDate(values.consent_at)}
                  {saved.consent_at === values.consent_at && item?.consent_by ? ` by ${item.consent_by}` : ''}
                </span>
              )}
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={values.published}
              disabled={!values.published && missing.length > 0}
              onChange={(e) => set('published', e.target.checked)}
              data-testid="showcase-published"
            />
            <span>
              <span className="font-semibold">Published</span>
              <span className="block text-xs text-slate-500">
                {missing.length > 0 && !values.published ? `To publish, add: ${missing.join(', ')}. ` : ''}
                The homepage does not show the showcase yet; published entries appear there once it does.
              </span>
            </span>
          </label>
        </section>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
          <button
            onClick={save}
            disabled={pending || shot.busy}
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
          <span className={labelCls}>Preview, as on the homepage</span>
          <ShowcaseCard item={values} locale="de" />
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
  const [moving, startMove] = useTransition();
  const [moveError, setMoveError] = useState<string | null>(null);

  const move = (id: string, step: -1 | 1) =>
    startMove(async () => {
      setMoveError(null);
      const result = await moveShowcase(id, step);
      if (!result.ok) setMoveError(result.error ?? 'Moving failed');
    });

  const arrow = 'rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent';

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={() => setOpen('new')}
          disabled={open === 'new'}
          data-testid="showcase-add"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          Add a website
        </button>
        {moveError && <span className="text-sm font-semibold text-red-600">{moveError}</span>}
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {open === 'new' && (
          <div className="border-b border-slate-100">
            <div className="px-5 py-3 text-sm font-bold">New entry</div>
            <ShowcaseForm item={null} onClose={() => setOpen(null)} onCreated={(id) => setOpen(id)} />
          </div>
        )}
        {items.length === 0 && open !== 'new' ? (
          <div className="p-6 text-sm text-slate-500">No websites yet. Add the first one: paste its link and the screenshot is taken for you.</div>
        ) : (
          items.map((item, index) => (
            <div key={item.id} className="border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-2 pr-3 hover:bg-slate-50">
                <button
                  onClick={() => setOpen(open === item.id ? null : item.id)}
                  className="flex min-w-0 flex-1 items-center gap-4 py-3 pl-5 text-left text-sm"
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
                  <span className="ml-auto text-slate-400">{open === item.id ? '▴' : '▾'}</span>
                </button>
                <button onClick={() => move(item.id, -1)} disabled={moving || index === 0} className={arrow} aria-label="Move up" title="Move up">
                  ↑
                </button>
                <button
                  onClick={() => move(item.id, 1)}
                  disabled={moving || index === items.length - 1}
                  className={arrow}
                  aria-label="Move down"
                  title="Move down"
                >
                  ↓
                </button>
              </div>
              {open === item.id && <ShowcaseForm key={item.id} item={item} onClose={() => setOpen(null)} onCreated={() => undefined} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
