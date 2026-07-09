// Shared constants for the e2e suite, derived from supabase/seed.sql.
// Keep IDs/prices in sync with the seed so pricing assertions stay valid.

/** Unique per-run token so parallel/repeat runs never collide, and teardown can target rows. */
export const RUN_ID = `${Date.now()}`;

/** All test leads use this pattern; global teardown deletes `email like 'e2e-%@example.com'`. */
export const testEmail = (tag = '') => `e2e-${RUN_ID}${tag ? `-${tag}` : ''}@example.com`;

/** All test vouchers start with E2E so teardown can delete `code like 'E2E%'`. */
export const testVoucherCode = (tag = '') => `E2E${RUN_ID}${tag}`.toUpperCase();

/** Seeded voucher: 20% off, applies to one-time + recurring. */
export const SEEDED_VOUCHER = { code: 'TKFF20', percent: 20, scope: 'both' as const };

/** Gastro persona recommends the Gold bundle with cookie+maps+foto+bookembed + CF Shield. */
export const GASTRO = {
  persona: 'gastro',
  recBundleName: 'Gold',
  // 2990 + 350 (cookie) + 190 (maps) + 290 (foto) + 490 (booking) + 150 (CF Shield setup)
  sumOnceDe: '€4.460',
  sumOnceEn: '€4,460',
  // (89 care Plus + 39 CF Shield) × 0.82 yearly discount
  sumMonthlyDe: '€104,96/Mon.',
  sumMonthlyEn: '€104.96/mo.',
  // without the 18% yearly discount
  sumMonthlyMonthlyDe: '€128,00/Mon.',
  // TKFF20 −20% on both totals
  sumOnceDiscountedDe: '€3.568',
  sumMonthlyDiscountedDe: '€83,97/Mon.',
};

export const START_BUTTON = { de: 'Jetzt starten', en: 'Start now' } as const;

/** A fully-formed lead for UI form fills. */
export const LEAD = {
  vorname: 'Erika',
  nachname: 'Musterfrau',
  firma: 'E2E Gasthaus GmbH',
  tel: '+49 170 1234567',
  ziel: 'Mehr Tischreservierungen über Google.',
};

/** A valid `POST /api/leads` selection (gastro/gold defaults) for seeding leads without the UI. */
export function leadApiPayload(email: string, opts?: { voucherCode?: string }) {
  return {
    locale: 'de',
    lead: {
      vorname: LEAD.vorname,
      nachname: LEAD.nachname,
      firma: LEAD.firma,
      email,
      tel: LEAD.tel,
      ziel: LEAD.ziel,
      consent: true,
    },
    selection: {
      answers: {
        hasSite: 'none',
        selfbuilt: null,
        aiHas: [],
        aiMissing: [],
        byowScope: null,
        pages: '14',
        langs: '1',
        contact: 'form',
        fees: null,
        shop: 'nein',
        blog: 'nein',
        assets: 'ja',
      },
      personaId: 'gastro',
      sourceUrl: '',
      bundle: 'gold',
      selectedAddons: {},
      qty: {},
      care: 'plus',
      support: 'none',
      cf: 'shield',
      backupUp: false,
      aiBundle: false,
      payYearly: true,
      voucher: opts?.voucherCode ? { code: opts.voucherCode, percent: 20, scope: 'both' } : null,
    },
  };
}
