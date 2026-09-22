/**
 * A tiny in-memory stand-in for the parts of supabase-js the quotes routes use:
 * `from().select/insert/update/upsert/delete` with eq/neq/is/in filters, order, limit,
 * single/maybeSingle, plus the two unique constraints the pipeline relies on
 * (`leads.session_id`, `lead_versions (lead_id, version)`). Column projections are ignored
 * (full rows come back), which is a superset of what the code reads.
 */
import { randomUUID } from 'node:crypto';

type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;

export interface FakeResult<T = unknown> {
  data: T;
  error: { code?: string; message: string } | null;
  count: number | null;
  status: number;
}

/** Column defaults the real schema applies (only the ones the routes rely on). */
const DEFAULTS: Record<string, Row> = {
  leads: { status: 'new', source: 'customer', archived_at: null, owner_email: null, agreed_version_id: null },
  funnel_sessions: { last_actor: null },
  onboarding_forms: { rev: 0, status: 'in_progress', answers: {}, flags: [], name: null, company: null, email: null, lead_id: null },
};

const UNIQUE: Record<string, string[][]> = {
  leads: [['session_id']],
  lead_versions: [['lead_id', 'version']],
  funnel_sessions: [['id']],
  onboarding_forms: [['id']],
  app_settings: [['key']],
  vouchers: [['id']],
};

export class FakeSupabase {
  tables = new Map<string, Row[]>();

  constructor(seed: Record<string, Row[]> = {}) {
    for (const [name, rows] of Object.entries(seed)) this.tables.set(name, rows.map((r) => ({ ...r })));
  }

  rows(table: string): Row[] {
    if (!this.tables.has(table)) this.tables.set(table, []);
    return this.tables.get(table)!;
  }

  from(table: string) {
    return new FakeQuery(this, table);
  }
}

type Op = { kind: 'select' } | { kind: 'insert'; rows: Row[] } | { kind: 'update'; patch: Row } | { kind: 'upsert'; rows: Row[]; ignoreDuplicates: boolean } | { kind: 'delete' };

class FakeQuery implements PromiseLike<FakeResult> {
  private op: Op = { kind: 'select' };
  private filters: Filter[] = [];
  private orderBy: { col: string; asc: boolean } | null = null;
  private limitN: number | null = null;
  private mode: 'many' | 'single' | 'maybeSingle' = 'many';
  private returning = false;

  constructor(
    private db: FakeSupabase,
    private table: string,
  ) {}

