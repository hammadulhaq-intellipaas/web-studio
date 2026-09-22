import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeSupabase } from './stubs/fake-supabase';
import { makeCatalog } from './fixtures/catalog';
import { leadApiPayload } from '../e2e/fixtures';

/**
 * The quotes pipeline's write paths (`POST /api/leads`, `POST /api/sessions`,
 * `GET /api/sessions/[id]`) against an in-memory database with the migration "applied":
 * binding, resubmission, team mode, locking, versions, voucher accounting.
 */

const state = { actor: 'customer' as string };
const fake = { db: new FakeSupabase() };
const emails = { submit: vi.fn(), resubmit: vi.fn() };

vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => fake.db }));
vi.mock('@/lib/catalog', () => ({ getCatalog: async () => makeCatalog() }));
vi.mock('@/lib/quotes/schema', () => ({ quotesSchemaReady: async () => true, QUOTES_MIGRATION: 'x' }));
vi.mock('@/lib/quotes/actor', async (orig) => ({
  ...(await orig<typeof import('@/lib/quotes/actor')>()),
  currentActor: async () => state.actor,
}));
vi.mock('@/lib/quotes/emails', () => ({
  sendSubmitEmails: (...args: unknown[]) => emails.submit(...args),
  sendResubmitEmails: (...args: unknown[]) => emails.resubmit(...args),
  sendQuoteToCustomerEmail: async () => true,
}));
vi.mock('@/lib/vouchers', () => ({
  validateVoucherCode: async (code: string) =>
    code.toUpperCase() === 'TKFF20' ? { valid: true, id: 'v-tkff20', percent: 20, scope: 'both' } : { valid: false },
}));

const { POST: postLead } = await import('@/app/api/leads/route');
const { POST: postSession } = await import('@/app/api/sessions/route');
const { GET: getSession } = await import('@/app/api/sessions/[id]/route');

const SID = 'useandom26T198340PX75';
const SID2 = 'pxJACKVERYMINDBUSHWOL';

