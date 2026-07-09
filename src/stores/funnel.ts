'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Answers, Catalog, Voucher } from '@/lib/types';
import { EMPTY_ANSWERS, pickAnswer, type QuestionDef } from '@/lib/questions';
import { isAddonIncluded, isAddonVisible } from '@/lib/pricing/engine';
import { recommend, recSet } from '@/lib/pricing/recommend';

export type FunnelStep =
  | 'intro'
  | 'persona'
  | 'questions'
  | 'config'
  | 'lead'
  | 'stage2'
  | 'done';

export interface LeadForm {
  vorname: string;
  nachname: string;
  firma: string;
  email: string;
  tel: string;
  ziel: string;
  consent: boolean;
}

export interface UploadedFile {
  name: string;
}

interface FunnelState {
  step: FunnelStep;
  url: string;
  persona: string | null;
  answers: Answers;
  bundle: string | null; // explicit user choice; null = follow recommendation
  sel: Record<string, boolean>;
  recSel: Record<string, boolean>; // "empfohlen"-marked add-ons for the current bundle
  qty: Record<string, number>;
  care: string | null;
  support: string;
  cf: string;
  backupUp: boolean;
  aiBundle: boolean;
  payYearly: boolean;
  promoInput: string;
  voucher: Voucher | null;
  promoMsg: 'empty' | 'invalid' | null;
  lead: LeadForm;
  leadErr: Partial<Record<keyof LeadForm, string>>;
  leadId: string | null;
  calendlyBooked: boolean;
  s2: Record<string, string>;
  goal: string | null;
  drive: string;
  logoFiles: UploadedFile[];
  fotoFiles: UploadedFile[];
  openSec: string | null;

  go: (step: FunnelStep) => void;
  setUrl: (url: string) => void;
  pickPersona: (catalog: Catalog, personaId: string) => void;
  answer: (q: QuestionDef, val: string) => void;
  toConfig: (catalog: Catalog) => void;
  pickBundle: (catalog: Catalog, bundleId: string) => void;
  toggleAddon: (id: string) => void;
  setQty: (id: string, n: number) => void;
  setCare: (id: string) => void;
  setSupport: (id: string) => void;
  setCf: (id: string) => void;
  toggleBackup: () => void;
  toggleAiBundle: () => void;
  setPayYearly: (v: boolean) => void;
  setPromoInput: (v: string) => void;
  setVoucher: (v: Voucher | null) => void;
  setPromoMsg: (m: 'empty' | 'invalid' | null) => void;
  setLeadField: (key: keyof LeadForm, value: string | boolean) => void;
  setLeadErr: (errs: Partial<Record<keyof LeadForm, string>>) => void;
  setLeadId: (id: string) => void;
  setCalendlyBooked: (v: boolean) => void;
  setS2: (key: string, value: string) => void;
  setGoal: (goal: string | null) => void;
  setDrive: (v: string) => void;
  addFiles: (kind: 'logo' | 'foto', files: UploadedFile[]) => void;
  setOpenSec: (id: string | null) => void;
  restart: () => void;
}

const initialLead: LeadForm = {
  vorname: '',
  nachname: '',
  firma: '',
  email: '',
  tel: '',
  ziel: '',
  consent: false,
};

/** Resolve the effective bundle: explicit choice, else recommendation, else gold. */
export function currentBundle(state: Pick<FunnelState, 'bundle' | 'answers' | 'persona'>): string {
  if (state.bundle) return state.bundle;
  if (state.persona) return recommend(state.answers).bundle;
  return 'gold';
}

