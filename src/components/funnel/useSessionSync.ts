'use client';

import { useEffect, useRef, useState } from 'react';
import { isValidSessionId } from '@/lib/session-id';
import { useFunnel, toSessionState, type SessionState } from '@/stores/funnel';

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

async function restoreSession(id: string): Promise<SessionState | null> {
  const res = await fetch(`/api/sessions/${id}`);
  if (!res.ok) return null;
  const body = (await res.json()) as { state?: SessionState };
  return body.state ?? null;
}

/**
 * Keeps the funnel state mirrored to a server-side session so the questionnaire can be
 * resumed from a shared link on any device.
 *
 * A session is minted only when the visitor actually starts a questionnaire (see
 * `startSession`), so the landing page keeps a clean URL. On mount, a `?c=<id>` link is
 * restored from the server **only when the id is not the one this browser is already
 * working on**: reloading your own tab must not pull back the server copy, since writes
 * are debounced and it can lag the state held in localStorage.
 *
 * Afterwards every state change is written back, debounced — except the very first write
 * of a new session, which is flushed immediately so uploads (which require the session
 * row to exist) can't race it.
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
        const state = await restoreSession(paramId!);
        if (!cancelled && state) {
          // Prime the "last saved" snapshot so restoring doesn't immediately write back.
          lastSavedRef.current = JSON.stringify(state);
          store.hydrateFromSession({ ...state, sessionId: paramId });
        } else if (!cancelled) {
          // Link is dead: keep the id so the visitor's own work is still shareable.
          store.setSessionId(paramId!);
        }
        restoringRef.current = false;
      } else if (hasLink) {
        // Our own link — a reload. localStorage already holds the freshest state, and
        // writes are debounced, so never pull the (possibly older) server copy back.
        writeSessionIdToUrl(store.sessionId!);
      } else if (store.sessionId) {
        // Visiting the site without a link is a new visit, not a resume: the previous run
        // stays reachable through its own `?c=` link, but this one starts at the intro.
        restoringRef.current = true;
        store.restart();
        restoringRef.current = false;
        clearSessionIdFromUrl();
      }
      // No link and no session: the landing page. A session is minted on "start".

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
      const payload = toSessionState(state);
      const serialized = JSON.stringify(payload);
      if (serialized === lastSavedRef.current) return;
      lastSavedRef.current = serialized;

      void fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: state.sessionId, state: payload }),
        keepalive: true,
      }).catch(() => {
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
          // Starting mints a session: the address bar must follow it, and the row must
          // exist before the first upload can attach to it — so write it now, not later.
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
