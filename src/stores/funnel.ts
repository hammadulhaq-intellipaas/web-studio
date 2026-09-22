'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Answers, Catalog, Voucher } from '@/lib/types';
import { EMPTY_ANSWERS, pickAnswer, type QuestionDef } from '@/lib/questions';
import { isAddonIncluded, isAddonVisible } from '@/lib/pricing/engine';
import { recommend, recSet } from '@/lib/pricing/recommend';
import { generateSessionId } from '@/lib/session-id';
import {
  INITIAL_LEAD_FORM,
  currentBundle,
  toSessionState,
  type FileKind,
  type FunnelStep,
  type LeadForm,
  type QuoteMeta,
  type SessionState,
  type UploadedFile,
} from '@/lib/funnel/state';

// The data shapes live in a React-free module so server code can share them.
export { currentBundle, toSessionState };
export type { FileKind, FunnelStep, LeadForm, QuoteMeta, SessionState, UploadedFile };

/** Transient notices shown on the intro (never persisted). */
export type FunnelNotice = 'link_dead' | null;

/** Which thank-you screen a submit ends on (never persisted). */
export type DoneVariant = 'new' | 'updated' | 'team';

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
  selectedSubAddons: Record<string, string[]>; // selected sub-addons for each addon (e.g., widget types)
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
  /** Set when this session is bound to a submitted (or team-created) quote. */
  quote: QuoteMeta | null;
  /** True right after a submit in this tab: shows the booking panel once, never restored. */
  justSubmitted: boolean;
  /** A signed-in team member editing a customer's quote (server-verified, never persisted). */
  teamMode: boolean;
  notice: FunnelNotice;
  doneVariant: DoneVariant;
  calendlyBooked: boolean;
  s2: Record<string, string>;
  goal: string | null;
  drive: string;
  logoFiles: UploadedFile[];
  fotoFiles: UploadedFile[];
  openSec: string | null;

  go: (step: FunnelStep) => void;
  startSession: () => void;
  setSessionId: (id: string) => void;
  hydrateFromSession: (state: Partial<SessionState> & { sessionId?: string }, quote?: QuoteMeta | null) => void;
  setQuote: (quote: QuoteMeta | null) => void;
  setJustSubmitted: (v: boolean) => void;
  setTeamMode: (v: boolean) => void;
  setNotice: (n: FunnelNotice) => void;
  setDoneVariant: (v: DoneVariant) => void;
  setUrl: (url: string) => void;
  setSiteNotes: (v: string) => void;
  pickPersona: (catalog: Catalog, personaId: string) => void;
  answer: (q: QuestionDef, val: string) => void;
  toConfig: (catalog: Catalog) => void;
  pickBundle: (catalog: Catalog, bundleId: string) => void;
  toggleAddon: (id: string) => void;
  setQty: (id: string, n: number) => void;
  setSubAddons: (addonId: string, ids: string[]) => void;
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

const initialLead: LeadForm = { ...INITIAL_LEAD_FORM };

/** A blank questionnaire back at the intro. The session is minted on the persona pick. */
function freshState() {
  return {
    sessionId: null,
    step: 'intro' as FunnelStep,
    url: '',
    siteNotes: '',
    siteFiles: [] as UploadedFile[],
    persona: null,
    answers: { ...EMPTY_ANSWERS },
    bundle: null,
    sel: {},
    recSel: {},
    qty: {},
    selectedSubAddons: {},
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
    quote: null,
    justSubmitted: false,
    teamMode: false,
    notice: null as FunnelNotice,
    doneVariant: 'new' as DoneVariant,
    calendlyBooked: false,
    s2: {},
    goal: null,
    drive: '',
    logoFiles: [] as UploadedFile[],
    fotoFiles: [] as UploadedFile[],
    openSec: null,
  };
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
      selectedSubAddons: {},
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
      quote: null,
      justSubmitted: false,
      teamMode: false,
      notice: null,
      doneVariant: 'new',
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
      // A session row saved before sub-options existed carries no `selectedSubAddons`
      // key, and a shallow set() would then leave the *recipient's* own ticks in place
      // instead of the sender's. Reset it explicitly so a shared link always shows the
      // configuration it was shared with. The quote binding is server truth (it is not
      // part of the mirrored state), so it is reset here too — never inherited.
      hydrateFromSession: (state, quote = null) => {
        const step = state.step;
        set({
          selectedSubAddons: {},
          ...(state as Partial<FunnelState>),
          quote,
          leadId: quote?.leadId ?? null,
          justSubmitted: false,
          calendlyBooked: false,
          // A bound quote reopens on the configurator (with the quote banner), never on
          // the contact form or the thank-you screen.
          ...(quote && (step === 'lead' || step === 'done') ? { step: 'config' as FunnelStep } : {}),
        });
      },
      setQuote: (quote) => set({ quote, leadId: quote?.leadId ?? get().leadId }),
      setJustSubmitted: (v) => set({ justSubmitted: v }),
      setTeamMode: (v) => set({ teamMode: v }),
      setNotice: (n) => set({ notice: n }),
      setDoneVariant: (v) => set({ doneVariant: v }),
      setUrl: (url) => set({ url }),
      setSiteNotes: (siteNotes) => set({ siteNotes }),

      // The first real signal mints the shareable session (not the click on "start"),
      // so a bounce from the landing page leaves no row behind. Minted in the same set()
      // as the persona so the immediate first write already carries it.
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
          ...(get().sessionId ? {} : { sessionId: generateSessionId() }),
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
      // Callers resolve the new list through `subAddonsOf` first; an empty list is
      // rejected here too so no path can price a selected add-on at zero.
      setSubAddons: (addonId, ids) => {
        if (!ids.length) return;
        set({ selectedSubAddons: { ...get().selectedSubAddons, [addonId]: ids } });
      },
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

      // Pressing "start" always begins a brand-new questionnaire instance; a previous
      // run's link keeps its own state. The session id itself is minted on the persona pick.
      startSession: () => {
        set({ ...freshState(), teamMode: get().teamMode });
        get().go('persona');
      },

      restart: () => set({ ...freshState(), teamMode: get().teamMode }),
    }),
    {
      // v4: added sessionId/siteNotes/siteFiles and removed the stage2 step.
      name: 'ipaas-konfigurator-v4',
      partialize: (state) => {
        const { leadErr, teamMode, notice, justSubmitted, doneVariant, ...rest } = state;
        void leadErr;
        void teamMode;
        void notice;
        void justSubmitted;
        void doneVariant;
        // Never restore into the finished state (matches the prototype). A submitted
        // quote reopens on the configurator, where the quote banner explains the link.
        return {
          ...rest,
          step: rest.step === 'done' ? (rest.quote ? 'config' : 'intro') : rest.step,
        };
      },
    },
  ),
);