export const useFunnel = create<FunnelState>()(
  persist(
    (set, get) => ({
      step: 'intro',
      url: '',
      persona: null,
      answers: { ...EMPTY_ANSWERS },
      bundle: null,
      sel: {},
      recSel: {},
      qty: {},
      care: null,
      support: 'none',
      cf: 'none',
      backupUp: false,
      aiBundle: false,
      payYearly: true,
      promoInput: '',
      voucher: null,
      promoMsg: null,
      lead: { ...initialLead },
      leadErr: {},
      leadId: null,
      calendlyBooked: false,
      s2: {},
      goal: null,
      drive: '',
      logoFiles: [],
      fotoFiles: [],
      openSec: 'unternehmen',

      go: (step) => {
        set({ step });
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' });
      },
      setUrl: (url) => set({ url }),

      pickPersona: (catalog, personaId) => {
        const persona = catalog.personas.find((p) => p.id === personaId);
        set({
          persona: personaId,
          answers: {
            ...EMPTY_ANSWERS,
            ...(persona?.default_answers ?? {}),
            aiHas: [],
            aiMissing: [],
          },
        });
        get().go('questions');
      },

      answer: (q, val) => set({ answers: pickAnswer(get().answers, q, val) }),

      toConfig: (catalog) => {
        const { answers, persona, url, care, cf } = get();
        const rec = recommend(answers);
        const recommendedSet = recSet(catalog, answers, persona, rec.bundle, url);
        set({
          bundle: null,
          sel: { ...recommendedSet },
          recSel: recommendedSet,
          care: care || 'plus',
          cf: cf !== 'none' ? cf : 'shield',
        });
        get().go('config');
      },

      pickBundle: (catalog, bundleId) => {
        const { answers, persona, url, sel } = get();
        const recommendedSet = recSet(catalog, answers, persona, bundleId, url);
        const keep: Record<string, boolean> = {};
        Object.keys(sel).forEach((id) => {
          const addon = catalog.addons.find((a) => a.id === id);
          if (
            addon &&
            sel[id] &&
            isAddonVisible(addon, bundleId) &&
            !isAddonIncluded(addon, bundleId, false)
          ) {
            keep[id] = true;
          }
        });
        set({ bundle: bundleId, sel: { ...recommendedSet, ...keep }, recSel: recommendedSet });
      },

      toggleAddon: (id) => set({ sel: { ...get().sel, [id]: !get().sel[id] } }),
      setQty: (id, n) => set({ qty: { ...get().qty, [id]: n } }),
      setCare: (id) => set({ care: id }),
      setSupport: (id) => set({ support: id }),
      setCf: (id) => set({ cf: id }),
      toggleBackup: () => set({ backupUp: !get().backupUp }),
      toggleAiBundle: () => set({ aiBundle: !get().aiBundle }),
      setPayYearly: (v) => set({ payYearly: v }),
      setPromoInput: (v) => set({ promoInput: v.toUpperCase(), promoMsg: null }),
      setVoucher: (v) => set({ voucher: v, promoMsg: null }),
      setPromoMsg: (m) => set({ promoMsg: m }),
      setLeadField: (key, value) =>
        set({
          lead: { ...get().lead, [key]: value },
          leadErr: { ...get().leadErr, [key]: undefined },
        }),
      setLeadErr: (errs) => set({ leadErr: errs }),
      setLeadId: (id) => set({ leadId: id }),
      setCalendlyBooked: (v) => set({ calendlyBooked: v }),
      setS2: (key, value) => set({ s2: { ...get().s2, [key]: value } }),
      setGoal: (goal) => set({ goal }),
      setDrive: (v) => set({ drive: v }),
      addFiles: (kind, files) =>
        kind === 'logo'
          ? set({ logoFiles: [...get().logoFiles, ...files] })
          : set({ fotoFiles: [...get().fotoFiles, ...files] }),
      setOpenSec: (id) => set({ openSec: id }),

      restart: () =>
        set({
          step: 'intro',
          url: '',
          persona: null,
          answers: { ...EMPTY_ANSWERS },
          bundle: null,
          sel: {},
          recSel: {},
          qty: {},
          care: null,
          support: 'none',
          cf: 'none',
          backupUp: false,
          aiBundle: false,
          payYearly: true,
          promoInput: '',
          voucher: null,
          promoMsg: null,
          lead: { ...initialLead },
          leadErr: {},
          leadId: null,
          calendlyBooked: false,
          s2: {},
          goal: null,
          drive: '',
          logoFiles: [],
          fotoFiles: [],
          openSec: 'unternehmen',
        }),
    }),
    {
      name: 'ipaas-konfigurator-v3',
      partialize: (state) => {
        const { logoFiles, fotoFiles, leadErr, ...rest } = state;
        void logoFiles;
        void fotoFiles;
        void leadErr;
        // Never restore into the finished state (matches the prototype).
        return { ...rest, step: rest.step === 'done' ? 'intro' : rest.step };
      },
    },
  ),
);
