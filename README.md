# IntelliPaaS Web Studio

Website-configurator sales funnel for German SMBs — a production Next.js port of the
Claude Design prototype in [`website-assessment-tool/`](website-assessment-tool/) (kept as the design reference).

Persona → branching questions → recommended bundle → add-on configurator with live pricing →
a single inquiry form (contact details + optional content intake, no payment) → Calendly
scheduling → confirmation. Everything price-, rule- or copy-shaped is CMS-managed in Supabase
via `/admin`.

Each run of the questionnaire gets a shareable `?c=<id>` link: the full state (answers,
configuration, voucher, contact details) is mirrored to `funnel_sessions`, so the link reopens
it on any device. The **Share** button under the voucher field copies it. The session is minted
on the persona pick (a bounce from the landing page leaves no row behind).

After a submit the link becomes the customer's **permanent quote link**: it keeps reopening the
live configuration (with a banner showing what was submitted and when), every pause in editing
is kept as a version the team can see, and sending it again *updates* the same lead instead of
creating a duplicate. `won` / `lost` quotes are closed for the customer (the link is read-only);
a lead that is *Removed* in the admin disappears from the CMS but keeps its row. A signed-in team member opening a customer
link works in **team mode** (saves versions, no customer emails).

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
| `OPENAI_API_KEY` / `OPENAI_PLAN_MODEL` | Suggested-plan generator (default `gpt-4o`); the key is also used by the onboarding form's AI layer (its model id is the `onb_model` setting) |
| `ONBOARDING_BASIC_USER` / `ONBOARDING_BASIC_PASS` | HTTP Basic auth in front of `/onboardingform/**` and `/api/onboarding/**`. **Fails closed**: unset = locked for everyone. `ONBOARDING_BASIC_AUTH=off` opens the form publicly |
| `TEAM_MODE` | `off` disables team mode on the public configurator (the proxy then no longer refreshes an admin's session on public paths). Default: on |

### Supabase

The project is linked to `kqpyoxrfyvbbqoslyqwy` ("Webstudio"). Schema lives in
`supabase/migrations/`, the full catalog seed (bundles, 45 add-ons, care/CF/support plans,
personas, settings, `TKFF20` voucher) in `supabase/seed.sql`:

```bash
supabase link --project-ref <ref>
supabase db push --include-seed
```

The quotes pipeline (`20260922000012_quotes_pipeline.sql`) is detected at runtime
(`src/lib/quotes/schema.ts`): until it has been applied the app keeps the legacy lead behaviour
and the admin shows a "migration pending" notice; no redeploy is needed afterwards.
`node scripts/purge-sessions.mts [--apply]` removes abandoned funnel sessions (unbound, no
uploads, no persona and older than 2 days, or older than 90 days).

Admin users are provisioned manually (no public sign-up) — Supabase dashboard → Auth → Add user
(email confirmed), or via the admin API. Any authenticated user is an admin.

### Calendly

1. Set the event-type URL in `/admin/catalog/settings` → *Calendly event URL* (empty hides the embed).
2. Create a webhook subscription (Calendly API, events `invitee.created` + `invitee.canceled`)
   pointing at `https://<site>/api/webhooks/calendly`, and put its signing key in
   `CALENDLY_WEBHOOK_SIGNING_KEY`. Appointments link to leads via the `utm_content` lead id
   passed into the embed (fallback: invitee email).

## Admin portal (`/admin`)

- **Leads** — the quote pipeline (`draft → new → contacted → agreed → won / lost`): searchable
  list with owner, last activity and bulk **Remove** (takes a lead out of the CMS for good after
  a confirmation — the row, its versions, notes and files stay in the database, and an undo is
  `update leads set archived_at = null`), **New quote** (a team-created draft, configured on the public site in team mode and
  sent to the customer with its link), and a detail with the submitted quote, the live
  configuration's diff, every version (with "Mark as agreed" + agreed amount), readable
  questionnaire answers, notes and the automatic timeline, uploaded files via signed URLs,
  appointment, and **Create onboarding form** (prefills contact, package and page band).
- **Calendar** — month view of all Calendly appointments.
- **Catalog** — CMS for bundles, add-ons (+categories), care/Cloudflare/support plans, personas,
  recommendation rules, legal pages, and settings (yearly-discount %, team email, Calendly URL,
  AI-bundle pricing, defaults). Every entity supports create/edit/delete; a row still referenced
  by another table refuses to delete. Edits are live on the public site immediately. `leads.config` is the latest
  submitted snapshot and changes only together with a `lead_versions` row — earlier snapshots are
  never rewritten. Voucher redemptions count once per code and are never decremented.
- **Vouchers** — multi-code percent discounts with scope (one-time/recurring/both), validity
  window, redemption limits.
- **Onboarding** — every client onboarding form: status, step, sales flags, the answers screen
  by screen, follow-up history, brief versions, uploads, delivery state and the AI log; team
  PDF and JSON downloads, resend emails, regenerate brief. The form's own definition (screens,
  fields, follow-ups, flag rules, brief sections, texts, AI prompts, examples) is edited under
  *Catalog → Onboarding form*.
