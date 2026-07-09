# IntelliPaaS Web Studio

Website-configurator sales funnel for German SMBs — a production Next.js port of the
Claude Design prototype in [`website-assessment-tool/`](website-assessment-tool/) (kept as the design reference).

Persona → branching questions → recommended bundle → add-on configurator with live pricing →
lead capture (no payment) with integrated Calendly scheduling → optional content intake →
confirmation. Everything price- or plan-shaped is CMS-managed in Supabase via `/admin`.

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
  and settings (yearly-discount %, team email, Calendly URL, AI-bundle pricing). Edits are live
  on the public site immediately. Lead price snapshots are immutable.
- **Vouchers** — multi-code percent discounts with scope (one-time/recurring/both), validity
  window, redemption limits.
- **Suggested build plan** (per lead) — AI-generated phased prompt chain (Claude Design →
  Claude Code) tailored to the lead; phases chain via literal `{{phase_n.output}}` tokens;
  prompts are copyable, editable, and re-generable as new versions.

## Tests

```bash
npm run test        # Vitest — pricing engine vectors ported from the prototype
npm run typecheck
npm run lint
npm run build && npm run e2e   # Playwright against http://localhost:3111 (starts the server)
```

The e2e suite covers the full DE funnel (exact pricing math incl. TKFF20), the BYOW branch,
the EN locale + language toggle, admin auth, lead detail, and a live CMS price edit.