  /** Projections and counts are ignored: full rows come back. */
  select() {
    if (this.op.kind !== 'select') this.returning = true;
    return this;
  }
  insert(rows: Row | Row[]) {
    this.op = { kind: 'insert', rows: Array.isArray(rows) ? rows : [rows] };
    return this;
  }
  update(patch: Row) {
    this.op = { kind: 'update', patch };
    return this;
  }
  upsert(rows: Row | Row[], opts: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
    this.op = { kind: 'upsert', rows: Array.isArray(rows) ? rows : [rows], ignoreDuplicates: !!opts.ignoreDuplicates };
    return this;
  }
  delete() {
    this.op = { kind: 'delete' };
    return this;
  }
  eq(col: string, v: unknown) {
    this.filters.push((r) => r[col] === v);
    return this;
  }
  neq(col: string, v: unknown) {
    this.filters.push((r) => r[col] !== v);
    return this;
  }
  is(col: string, v: unknown) {
    this.filters.push((r) => (v === null ? r[col] == null : r[col] === v));
    return this;
  }
  in(col: string, vs: unknown[]) {
    this.filters.push((r) => vs.includes(r[col]));
    return this;
  }
  not(col: string, op: string, v: unknown) {
    if (op === 'is' && v === null) this.filters.push((r) => r[col] != null);
    return this;
  }
  /** Search filters are not modelled (never used by the tested paths). */
  or() {
    return this;
  }
  ilike() {
    return this;
  }
  gte(col: string, v: string) {
    this.filters.push((r) => String(r[col]) >= v);
    return this;
  }
  order(col: string, opts: { ascending?: boolean } = {}) {
    this.orderBy = { col, asc: opts.ascending !== false };
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  single() {
    this.mode = 'single';
    return this;
  }
  maybeSingle() {
    this.mode = 'maybeSingle';
    return this;
  }

  private matching(): Row[] {
    let rows = this.db.rows(this.table).filter((r) => this.filters.every((f) => f(r)));
    if (this.orderBy) {
      const { col, asc } = this.orderBy;
      rows = [...rows].sort((a, b) => (a[col] === b[col] ? 0 : (a[col] as never) > (b[col] as never) ? 1 : -1) * (asc ? 1 : -1));
    }
    if (this.limitN != null) rows = rows.slice(0, this.limitN);
    return rows;
  }

  private violates(row: Row, exclude?: Row): string | null {
    for (const cols of UNIQUE[this.table] ?? []) {
      if (cols.some((c) => row[c] == null)) continue;
      const dupe = this.db.rows(this.table).find((r) => r !== exclude && cols.every((c) => r[c] === row[c]));
      if (dupe) return cols.join(',');
    }
    return null;
  }

  private run(): FakeResult {
    const ok = (data: unknown, status = 200): FakeResult => ({ data, error: null, count: Array.isArray(data) ? data.length : null, status });
    const fail = (message: string, code?: string): FakeResult => ({ data: null, error: { message, code }, count: null, status: 400 });
    const table = this.db.rows(this.table);
    const shape = (rows: Row[]): FakeResult => {
      if (this.mode === 'many') return ok(rows.map((r) => ({ ...r })));
      if (rows.length > 1) return fail('multiple rows', 'PGRST116');
      if (this.mode === 'single' && rows.length === 0) return fail('no rows', 'PGRST116');
      return ok(rows[0] ? { ...rows[0] } : null);
    };

    switch (this.op.kind) {
      case 'select':
        return shape(this.matching());
      case 'insert': {
        const inserted: Row[] = [];
        for (const raw of this.op.rows) {
          const row: Row = { id: randomUUID(), created_at: new Date().toISOString(), ...(DEFAULTS[this.table] ?? {}), ...raw };
          const v = this.violates(row);
          if (v) return fail(`duplicate key value violates unique constraint (${v})`, '23505');
          table.push(row);
          inserted.push(row);
        }
        return this.returning ? shape(inserted) : ok(null, 201);
      }
      case 'upsert': {
        const out: Row[] = [];
        for (const raw of this.op.rows) {
          const row: Row = { id: randomUUID(), created_at: new Date().toISOString(), ...(DEFAULTS[this.table] ?? {}), ...raw };
          const cols = (UNIQUE[this.table] ?? [['id']])[0];
          const existing = table.find((r) => cols.every((c) => r[c] === row[c]));
          if (existing) {
            if (this.op.ignoreDuplicates) continue;
            Object.assign(existing, raw);
            out.push(existing);
          } else {
            table.push(row);
            out.push(row);
          }
        }
        return this.returning ? shape(out) : ok(null, 201);
      }
      case 'update': {
        const rows = this.matching();
        for (const r of rows) {
          const next = { ...r, ...this.op.patch };
          const v = this.violates(next, r);
          if (v) return fail(`duplicate key value violates unique constraint (${v})`, '23505');
          Object.assign(r, this.op.patch);
        }
        return this.returning ? shape(rows) : ok(null, 204);
      }
      case 'delete': {
        const rows = this.matching();
        for (const r of rows) table.splice(table.indexOf(r), 1);
        return this.returning ? shape(rows) : ok(null, 204);
      }
    }
  }

  then<R1 = FakeResult, R2 = never>(
    onfulfilled?: ((value: FakeResult) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return Promise.resolve(this.run()).then(onfulfilled ?? undefined, onrejected ?? undefined);
  }
}
