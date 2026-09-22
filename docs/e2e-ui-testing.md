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
| D7 | Fill the collapsed **optional intake** sections on the contact form (or skip them) | Sent together with the inquiry (`POST /api/leads`, `stage2`); the intake never blocks completion. The done screen shows the customer's permanent link (`quote-link`) with a copy button. |
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
| H3 | Change the lead **status** (`lead-status`: draft, new, contacted, agreed, won, lost) | Persists; reflected in the list; logged in the activity timeline. Setting *agreed* without picking a version takes the latest one. |
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

## Suite L — Client onboarding form (`/onboardingform`)

Server must run with `ONBOARDING_AI_FIXTURE=1` for L4–L7 to be deterministic; without it the real
model answers (needs `OPENAI_API_KEY`). The route is behind Basic auth (`ONBOARDING_BASIC_USER/PASS`).

| # | Action | Expected |
|---|--------|----------|
| L1 | Open `/onboardingform` without credentials | 401 with a Basic challenge; `/` still 200. With the credentials: landing with "ca. 20 Minuten", *Briefing starten*. |
| L2 | *Briefing starten* | Redirect to `/onboardingform/<21-char id>`, Screen 1 with the 10-dot stepper (phones: "Schritt 1 von 10"). *Weiter* while empty → red field errors. |
| L3 | Answer *Änderungen an meiner bestehenden Website* → back to *Eine neue Website* → back again | URL field appears, disappears, reappears **with the typed value** ("Wir haben Ihre frühere Antwort wiederhergestellt"). |
| L4 | Walk screens 2–9 (see `e2e/onboarding-form.spec.ts` for a full set of answers); on Screen 5 put two actions into *Am wichtigsten* | *Weiter* blocked with "Genau 1 × …"; fixing it continues. Sliders show captions; *Weiß ich nicht* pills mark a field as unsure. |
| L5 | Paste "Passwort: xyz" into *Konten* | Value saved as `Passwort: [entfernt / redacted]` with an amber notice; the team sees flag `credentials_redacted`. |
| L6 | Close the tab, open the same URL in a private window | Same step, same answers. Header toggle *EN* → `/en/onboardingform/<id>` with English CMS copy. |
| L7 | *Antworten prüfen* → follow-ups | One question at a time with quick replies / text / *Überspringen*; the legal-pages "Wir haben keine" reply chains into the price offer; 11 pages against a 5–8 band → acknowledge-only scope note (no price shown). |
| L8 | *Weiter zum Briefing* | Nine numbered sections; *Bearbeiten* saves inline (badge *bearbeitet*); *Neu schreiben lassen* changes only that section; section 9 lists open items. |
| L9 | *Weiter zur Bestätigung* → tick all → name → confirm | Terms show "3 bis 6 Wochen" / "24 Stunden"; done screen with PDF download; client + team emails (Resend rejects `example.com` recipients — use a real address). Record locked afterwards. |
| L10 | Admin → **Onboarding** → the form | Flags, follow-up history, answers (don't-know / follow-up marked), brief versions, AI log, PDF/JSON downloads. **Catalog → Onboarding form → Fields**: edit a label → reload the public form → new label. |

---

## Suite M — Permanent quote link (`e2e/quote-link.spec.ts`)

Needs the quotes migration (`20260922000012`) on the target database; the spec skips itself otherwise.

| # | Action | Expected |
|---|--------|----------|
| M1 | Complete a DE run and submit | Done screen shows **Ihr persönlicher Link** (`quote-link`, `?c=<21 chars>`); `leads.session_id` is that id; `GET /api/sessions/<id>` returns `quote.leadId`. The confirmation email carries the link. |
| M2 | Open the link in a private window | Configurator with the quote banner ("Ihre Anfrage vom …", totals) and the same `sum-once`. |
| M3 | Toggle an add-on → **Änderungen senden** → submit | Heading *Anfrage aktualisieren*, consent shown as already given, done variant "Danke, wir haben Ihre Änderungen erhalten." Same lead (no duplicate), `total_one_time` updated, `lead_versions` v1 + v2, team gets "Quote updated (v2)" with the diff. |
| M4 | Open `/?c=<unknown id>` | Intro with the notice "Dieser Link ist nicht mehr gültig", clean URL, no row created (`GET /api/sessions/<id>` stays 404). |
| M5 | DE → EN toggle on the configurator | `/en?c=<same id>`; no restart. |
| M6 | Set the lead to *won* in the admin, reopen the link, change something | Banner "Dieses Angebot ist abgeschlossen"; `POST /api/sessions` answers 403; nothing saved. |

## Suite N — Admin: quotes pipeline (`e2e/admin-quotes.admin.spec.ts`)

| # | Action | Expected |
|---|--------|----------|
| N1 | **Leads** → **+ New quote** → name/email → *Create draft* | Redirect to the new lead (`draft`, badge *team quote*, v1 in Versions, customer link shown). |
| N2 | **Open in configurator** (same browser, signed in) | Public site in **Team-Modus** banner; configure; **Änderungen senden** → *Angebot speichern* (no phone/consent required) → "Angebot gespeichert." → *Zurück zum Admin* shows v2, status still draft, no customer email. |
| N3 | **Send quote to customer** | Customer email with link + receipt; status draft → contacted; timeline entry. |
| N4 | Row action **Remove** (or tick rows → *Remove selected*) | Confirmation first; then the lead is gone from every view (Open, All, its detail page 404s) while the row, its versions and notes stay in the DB (`archived_at` set). No restore in the CMS — undo is `update leads set archived_at = null`. Dashboard counts and calendar links exclude removed leads. |
| N5 | Detail → add a note | Note on top of **Activity & notes**; every status change, version, email and link action is logged there automatically. |
| N6 | Versions → **Mark as agreed** (optionally override the amounts) | Version highlighted *agreed*, status → agreed, agreed amount pill on the quote card. |
| N7 | **Questionnaire** section | Question text + chosen labels ("Do you already have a website…" → "No, I'm starting fresh"), never raw keys; content intake with field labels. |
| N8 | Customer edits the link without resubmitting | Quote card shows "Live configuration differs from the submitted quote" with the diff; a version is saved once the customer pauses for `quote_idle_minutes` (Catalog → Settings) or via **Save version now**. |
| N9 | **Create onboarding form** | Redirect to the new onboarding form (linked to the lead, "Created from lead →"); Screen 1 prefilled with contact, booked package (silver/gold/platinum), page band, project type, existing URL. |
| N10 | Lead without a link (submitted before this release) → **Create customer link** | Link minted from the stored snapshot; version *link restored*. |

---

## Integration verification matrix

| Integration | How to confirm from the UI | Failure mode if unconfigured |
|---|---|---|
| **Supabase** (DB/auth) | Funnel loads catalog; admin login works; leads persist | Site 500 / login fails |
| **Resend** (email) | Receive confirmation + team email after C3 | Silently skipped (needs verified domain + `team_email`) |
| **OpenAI** (plan gen) | H4 produces phase cards | Red error in Plan panel |
| **Calendly** (webhook) | I2 appointment appears in admin Calendar | Booking widget works, but no admin sync |
| **OpenAI** (onboarding) | L7 asks model questions, L8 brief is `llm`-sourced (admin shows source/model) | Falls back to a plain rendering of the answers; AI log shows the failure |

---

## Cross-cutting checks
- **Responsive:** run Suite A at mobile width (~375px) — no horizontal scroll; sidebar/receipt reflow.
- **Console:** no uncaught errors during the full funnel.
- **Direct API probes** (fast smoke test): `GET /` → 200, `GET /admin` → 307,
  `POST /api/vouchers/validate {"code":"TKFF20"}` → valid,
  `POST /api/webhooks/calendly` (unsigned) → 401.