- **Suggested build plan** (per lead) — AI-generated phased prompt chain (Claude Design →
  Claude Code) tailored to the lead; phases chain via literal `{{phase_n.output}}` tokens;
  prompts are copyable, editable, and re-generable as new versions.

## Client onboarding form (`/onboardingform`)

The post-deposit intake that replaces the Google Form (spec: *web-studio-onboarding-form-spec*,
16 Sep 2026; rewritten 23 Sep 2026). `/onboardingform/new` mints a form and redirects to
`/onboardingform/<id>` — an unguessable 21-char id that is also the resume link (`/en/…` for
English). Nine question screens with conditional reveals, then step 10, the review node:
deterministic gap check → optional model pass → guided follow-ups (max 2 rounds / 12 questions,
all skippable) → **the read-back** → terms + confirmation → PDF and JSON emailed to the client
and the team.

The read-back is two blocks: every answer grouped by screen with a link back to it, then a plain
paragraph of what we understood. That paragraph is **templated, not model-written** — an
`onb_texts` row with `{business_one_liner}`-style tokens that `src/lib/onboarding/understood.ts`
fills from the client's own answers, so the client never has to read or approve prose a model
produced. They answer yes / mostly / no, and anything but yes requires a correction, stored as
`understood_ok` / `understood_corrections`. The AI brief still runs at this point, because the
team works from it; the client is simply not shown it.

Long free-text fields carry two helpers: **"Help me say this better"** (`ai_assist`) sends that
one answer for a single guardrailed rewrite the client can take or leave
(`POST /api/onboarding/<id>/assist`), and a **page counter** (`count_band`) that counts the listed
pages against the band the client booked. *I don't know* asks when they will know instead of just
recording the gap, and fields with a `none_label` get an explicit "we don't have one" tick so an
empty answer and a deliberate none read differently.

**Everything content-shaped is data** in the `onb_*` tables (screens, fields incl. `show_when`
conditions, follow-up triggers, flag rules, brief sections, long-form texts, the five AI prompts,
worked examples) plus `onb_*` app settings (model id, caps, minimum build time, estimated minutes,
terms version, links). Initial content lives in `supabase/seed/onboarding/*.ts`. Only UI chrome
(buttons, validation messages) is in `messages/*.json`.

| Command | What it does |
|---|---|
| `node scripts/gen-onboarding-seed.mts` | Regenerates the first-install seed migration (`on conflict do nothing`, so CMS edits are never overwritten). Refuses to overwrite a migration that has already been applied. |
| `node scripts/gen-onboarding-seed.mts --upsert <name>.sql` | Emits the same content as an **upsert** migration — how a rewritten definition reaches rows that are already live. This overwrites CMS edits on purpose. Retired fields are set `active = false`, never deleted, so old answers keep their labels. |
| `node scripts/apply-onboarding-seed.mts [--apply]` | Same content, applied straight through the service-role key (dry run without `--apply`). For a machine that has the key but no database password. |

Hard rules are enforced in code, not only in the prompt: the brief is schema-validated, checked
for prices/durations and for facts that don't occur in the answers (retry once, then a plain
rendering of the answers), passwords pasted into any field are redacted before storage, every
model prompt/response is logged to `onboarding_ai_log`, and the "what we still need" section is
composed by code from every unanswered, "don't know" or skipped item.

| Env | Purpose |
|---|---|
| `ONBOARDING_BASIC_USER` / `ONBOARDING_BASIC_PASS` | Basic auth in front of the form + API; fails closed when unset; `ONBOARDING_BASIC_AUTH=off` opens it |
| `ONBOARDING_AI_FIXTURE=1` | Server-side switch that replaces the model with canned outputs (used by the e2e suite) |
| `OPENAI_API_KEY` | The model; the id is the `onb_model` setting |
| `NEXT_PUBLIC_SITE_URL` | Base of the links in emails and the admin (set to `https://web-studio.intellipaas.io` in production) |

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

The quotes pipeline is covered by `e2e/quote-link.spec.ts` (permanent link, resubmit, dead link,
language toggle) and `e2e/admin-quotes.admin.spec.ts` (New quote + team mode, Remove/Restore,
notes, agreed amount, readable answers, onboarding hand-off); both skip themselves while the
quotes migration is not applied to the target database. Vitest: `quotes-selection` (lead ↔
session round trip reproduces the stored totals), `quotes-diff`, `quotes-answers`,
`quotes-versions`.
