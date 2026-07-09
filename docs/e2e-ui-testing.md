# Web Studio — E2E UI Testing Guide

A manual, click-through test guide covering every UI flow in the platform. Steps, buttons,
and expected results are traced against the actual components. For the automated Playwright
version of these suites, see `e2e/` and run `npm run e2e`.

## Test environment

| | |
|---|---|
| **Production URL** | https://web-studio-lac.vercel.app |
| **DE funnel** | `/` (default locale) |
| **EN funnel** | `/en` |
| **Admin** | `/admin` → redirects to `/admin/login` |
| **Admin login** | `admin@intellipaas.io` / `Access!` |
| **Seeded test voucher** | `TKFF20` → 20% off, scope **both** (one-time + recurring) |
| **Calendly** | Embedded onboarding event (live via `CALENDLY_URL`) |

**Funnel step machine:** `intro → persona → questions → config → lead → stage2 → done`
State persists in `localStorage` (`ipaas-konfigurator-v3`). Use an **incognito window** per
run for a clean state, or click **Restart** on the Done screen.

**Legend:** ✅ = expected pass · Each case lists **Action → Expected**.

---

## Suite A — Public funnel happy path (DE)

| # | Action | Expected |
|---|--------|----------|
| A1 | Open `/` | Intro screen: IntelliPaaS logo, headline, trust badges, CTA button. HTTP 200. |
| A2 | Click the intro CTA | Advances to **Persona** step. |
| A3 | Pick any persona (e.g. handwork/retail) | Advances to **Questions**; answers pre-filled from persona defaults. |
| A4 | Answer the questions, click continue | Advances to **Configurator**; a bundle is **pre-recommended**, recommended add-ons pre-checked, care = "plus", Cloudflare = "shield". |
| A5 | Review the **price sidebar** | Shows one-time total + monthly total; updates live as you change selections. |
| A6 | Click continue to **Lead** | Lead form renders with an order summary/receipt. |
| A7 | Fill required fields + consent, submit | On success: Calendly panel appears (see Suite C). |
| A8 | Continue → **Stage 2** → Finish | **Done** screen: green check, "next steps" cards, final receipt (one-time + monthly + yearly). |

---

## Suite B — Configurator logic

| # | Action | Expected |
|---|--------|----------|
| B1 | Switch bundle (silver/gold/etc.) | Add-ons re-baseline to the new bundle's recommended set; **manually added** extras are preserved; included add-ons show as included. |
| B2 | Toggle an add-on on/off | Price sidebar one-time/monthly totals update immediately. |
| B3 | Change an add-on **quantity** (where supported) | Line total scales with qty. |
| B4 | Change **Care** / **Support** / **Cloudflare** tier | Monthly total reflects the tier change. |
| B5 | Toggle **AI bundle** | Adds AI setup (one-time) + monthly per seeded `ai_bundle` pricing. |
| B6 | Toggle **pay yearly** on/off | Yearly view applies the `yearly_discount_pct` (seeded 18%); "per year" line appears on Done. |
| B7 | Enter voucher **`TKFF20`** in the promo box, apply | Accepted → 20% discount lines appear on **both** one-time and monthly. |
| B8 | Enter a **bogus** code (e.g. `NOPE99`) | Rejected with "invalid" message; no discount applied. |
| B9 | Enter empty code, apply | "empty" message. |

> Voucher validation hits `POST /api/vouchers/validate` (live DB). Quick API sanity check:
> `curl -X POST .../api/vouchers/validate -d '{"code":"TKFF20"}'` → `{"valid":true,"percent":20,"scope":"both"}`

---

## Suite C — Lead capture, Calendly & emails

| # | Action | Expected |
|---|--------|----------|
| C1 | On Lead step, click **submit with empty required fields** | Inline errors on email, tel, and consent (`data-testid=lead-err-*`). No submission. |
| C2 | Enter an **invalid email**, submit | Email validation error. |
| C3 | Enter valid first/last/company/**email**/**phone**, optional goal, **check consent**, submit | Button shows "submitting…", then success → **Calendly panel** renders below. Lead is persisted. |
| C4 | In the Calendly widget, book a slot | Green **"booked"** confirmation banner (`data-testid=calendly-booked`). |
| C5 | Click **Continue** (`calendly-continue`) | Advances to **Stage 2** (works whether or not you booked). |
| C6 | **Email check** (Resend) | Lead **confirmation email** to the address you entered + **team notification** to `team_email`. Requires `no-reply@intellipaas.io` domain verified in Resend — otherwise send fails silently by design. |
| C7 | **Verify in admin** | New lead appears in Admin → **Leads** with full config snapshot, questionnaire answers, and totals. |

---

## Suite D — Stage 2 enrichment & uploads

| # | Action | Expected |
|---|--------|----------|
| D1 | Observe **readiness meter** | Starts ~25%; rises toward 100% as you fill fields (`data-testid=readiness`). |
| D2 | Expand each accordion section (Unternehmen, Marke, Geschichte, Social, Ziel) | Section opens; per-section "filled/total" counter updates. |
| D3 | Fill text/textarea fields | Values persist across section toggles. |
| D4 | In **Marke**, upload a **logo** and a **photo** (drag-drop or picker) | File chips (📎 name) appear. Accepts jpg/png/webp/pdf/doc/docx; **>25 MB rejected**. Hits `POST /api/leads/[id]/uploads`. |
| D5 | Paste a **Drive link** | Counts toward readiness. |
| D6 | In **Ziel**, pick a goal chip | Toggles selected; counts toward readiness. |
| D7 | Click **Send** (`s2-finish`) or **"later"** | Both persist Stage 2 (`PATCH /api/leads/[id]/stage2`) and go to **Done**. Stage 2 never blocks completion. |
| D8 | Confirm in admin | Lead detail shows Stage-2 content + uploaded files (signed URLs). |

