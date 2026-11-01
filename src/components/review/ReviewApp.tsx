'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { Proposal } from '@/lib/developer/messages';
import type { ReviewComment, ReviewState, ReviewVersion } from '@/lib/developer/review';

/**
 * The client's review page: both design proposals in tabs, the design in a sandboxed frame,
 * pinned comments anywhere on it (like comments on a shared PDF), a general feedback box, the
 * choice between the proposals and, at the end, the approval. The design frame talks to this
 * page only through the review bridge (public/review-bridge.js).
 */

type Device = 'laptop' | 'phone';
type Pick = { page: string; pageTitle: string; x: number; y: number; near: string; device: Device };

const T = {
  de: {
    proposal: 'Entwurf', iteration: 'Iteration', latest: 'aktuell', yourChoice: 'Ihre Wahl', forComparison: 'Zum Vergleich',
    laptop: 'Laptop', phone: 'Handy', comment: 'Kommentieren', commenting: 'Klicken Sie auf eine Stelle', done: 'Fertig',
    choose: 'Diesen Entwurf wählen', approve: 'Diesen Entwurf freigeben', approvedChip: 'Freigegeben',
    name: 'Ihr Name', nameHint: 'Damit wir wissen, von wem die Kommentare sind.', nameMissing: 'Bitte tragen Sie zuerst Ihren Namen ein.',
    general: 'Allgemeines Feedback', generalPh: 'Was Ihnen insgesamt auffällt', save: 'Speichern', cancel: 'Abbrechen',
    newComment: 'Neuer Kommentar', near: 'Bei', commentPh: 'Was soll sich hier ändern?', likeHint: 'Sie können uns auch sagen, was Ihnen gefällt.',
    comments: 'Kommentare', none: 'Noch keine Kommentare. Klicken Sie oben auf „Kommentieren“ und dann auf eine Stelle im Entwurf.',
    generalLabel: 'Allgemein', carry: 'In Ihren Entwurf übernehmen', addressed: 'Umgesetzt', onPhone: 'Handy-Ansicht',
    send: 'Feedback an Web Studio senden', sendHint: 'Wir bekommen alle neuen Kommentare auf einmal.', sent: 'Danke! Ihr Feedback ist bei uns.', nothing: 'Es gibt keine neuen Kommentare zum Senden.',
    changes: 'Was sich in dieser Iteration geändert hat',
    chooseTitle: 'Entwurf {n} wählen?', chooseText: 'Wir arbeiten ab jetzt mit Entwurf {n} weiter. Gefällt Ihnen etwas an Entwurf {m}? Kommentieren Sie es einfach dort, dann übernehmen wir es in Entwurf {n}.',
    chooseYes: 'Ja, Entwurf {n} wählen',
    approveTitle: 'Diesen Entwurf freigeben?', approveText: 'Mit der Freigabe ist das Design abgeschlossen, und wir bauen Ihre Website auf dieser Grundlage. Die Seiten, die hier noch fehlen, gestalten wir im gleichen Stil.',
    approveYes: 'Ja, freigeben', approvedNote: 'Freigegeben von {name}. Vielen Dank, wir bauen jetzt Ihre Website.',
    otherNote: 'Zum Vergleich. Gefällt Ihnen hier etwas? Kommentieren Sie es, dann übernehmen wir es in Entwurf {n}.',
    intro: 'Ein Entwurf zeigt die wichtigsten Seiten, damit Sie Schrift, Farben und Aufbau beurteilen können. Die übrigen Seiten bauen wir später im gleichen Stil.',
    soon: 'Ihre Entwürfe sind bald hier.', error: 'Das hat nicht geklappt. Bitte versuchen Sie es noch einmal.', other: 'English',
  },
  en: {
    proposal: 'Proposal', iteration: 'Iteration', latest: 'latest', yourChoice: 'Your choice', forComparison: 'For comparison',
    laptop: 'Laptop', phone: 'Phone', comment: 'Comment', commenting: 'Click a spot in the design', done: 'Done',
    choose: 'Choose this design', approve: 'Approve this design', approvedChip: 'Approved',
    name: 'Your name', nameHint: 'So we know who the comments are from.', nameMissing: 'Please enter your name first.',
    general: 'General feedback', generalPh: 'What strikes you overall', save: 'Save', cancel: 'Cancel',
    newComment: 'New comment', near: 'Near', commentPh: 'What should change here?', likeHint: 'You can also tell us what you like.',
    comments: 'Comments', none: 'No comments yet. Click "Comment" at the top, then a spot in the design.',
    generalLabel: 'General', carry: 'Bring into your design', addressed: 'Done', onPhone: 'Phone view',
    send: 'Send feedback to Web Studio', sendHint: 'We receive all new comments at once.', sent: 'Thank you! We have your feedback.', nothing: 'There are no new comments to send.',
    changes: 'What changed in this iteration',
    chooseTitle: 'Choose Proposal {n}?', chooseText: 'We will continue with Proposal {n} from now on. Like something in Proposal {m}? Just comment on it there and we will bring it into Proposal {n}.',
    chooseYes: 'Yes, choose Proposal {n}',
    approveTitle: 'Approve this design?', approveText: 'Approving completes the design, and we build your website on it. The pages not shown here are designed later in the same style.',
    approveYes: 'Yes, approve', approvedNote: 'Approved by {name}. Thank you, we are building your website now.',
    otherNote: 'For comparison. Like something here? Comment on it and we will bring it into Proposal {n}.',
    intro: 'A proposal shows the key pages, so you can judge the fonts, colours and layout. We build the other pages later in the same style.',
    soon: 'Your designs will be here soon.', error: 'That did not work. Please try again.', other: 'Deutsch',
  },
};
const fill = (s: string, vars: Record<string, string | number>) => Object.entries(vars).reduce((a, [k, v]) => a.replaceAll(`{${k}}`, String(v)), s);
const num = (p: Proposal) => (p === 'A' ? 1 : 2);
const NAME_KEY = 'wsr-name';
const PHONE_QUERY = '(max-width: 640px)';

