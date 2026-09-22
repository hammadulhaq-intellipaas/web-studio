import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeSupabase } from './stubs/fake-supabase';
import { makeCatalog, makeSelection } from './fixtures/catalog';
import { makeDefinition } from './fixtures/onboarding';
import { priceSelection } from '@/lib/quotes/price';

/**
 * The admin server actions of the quotes pipeline against the in-memory database:
 * drafts, archive, agreed amount, link restore, manual versions, onboarding hand-off.
 */

const fake = { db: new FakeSupabase() };
const redirects: string[] = [];
const sent = vi.fn(async () => true);

vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => fake.db }));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'matt@intellipaas.io' } } }) } }),
}));
vi.mock('@/lib/catalog', () => ({ getCatalog: async () => makeCatalog() }));
vi.mock('@/lib/quotes/schema', () => ({ quotesSchemaReady: async () => true, QUOTES_MIGRATION: 'x' }));
vi.mock('@/lib/quotes/emails', () => ({ sendQuoteToCustomerEmail: (...args: unknown[]) => sent(...(args as [])) }));
vi.mock('@/lib/onboarding/definition', () => ({ getOnboardingDefinition: async () => makeDefinition() }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    redirects.push(url);
  },
}));

const actions = await import('@/app/admin/leads/actions');

const catalog = makeCatalog();
const LEAD_ID = 'b55f200f-ddd1-478e-a5d3-15feae2a7561';

function seedLead(over: Record<string, unknown> = {}) {
  const priced = priceSelection(catalog, makeSelection({ selectedAddons: { cookie: true }, cf: 'shield', personaId: 'gastro' }), 'de');
  const row = {
    id: LEAD_ID,
    locale: 'de',
    vorname: 'Julian',
    nachname: 'Munz',
    firma: 'Beyond Therapy',
    email: 'julian@example.com',
    telefon: '+41 79 000',
    ziel: null,
    consent_at: '2026-09-18T10:00:00Z',
    persona_id: 'gastro',
    source_url: 'https://www.beyondtherapy.ch',
    config: priced.config,
    total_one_time: priced.totals.oneTimeEffective,
    total_monthly: priced.totals.monthlyEffective,
    total_yearly: priced.totals.yearlyEffective,
    voucher_id: null,
    stage2: { fields: { firmenname: 'Beyond Therapy GmbH' }, goal: 'termine', driveLink: '' },
    status: 'contacted',
    session_id: null,
    source: 'customer',
    owner_email: null,
    archived_at: null,
    submitted_at: '2026-09-18T10:00:00Z',
    agreed_version_id: null,
    created_at: '2026-09-18T10:00:00Z',
    ...over,
  };
  fake.db.rows('leads').push(row);
  return row;
}

beforeEach(() => {
  redirects.length = 0;
  sent.mockClear();
  fake.db = new FakeSupabase({ app_settings: [{ key: 'quote_idle_minutes', value: 10 }] });
});

describe('createDraftQuote', () => {
  it('creates a draft lead bound to a fresh session and redirects to it', async () => {
    await actions.createDraftQuote({ vorname: 'Thorsten', nachname: 'B', firma: 'X GmbH', email: 'T@Example.com', telefon: '', locale: 'de' });
    const [lead] = fake.db.rows('leads');
    expect(lead).toMatchObject({ status: 'draft', source: 'team', email: 't@example.com', telefon: null, consent_at: null, owner_email: 'matt@intellipaas.io' });
    expect(lead.session_id).toMatch(/^[A-Za-z0-9]{21}$/);
    expect(Number(lead.total_one_time)).toBe(2990 + 150); // default bundle + default CF shield setup
    const session = fake.db.rows('funnel_sessions').find((s) => s.id === lead.session_id)!;
    expect((session.state as { step: string; bundle: string }).step).toBe('config');
    expect((session.state as { lead: { email: string } }).lead.email).toBe('t@example.com');
    expect(fake.db.rows('lead_versions')).toHaveLength(1);
    expect(redirects).toEqual([`/admin/leads/${lead.id}`]);
  });

  it('rejects a draft without a usable email', async () => {
    const r = await actions.createDraftQuote({ vorname: '', nachname: '', firma: 'X', email: 'nope', telefon: '', locale: 'de' });
    expect(r).toEqual({ ok: false, error: 'A valid email is required' });
    expect(fake.db.rows('leads')).toHaveLength(0);
  });
});

