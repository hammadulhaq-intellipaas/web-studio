import { describe, expect, it } from 'vitest';
import type { Lead } from '@/lib/types';
import { calcTotals } from '@/lib/pricing/engine';
import { hashSelection, priceSelection } from '@/lib/quotes/price';
import {
  normalizeSessionState,
  selectionFromLeadConfig,
  selectionFromState,
  stateFromLead,
  stateFromSubmission,
} from '@/lib/quotes/selection';
import { makeCatalog, makeSelection } from './fixtures/catalog';

const catalog = makeCatalog();

/** A lead row as the API stores it, priced from the given selection. */
function leadFrom(selection = makeSelection({})): Lead {
  const priced = priceSelection(catalog, selection, 'de', { siteNotes: 'alte Seite' });
  return {
    id: 'lead-1',
    locale: 'de',
    vorname: 'Erika',
    nachname: 'Musterfrau',
    firma: 'E2E GmbH',
    email: 'erika@example.com',
    telefon: '+49 170 1234567',
    ziel: 'Mehr Anfragen',
    consent_at: '2026-09-18T10:00:00Z',
    persona_id: selection.personaId,
    source_url: selection.sourceUrl || null,
    config: priced.config,
    total_one_time: priced.totals.oneTimeEffective,
    total_monthly: priced.totals.monthlyEffective,
    total_yearly: priced.totals.yearlyEffective,
    voucher_id: null,
    stage2: { fields: { firmenname: 'E2E GmbH' }, goal: 'termine', driveLink: '' },
    drive_link: null,
    goal: 'termine',
    status: 'new',
    session_id: null,
    source: 'customer',
    owner_email: null,
    archived_at: null,
    archived_by: null,
    submitted_at: '2026-09-18T10:00:00Z',
    agreed_version_id: null,
    agreed_one_time: null,
    agreed_monthly: null,
    agreed_at: null,
    agreed_by: null,
    created_at: '2026-09-18T10:00:00Z',
    updated_at: '2026-09-18T10:00:00Z',
  };
}

describe('priceSelection', () => {
  it('matches the engine totals and stores EUR raw prices on the lines', () => {
    const selection = makeSelection({ selectedAddons: { cookie: true }, cf: 'shield' });
    const { config, totals, receipt } = priceSelection(catalog, selection, 'de');
    expect(totals).toEqual(calcTotals(catalog, selection));
    expect(config.bundle).toBe('gold');
    expect(config.addons.map((a) => a.id)).toEqual(['cookie']);
    expect(config.lines.oneOff.reduce((s, l) => s + l.price, 0)).toBe(totals.oneTime);
    expect(config.lines.oneOff.map((l) => l.price)).toEqual(receipt.oneOff.map((l) => l.rawPrice));
    expect(config.siteNotes).toBe('');
  });

  it('records ticked sub-options and quantities on the add-on', () => {
    const selection = makeSelection({ selectedAddons: { widgets: true }, selectedSubAddons: { widgets: ['whatsapp', 'reviews'] } });
    const { config } = priceSelection(catalog, selection, 'de');
    const widgets = config.addons.find((a) => a.id === 'widgets')!;
    expect(widgets.subAddons).toEqual(['whatsapp', 'reviews']);
    expect(widgets.price).toBe(380);
  });

  it('refuses a bundle the catalog does not know', () => {
    expect(() => priceSelection(catalog, makeSelection({ bundle: 'diamond' }), 'de')).toThrow(/Unknown bundle/);
  });
});

describe('lead ↔ session round trip', () => {
  const cases: Record<string, ReturnType<typeof makeSelection>> = {
    'default gold': makeSelection({ selectedAddons: { cookie: true }, cf: 'shield', personaId: 'gastro' }),
    'with voucher and monthly billing': makeSelection({
      selectedAddons: { cookie: true, widgets: true },
      selectedSubAddons: { widgets: ['clicktocall'] },
      payYearly: false,
      voucher: { code: 'TKFF40', percent: 40, scope: 'both' },
    }),
    'ai bundle + backup + yearly add-on': makeSelection({ aiBundle: true, backupUp: true, selectedAddons: { dsgvoyear: true }, care: 'pro', cf: 'shield' }),
  };

  for (const [name, selection] of Object.entries(cases)) {
    it(`reproduces the stored totals for "${name}"`, () => {
      const lead = leadFrom(selection);
      const state = stateFromLead(lead, catalog);
      expect(state.step).toBe('config');
      expect(state.lead.email).toBe(lead.email);
      expect(state.lead.consent).toBe(true);
      expect(state.siteNotes).toBe('alte Seite');
      expect(state.s2).toEqual({ firmenname: 'E2E GmbH' });

      const roundTrip = selectionFromState(state, catalog);
      const priced = priceSelection(catalog, roundTrip, 'de');
      expect(priced.totals.oneTimeEffective).toBeCloseTo(Number(lead.total_one_time), 6);
      expect(priced.totals.monthlyEffective).toBeCloseTo(Number(lead.total_monthly), 6);
      expect(priced.totals.yearlyEffective).toBeCloseTo(Number(lead.total_yearly), 6);
      expect(hashSelection(roundTrip)).toBe(hashSelection(selectionFromLeadConfig(lead.config, lead, catalog)));
    });
  }

  it('normalises a broken session state instead of rejecting it', () => {
    const state = normalizeSessionState({ step: 'nowhere', sel: 'oops', qty: { page: 3 }, voucher: { code: 1 }, answers: null });
    expect(state.step).toBe('config');
    expect(state.sel).toEqual({});
    expect(state.qty).toEqual({ page: 3 });
    expect(state.voucher).toBeNull();
    expect(state.answers.hasSite).toBeNull();
    expect(state.lead.consent).toBe(false);
  });

  it('falls back to the default bundle when a stored bundle was deactivated', () => {
    const state = normalizeSessionState({ bundle: 'diamond', persona: 'gastro' });
    expect(selectionFromState(state, catalog).bundle).toBe(catalog.defaultBundle);
    const lead = leadFrom();
    lead.config = { ...lead.config, bundle: 'diamond' };
    expect(selectionFromLeadConfig(lead.config, lead, catalog).bundle).toBe(catalog.defaultBundle);
  });

  it('builds a session from a submission with the recommended set as recSel', () => {
    const selection = makeSelection({ personaId: 'gastro', selectedAddons: { cookie: true } });
    const state = stateFromSubmission(
      { selection, lead: { vorname: 'A', nachname: 'B', firma: '', email: 'a@b.de', tel: '1', ziel: '', consent: true } },
      catalog,
    );
    expect(state.persona).toBe('gastro');
    expect(state.sel).toEqual({ cookie: true });
    expect(typeof state.recSel).toBe('object');
    expect(state.promoInput).toBe('');
  });
});

describe('hashSelection', () => {
  it('ignores order, unticked add-ons and voucher case', () => {
    const a = makeSelection({ selectedAddons: { cookie: true, widgets: false }, qty: {}, voucher: { code: 'tkff20', percent: 20, scope: 'both' } });
    const b = makeSelection({ selectedAddons: { cookie: true }, voucher: { code: 'TKFF20', percent: 20, scope: 'both' } });
    expect(hashSelection(a)).toBe(hashSelection(b));
  });

  it('changes when the configuration changes', () => {
    const a = makeSelection({ selectedAddons: { cookie: true } });
    expect(hashSelection(a)).not.toBe(hashSelection(makeSelection({ selectedAddons: { cookie: true }, payYearly: false })));
    expect(hashSelection(a)).not.toBe(hashSelection(makeSelection({ selectedAddons: { cookie: true, widgets: true } })));
  });
});
