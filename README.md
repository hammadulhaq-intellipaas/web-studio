# IntelliPaaS Web Studio

Website-configurator sales funnel for German SMBs — a production Next.js port of the
Claude Design prototype in [`website-assessment-tool/`](website-assessment-tool/) (kept as the design reference).

Persona → branching questions → recommended bundle → add-on configurator with live pricing →
a single inquiry form (contact details + optional content intake, no payment) → Calendly
scheduling → confirmation. Everything price-, rule- or copy-shaped is CMS-managed in Supabase
via `/admin`.

Each run of the questionnaire gets a shareable `?c=<id>` link: the full state (answers,
configuration, voucher, contact details) is mirrored to `funnel_sessions`, so the link reopens
it on any device. The **Share** button under the voucher field copies it.

## Stack

Next.js (App Router, TS) · next-intl (DE default / EN) · Supabase (Postgres + Auth + Storage) ·
Zustand · Calendly (inline embed + webhook) · Resend · Vercel AI SDK + OpenAI (plan generator) ·
Vitest + Playwright.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

### Environment variables

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project (anon key only reads the public catalog — RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only: lead writes, uploads, voucher checks, webhook |
| `NEXT_PUBLIC_SITE_URL` | Absolute URL used in admin links inside emails |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Lead notification + customer confirmation emails (skipped if unset) |
| `RESEND_TO_EMAIL` | Comma-separated team recipients for new-inquiry **and** confirmed-booking notifications. Falls back to the `team_email` app setting |
| `CALENDLY_URL` | Booking embed URL (overridden by the `calendly_event_url` app setting) |
| `CALENDLY_WEBHOOK_SIGNING_KEY` | HMAC verification of `/api/webhooks/calendly` |
| `OPENAI_API_KEY` / `OPENAI_PLAN_MODEL` | Suggested-plan generator (default `gpt-4o`) |

### Supabase

The project is linked to `aqbktyvrzuwgjnzoaglv` (eu-central-1). Schema lives in
`supabase/migrations/`, the full catalog seed (bundles, 45 add-ons, care/CF/support plans,
personas, settings, `TKFF20` voucher) in `supabase/seed.sql`:

```bash
supabase link --project-ref <ref>
supabase db push --include-seed
```

Admin users are provisioned manually (no public sign-up) — Supabase dashboard → Auth → Add user
(email confirmed), or via the admin API. Any authenticated user is an admin.

### Calendly

1. Set the event-type URL in `/admin/catalog/settings` → *Calendly event URL* (empty hides the embed).
2. Create a webhook subscription (Calendly API, events `invitee.created` + `invitee.canceled`)
   pointing at `https://<site>/api/webhooks/calendly`, and put its signing key in
   `CALENDLY_WEBHOOK_SIGNING_KEY`. Appointments link to leads via the `utm_content` lead id
   passed into the embed (fallback: invitee email).

## Admin portal (`/admin`)

- **Leads** — searchable list, full detail (config snapshot, questionnaire, stage-2 content,
  uploaded files via signed URLs, appointment, status).
- **Calendar** — month view of all Calendly appointments.
- **Catalog** — CMS for bundles, add-ons (+categories), care/Cloudflare/support plans, personas,
  recommendation rules, legal pages, and settings (yearly-discount %, team email, Calendly URL,
  AI-bundle pricing, defaults). Every entity supports create/edit/delete; a row still referenced
  by another table refuses to delete. Edits are live on the public site immediately. Lead price
  snapshots are immutable.
- **Vouchers** — multi-code percent discounts with scope (one-time/recurring/both), validity
  window, redemption limits.
- **Suggested build plan** (per lead) — AI-generated phased prompt chain (Claude Design →
  Claude Code) tailored to the lead; phases chain via literal `{{phase_n.output}}` tokens;
  prompts are copyable, editable, and re-generable as new versions.

## Recommendation rules (CMS)

Which bundle is recommended and which add-ons are pre-selected is **data**, not code —
`bundle_rules` and `addon_rules`, edited under *Catalog*. `src/lib/pricing/recommend.ts` is a
generic evaluator over them.

Both tables share one condition shape; every clause must match (an empty `[]` always fires):

```json
[{ "key": "assets", "values": ["ja"] }, { "key": "byow", "values": ["false"] }]
```

`key` is any questionnaire answer, plus two derived keys: `byow` (`"true"`/`"false"`) and `url`
(`"__set"` when a source URL was given). Multi-select answers match on intersection, and
`"negate": true` inverts a clause.

- **`bundle_rules`** — the highest-`priority` matching `base` rule sets the starting bundle; each
  matching `upgrade` rule then escalates it, but only to a higher tier (`bundles.sort`).
- **`addon_rules`** — additive rules run first (together with a persona's `preselect_addons`),
  then every matching rule's `remove_addon_ids` is applied. Suppression running last is what lets
  "customer already has a logo & imagery" override a persona pre-selection.
- **`addons.bundle_members`** — an add-on that covers others (e.g. *SEO + GEO Setup Bundle* →
  `seosetup`, `geosetup`). Members show as *included* and are never charged: only the parent's
  price counts.

Defaults live in settings (`default_bundle`, `default_care_plan`, `default_cloudflare_plan`,
`ai_bundle_category`). The questionnaire's shape stays in `src/lib/questions.ts` — rules only
reference its answer keys.

## Tests

```bash
npm run test        # Vitest — pricing vectors + rules-engine parity against the old hardcoded logic
npm run typecheck
npm run lint
npm run build && npm run e2e   # Playwright against http://localhost:3111 (starts the server)
```

`tests/rules-parity.test.ts` drives the whole answer matrix through both the evaluator and a copy
of the pre-CMS implementation and asserts they agree — the one intended divergence being that
`assets = "ja"` no longer pre-selects the photo/logo package.

The e2e suite covers the full DE funnel (exact pricing math incl. TKFF20), the BYOW branch, the
shareable session link, pre-lead uploads, the EN locale + language toggle, admin auth, lead
detail, live CMS price edits, catalog CRUD, and the SEO + GEO bundle's no-double-pricing rule.
