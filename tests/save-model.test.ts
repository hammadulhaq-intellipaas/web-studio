import { beforeEach, describe, expect, it } from 'vitest';
import { useFunnel, hasUnsavedChanges } from '@/stores/funnel';
import type { QuoteMeta } from '@/lib/funnel/state';
import { makeCatalog } from './fixtures/catalog';

/**
 * A quote only changes when someone saves it. The store keeps the last saved version, so it
 * can tell what is unsaved and put it back on Discard. This is what would have undone the
 * accidental edit to Nina's quote in one click.
 */
const QUOTE: QuoteMeta = {
  leadId: 'lead-1',
  status: 'new',
  locked: false,
  draft: false,
  submittedAt: '2026-10-03T18:00:00Z',
  hasConsent: true,
  oneTime: 2301,
  monthly: 115.62,
  submitted: null,
  locale: 'de',
};

const catalog = makeCatalog();
const unsaved = () => {
  const s = useFunnel.getState();
  return hasUnsavedChanges(s, s.savedSnapshot, catalog);
};

beforeEach(() => {
  useFunnel.getState().restart();
  useFunnel.getState().hydrateFromSession(
    { step: 'config', bundle: 'silver', sel: { cms: true, cookie: true, seolite: true }, care: 'plus', sessionId: 'S1' },
    QUOTE,
  );
});

describe('what is saved', () => {
  it('opening a quote counts as saved: nothing to save yet', () => {
    expect(useFunnel.getState().savedSnapshot).not.toBeNull();
    expect(unsaved()).toBe(false);
  });

  it('any change to the quote makes it unsaved', () => {
    useFunnel.getState().toggleAddon('cookie');
    expect(unsaved()).toBe(true);
  });

  it('removing every add-on is a change like any other', () => {
    useFunnel.getState().clearAddons();
    expect(unsaved()).toBe(true);
  });

  it('changing it back is no longer a change', () => {
    useFunnel.getState().toggleAddon('cookie');
    useFunnel.getState().toggleAddon('cookie');
    expect(unsaved()).toBe(false);
  });

  // The case from the live audit: an add-on the quote never had, picked and unpicked.
  it('picking an add-on and unpicking it again is not a change', () => {
    useFunnel.getState().toggleAddon('foto');
    expect(unsaved()).toBe(true);
    useFunnel.getState().toggleAddon('foto');
    expect(unsaved()).toBe(false);
  });

  it('several add-ons undone in a different order is not a change', () => {
    useFunnel.getState().toggleAddon('cookie');
    useFunnel.getState().toggleAddon('foto');
    useFunnel.getState().toggleAddon('cookie');
    useFunnel.getState().toggleAddon('foto');
    expect(unsaved()).toBe(false);
  });

  it('a quantity stepped up and back down is not a change', () => {
    useFunnel.getState().setQty('page', 2);
    expect(unsaved()).toBe(true);
    useFunnel.getState().setQty('page', 1);
    expect(unsaved()).toBe(false);
  });

  it('sub-options ticked back to how they were is not a change', () => {
    useFunnel.getState().setSubAddons('widgets', ['whatsapp', 'reviews']);
    expect(unsaved()).toBe(true);
    useFunnel.getState().setSubAddons('widgets', ['whatsapp']);
    expect(unsaved()).toBe(false);
  });

  it('a different quantity is still a change', () => {
    useFunnel.getState().setQty('page', 3);
    expect(unsaved()).toBe(true);
  });

  // Moving between steps or typing half a promo code is not a change to the quote.
  it('moving around the funnel is not a change', () => {
    useFunnel.getState().go('lead');
    useFunnel.getState().setPromoInput('HALF');
    expect(unsaved()).toBe(false);
  });
});

describe('Discard', () => {
  it('puts the quote back exactly as it was saved', () => {
    useFunnel.getState().clearAddons();
    useFunnel.getState().setCare('pro');
    useFunnel.getState().discardChanges();
    const s = useFunnel.getState();
    expect(s.sel).toEqual({ cms: true, cookie: true, seolite: true });
    expect(s.care).toBe('plus');
    expect(unsaved()).toBe(false);
  });
});

describe('Save', () => {
  it('after saving, the new version is the saved one', () => {
    useFunnel.getState().toggleAddon('foto');
    useFunnel.getState().markSaved();
    expect(unsaved()).toBe(false);
    useFunnel.getState().discardChanges();
    expect(useFunnel.getState().sel.foto).toBe(true);
  });

  it('a run with no quote has nothing to save', () => {
    useFunnel.getState().restart();
    useFunnel.getState().markSaved();
    expect(useFunnel.getState().savedSnapshot).toBeNull();
  });
});
