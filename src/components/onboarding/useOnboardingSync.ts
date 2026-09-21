'use client';

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { Locale } from '@/lib/types';
import { mergePatch } from '@/lib/onboarding/logic';
import type { Answer, Answers, OnboardingFormRecord } from '@/lib/onboarding/types';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

export interface PendingPatch {
  changes: Record<string, Answer | null>;
  current_step?: string | null;
  locale?: Locale;
}

export interface SaveNotice {
  removed: Answers;
  redactions: number;
}

const DEBOUNCE_MS = 800;
const RETRY_MS = 5000;

function mergePending(a: PendingPatch, b: PendingPatch): PendingPatch {
  return {
    changes: { ...a.changes, ...b.changes },
    ...(b.current_step !== undefined ? { current_step: b.current_step } : a.current_step !== undefined ? { current_step: a.current_step } : {}),
    ...(b.locale ? { locale: b.locale } : a.locale ? { locale: a.locale } : {}),
  };
}

function isEmptyPatch(p: PendingPatch): boolean {
  return !Object.keys(p.changes).length && p.current_step === undefined && !p.locale;
}

/**
 * Field-level autosave against PATCH /api/onboarding/<id>.
 *
 * Only what changed since the last save is sent, together with the revision the client
 * last saw. A 409 `stale` (another tab won) takes the server's row, re-applies this tab's
 * pending changes on top and retries once. Network failures keep the changes queued and
 * retry; `pagehide` flushes so the last edit before closing the tab is never lost (the
 * body is small, so `keepalive` is safe).
 */
export function useOnboardingSync(
  formId: string,
  record: OnboardingFormRecord,
  setRecord: Dispatch<SetStateAction<OnboardingFormRecord>>,
  onSaved?: (notice: SaveNotice) => void,
) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const pendingRef = useRef<PendingPatch>({ changes: {} });
  const recordRef = useRef(record);
  const inFlightRef = useRef(false);
  const againRef = useRef(false);
  const retriedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSavedRef = useRef(onSaved);
  // flush() re-enters itself (retry, queued second pass); a ref avoids a self-reference.
  const flushRef = useRef<(opts?: { keepalive?: boolean }) => Promise<void>>(async () => {});

  useEffect(() => {
    recordRef.current = record;
  }, [record]);
  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  const applyServerRecord = useCallback(
    (server: OnboardingFormRecord, reapply: PendingPatch) => {
      const merged: OnboardingFormRecord = {
        ...server,
        answers: mergePatch(server.answers, reapply.changes),
        current_step: reapply.current_step !== undefined ? reapply.current_step : server.current_step,
        locale: reapply.locale ?? server.locale,
      };
      recordRef.current = merged;
      setRecord(merged);
    },
    [setRecord],
  );

  const flush = useCallback(
    async (opts: { keepalive?: boolean } = {}) => {
      if (inFlightRef.current) {
        againRef.current = true;
        return;
      }
      const snapshot = pendingRef.current;
      if (isEmptyPatch(snapshot)) return;
      pendingRef.current = { changes: {} };
      inFlightRef.current = true;
      setStatus('saving');

      const baseRev = recordRef.current.rev;
      try {
        const res = await fetch(`/api/onboarding/${formId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base_rev: baseRev, ...snapshot }),
          keepalive: opts.keepalive,
        });

        if (res.status === 409) {
          const body = (await res.json()) as { error: string; record: OnboardingFormRecord | null };
          if (body.error === 'confirmed' && body.record) {
            applyServerRecord(body.record, { changes: {} });
            setStatus('saved');
            return;
          }
          if (body.record) {
            // Another tab moved the record on: rebase our changes and try once more.
            const reapply = mergePending(snapshot, pendingRef.current);
            applyServerRecord(body.record, reapply);
            pendingRef.current = reapply;
            if (!retriedRef.current) {
              retriedRef.current = true;
              againRef.current = true;
            } else {
              setStatus('error');
            }
            return;
          }
          throw new Error(body.error);
        }
        if (!res.ok) throw new Error(`save failed: ${res.status}`);

        const body = (await res.json()) as { record: OnboardingFormRecord; removed: Answers; redactions: number };
        applyServerRecord(body.record, pendingRef.current);
        retriedRef.current = false;
        setStatus('saved');
        if (Object.keys(body.removed ?? {}).length || body.redactions) {
          onSavedRef.current?.({ removed: body.removed ?? {}, redactions: body.redactions ?? 0 });
        }
      } catch {
        // Keep everything queued; retry after a pause (or as soon as the next edit lands).
        pendingRef.current = mergePending(snapshot, pendingRef.current);
        setStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => void flushRef.current(), RETRY_MS);
      } finally {
        inFlightRef.current = false;
        if (againRef.current) {
          againRef.current = false;
          void flushRef.current();
        }
      }
    },
    [applyServerRecord, formId],
  );
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const queue = useCallback(
    (patch: PendingPatch) => {
      pendingRef.current = mergePending(pendingRef.current, patch);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void flush(), DEBOUNCE_MS);
    },
    [flush],
  );

  useEffect(() => {
    const onPageHide = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      void flush({ keepalive: true });
    };
    const onOnline = () => void flush();
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('online', onOnline);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [flush]);

  return { status, queue, flush };
}
