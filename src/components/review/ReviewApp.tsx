'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { LanguagePills } from '@/components/LanguagePills';
import type { Proposal } from '@/lib/developer/messages';
import type { ReviewComment, ReviewState, ReviewVersion } from '@/lib/developer/review';

/**
 * The client's review page: both design proposals in tabs, the design in a sandboxed frame,
 * marked comments anywhere on it (a box drawn around the spot, like markup on a screenshot),
 * a general feedback box, the choice between the proposals and, at the end, the approval. The
 * side panel walks the client through it in numbered steps; a short guide opens on the first
 * visit. The design frame talks to this page only through the review bridge
 * (public/review-bridge.js).
 */

type Device = 'laptop' | 'phone';
type Pick = { page: string; pageTitle: string; x: number; y: number; w: number; h: number; near: string; device: Device; place: 'top' | 'bottom' };

const T = {
  de: {
    title: 'Ihre Website-Entwürfe', howItWorks: "So funktioniert's",
    proposal: 'Entwurf', iteration: 'Iteration', latest: 'aktuell', yourChoice: 'Ihre Wahl',
    laptop: 'Laptop', phone: 'Handy', loading: 'Der Entwurf wird geladen …',
    intro: 'Ein Entwurf zeigt die wichtigsten Seiten Ihrer Website, damit Sie Schrift, Farben und Aufbau beurteilen können. Die übrigen Seiten bauen wir später im gleichen Stil.',
    otherNote: 'Zum Vergleich. Gefällt Ihnen hier etwas? Markieren Sie es, dann übernehmen wir es in Entwurf {n}.',
    approvedNote: 'Freigegeben von {name}. Vielen Dank, wir bauen jetzt Ihre Website.', approvedChip: 'Freigegeben',
    name: 'Ihr Name', nameHint: 'Damit wir wissen, von wem die Kommentare sind.', nameMissing: 'Bitte tragen Sie zuerst Ihren Namen ein.',
    markTitle: 'Stellen im Entwurf markieren',
    markHint: 'Klicken Sie auf den Button und ziehen Sie dann mit der Maus einen Rahmen um die Stelle, die Sie meinen.',
    markHintTouch: 'Tippen Sie auf den Button und dann auf die Stelle im Entwurf, die Sie meinen.',
    mark: 'Stelle markieren', markStop: 'Markieren beenden',
    banner: 'Ziehen Sie einen Rahmen um die Stelle, die Sie meinen', bannerTouch: 'Tippen Sie auf die Stelle, die Sie meinen', done: 'Fertig',
    composerTitle: 'Ihr Kommentar zu dieser Stelle', commentPh: 'Was soll sich hier ändern? Sie können uns auch sagen, was Ihnen gefällt.',
    generalTitle: 'Allgemeines Feedback', generalHint: 'Was Ihnen insgesamt auffällt, gern auch, was Ihnen gefällt.',
    generalPh: 'Zum Beispiel: Die Farben gefallen mir, die Schrift ist mir zu klein.',
    save: 'Speichern', cancel: 'Abbrechen',
    sendTitle: 'Feedback senden', comments: 'Ihre Kommentare zu diesem Entwurf', none: 'Noch keine Kommentare.',
    generalLabel: 'Allgemein', carry: 'In Ihren Entwurf übernehmen', addressed: 'Umgesetzt', onPhone: 'Handy-Ansicht',
    send: 'Feedback an Web Studio senden', sendHint: 'Wir bekommen alle neuen Kommentare auf einmal. Danach können Sie weiter kommentieren.',
    sent: 'Danke! Ihr Feedback ist bei uns.', nothing: 'Es gibt keine neuen Kommentare zum Senden.',
    decideTitle: 'Entscheiden', chooseHint: 'Haben Sie sich entschieden? Dann wählen Sie Ihren Entwurf. Danach arbeiten wir nur noch mit ihm weiter.',
    choose: 'Entwurf {n} wählen',
    approveTitle: 'Freigeben', approveHint: 'Ist alles so, wie Sie es möchten? Dann geben Sie den Entwurf frei, und wir bauen Ihre Website.',
    approve: 'Entwurf freigeben',
    changes: 'Was sich in dieser Iteration geändert hat',
    chooseModal: 'Entwurf {n} wählen?', chooseText: 'Wir arbeiten ab jetzt mit Entwurf {n} weiter. Gefällt Ihnen etwas an Entwurf {m}? Kommentieren Sie es einfach dort, dann übernehmen wir es in Entwurf {n}.',
    chooseYes: 'Ja, Entwurf {n} wählen',
    approveModal: 'Diesen Entwurf freigeben?', approveText: 'Mit der Freigabe ist das Design abgeschlossen, und wir bauen Ihre Website auf dieser Grundlage. Die Seiten, die hier noch fehlen, gestalten wir im gleichen Stil.',
    approveYes: 'Ja, freigeben',
    guideTitle: 'So geben Sie uns Feedback',
    guide1Title: 'Entwürfe ansehen', guide1: 'Oben wechseln Sie zwischen den Entwürfen und zwischen Laptop- und Handy-Ansicht. Im Entwurf können Sie sich durch die Seiten klicken.',
    guide2Title: 'Stellen markieren', guide2: 'Klicken Sie auf „Stelle markieren“ und ziehen Sie einen Rahmen um das, was Sie meinen. Dann schreiben Sie dazu, was sich ändern soll oder was Ihnen gefällt.',
    guide2Touch: 'Tippen Sie auf „Stelle markieren“ und dann auf die Stelle, die Sie meinen. Dann schreiben Sie dazu, was sich ändern soll oder was Ihnen gefällt.',
    guide3Title: 'Senden und entscheiden', guide3: 'Senden Sie uns Ihr Feedback. Wenn Ihnen ein Entwurf gefällt, wählen Sie ihn aus.',
    guideGo: "Los geht's",
    soon: 'Ihre Entwürfe sind bald hier.', error: 'Das hat nicht geklappt. Bitte versuchen Sie es noch einmal.',
  },
  en: {
    title: 'Your website designs', howItWorks: 'How it works',
    proposal: 'Proposal', iteration: 'Iteration', latest: 'latest', yourChoice: 'Your choice',
    laptop: 'Laptop', phone: 'Phone', loading: 'Loading the design …',
    intro: 'A proposal shows the key pages of your website, so you can judge the fonts, colours and layout. We build the other pages later in the same style.',
    otherNote: 'For comparison. Like something here? Mark it and we will bring it into Proposal {n}.',
    approvedNote: 'Approved by {name}. Thank you, we are building your website now.', approvedChip: 'Approved',
    name: 'Your name', nameHint: 'So we know who the comments are from.', nameMissing: 'Please enter your name first.',
    markTitle: 'Mark spots in the design',
    markHint: 'Click the button, then drag a box with your mouse around the spot you mean.',
    markHintTouch: 'Tap the button, then tap the spot in the design you mean.',
    mark: 'Mark a spot', markStop: 'Stop marking',
    banner: 'Drag a box around the spot you mean', bannerTouch: 'Tap the spot you mean', done: 'Done',
    composerTitle: 'Your comment on this spot', commentPh: 'What should change here? You can also tell us what you like.',
    generalTitle: 'General feedback', generalHint: 'What strikes you overall, including what you like.',
    generalPh: 'For example: I like the colours, the text is too small for me.',
    save: 'Save', cancel: 'Cancel',
    sendTitle: 'Send feedback', comments: 'Your comments on this design', none: 'No comments yet.',
    generalLabel: 'General', carry: 'Bring into your design', addressed: 'Done', onPhone: 'Phone view',
    send: 'Send feedback to Web Studio', sendHint: 'We receive all new comments at once. You can keep commenting afterwards.',
    sent: 'Thank you! We have your feedback.', nothing: 'There are no new comments to send.',
    decideTitle: 'Decide', chooseHint: 'Made up your mind? Then choose your proposal. From then on we only work on that one.',
    choose: 'Choose Proposal {n}',
    approveTitle: 'Approve', approveHint: 'Is everything the way you want it? Then approve the design and we build your website.',
    approve: 'Approve the design',
    changes: 'What changed in this iteration',
    chooseModal: 'Choose Proposal {n}?', chooseText: 'We will continue with Proposal {n} from now on. Like something in Proposal {m}? Just comment on it there and we will bring it into Proposal {n}.',
    chooseYes: 'Yes, choose Proposal {n}',
    approveModal: 'Approve this design?', approveText: 'Approving completes the design, and we build your website on it. The pages not shown here are designed later in the same style.',
    approveYes: 'Yes, approve',
    guideTitle: 'How to give us feedback',
    guide1Title: 'Look at the designs', guide1: 'At the top you switch between the proposals and between the laptop and phone view. Inside the design you can click through the pages.',
    guide2Title: 'Mark spots', guide2: 'Click "Mark a spot" and drag a box around what you mean. Then write what should change, or what you like.',
    guide2Touch: 'Tap "Mark a spot", then tap the spot you mean. Then write what should change, or what you like.',
    guide3Title: 'Send and decide', guide3: 'Send us your feedback. When you like a proposal, choose it.',
    guideGo: "Let's start",
    soon: 'Your designs will be here soon.', error: 'That did not work. Please try again.',
  },
};
const fill = (s: string, vars: Record<string, string | number>) => Object.entries(vars).reduce((a, [k, v]) => a.replaceAll(`{${k}}`, String(v)), s);
const num = (p: Proposal) => (p === 'A' ? 1 : 2);
const NAME_KEY = 'wsr-name';
const GUIDE_KEY = 'wsr-guide-seen';
const PHONE_QUERY = '(max-width: 640px)';
const TOUCH_QUERY = '(pointer: coarse)';
/** The marking colour, as in the design frame (review-bridge.js). */
const RED = '#E5484D';

