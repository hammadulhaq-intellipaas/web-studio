'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Answers, Catalog, Voucher } from '@/lib/types';
import { EMPTY_ANSWERS, pickAnswer, type QuestionDef } from '@/lib/questions';
import { isAddonIncluded, isAddonVisible } from '@/lib/pricing/engine';
import { recommend, recSet } from '@/lib/pricing/recommend';
import { generateSessionId } from '@/lib/session-id';

export type FunnelStep = 'intro' | 'persona' | 'questions' | 'config' | 'lead' | 'done';

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

/** Files uploaded before a lead exists; keyed to the funnel session. */
export type FileKind = 'logo' | 'foto' | 'site';

interface FunnelState {
  /** nanoid; identifies the shareable server-side copy of this funnel state. */
  sessionId: string | null;
  step: FunnelStep;
  url: string;
  /** Free-text notes about the existing website / concept (question 1). */
  siteNotes: string;
  siteFiles: UploadedFile[];
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
  setSessionId: (id: string) => void;
  hydrateFromSession: (state: Partial<FunnelState>) => void;
  setUrl: (url: string) => void;
  setSiteNotes: (v: string) => void;
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
  addFiles: (kind: FileKind, files: UploadedFile[]) => void;
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

/** Resolve the effective bundle: explicit choice, else recommendation, else the CMS default. */
export function currentBundle(
  state: Pick<FunnelState, 'bundle' | 'answers' | 'persona' | 'url'>,
  catalog: Catalog,
): string {
  if (state.bundle) return state.bundle;
  if (state.persona) return recommend(catalog, state.answers, state.url).bundle;
  return catalog.defaultBundle;
}

export const useFunnel = create<FunnelState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      step: 'intro',
      url: '',
      siteNotes: '',
      siteFiles: [],
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
      openSec: null,

      go: (step) => {
        set({ step });
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' });
      },
      setSessionId: (id) => set({ sessionId: id }),
      hydrateFromSession: (state) => set(state as Partial<FunnelState>),
      setUrl: (url) => set({ url }),
      setSiteNotes: (siteNotes) => set({ siteNotes }),

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
        const rec = recommend(catalog, answers, url);
        const recommendedSet = recSet(catalog, answers, persona, rec.bundle, url);
        set({
          bundle: null,
          sel: { ...recommendedSet },
          recSel: recommendedSet,
          care: care || catalog.defaultCarePlan,
          cf: cf !== 'none' ? cf : catalog.defaultCloudflarePlan,
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
      addFiles: (kind, files) => {
        if (kind === 'logo') set({ logoFiles: [...get().logoFiles, ...files] });
        else if (kind === 'foto') set({ fotoFiles: [...get().fotoFiles, ...files] });
        else set({ siteFiles: [...get().siteFiles, ...files] });
      },
      setOpenSec: (id) => set({ openSec: id }),

      restart: () =>
        set({
          // A fresh questionnaire gets a fresh shareable session.
          sessionId: generateSessionId(),
          step: 'intro',
          url: '',
          siteNotes: '',
          siteFiles: [],
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
          openSec: null,
        }),
    }),
    {
      // v4: added sessionId/siteNotes/siteFiles and removed the stage2 step.
      name: 'ipaas-konfigurator-v4',
      partialize: (state) => {
        const { leadErr, ...rest } = state;
        void leadErr;
        // Never restore into the finished state (matches the prototype).
        return { ...rest, step: rest.step === 'done' ? 'intro' : rest.step };
      },
    },
  ),
);

/**
 * The slice of funnel state mirrored to `funnel_sessions` so a shared `?c=<id>` link
 * reopens the questionnaire exactly as it was left — answers, configuration, voucher
 * and contact details included.
 */
export interface SessionState {
  step: FunnelStep;
  url: string;
  siteNotes: string;
  siteFiles: UploadedFile[];
  persona: string | null;
  answers: Answers;
  bundle: string | null;
  sel: Record<string, boolean>;
  recSel: Record<string, boolean>;
  qty: Record<string, number>;
  care: string | null;
  support: string;
  cf: string;
  backupUp: boolean;
  aiBundle: boolean;
  payYearly: boolean;
  promoInput: string;
  voucher: Voucher | null;
  lead: LeadForm;
  s2: Record<string, string>;
  goal: string | null;
  drive: string;
  logoFiles: UploadedFile[];
  fotoFiles: UploadedFile[];
}

export function toSessionState(s: SessionState): SessionState {
  return {
    // A shared link never drops the recipient into the finished screen.
    step: s.step === 'done' ? 'lead' : s.step,
    url: s.url,
    siteNotes: s.siteNotes,
    siteFiles: s.siteFiles,
    persona: s.persona,
    answers: s.answers,
    bundle: s.bundle,
    sel: s.sel,
    recSel: s.recSel,
    qty: s.qty,
    care: s.care,
    support: s.support,
    cf: s.cf,
    backupUp: s.backupUp,
    aiBundle: s.aiBundle,
    payYearly: s.payYearly,
    promoInput: s.promoInput,
    voucher: s.voucher,
    lead: s.lead,
    s2: s.s2,
    goal: s.goal,
    drive: s.drive,
    logoFiles: s.logoFiles,
    fotoFiles: s.fotoFiles,
  };
}
