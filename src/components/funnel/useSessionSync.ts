'use client';

import { useEffect, useRef, useState } from 'react';
import { isValidSessionId } from '@/lib/session-id';
import { useFunnel, toSessionState, type QuoteMeta, type SessionState } from '@/stores/funnel';

const SAVE_DEBOUNCE_MS = 2000;

/** `?c=<id>` — the shareable handle for a funnel session. */
export const SESSION_PARAM = 'c';

export function sessionShareUrl(sessionId: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set(SESSION_PARAM, sessionId);
  url.hash = '';
  return url.toString();
}

function writeSessionIdToUrl(sessionId: string) {
  const url = new URL(window.location.href);
  if (url.searchParams.get(SESSION_PARAM) === sessionId) return;
  url.searchParams.set(SESSION_PARAM, sessionId);
  window.history.replaceState(null, '', url.toString());
}

function clearSessionIdFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(SESSION_PARAM)) return;
  url.searchParams.delete(SESSION_PARAM);
  window.history.replaceState(null, '', url.toString());
}

interface RestoredSession {
  state: SessionState;
  quote: QuoteMeta | null;
}

async function restoreSession(id: string): Promise<RestoredSession | null | 'error'> {
  try {
    const res = await fetch(`/api/sessions/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) return 'error';
    const body = (await res.json()) as { state?: SessionState; quote?: QuoteMeta | null };
    return body.state ? { state: body.state, quote: body.quote ?? null } : null;
  } catch {
    return 'error';
  }
}

/**
 * Keeps the funnel state mirrored to a server-side session so the questionnaire can be
 * resumed from a shared link on any device — and, once submitted, so the customer's link
 * keeps working as their live quote.
 *
 * A session is minted on the first real signal (the persona pick, see `pickPersona`), so
 * the landing page keeps a clean URL. On mount, a `?c=<id>` link is restored from the
 * server when the id is not the one this browser is already working on; a browser's own
 * link is only re-pulled when the session is bound to a quote (the team may have changed it
 * from the admin meanwhile). A dead link starts fresh and says so — it never adopts the id,
 * which used to re-create the row from blank state.
 *
 * Afterwards every state change is written back, debounced — except the very first write
 * of a new session, which is flushed immediately so uploads (which require the session
 * row to exist) can't race it. A closed quote (`won` / `lost`) stops saving.
 */
export function useSessionSync() {
  const [ready, setReady] = useState(false);
  const restoringRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const store = useFunnel.getState();
      const paramId = new URLSearchParams(window.location.search).get(SESSION_PARAM);
      const hasLink = !!paramId && isValidSessionId(paramId);

      if (hasLink && paramId !== store.sessionId) {
        // A link from elsewhere (or another device): the server holds its state.
        restoringRef.current = true;
        const restored = await restoreSession(paramId!);
        if (!cancelled && restored && restored !== 'error') {
          // Prime the "last saved" snapshot so restoring doesn't immediately write back.
          lastSavedRef.current = JSON.stringify(restored.state);
          store.hydrateFromSession({ ...restored.state, sessionId: paramId! }, restored.quote);
        } else if (!cancelled && restored === null) {
          // Dead link: start fresh and say so.
          store.restart();
          store.setNotice('link_dead');
          clearSessionIdFromUrl();
        } else if (!cancelled) {
          // Server hiccup: keep the id so a retry (reload) still resolves the link.
          store.setSessionId(paramId!);
        }
        restoringRef.current = false;
      } else if (hasLink) {
        if (store.quote || store.leadId) {
          // A bound quote can change from the admin (team mode) while this tab is closed:
          // the server copy wins over localStorage.
          restoringRef.current = true;
          const restored = await restoreSession(paramId!);
          if (!cancelled && restored && restored !== 'error') {
            lastSavedRef.current = JSON.stringify(restored.state);
            store.hydrateFromSession({ ...restored.state, sessionId: paramId! }, restored.quote);
          } else if (!cancelled && restored === null) {
            store.restart();
            store.setNotice('link_dead');
            clearSessionIdFromUrl();
          }
          restoringRef.current = false;
        } else {
          // Our own link — a reload. localStorage already holds the freshest state, and
          // writes are debounced, so never pull the (possibly older) server copy back.
          writeSessionIdToUrl(store.sessionId!);
        }
      } else if (store.sessionId && store.quote) {
        // A submitted quote stays reachable: put its link back instead of starting over.
        writeSessionIdToUrl(store.sessionId);
      } else if (store.sessionId) {
        // Visiting the site without a link is a new visit, not a resume: the previous run
        // stays reachable through its own `?c=` link, but this one starts at the intro.
        restoringRef.current = true;
        store.restart();
        restoringRef.current = false;
        clearSessionIdFromUrl();
      }
      // No link and no session: the landing page. A session is minted on the persona pick.

      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    const save = (state: ReturnType<typeof useFunnel.getState>) => {
      if (!state.sessionId || restoringRef.current) return;
      // A closed quote is read-only for the customer; the team still edits it.
      if (state.quote?.locked && !state.teamMode) return;
      const payload = toSessionState(state);
      const serialized = JSON.stringify(payload);
      if (serialized === lastSavedRef.current) return;
      lastSavedRef.current = serialized;

      void fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: state.sessionId, state: payload }),
        keepalive: true,
      })
        .then((res) => {
          if (res.status === 403) {
            // The quote was closed meanwhile: stop saving and let the banner explain.
            const current = useFunnel.getState();
            if (current.quote) current.setQuote({ ...current.quote, locked: true });
          }
        })
        .catch(() => {
          // Sharing is best-effort; localStorage still holds the state.
          lastSavedRef.current = '';
        });
    };

    // Write the initial state so a link shared before any edit already resolves.
    save(useFunnel.getState());

    const unsubscribe = useFunnel.subscribe((state, prev) => {
      if (state.sessionId !== prev.sessionId) {
        lastSavedRef.current = '';
        if (timerRef.current) clearTimeout(timerRef.current);
        if (state.sessionId) {
          // Minting a session: the address bar must follow it, and the row must exist
          // before the first upload can attach to it — so write it now, not later.
          writeSessionIdToUrl(state.sessionId);
          save(state);
        } else {
          // `restart()` drops back to the intro with no session of its own.
          clearSessionIdFromUrl();
        }
        return;
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => save(state), SAVE_DEBOUNCE_MS);
    });

    // Don't let a debounced write die with the page: a link shared right after an edit
    // must already resolve to that edit.
    const flush = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      save(useFunnel.getState());
    };
    window.addEventListener('pagehide', flush);

    return () => {
      window.removeEventListener('pagehide', flush);
      if (timerRef.current) clearTimeout(timerRef.current);
      unsubscribe();
    };
  }, [ready]);

  return ready;
}