/* Browser-only values, read the React way so the server render and the first browser render agree. */
const onStorage = (cb: () => void) => { window.addEventListener('storage', cb); return () => window.removeEventListener('storage', cb); };
const storedName = () => { try { return localStorage.getItem(NAME_KEY) ?? ''; } catch { return ''; } };
const onPhoneQuery = (cb: () => void) => { const m = window.matchMedia(PHONE_QUERY); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); };
const isPhone = () => window.matchMedia(PHONE_QUERY).matches;

export function ReviewApp({ initial, api }: { initial: ReviewState; api: string }) {
  const [data, setData] = useState(initial);
  const [lang, setLang] = useState<'de' | 'en'>(initial.lang);
  const t = T[lang];
  const proposals = (['A', 'B'] as Proposal[]).filter((p) => data.versions.some((v) => v.proposal === p));
  const [tab, setTab] = useState<Proposal>(initial.chosen ?? proposals[0] ?? 'A');
  const [picked, setPicked] = useState<Partial<Record<Proposal, string>>>({});
  const phone = useSyncExternalStore(onPhoneQuery, isPhone, () => false);
  const [deviceChoice, setDevice] = useState<Device | null>(null);
  const device: Device = deviceChoice ?? (phone ? 'phone' : 'laptop');
  const [commenting, setCommenting] = useState(false);
  const [pending, setPending] = useState<Pick | null>(null);
  const [draft, setDraft] = useState('');
  const [general, setGeneral] = useState('');
  const remembered = useSyncExternalStore(onStorage, storedName, () => '');
  const [typedName, setName] = useState<string | null>(null);
  const name = typedName ?? remembered;
  const [nameError, setNameError] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [page, setPage] = useState<{ key: string; title: string } | null>(null);
  const [modal, setModal] = useState<'choose' | 'approve' | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const [box, setBox] = useState({ w: 1000, h: 700 });

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const versions = useMemo(() => data.versions.filter((v) => v.proposal === tab).sort((a, b) => b.iteration - a.iteration), [data.versions, tab]);
  const version: ReviewVersion | undefined = versions.find((v) => v.id === picked[tab]) ?? versions[0];
  const isLatest = !!version && version.id === versions[0]?.id;
  const comments = useMemo(() => data.comments.filter((c) => c.versionId === version?.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [data.comments, version?.id]);
  const pinNumber = useMemo(() => {
    const m = new Map<string, number>();
    comments.filter((c) => c.kind === 'pin').forEach((c, i) => m.set(c.id, i + 1));
    return m;
  }, [comments]);
  const approved = !!data.approved;
  const other = tab === 'A' ? 'B' : 'A';
  const unsent = data.comments.filter((c) => !c.sent).length;

  const say = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); };
  const needName = () => {
    if (name.trim()) return false;
    setNameError(true);
    document.getElementById('wsr-name')?.focus();
    return true;
  };
  const call = useCallback(async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, author: name.trim() }) });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.error || 'error');
      return out;
    } finally {
      setBusy(false);
    }
  }, [api, name]);

  // Messages from the design frame: page loaded, a spot picked, a pin clicked.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      const d = e.data as Record<string, unknown> | null;
      if (!d || d.__wsr !== 1) return;
      if (d.type === 'ready') setPage({ key: String(d.page ?? ''), title: String(d.pageTitle ?? '') });
      if (d.type === 'open') setActive(String(d.id));
      if (d.type === 'pick') {
        setPending({ page: String(d.page), pageTitle: String(d.pageTitle ?? ''), x: Number(d.x), y: Number(d.y), near: String(d.near ?? ''), device });
        setTimeout(() => composer.current?.focus(), 50);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [device]);

  // What the design frame should show: comment mode and the pins of this page on this device.
  useEffect(() => {
    const win = frame.current?.contentWindow;
    if (!win || !page) return;
    const pins = comments
      .filter((c) => c.kind === 'pin' && c.page === page.key && (c.device ?? 'laptop') === device && c.x != null && c.y != null)
      .map((c) => ({ id: c.id, n: pinNumber.get(c.id), x: c.x, y: c.y, active: c.id === active }));
    if (pending && pending.page === page.key) pins.push({ id: 'pending', n: 0, x: pending.x, y: pending.y, active: true });
    win.postMessage({ __wsr: 1, type: 'mode', on: commenting && !approved }, '*');
    win.postMessage({ __wsr: 1, type: 'pins', pins: pins.map((p) => (p.id === 'pending' ? { ...p, n: '+', pending: true } : p)) }, '*');
  }, [comments, pinNumber, page, device, commenting, active, pending, approved]);

  const focusComment = (c: ReviewComment) => {
    setActive(c.id);
    frame.current?.contentWindow?.postMessage({ __wsr: 1, type: 'scrollTo', id: c.id }, '*');
  };
  const savePin = async () => {
    if (!pending || !version || !draft.trim() || needName()) return;
    try {
      setData(await call({ action: 'comment', versionId: version.id, kind: 'pin', page: pending.page, pageTitle: pending.pageTitle, device: pending.device, x: pending.x, y: pending.y, near: pending.near, body: draft }));
      setPending(null);
      setDraft('');
    } catch { say(t.error); }
  };
  const saveGeneral = async () => {
    if (!version || !general.trim() || needName()) return;
    try {
      setData(await call({ action: 'comment', versionId: version.id, kind: 'general', body: general }));
      setGeneral('');
    } catch { say(t.error); }
  };
  const send = async () => {
    if (needName()) return;
    try {
      const out = await call({ action: 'send' });
      setData(out.state);
      say(out.sent ? t.sent : t.nothing);
    } catch { say(t.error); }
  };
  const confirm = async () => {
    if (!version || needName()) return;
    try {
      setData(await call(modal === 'choose' ? { action: 'choose', proposal: tab } : { action: 'approve', versionId: version.id }));
      setModal(null);
      setCommenting(false);
    } catch { say(t.error); }
  };

  const scale = device === 'laptop' ? Math.min(1, box.w / 1280) : 1;
  const frameW = device === 'laptop' ? 1280 : 390;
  const frameH = device === 'laptop' ? box.h / scale : box.h;
  const summary = version ? data.summaries[version.id] : undefined;

  if (!data.versions.length) {
    return <div className="grid min-h-dvh place-items-center p-6 text-center text-zinc-600">{t.soon}</div>;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-zinc-200 bg-white px-4 py-3 sm:px-5">
        <div className="mr-auto min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">Web Studio</div>
          <div className="truncate text-[15px] font-semibold">{data.company}</div>
        </div>
        <nav className="flex gap-1 rounded-lg bg-zinc-100 p-1" aria-label={t.proposal}>
          {proposals.map((p) => (
            <button key={p} type="button" onClick={() => { setTab(p); setPending(null); setActive(null); setPage(null); }} aria-pressed={tab === p}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${tab === p ? 'bg-white shadow-sm' : 'text-zinc-600 hover:text-zinc-900'}`}>
              {t.proposal} {num(p)}
              {data.chosen && <span className="ml-1.5 text-xs font-normal text-zinc-500">· {data.chosen === p ? t.yourChoice : t.forComparison}</span>}
            </button>
          ))}
        </nav>
        {versions.length > 1 && (
          <select aria-label={t.iteration} value={version?.id} onChange={(e) => { setPicked({ ...picked, [tab]: e.target.value }); setPending(null); setPage(null); }}
            className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm">
            {versions.map((v, i) => <option key={v.id} value={v.id}>{t.iteration} {v.iteration}{i === 0 ? ` (${t.latest})` : ''}</option>)}
          </select>
        )}
        <div className="flex gap-1 rounded-lg bg-zinc-100 p-1">
          {(['laptop', 'phone'] as Device[]).map((d) => (
            <button key={d} type="button" aria-pressed={device === d} onClick={() => { setDevice(d); setPending(null); setPage(null); }}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${device === d ? 'bg-white shadow-sm' : 'text-zinc-600'}`}>{d === 'laptop' ? t.laptop : t.phone}</button>
          ))}
        </div>
        {!approved && (
          <button type="button" onClick={() => { setCommenting(!commenting); setPending(null); }} aria-pressed={commenting}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${commenting ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
            {commenting ? `${t.commenting} · ${t.done}` : t.comment}
          </button>
        )}
        {!approved && !data.chosen && proposals.length > 1 && (
          <button type="button" onClick={() => setModal('choose')} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700">{t.choose}</button>
        )}
        {!approved && (data.chosen === tab || (!data.chosen && proposals.length === 1)) && isLatest && (
          <button type="button" onClick={() => setModal('approve')} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">{t.approve}</button>
        )}
        {approved && <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">{t.approvedChip}</span>}
        <button type="button" onClick={() => setLang(lang === 'de' ? 'en' : 'de')} className="text-sm text-zinc-500 underline-offset-4 hover:underline">{t.other}</button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:h-[calc(100dvh-66px)] lg:flex-row">
        <div ref={stage} className={`relative h-[72dvh] min-w-0 flex-1 overflow-hidden bg-zinc-200 lg:h-auto ${device === 'phone' ? 'flex justify-center pt-3' : ''}`}>
          {version && (
            <div style={{ width: frameW * scale, height: device === 'laptop' ? box.h : box.h - 12 }} className={device === 'laptop' ? 'mx-auto' : ''}>
              <iframe
                key={`${version.id}-${device}`}
                ref={frame}
                src={version.draftUrl}
                title={`${t.proposal} ${num(version.proposal)} · ${t.iteration} ${version.iteration}`}
                sandbox="allow-scripts allow-popups allow-forms"
                style={{ width: frameW, height: device === 'laptop' ? frameH : box.h - 12, transform: `scale(${scale})`, transformOrigin: '0 0', border: 0, background: '#fff' }}
                className={device === 'phone' ? 'rounded-t-2xl shadow-lg' : ''}
              />
            </div>
          )}
          {commenting && <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white shadow">{t.commenting}</div>}
        </div>

        <aside className="w-full shrink-0 overflow-y-auto border-zinc-200 bg-white lg:w-[380px] lg:border-l">
          <div className="space-y-5 p-5">
            {approved && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{fill(t.approvedNote, { name: data.approved?.by ?? '' })}</p>}
            {!approved && data.chosen && data.chosen !== tab && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{fill(t.otherNote, { n: num(data.chosen) })}</p>}
            {!approved && !data.chosen && <p className="text-sm text-zinc-600">{t.intro}</p>}

            <div>
              <label htmlFor="wsr-name" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.name}</label>
              <input id="wsr-name" value={name} maxLength={80} onChange={(e) => { setName(e.target.value); setNameError(false); try { localStorage.setItem(NAME_KEY, e.target.value); } catch {} }}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${nameError ? 'border-red-500' : 'border-zinc-300'}`} />
              <p className={`mt-1 text-xs ${nameError ? 'text-red-600' : 'text-zinc-500'}`}>{nameError ? t.nameMissing : t.nameHint}</p>
            </div>

            {pending && (
              <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-800">{t.newComment}</div>
                {pending.near && <p className="mb-2 text-xs text-amber-900">{t.near}: {pending.near}</p>}
                <textarea ref={composer} value={draft} maxLength={2000} rows={3} onChange={(e) => setDraft(e.target.value)} placeholder={t.commentPh}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm" />
                <p className="mt-1 text-xs text-zinc-600">{t.likeHint}</p>
                <div className="mt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => { setPending(null); setDraft(''); }} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-100">{t.cancel}</button>
                  <button type="button" disabled={busy || !draft.trim()} onClick={savePin} className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40">{t.save}</button>
                </div>
              </div>
            )}

            {!approved && (
              <div>
                <label htmlFor="wsr-general" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.general}</label>
                <textarea id="wsr-general" value={general} maxLength={2000} rows={2} onChange={(e) => setGeneral(e.target.value)} placeholder={t.generalPh}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-xs text-zinc-500">{t.likeHint}</span>
                  <button type="button" disabled={busy || !general.trim()} onClick={saveGeneral} className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40">{t.save}</button>
                </div>
              </div>
            )}

            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.comments} ({comments.length})</h2>
              {comments.length === 0 ? (
                <p className="text-sm text-zinc-500">{t.none}</p>
              ) : (
                <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
                  {comments.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => focusComment(c)} className={`block w-full px-3 py-2.5 text-left ${active === c.id ? 'bg-blue-50' : 'hover:bg-zinc-50'}`}>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold text-white ${c.kind === 'pin' ? 'bg-blue-600' : 'bg-zinc-500'}`}>{c.kind === 'pin' ? pinNumber.get(c.id) : '·'}</span>
                          <span className="font-semibold text-zinc-700">{c.author}</span>
                          <span className="truncate">{c.kind === 'pin' ? c.pageTitle || '' : t.generalLabel}{c.device === 'phone' ? ` · ${t.onPhone}` : ''}</span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800">{c.body}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {c.carryOver && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{t.carry}</span>}
                          {c.status === 'addressed' && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">{t.addressed}</span>}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {!approved && (
              <div>
                <button type="button" disabled={busy || !unsent} onClick={send} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
                  {t.send}{unsent ? ` (${unsent})` : ''}
                </button>
                <p className="mt-1 text-center text-xs text-zinc-500">{t.sendHint}</p>
              </div>
            )}

            {summary && (
              <details className="rounded-xl border border-zinc-200 p-3 text-sm">
                <summary className="cursor-pointer font-semibold text-zinc-700">{t.changes}</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-700">
                  {summary.split('\n').map((l) => l.replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').trim()).filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}
                </ul>
              </details>
            )}
          </div>
        </aside>
      </div>

      {modal && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" onClick={() => setModal(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">{modal === 'choose' ? fill(t.chooseTitle, { n: num(tab) }) : t.approveTitle}</h2>
            <p className="mt-2 text-sm text-zinc-600">{modal === 'choose' ? fill(t.chooseText, { n: num(tab), m: num(other) }) : t.approveText}</p>
            {!name.trim() && (
              <div className="mt-4">
                <label htmlFor="wsr-name-modal" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.name}</label>
                <input id="wsr-name-modal" value={name} maxLength={80} onChange={(e) => { setName(e.target.value); try { localStorage.setItem(NAME_KEY, e.target.value); } catch {} }}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setModal(null)} className="rounded-lg px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100">{t.cancel}</button>
              <button type="button" disabled={busy || !name.trim()} onClick={confirm} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                {modal === 'choose' ? fill(t.chooseYes, { n: num(tab) }) : t.approveYes}
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">{toast}</div>}
    </div>
  );
}