describe('archive / restore', () => {
  it('hides and restores without deleting, and logs it', async () => {
    seedLead();
    expect(await actions.archiveLeads([LEAD_ID], true)).toMatchObject({ ok: true });
    expect(fake.db.rows('leads')[0].archived_at).toBeTruthy();
    expect(fake.db.rows('leads')[0].archived_by).toBe('matt@intellipaas.io');
    expect(await actions.archiveLeads([LEAD_ID], false)).toMatchObject({ ok: true });
    expect(fake.db.rows('leads')[0].archived_at).toBeNull();
    expect(fake.db.rows('lead_activity').filter((a) => a.kind === 'archive')).toHaveLength(2);
  });

  it('ignores garbage ids', async () => {
    expect(await actions.archiveLeads(['not-a-uuid'], true)).toEqual({ ok: false, error: 'Nothing selected' });
  });
});

describe('customer link for legacy leads', () => {
  it('mints a session from the stored snapshot, binds it and stores a "restore" version', async () => {
    const lead = seedLead();
    const r = await actions.createCustomerLink(LEAD_ID);
    expect(r.ok).toBe(true);
    const bound = fake.db.rows('leads')[0];
    expect(bound.session_id).toMatch(/^[A-Za-z0-9]{21}$/);
    expect(r.ok && r.url).toContain(`?c=${bound.session_id}`);
    const session = fake.db.rows('funnel_sessions')[0];
    const state = session.state as { sel: Record<string, boolean>; lead: { email: string; consent: boolean }; url: string };
    expect(state.sel).toEqual({ cookie: true });
    expect(state.lead.email).toBe(lead.email);
    expect(state.lead.consent).toBe(true);
    expect(state.url).toBe('https://www.beyondtherapy.ch');
    const versions = fake.db.rows('lead_versions');
    expect(versions).toHaveLength(1);
    expect(versions[0]).toMatchObject({ reason: 'restore', actor: 'team:matt@intellipaas.io' });
    expect(Number((versions[0].totals as { oneTimeEffective: number }).oneTimeEffective)).toBe(Number(lead.total_one_time));
    // Idempotent: a second call just returns the existing link.
    const again = await actions.createCustomerLink(LEAD_ID);
    expect(again.ok && again.url).toBe(r.ok && r.url);
    expect(fake.db.rows('funnel_sessions')).toHaveLength(1);
  });
});