---

## Suite E — Localization (EN)

| # | Action | Expected |
|---|--------|----------|
| E1 | Open `/en` | Full funnel renders in English. HTTP 200. |
| E2 | Run A1–A8 on `/en` | All labels/CTAs/validation in English; Calendly display language follows the event's own settings. |
| E3 | Toggle locale via the header switcher | Switches DE↔EN, preserving progress. |
| E4 | Footer legal links | `/impressum` and `/datenschutz` load in the active locale. |

---

## Suite F — Persistence & restart

| # | Action | Expected |
|---|--------|----------|
| F1 | Progress to Config, **reload** the page | Returns to the same step with selections intact (persisted). |
| F2 | Complete to **Done**, reload | Does **not** restore into Done — resets to Intro (by design). |
| F3 | Click **Restart** (`data-testid=restart`) on Done | Full state reset to Intro. |

---

## Suite G — Admin auth

| # | Action | Expected |
|---|--------|----------|
| G1 | Visit `/admin` while logged out | **307 redirect** to `/admin/login`. |
| G2 | Login with wrong password | Red error message (Supabase auth error); stays on login. |
| G3 | Login `admin@intellipaas.io` / `Access!` | Redirects to `/admin` dashboard. |
| G4 | Directly hit `/admin/leads`, `/admin/vouchers` etc. while logged out | Each redirects to login. |
| G5 | Click **Sign out** (`admin-signout`) | Returns to login; protected routes blocked again. |

---

## Suite H — Admin: Leads & AI plan generator (OpenAI)

| # | Action | Expected |
|---|--------|----------|
| H1 | Open **Leads** | Searchable list of captured leads. |
| H2 | Open a lead detail | Full config snapshot, questionnaire, totals, Stage-2 content, uploaded files, source URL, persona. |
| H3 | Change the lead **status** (`StatusSelect`) | Persists; reflected in the list. |
| H4 | Click **Generate plan** (`generate-plan`) | Calls OpenAI (via `OPENAI_API_KEY`, model `gpt-4o`); returns a phased **Claude Design → Claude Code** prompt chain as phase cards. |
| H5 | **Copy prompt** on a phase | Copies markdown to clipboard ("Copied ✓"). |
| H6 | **Edit** a phase prompt, **Save** | Persists; plan version marked "edited". |
| H7 | Click **Regenerate (new version)** | Creates a new version; version selector switches between v1/v2… |
| H8 | If `OPENAI_API_KEY` missing/invalid | Red error surfaced in the panel — expected failure mode. |

---

## Suite I — Admin: Calendar (Calendly webhook)

| # | Action | Expected |
|---|--------|----------|
| I1 | Open **Calendar** | Month view of appointments. |
| I2 | Book via funnel Calendly (C4), then refresh Calendar | New **scheduled** appointment appears, linked to the lead (via `utm_content` = lead id). |
| I3 | Cancel that booking in Calendly | Appointment flips to **canceled** on next webhook. |

> **Webhook prerequisite:** a Calendly webhook subscription must point to
> `https://web-studio-lac.vercel.app/api/webhooks/calendly` (events `invitee.created`,
> `invitee.canceled`) using signing key `u4bMR0k6A45T`. Unsigned/incorrectly-signed calls
> return **401**. Without the subscription, bookings won't sync even though the embed works.

---

## Suite J — Admin: Catalog CMS (live edits)

| # | Action | Expected |
|---|--------|----------|
| J1 | Open **Catalog** | Entity groups: bundles, add-ons, care/support/Cloudflare plans, personas, settings. |
| J2 | Edit a **bundle price** or **add-on**, save | Change persists (`EntityEditor`). |
| J3 | Reload the **public funnel** | Edited pricing/labels reflected live (catalog is read at request time). |
| J4 | **Settings** → set `team_email`, verify `calendly_event_url`, `ai_bundle`, `yearly_discount_pct` | Saved; `team_email` drives C6 notifications. If `calendly_event_url` is empty, the embed falls back to the `CALENDLY_URL` env var. |

---

## Suite K — Admin: Vouchers CRUD

| # | Action | Expected |
|---|--------|----------|
| K1 | Open **Vouchers** | Lists seeded `TKFF20`. |
| K2 | **Create** a voucher (code, %, scope, validity, redemption limit) | Appears in list (`VoucherEditor`). |
| K3 | Apply the **new** code in the funnel promo box | Accepted with its configured percent/scope. |
| K4 | Set a voucher **expired** or over its redemption limit | Funnel rejects it as invalid. |
| K5 | **Edit/delete** a voucher | Reflected in funnel validation. |

---

## Integration verification matrix

| Integration | How to confirm from the UI | Failure mode if unconfigured |
|---|---|---|
| **Supabase** (DB/auth) | Funnel loads catalog; admin login works; leads persist | Site 500 / login fails |
| **Resend** (email) | Receive confirmation + team email after C3 | Silently skipped (needs verified domain + `team_email`) |
| **OpenAI** (plan gen) | H4 produces phase cards | Red error in Plan panel |
| **Calendly** (webhook) | I2 appointment appears in admin Calendar | Booking widget works, but no admin sync |

---

## Cross-cutting checks
- **Responsive:** run Suite A at mobile width (~375px) — no horizontal scroll; sidebar/receipt reflow.
- **Console:** no uncaught errors during the full funnel.
- **Direct API probes** (fast smoke test): `GET /` → 200, `GET /admin` → 307,
  `POST /api/vouchers/validate {"code":"TKFF20"}` → valid,
  `POST /api/webhooks/calendly` (unsigned) → 401.