const json = (url: string, body: unknown) =>
  new Request(`http://localhost${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

async function submit(body: unknown) {
  const res = await postLead(json('/api/leads', body));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

function payload(email: string, extra: Record<string, unknown> = {}) {
  return { ...leadApiPayload(email), sessionId: SID, ...extra };
}

const sessionState = (over: Record<string, unknown> = {}) => ({
  step: 'config',
  url: '',
  siteNotes: '',
  siteFiles: [],
  persona: 'gastro',
  answers: { hasSite: 'none', selfbuilt: null, aiHas: [], aiMissing: [], byowScope: null, pages: '14', langs: '1', contact: 'form', fees: null, shop: 'nein', blog: 'nein', assets: 'ja' },
  bundle: 'gold',
  sel: {},
  recSel: {},
  qty: {},
  selectedSubAddons: {},
  care: 'plus',
  support: 'none',
  cf: 'shield',
  backupUp: false,
  aiBundle: false,
  payYearly: true,
  promoInput: '',
  voucher: null,
  lead: { vorname: 'Erika', nachname: 'M', firma: '', email: 'e@example.com', tel: '+49 170 1234567', ziel: '', consent: true },
  s2: {},
  goal: null,
  drive: '',
  logoFiles: [],
  fotoFiles: [],
  ...over,
});

beforeEach(() => {
  state.actor = 'customer';
  emails.submit.mockReset();
  emails.resubmit.mockReset();
  fake.db = new FakeSupabase({
    funnel_sessions: [{ id: SID, state: sessionState(), created_at: '2026-09-22T09:00:00Z', updated_at: '2026-09-22T09:00:00Z', last_actor: null }],
    vouchers: [{ id: 'v-tkff20', code: 'TKFF20', percent: 20, scope: 'both', redemption_count: 0, active: true }],
    app_settings: [{ key: 'quote_idle_minutes', value: 10 }, { key: 'team_email', value: 'team@example.com' }],
  });
});

describe('POST /api/leads — first submit', () => {
  it('binds the lead to its session, stores v1 and returns the link', async () => {
    const { status, body } = await submit(payload('a@example.com'));
    expect(status).toBe(200);
    expect(body.link).toContain(`?c=${SID}`);
    expect(body.version).toBe(1);
    expect((body.quote as { status: string; hasConsent: boolean }).status).toBe('new');

    const [lead] = fake.db.rows('leads');
    expect(lead.session_id).toBe(SID);
    expect(lead.source).toBe('customer');
    expect(lead.submitted_at).toBeTruthy();
    expect(lead.consent_at).toBeTruthy();
    expect(lead.total_one_time).toBe(2990 + 150); // gold + CF shield setup, no add-ons

    const versions = fake.db.rows('lead_versions');
    expect(versions).toHaveLength(1);
    expect(versions[0]).toMatchObject({ lead_id: lead.id, version: 1, reason: 'submit', actor: 'customer' });
    expect(fake.db.rows('lead_activity').some((a) => a.kind === 'version')).toBe(true);
    expect(emails.submit).toHaveBeenCalledTimes(1);
    expect(emails.submit.mock.calls[0][3]).toBe(SID);
    // The session row is kept — it is the customer's permanent link.
    expect(fake.db.rows('funnel_sessions').find((s) => s.id === SID)).toBeTruthy();
  });

  it('mints a session when the browser sent none (API-seeded leads get a link too)', async () => {
    const { status, body } = await submit({ ...leadApiPayload('b@example.com') });
    expect(status).toBe(200);
    const lead = fake.db.rows('leads')[0];
    expect(lead.session_id).toMatch(/^[A-Za-z0-9]{21}$/);
    expect(body.link).toContain(`?c=${lead.session_id}`);
    const minted = fake.db.rows('funnel_sessions').find((s) => s.id === lead.session_id)!;
    expect((minted.state as { lead: { email: string } }).lead.email).toBe('b@example.com');
    expect(minted.last_actor).toBe('customer');
  });

  it('requires consent and a phone number from customers', async () => {
    const noConsent = await submit(payload('c@example.com', { lead: { ...leadApiPayload('c@example.com').lead, consent: false } }));
    expect(noConsent.status).toBe(400);
    const noTel = await submit(payload('c@example.com', { lead: { ...leadApiPayload('c@example.com').lead, tel: '' } }));
    expect(noTel.status).toBe(400);
    expect(fake.db.rows('leads')).toHaveLength(0);
  });

  it('counts a voucher redemption once', async () => {
    await submit(payload('d@example.com', { selection: { ...leadApiPayload('d@example.com', { voucherCode: 'TKFF20' }).selection } }));
    expect(fake.db.rows('vouchers')[0].redemption_count).toBe(1);
    expect(fake.db.rows('leads')[0].total_one_time).toBe((2990 + 150) * 0.8);
  });
});

describe('POST /api/leads — resubmission through the same link', () => {
  it('updates the existing lead as a new version instead of creating a duplicate', async () => {
    await submit(payload('r@example.com'));
    const first = fake.db.rows('leads')[0];

    const changed = payload('r@example.com', { selection: { ...leadApiPayload('r@example.com').selection, selectedAddons: { cookie: true } } });
    changed.lead.tel = '+49 30 555';
    const { status, body } = await submit(changed);
    expect(status).toBe(200);
    expect(body.updated).toBe(true);
    expect(body.id).toBe(first.id);
    expect(body.version).toBe(2);

    expect(fake.db.rows('leads')).toHaveLength(1);
    const lead = fake.db.rows('leads')[0];
    expect(lead.total_one_time).toBe(2990 + 150 + 350);
    expect(lead.telefon).toBe('+49 30 555');
    expect((lead.config as { addons: { id: string }[] }).addons.map((a) => a.id)).toEqual(['cookie']);
    expect(fake.db.rows('lead_versions').map((v) => v.version)).toEqual([1, 2]);
    expect(emails.resubmit).toHaveBeenCalledTimes(1);
    expect(emails.resubmit.mock.calls[0][5]).toBe(2);
  });

  it('does not store a duplicate version when nothing changed, and never double-counts a voucher', async () => {
    const withVoucher = () => payload('v@example.com', { selection: leadApiPayload('v@example.com', { voucherCode: 'TKFF20' }).selection });
    await submit(withVoucher());
    await submit(withVoucher());
    expect(fake.db.rows('lead_versions')).toHaveLength(1);
    expect(fake.db.rows('vouchers')[0].redemption_count).toBe(1);
  });

  it('refuses customer changes once the quote is won or lost', async () => {
    await submit(payload('w@example.com'));
    fake.db.rows('leads')[0].status = 'won';
    const { status, body } = await submit(payload('w@example.com'));
    expect(status).toBe(403);
    expect(body.error).toBe('locked');
    expect(fake.db.rows('lead_versions')).toHaveLength(1);
  });

  it('accepts a resubmit without the consent flag when consent was already given', async () => {
    await submit(payload('k@example.com'));
    const again = payload('k@example.com', { lead: { ...leadApiPayload('k@example.com').lead, consent: false } });
    expect((await submit(again)).status).toBe(200);
  });

  it('turns a team draft into a new inquiry on the customer\'s first own submit', async () => {
    fake.db.rows('leads').push({
      id: 'draft-1',
      locale: 'de',
      vorname: 'T',
      nachname: 'B',
      firma: 'X',
      email: 't@example.com',
      telefon: null,
      consent_at: null,
      submitted_at: null,
      config: { bundle: 'gold', bundleName: 'Gold', addons: [], voucher: null, lines: { oneOff: [], monthly: [], yearly: [] } },
      status: 'draft',
      session_id: SID,
      voucher_id: null,
      persona_id: null,
    });
    const { status, body } = await submit(payload('t@example.com'));
    expect(status).toBe(200);
    expect(body.id).toBe('draft-1');
    const lead = fake.db.rows('leads')[0];
    expect(lead.status).toBe('new');
    expect(lead.consent_at).toBeTruthy();
    expect(lead.submitted_at).toBeTruthy();
    expect((body.quote as { status: string }).status).toBe('new');
  });
});

describe('POST /api/leads — team mode', () => {
  it('refuses a team save from an anonymous caller (never degrades to a customer submit)', async () => {
    await submit(payload('team@example.com'));
    const { status, body } = await submit(payload('team@example.com', { team: true }));
    expect(status).toBe(401);
    expect(body.error).toBe('team_required');
  });

  it('saves a version for a signed-in team member without emails, consent or a phone', async () => {
    await submit(payload('team2@example.com'));
    emails.resubmit.mockReset();
    state.actor = 'team:matt@intellipaas.io';
    const body = payload('team2@example.com', {
      team: true,
      lead: { ...leadApiPayload('team2@example.com').lead, tel: '', consent: false },
      selection: { ...leadApiPayload('team2@example.com').selection, selectedAddons: { cookie: true } },
    });
    const { status } = await submit(body);
    expect(status).toBe(200);
    const versions = fake.db.rows('lead_versions');
    expect(versions).toHaveLength(2);
    expect(versions[1].actor).toBe('team:matt@intellipaas.io');
    expect(emails.resubmit).not.toHaveBeenCalled();
    expect(fake.db.rows('leads')[0].status).toBe('new');
  });

  it('answers 404 for a team save on a session that has no quote', async () => {
    state.actor = 'team:matt@intellipaas.io';
    const { status } = await submit(payload('nobody@example.com', { team: true }));
    expect(status).toBe(404);
  });
});

describe('POST /api/sessions — history on the customer link', () => {
  const save = (id: string, s: Record<string, unknown>) => postSession(json('/api/sessions', { id, state: s }));

  it('is a plain upsert for sessions without a quote', async () => {
    const res = await save(SID2, sessionState());
    expect(res.status).toBe(200);
    expect(fake.db.rows('funnel_sessions').find((s) => s.id === SID2)).toBeTruthy();
    expect(fake.db.rows('lead_versions')).toHaveLength(0);
  });

  it('keeps the previous state as a version when the idle window has passed or the writer changed', async () => {
    await submit(payload('h@example.com'));
    expect(fake.db.rows('lead_versions')).toHaveLength(1);

    // Same actor, quick follow-up write: no version.
    await save(SID, sessionState({ sel: { cookie: true } }));
    expect(fake.db.rows('lead_versions')).toHaveLength(1);
    expect(fake.db.rows('funnel_sessions').find((s) => s.id === SID)!.last_actor).toBe('customer');

    // The stored state is 30 minutes old → the next write closes that burst.
    const row = fake.db.rows('funnel_sessions').find((s) => s.id === SID)!;
    row.updated_at = new Date(Date.now() - 30 * 60_000).toISOString();
    await save(SID, sessionState({ sel: { cookie: true, widgets: true } }));
    const versions = fake.db.rows('lead_versions');
    expect(versions).toHaveLength(2);
    expect(versions[1]).toMatchObject({ version: 2, reason: 'idle', actor: 'customer' });
    expect((versions[1].config as { addons: { id: string }[] }).addons.map((a) => a.id)).toEqual(['cookie']);

    // A different writer closes the burst immediately.
    state.actor = 'team:matt@intellipaas.io';
    await save(SID, sessionState({ sel: { cookie: true, widgets: true }, care: 'pro' }));
    expect(fake.db.rows('lead_versions')).toHaveLength(3);
    expect(fake.db.rows('lead_versions')[2].reason).toBe('actor_change');
    expect(fake.db.rows('funnel_sessions').find((s) => s.id === SID)!.last_actor).toBe('team:matt@intellipaas.io');
  });

  it('refuses customer writes on a closed quote but lets the team through', async () => {
    await submit(payload('l@example.com'));
    fake.db.rows('leads')[0].status = 'lost';
    expect((await save(SID, sessionState({ sel: { cookie: true } }))).status).toBe(403);
    state.actor = 'team:matt@intellipaas.io';
    expect((await save(SID, sessionState({ sel: { cookie: true } }))).status).toBe(200);
  });
});

describe('GET /api/sessions/[id]', () => {
  it('returns the quote meta for a bound session and nothing sensitive', async () => {
    await submit(payload('g@example.com'));
    const res = await getSession(new Request(`http://localhost/api/sessions/${SID}`), { params: Promise.resolve({ id: SID }) });
    const body = (await res.json()) as { state: unknown; quote: Record<string, unknown> | null };
    expect(body.quote).toMatchObject({ status: 'new', locked: false, draft: false, hasConsent: true, locale: 'de' });
    expect(Object.keys(body.quote!)).not.toContain('email');
    const unbound = await getSession(new Request(`http://localhost/api/sessions/${SID2}`), { params: Promise.resolve({ id: SID2 }) });
    expect(unbound.status).toBe(404);
  });
});