describe('status, agreed amount, manual version, send', () => {
  it('marks a version as agreed with an override and moves the status', async () => {
    seedLead();
    await actions.createCustomerLink(LEAD_ID);
    const version = fake.db.rows('lead_versions')[0];
    const r = await actions.markAgreed(LEAD_ID, version.id as string, { oneTime: 3000, monthly: null });
    expect(r.ok).toBe(true);
    const lead = fake.db.rows('leads')[0];
    expect(lead).toMatchObject({ status: 'agreed', agreed_version_id: version.id, agreed_one_time: 3000, agreed_by: 'matt@intellipaas.io' });
    expect(Number(lead.agreed_monthly)).toBeCloseTo(Number((version.totals as { monthlyEffective: number }).monthlyEffective), 6);
  });

  it('setting the status to agreed without a version takes the latest one', async () => {
    seedLead();
    await actions.createCustomerLink(LEAD_ID);
    await actions.updateLeadStatus(LEAD_ID, 'agreed');
    const lead = fake.db.rows('leads')[0];
    expect(lead.agreed_version_id).toBe(fake.db.rows('lead_versions')[0].id);
    expect(fake.db.rows('lead_activity').some((a) => a.kind === 'status' && String(a.body).includes('contacted → agreed'))).toBe(true);
    await expect(actions.updateLeadStatus(LEAD_ID, 'bogus')).rejects.toThrow('Invalid status');
  });

  it('"Save version now" reprices the live session and skips duplicates', async () => {
    seedLead();
    await actions.createCustomerLink(LEAD_ID);
    const session = fake.db.rows('funnel_sessions')[0];
    expect(await actions.saveVersionNow(LEAD_ID)).toMatchObject({ ok: true, message: 'Unchanged since v1' });
    (session.state as { sel: Record<string, boolean> }).sel = { cookie: true, widgets: true };
    expect(await actions.saveVersionNow(LEAD_ID)).toMatchObject({ ok: true, message: 'Saved as v2' });
    const v2 = fake.db.rows('lead_versions')[1];
    expect(v2).toMatchObject({ version: 2, reason: 'manual' });
    expect((v2.config as { addons: { id: string }[] }).addons.map((a) => a.id).sort()).toEqual(['cookie', 'widgets']);
  });

  it('sends the quote to the customer and moves a draft to contacted', async () => {
    seedLead({ status: 'draft', source: 'team' });
    await actions.createCustomerLink(LEAD_ID);
    const r = await actions.sendQuoteToCustomer(LEAD_ID);
    expect(r.ok).toBe(true);
    expect(sent).toHaveBeenCalledTimes(1);
    expect(fake.db.rows('leads')[0].status).toBe('contacted');
    expect(fake.db.rows('lead_activity').some((a) => a.kind === 'email')).toBe(true);
  });
});

describe('createOnboardingFormFromLead', () => {
  it('prefills Screen 1 from the quote, links the form and redirects to it', async () => {
    seedLead({ config: { ...seedConfig(), answers: { ...seedConfig().answers, hasSite: 'website', pages: '58' } } });
    const r = await actions.createOnboardingFormFromLead(LEAD_ID);
    expect(r).toBeUndefined(); // redirected
    const form = fake.db.rows('onboarding_forms')[0];
    expect(form.lead_id).toBe(LEAD_ID);
    expect(form.email).toBe('julian@example.com');
    expect(form.company).toBe('Beyond Therapy');
    const answers = form.answers as Record<string, { v: unknown; src?: string }>;
    expect(answers.contact_name).toEqual({ v: 'Julian Munz', src: 'lead' });
    expect(answers.booked_package).toEqual({ v: 'gold', src: 'lead' });
    expect(answers.booked_page_band).toEqual({ v: '58', src: 'lead' });
    expect(answers.project_type).toEqual({ v: 'changes', src: 'lead' });
    expect(answers.existing_url).toEqual({ v: 'https://www.beyondtherapy.ch', src: 'lead' });
    expect(answers.legal_name).toEqual({ v: 'Beyond Therapy GmbH', src: 'lead' });
    expect(redirects).toEqual([`/admin/onboarding/${form.id}`]);
    expect(fake.db.rows('lead_activity').some((a) => a.kind === 'onboarding')).toBe(true);
  });

  it('leaves the package empty for a BYOW quote', async () => {
    seedLead({ config: { ...seedConfig(), bundle: 'byow', bundleName: 'Bring Your Own Website' } });
    await actions.createOnboardingFormFromLead(LEAD_ID);
    const answers = fake.db.rows('onboarding_forms')[0].answers as Record<string, unknown>;
    expect(answers.booked_package).toBeUndefined();
    expect(answers.contact_email).toEqual({ v: 'julian@example.com', src: 'lead' });
  });
});

function seedConfig() {
  return priceSelection(catalog, makeSelection({ selectedAddons: { cookie: true }, cf: 'shield', personaId: 'gastro' }), 'de').config;
}