/* Browser-only values, read the React way so the server render and the first browser render agree. */
const onStorage = (cb: () => void) => { window.addEventListener('storage', cb); return () => window.removeEventListener('storage', cb); };
const stored = (key: string) => () => { try { return localStorage.getItem(key) ?? ''; } catch { return ''; } };
const storedName = stored(NAME_KEY);
const guideSeen = () => stored(GUIDE_KEY)() === '1';
const media = (query: string) => ({
  subscribe: (cb: () => void) => { const m = window.matchMedia(query); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); },
  get: () => window.matchMedia(query).matches,
});
const phoneMedia = media(PHONE_QUERY);
const touchMedia = media(TOUCH_QUERY);

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2.5 text-[15px] font-semibold text-[#0F2440]">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#0F2440] text-xs font-bold text-white">{n}</span>
        {title}
      </h2>
      <div className="pl-[34px]">{children}</div>
    </section>
  );
}

function LaptopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="4" y="5" width="16" height="11" rx="1.5" /><path d="M2 19h20" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18.5h2" />
    </svg>
  );
}
/** A box drawn around a spot, with its number: what "Mark a spot" makes. */
function MarkIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="6" width="15" height="12" rx="2" strokeDasharray="3 2" /><path d="M14 14l6 6M14 14h4.5M14 14v4.5" />
    </svg>
  );
}
function MarkPicture() {
  return (
    <svg width="72" height="48" viewBox="0 0 72 48" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="70" height="46" rx="5" fill="#F5F7FB" stroke="#E4E9F2" />
      <rect x="9" y="9" width="30" height="5" rx="2" fill="#C9D2E1" /><rect x="9" y="19" width="44" height="3" rx="1.5" fill="#E4E9F2" />
      <rect x="9" y="25" width="38" height="3" rx="1.5" fill="#E4E9F2" /><rect x="9" y="31" width="40" height="3" rx="1.5" fill="#E4E9F2" />
      <rect x="6" y="16" width="50" height="22" rx="3" stroke={RED} strokeWidth="2" fill="rgba(229,72,77,.08)" />
      <circle cx="6" cy="16" r="5.5" fill={RED} stroke="#fff" strokeWidth="1.5" />
      <path d="M56 38l7 7" stroke="#0F2440" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ReviewApp({ initial, api }: { initial: ReviewState; api: string }) {
  const [data, setData] = useState(initial);
  const [lang, setLang] = useState<'de' | 'en'>(initial.lang);
  const t = T[lang];
  const proposals = (['A', 'B'] as Proposal[]).filter((p) => data.versions.some((v) => v.proposal === p));
  const [tab, setTab] = useState<Proposal>(initial.chosen ?? proposals[0] ?? 'A');
  const [picked, setPicked] = useState<Partial<Record<Proposal, string>>>({});
  const phone = useSyncExternalStore(phoneMedia.subscribe, phoneMedia.get, () => false);
  const touch = useSyncExternalStore(touchMedia.subscribe, touchMedia.get, () => false);
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
  const seen = useSyncExternalStore(onStorage, guideSeen, () => true);
  const [guideChoice, setGuide] = useState<boolean | null>(null);
  const guide = guideChoice ?? !seen;
  const [active, setActive] = useState<string | null>(null);
  const [page, setPage] = useState<{ key: string; title: string } | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
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
  const frameKey = version ? `${version.id}-${device}` : '';
  const comments = useMemo(() => data.comments.filter((c) => c.versionId === version?.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [data.comments, version?.id]);
  const pinNumber = useMemo(() => {
    const m = new Map<string, number>();
    comments.filter((c) => c.kind === 'pin').forEach((c, i) => m.set(c.id, i + 1));
    return m;
  }, [comments]);
  const approved = !!data.approved;
  const other = tab === 'A' ? 'B' : 'A';
  const unsent = data.comments.filter((c) => !c.sent).length;
  const canChoose = !approved && !data.chosen && proposals.length > 1;
  const canApprove = !approved && (data.chosen === tab || (!data.chosen && proposals.length === 1)) && isLatest;

  const say = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); };
  const rememberName = (value: string) => {
    setName(value);
    setNameError(false);
    try { localStorage.setItem(NAME_KEY, value); } catch {}
  };
  const needName = () => {
    if (name.trim()) return false;
    setNameError(true);
    document.getElementById('wsr-name')?.focus();
    return true;
  };
  const closeGuide = () => {
    setGuide(false);
    try { localStorage.setItem(GUIDE_KEY, '1'); } catch {}
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

  // Messages from the design frame: page loaded, a spot marked, a mark clicked.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      const d = e.data as Record<string, unknown> | null;
      if (!d || d.__wsr !== 1) return;
      if (d.type === 'ready') setPage({ key: String(d.page ?? ''), title: String(d.pageTitle ?? '') });
      if (d.type === 'ready' && d.settled) setLoadedKey(frameKey);
      if (d.type === 'open') setActive(String(d.id));
      if (d.type === 'pick') {
        setPending({
          page: String(d.page), pageTitle: String(d.pageTitle ?? ''), x: Number(d.x), y: Number(d.y), w: Number(d.w) || 0, h: Number(d.h) || 0,
          near: String(d.near ?? ''), device, place: d.place === 'top' ? 'top' : 'bottom',
        });
        setTimeout(() => composer.current?.focus(), 50);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [device, frameKey]);

  // What the design frame should show: comment mode and the marks of this page on this device.
  useEffect(() => {
    const win = frame.current?.contentWindow;
    if (!win || !page) return;
    const pins: Record<string, unknown>[] = comments
      .filter((c) => c.kind === 'pin' && c.page === page.key && (c.device ?? 'laptop') === device && c.x != null && c.y != null)
      .map((c) => ({ id: c.id, n: pinNumber.get(c.id), x: c.x, y: c.y, w: c.w, h: c.h, active: c.id === active }));
    if (pending && pending.page === page.key) pins.push({ id: 'pending', n: '+', x: pending.x, y: pending.y, w: pending.w, h: pending.h, pending: true });
    win.postMessage({ __wsr: 1, type: 'mode', on: commenting && !approved }, '*');
    win.postMessage({ __wsr: 1, type: 'pins', pins }, '*');
  }, [comments, pinNumber, page, device, commenting, active, pending, approved]);

  const focusComment = (c: ReviewComment) => {
    setActive(c.id);
    frame.current?.contentWindow?.postMessage({ __wsr: 1, type: 'scrollTo', id: c.id }, '*');
  };
  const toggleMarking = () => {
    setCommenting(!commenting);
    setPending(null);
    // On a phone the design sits above this panel: bring it into view.
    const top = stage.current?.getBoundingClientRect().top ?? 0;
    if (!commenting && (top < 0 || top > window.innerHeight * 0.5)) stage.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const switchTo = (next: { tab?: Proposal; device?: Device; version?: string }) => {
    if (next.tab) setTab(next.tab);
    if (next.device) setDevice(next.device);
    if (next.version) setPicked({ ...picked, [tab]: next.version });
    setPending(null);
    setActive(null);
    setPage(null);
  };
  const savePin = async () => {
    if (!pending || !version || !draft.trim() || !name.trim()) return;
    try {
      setData(await call({
        action: 'comment', versionId: version.id, kind: 'pin', page: pending.page, pageTitle: pending.pageTitle, device: pending.device,
        x: pending.x, y: pending.y, w: pending.w || undefined, h: pending.h || undefined, near: pending.near, body: draft,
      }));
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
    if (!version || !name.trim()) return;
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
  const marking = commenting && !approved;
  const btn = 'rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-40';
  const nameField = (id: string) => (
    <input id={id} value={name} maxLength={80} onChange={(e) => rememberName(e.target.value)} placeholder={t.name}
      className={`w-full rounded-lg border bg-white px-3 py-2 text-sm ${nameError ? 'border-red-500' : 'border-[#D5DCE8]'}`} />
  );

  if (!data.versions.length) {
    return <div className="grid min-h-dvh place-items-center p-6 text-center text-[#4A5872]">{t.soon}</div>;
  }

  let step = 0;
  return (
    <div className="flex min-h-dvh flex-col bg-[#F5F7FB] text-[#0F2440]">
      <header className="flex items-center gap-3 border-b border-[#E4E9F2] bg-white px-4 py-2.5 sm:px-6">
        <Image src="/intellipaas-logo.png" alt="IntelliPaaS Web Studio" width={36} height={36} className="h-9 w-9 shrink-0" style={{ objectFit: 'cover', objectPosition: 'center 38%' }} />
        <div className="mr-auto min-w-0">
          <div className="text-[15px] font-bold leading-tight">{t.title}</div>
          <div className="truncate text-xs text-[#7A879B]">{data.company} · Web Studio</div>
        </div>
        <button type="button" onClick={() => setGuide(true)} className="hidden rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#4A5872] hover:bg-[#F5F7FB] sm:block">
          {t.howItWorks}
        </button>
        <LanguagePills value={lang} onChange={setLang} />
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:h-[calc(100dvh-61px)] lg:flex-row">
        <main className="flex min-w-0 flex-col lg:min-h-0 lg:flex-1">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#E4E9F2] bg-white px-4 py-2.5 sm:px-6">
            <nav className="flex gap-1 rounded-xl bg-[#EEF2F8] p-1" aria-label={t.proposal}>
              {proposals.map((p) => (
                <button key={p} type="button" onClick={() => switchTo({ tab: p })} aria-pressed={tab === p}
                  className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${tab === p ? 'bg-white text-[#0F2440] shadow-sm' : 'text-[#4A5872] hover:text-[#0F2440]'}`}>
                  {t.proposal} {num(p)}
                  {data.chosen === p && <span className="ml-1.5 rounded-full bg-[#E8F0FF] px-2 py-0.5 text-[11px] font-semibold text-[#1E5EFF]">{t.yourChoice}</span>}
                </button>
              ))}
            </nav>
            {versions.length > 1 && (
              <select aria-label={t.iteration} value={version?.id} onChange={(e) => switchTo({ version: e.target.value })}
                className="rounded-lg border border-[#D5DCE8] bg-white px-2.5 py-1.5 text-sm font-medium">
                {versions.map((v, i) => <option key={v.id} value={v.id}>{t.iteration} {v.iteration}{i === 0 ? ` (${t.latest})` : ''}</option>)}
              </select>
            )}
            <div className="ml-auto flex gap-1 rounded-xl bg-[#EEF2F8] p-1">
              {(['laptop', 'phone'] as Device[]).map((d) => (
                <button key={d} type="button" aria-pressed={device === d} onClick={() => switchTo({ device: d })}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${device === d ? 'bg-white text-[#0F2440] shadow-sm' : 'text-[#4A5872]'}`}>
                  {d === 'laptop' ? <LaptopIcon /> : <PhoneIcon />}{d === 'laptop' ? t.laptop : t.phone}
                </button>
              ))}
            </div>
          </div>

          <div ref={stage} className={`relative h-[72dvh] min-w-0 shrink-0 overflow-hidden bg-[#E9EDF4] lg:h-auto lg:min-h-0 lg:flex-1 ${device === 'phone' ? 'flex justify-center pt-3' : ''}`}>
            {version && (
              <div style={{ width: frameW * scale, height: device === 'laptop' ? box.h : box.h - 12 }} className={device === 'laptop' ? 'mx-auto' : ''}>
                <iframe
                  key={frameKey}
                  ref={frame}
                  src={version.draftUrl}
                  title={`${t.proposal} ${num(version.proposal)} · ${t.iteration} ${version.iteration}`}
                  sandbox="allow-scripts allow-popups allow-forms"
                  onLoad={() => setLoadedKey(frameKey)}
                  style={{ width: frameW, height: device === 'laptop' ? frameH : box.h - 12, transform: `scale(${scale})`, transformOrigin: '0 0', border: 0, background: '#fff' }}
                  className={device === 'phone' ? 'rounded-t-2xl shadow-lg' : ''}
                />
              </div>
            )}
            {version && loadedKey !== frameKey && (
              <div className="absolute inset-0 grid place-items-center bg-[#E9EDF4]">
                <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-medium text-[#4A5872] shadow-sm">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#C9D2E1] border-t-[#1E5EFF]" />
                  {t.loading}
                </div>
              </div>
            )}
            {marking && <div className="pointer-events-none absolute inset-0 border-[3px]" style={{ borderColor: RED }} />}
            {marking && !pending && (
              <div className="absolute bottom-4 left-1/2 flex w-max max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-3 rounded-xl bg-[#0F2440] py-2 pl-4 pr-2 text-sm font-medium text-white shadow-lg">
                <MarkIcon />
                <span>{touch ? t.bannerTouch : t.banner}</span>
                <button type="button" onClick={toggleMarking} className="rounded-lg bg-white/15 px-3 py-1.5 font-semibold hover:bg-white/25">{t.done}</button>
              </div>
            )}
            {pending && (
              <div className={`absolute left-1/2 w-[min(440px,calc(100%-24px))] -translate-x-1/2 rounded-xl border-2 bg-white p-4 shadow-xl ${pending.place === 'top' ? 'top-4' : 'bottom-4'}`} style={{ borderColor: RED }}>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <span className="h-3 w-3 rounded-sm border-2" style={{ borderColor: RED }} />
                  {t.composerTitle}
                </div>
                {!name.trim() && <div className="mb-2">{nameField('wsr-name-composer')}</div>}
                <textarea ref={composer} value={draft} maxLength={2000} rows={3} onChange={(e) => setDraft(e.target.value)} placeholder={t.commentPh}
                  className="w-full rounded-lg border border-[#D5DCE8] px-3 py-2 text-sm" />
                <div className="mt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => { setPending(null); setDraft(''); }} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[#4A5872] hover:bg-[#F5F7FB]">{t.cancel}</button>
                  <button type="button" disabled={busy || !draft.trim() || !name.trim()} onClick={savePin} className="rounded-lg bg-[#1E5EFF] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40">{t.save}</button>
                </div>
              </div>
            )}
          </div>
        </main>

        <aside className="w-full shrink-0 overflow-y-auto border-t border-[#E4E9F2] bg-white lg:w-[400px] lg:border-l lg:border-t-0">
          <div className="space-y-7 p-5 sm:p-6">
            {approved && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{fill(t.approvedNote, { name: data.approved?.by ?? '' })}</p>}
            {!approved && data.chosen && data.chosen !== tab && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{fill(t.otherNote, { n: num(data.chosen) })}</p>}
            {!approved && !(data.chosen && data.chosen !== tab) && <p className="text-sm leading-relaxed text-[#4A5872]">{t.intro}</p>}

            {!approved && (
              <Step n={++step} title={t.name}>
                {nameField('wsr-name')}
                <p className={`mt-1 text-xs ${nameError ? 'text-red-600' : 'text-[#7A879B]'}`}>{nameError ? t.nameMissing : t.nameHint}</p>
              </Step>
            )}

            {!approved && (
              <Step n={++step} title={t.markTitle}>
                <p className="mb-3 text-sm text-[#4A5872]">{touch ? t.markHintTouch : t.markHint}</p>
                <button type="button" onClick={toggleMarking} aria-pressed={commenting}
                  className={`flex w-full items-center justify-center gap-2 ${btn} ${commenting ? 'border-2 bg-white' : 'bg-[#1E5EFF] text-white hover:bg-[#1a52e0]'}`}
                  style={commenting ? { borderColor: RED, color: RED } : undefined}>
                  <MarkIcon />{commenting ? t.markStop : t.mark}
                </button>
              </Step>
            )}

            {!approved && (
              <Step n={++step} title={t.generalTitle}>
                <p className="mb-2 text-sm text-[#4A5872]">{t.generalHint}</p>
                <textarea id="wsr-general" value={general} maxLength={2000} rows={3} onChange={(e) => setGeneral(e.target.value)} placeholder={t.generalPh}
                  className="w-full rounded-lg border border-[#D5DCE8] px-3 py-2 text-sm" />
                <div className="mt-2 flex justify-end">
                  <button type="button" disabled={busy || !general.trim()} onClick={saveGeneral} className={`${btn} bg-[#0F2440] py-1.5 text-white`}>{t.save}</button>
                </div>
              </Step>
            )}

            <Step n={++step} title={approved ? t.comments : t.sendTitle}>
              {!approved && <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#7A879B]">{t.comments} ({comments.length})</h3>}
              {comments.length === 0 ? (
                <p className="text-sm text-[#7A879B]">{t.none}</p>
              ) : (
                <ul className="divide-y divide-[#EEF2F8] rounded-xl border border-[#E4E9F2]">
                  {comments.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => focusComment(c)} className={`block w-full px-3 py-2.5 text-left ${active === c.id ? 'bg-[#EEF3FF]' : 'hover:bg-[#F5F7FB]'}`}>
                        <div className="flex items-center gap-2 text-xs text-[#7A879B]">
                          <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold text-white ${c.kind === 'pin' ? 'bg-[#1E5EFF]' : 'bg-[#9AA7BC]'}`}>{c.kind === 'pin' ? pinNumber.get(c.id) : '·'}</span>
                          <span className="font-semibold text-[#0F2440]">{c.author}</span>
                          <span className="truncate">{c.kind === 'pin' ? c.pageTitle || '' : t.generalLabel}{c.device === 'phone' ? ` · ${t.onPhone}` : ''}</span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-[#0F2440]">{c.body}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {c.carryOver && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{t.carry}</span>}
                          {c.status === 'addressed' && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">{t.addressed}</span>}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!approved && (
                <div className="mt-3">
                  <button type="button" disabled={busy || !unsent} onClick={send} className={`w-full ${btn} bg-[#1E5EFF] text-white hover:bg-[#1a52e0]`}>
                    {t.send}{unsent ? ` (${unsent})` : ''}
                  </button>
                  <p className="mt-1.5 text-center text-xs text-[#7A879B]">{t.sendHint}</p>
                </div>
              )}
            </Step>

            {(canChoose || canApprove) && (
              <Step n={++step} title={canChoose ? t.decideTitle : t.approveTitle}>
                <p className="mb-3 text-sm text-[#4A5872]">{canChoose ? t.chooseHint : t.approveHint}</p>
                <button type="button" onClick={() => setModal(canChoose ? 'choose' : 'approve')}
                  className={`w-full ${btn} text-white ${canChoose ? 'bg-[#0F2440] hover:bg-[#1b3558]' : 'bg-emerald-700 hover:bg-emerald-800'}`}>
                  {canChoose ? fill(t.choose, { n: num(tab) }) : t.approve}
                </button>
              </Step>
            )}

            {summary && (
              <details className="rounded-xl border border-[#E4E9F2] p-3 text-sm">
                <summary className="cursor-pointer font-semibold">{t.changes}</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[#4A5872]">
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
            <h2 className="text-lg font-semibold">{modal === 'choose' ? fill(t.chooseModal, { n: num(tab) }) : t.approveModal}</h2>
            <p className="mt-2 text-sm text-[#4A5872]">{modal === 'choose' ? fill(t.chooseText, { n: num(tab), m: num(other) }) : t.approveText}</p>
            {!name.trim() && <div className="mt-4">{nameField('wsr-name-modal')}</div>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setModal(null)} className="rounded-lg px-4 py-2 text-sm font-semibold text-[#4A5872] hover:bg-[#F5F7FB]">{t.cancel}</button>
              <button type="button" disabled={busy || !name.trim()} onClick={confirm} className="rounded-lg bg-[#0F2440] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                {modal === 'choose' ? fill(t.chooseYes, { n: num(tab) }) : t.approveYes}
              </button>
            </div>
          </div>
        </div>
      )}

      {guide && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="wsr-guide-title">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl sm:p-7">
            <h2 id="wsr-guide-title" className="text-xl font-bold">{t.guideTitle}</h2>
            <p className="mt-1 text-sm text-[#7A879B]">{data.company}</p>
            <ol className="mt-5 space-y-4">
              {[
                [t.guide1Title, t.guide1],
                [t.guide2Title, touch ? t.guide2Touch : t.guide2],
                [t.guide3Title, t.guide3],
              ].map(([title, text], i) => (
                <li key={title} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#0F2440] text-sm font-bold text-white">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{title}</div>
                    <p className="mt-0.5 text-sm leading-relaxed text-[#4A5872]">{text}</p>
                  </div>
                  {i === 1 && <div className="hidden shrink-0 sm:block"><MarkPicture /></div>}
                </li>
              ))}
            </ol>
            <button type="button" onClick={closeGuide} className="mt-6 w-full rounded-lg bg-[#1E5EFF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1a52e0]">{t.guideGo}</button>
          </div>
        </div>
      )}
      {toast && <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[#0F2440] px-4 py-2.5 text-sm font-medium text-white shadow-lg">{toast}</div>}
    </div>
  );
}
