'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Answer, Answers } from '@/lib/onboarding/types';

interface StashState {
  /** form id → answers of fields that were cleared because they became hidden. */
  stash: Record<string, Answers>;
  add: (formId: string, removed: Answers) => void;
  take: (formId: string, key: string) => Answer | undefined;
  clear: (formId: string) => void;
}

/**
 * Spec §03 says a hidden field's value must be cleared — and it is, on the server too.
 * But a client who toggles "changes to my site" → "new site" → "changes" again should not
 * have to retype the URL. The cleared values wait here (this browser only, never sent)
 * and are put back the moment the field reappears.
 */
export const useOnboardingStash = create<StashState>()(
  persist(
    (set, get) => ({
      stash: {},
      add: (formId, removed) => {
        if (!Object.keys(removed).length) return;
        set({ stash: { ...get().stash, [formId]: { ...(get().stash[formId] ?? {}), ...removed } } });
      },
      take: (formId, key) => {
        const mine = get().stash[formId];
        if (!mine || !(key in mine)) return undefined;
        const { [key]: value, ...rest } = mine;
        set({ stash: { ...get().stash, [formId]: rest } });
        return value;
      },
      clear: (formId) => {
        const { [formId]: _dropped, ...rest } = get().stash;
        void _dropped;
        set({ stash: rest });
      },
    }),
    { name: 'onboarding-stash-v1' },
  ),
);
