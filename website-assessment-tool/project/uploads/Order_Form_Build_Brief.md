# IntelliPaaS Web Studio — Digital Order Form (Configurator)
### Build Brief for Claude Design

**Version:** 1.0 · July 2026
**Owner:** Matt Soltau · **Sales channel:** Thorsten (all leads route to him)
**Audience:** German SMBs (Handwerker, Gastro, Praxen, Kanzleien, Einzelhandel, Coaches)
**Language of the tool:** **German** (all customer-facing copy). This brief is in English; every user-facing string below is given in German.

---

## 1. Purpose

Build a **highly interactive, single-page web app** that works like a **car configurator** ("Base model includes… now add sat-nav, leather seats…"). A visitor picks who they are, answers a handful of questions, and instantly gets a **recommended bundle** with pre-selected add-ons and a **live price**. They can toggle options like a car catalogue, then submit to **book a call with us** — Thorsten takes it from there.

The form has a second job: **capture as much of the customer's content as possible** (text, images, links, uploads) so our team can build an impressive first website draft in Claude Design immediately after the call.

**Two goals, one tool:**
1. **Qualify + configure + upsell** automatically → a warm, priced lead for Thorsten.
2. **Collect build-ready content** → faster, more impressive website out of the gate.

### Guiding principles
- **Low friction first.** The configurator must feel like a 2-minute game, not a form. Never show a wall of fields upfront.
- **Two stages.** Commit first (fast), enrich second (optional, rewarded).
- **Generosity is rewarded.** Frame content upload as *"the more you share, the more impressive your website — and the faster you're live."*
- **Thorsten is the finish line.** No online payment. The CTA is always *"Gespräch vereinbaren."* Every submission is a lead for Thorsten.
- **Dogfooding.** This tool is itself a showcase of what we build. It must look and feel premium — if we build this for ourselves, the customer imagines what we build for them.
- **Compliant by example.** The form itself is DSGVO-konform (consent, EU data, Impressum/Datenschutz links). We practice what we sell.

---

## 2. High-level flow

```
Intro ──▶ Step 1: Persona ──▶ Step 2: 5–6 Questions ──▶ Step 3: Recommendation + Configurator
                                                              │  (live price, toggle add-ons, care plan)
                                                              ▼
                                        Step 4: Lead capture (Stage 1 — essentials)  ── SUBMIT = qualified lead
                                                              ▼
                                        Step 5: "Machen Sie Ihre Website großartig" (Stage 2 — optional content + uploads)
                                                              ▼
                                        Step 6: Confirmation ("Gespräch vereinbaren")
```

A persistent **progress bar** across the top (e.g. `Schritt 2 von 5`). Users can go **back** without losing input. All state held client-side until submit.

---

## 3. Screen-by-screen specification

### 3.1 Intro screen
- Logo (electric-blue infinity, `IntelliPaaS.io`) + "Web Studio".
- Headline: **"Ihre neue Website — in wenigen Minuten konfiguriert."**
- Sub: *"Beantworten Sie ein paar Fragen und erhalten Sie sofort ein passendes Paket mit Preis. Unverbindlich."*
- Trust row (icons): *DSGVO-konform · Live in 14 Tagen · Server in DE/EU · Festpreis*.
- Primary button: **"Jetzt starten"**.
- Optional single field: *"Haben Sie schon eine Website? Link einfügen (optional)"* → feeds the auto-fill in §7.

### 3.2 Step 1 — Persona ("Wer sind Sie?")
Big, tappable cards (icon + label). Selecting one sets smart defaults (see §5).

| Card (DE) | Icon idea |
|---|---|
| Handwerk & Betrieb | wrench/helmet |
| Gastronomie & Hotellerie | fork/plate |
| Praxis & Gesundheit | stethoscope/cross |
| Kanzlei & Beratung | scales/briefcase |
| Einzelhandel & Online-Shop | shopping bag |
| Coach & Dienstleister | spark/person |
| *Etwas anderes* | dots |

### 3.3 Step 2 — Questions (5–6, one per screen or a short stack)
Keep each answer a tap. Suggested set:

1. **Wie viele Seiten brauchen Sie ungefähr?** → `1–3` · `4–5` · `6–10` · `Mehr als 10`
2. **In wie vielen Sprachen?** → `1 Sprache` · `2 Sprachen` · `3+`
3. **Brauchen Sie eine Online-Terminbuchung?** → `Ja` · `Nein`
4. **Möchten Sie online verkaufen?** → `Nein` · `Ein paar Produkte` · `Voller Online-Shop`
5. **Möchten Sie einen Blog / Neuigkeiten-Bereich?** → `Ja` · `Nein`
6. **Haben Sie bereits ein Logo & Bildmaterial?** → `Ja` · `Teilweise` · `Nein`

(Prefill answers from persona defaults; the user only adjusts.)

### 3.4 Step 3 — Recommendation + Configurator (the heart of the tool)
This is the "car catalogue" screen. Layout:

**A) The recommendation banner**
- *"Unsere Empfehlung für Sie:"* **[Gold — €2.290]** with one-line reason (*"Ideal für die meisten Unternehmen mit bis zu 5 Seiten und Blog."*).
- Small toggle to switch base bundle (Silver / Gold / Platinum) — the user can override; feature deltas update live.

**B) "Das ist alles enthalten" (base model)**
- Show the selected bundle's included features as ticked, read-only chips (pulled from §6). This is the "base car."

**C) "Extras hinzufügen" (the à-la-carte options)**
- Add-ons as **toggle cards** grouped by category (Inhalte, Funktionen, Compliance, Marketing, E-Mail, KI).
- Options already included in the chosen bundle are shown as *"✓ enthalten"* and disabled.
- Answers from Step 2 **pre-tick** relevant add-ons (e.g. 2 languages → *Weitere Sprache* pre-selected). Pre-ticked items are visually marked *"empfohlen"*.

**D) Care plan selector (recurring)**
- Three options: `Basis €49/Mon.` · **`Plus €79/Mon.` (vorausgewählt, "Empfehlung")** · `Pro €199/Mon.`
- Framed as: *"Wir halten Ihre Website sicher & abmahnsicher."*

**E) The AI Ultimate teaser (aspirational anchor)**
- A distinct premium card: **"AI Ultimate — die Website, die mitdenkt · ab €8.500"** with 3–4 wow bullets (self-optimizing SEO, KI-Concierge, self-healing, Stripe-Shop). Button: *"Mehr erfahren"* (expands details). It should make everything else feel affordable.

**F) The live price summary (sticky)**
Always visible (sidebar on desktop, sticky bottom bar on mobile). **Two totals, clearly separated:**
- **Einmalig:** `€X.XXX` (bundle + one-time add-ons)
- **Monatlich:** `€XX/Mon.` (care plan + recurring add-ons)
- Note: *"Unverbindliche Schätzung inkl. gewählter Extras. Alle Preise zzgl. USt."*
- Button: **"Weiter zur Anfrage"**.

### 3.5 Step 4 — Lead capture (Stage 1, essential — the commitment moment)
Short form. **Submitting here already creates a complete, qualified lead** even if the user stops afterwards.
- Vorname, Nachname
- Firmenname
- E-Mail *(required)*
- Telefon *(required — Thorsten will call)*
- *"Was möchten Sie erreichen?"* (free text, 1–2 lines, optional)
- Consent checkbox (see §12): *"Ich stimme der Verarbeitung meiner Daten gemäß Datenschutzerklärung zu."*
- Button: **"Anfrage absenden & Gespräch vereinbaren"**.

On submit: fire the lead to Thorsten (§9), then advance to Step 5.

### 3.6 Step 5 — "Machen Sie Ihre Website großartig" (Stage 2, optional content intake)
Shown **after** submit. Header copy:
> **"Geschafft! Thorsten meldet sich in Kürze."**
> *"Möchten Sie schneller live gehen? Je mehr Sie jetzt teilen, desto beeindruckender wird Ihr erster Entwurf. Alles freiwillig — Sie können auch später ergänzen."*

All fields optional, auto-saved, resumable via link. Detailed fields in §6/§7. Include drag-&-drop uploads **and** a *"Stattdessen Google-Drive-/Dropbox-Link einfügen"* option.

Progress nudge: a playful meter — *"Website-Bereitschaft: 40%"* — that fills as they add content, rewarding generosity.

### 3.7 Step 6 — Confirmation
- **"Vielen Dank! Ihre Anfrage ist bei uns."**
- What happens next (3 steps): *1. Thorsten meldet sich · 2. Wir stimmen Details & Anzahlung (50%) ab · 3. Ihre Website ist in 14 Tagen live.*
- Recap of their configuration + estimated price.
- Optional: *"Zur Übersicht als PDF"* (email them their config).
- Reassurance: *"Kein Risiko — das Erstgespräch ist unverbindlich."*

---

## 4. Recommendation engine (deterministic rules)

Compute a **base bundle**, then apply **upgrade rules**, then **pre-tick add-ons**. Always keep the user able to override.

### Base bundle (from "number of pages")
- `1–3` → **Silver**
- `4–5` → **Gold**
- `6–10` → **Platinum**
- `Mehr als 10` → **Platinum** + note *"oder AI Ultimate für unbegrenzte Seiten"*

### Upgrade / pre-tick rules (apply all that match)
- **Blog = Ja** and base = Silver → recommend **upgrade to Gold** (Blog included) with note; if base ≥ Gold, already included.
- **Terminbuchung = Ja** and base = Silver → pre-tick **Online-Buchungssystem** add-on (or suggest Gold, where it's included).
- **2 Sprachen** → if base < Platinum, pre-tick **Weitere Sprache** add-on; if base = Platinum, included. **3+** → pre-tick languages as add-ons.
- **Verkaufen = Ein paar Produkte** → base Gold + pre-tick **eCommerce / Stripe-Checkout**.
- **Verkaufen = Voller Online-Shop** → recommend **Platinum**, pre-tick **eCommerce / Stripe-Checkout**, surface **AI Ultimate** teaser prominently.
- **Logo/Bildmaterial = Nein** → pre-tick **Logo / Branding-Auffrischung** and **Foto-/Bildpaket**.
- **Analytics interest / base = Silver** → pre-tick **Cookie-Consent + Analytics** (it's included from Gold up).
- **Persona = Praxis/Einzelhandel** (BFSG-relevant) → surface **BFSG-Barrierefreiheitspaket** as recommended.
- **Care plan** → default **Plus (€79)** pre-selected for everyone.

### Persona defaults (starting point before questions)

| Persona | Default base | Pre-suggested add-ons |
|---|---|---|
| Handwerk & Betrieb | Silver→Gold | Foto-/Bildpaket · Google-Profil + lokale SEO |
| Gastronomie & Hotellerie | Gold | Online-Buchung (enth.) · Google-Maps-Einbindung · Social Galerien |
| Praxis & Gesundheit | Gold | Online-Buchung (enth.) · BFSG-Paket · ggf. 2. Sprache |
| Kanzlei & Beratung | Gold | 2. Sprache (DE/EN) · Blog (enth.) |
| Einzelhandel & Online-Shop | Platinum | eCommerce/Stripe · Foto-/Bildpaket |
| Coach & Dienstleister | Gold | Online-Buchung · Newsletter (Brevo) · Blog (enth.) |

---

## 5. Pricing data (source of truth for the calculator)

All prices in **EUR, zzgl. USt.** Show ranges in marketing text, but the **calculator uses the single "Kalkulationspreis"** below and labels the total *"unverbindliche Schätzung."* Split every item into **Einmalig** or **Monatlich**.

### Bundles (base, one-time)
| Bundle | Preis | Kern-Inklusiv (chips) |
|---|---|---|
| Silver | €1.790 | bis 3 Seiten · 1 Sprache · 1 Kontaktformular (Secured by Cloudflare) · Social Links · Impressum & Datenschutz |
| Gold | €2.290 | bis 5 Seiten · Blog · 1 Sprache · Buchung · Cookie-Consent + Analytics · lokale SEO · €150 IntelliPaaS Integrations-Guthaben · 3 Korrekturrunden |
| Platinum | €2.990 | bis 10 Seiten · Blog · 2 Sprachen · 2 Formulare · Buchung · Social Galerien · eCommerce · €500 Guthaben · 5 Korrekturrunden |
| AI Ultimate | ab €8.500 (+ ab €299/Mon.) | agentische Website — siehe Teaser |

*Included counts per bundle for gating add-ons:* Silver = 3 pages/1 lang/1 form; Gold = 5/1/1(+booking,blog,analytics); Platinum = 10/2/2(+galleries,ecommerce).

### Add-ons — one-time (Einmalig)
| Add-on (DE) | Kalkulationspreis | Kategorie |
|---|---|---|
| Zusätzliche Webseite (pro Seite) | €150 | Inhalte |
| Texterstellung (pro Seite, DE) | €120 | Inhalte |
| Blog-Einrichtung | €300 | Inhalte |
| Blogartikel schreiben, SEO-optimiert (pro Beitrag) | €120 | Inhalte |
| Foto-/Bildpaket | €300 | Inhalte |
| Logo / Branding-Auffrischung | €600 | Inhalte |
| Weitere Sprache | €450 | Funktionen |
| Online-Buchungssystem | €250 | Funktionen |
| Zusätzliches Kontaktformular | €120 | Funktionen |
| Newsletter-Anbindung (Brevo) | €250 | Funktionen |
| eCommerce / Stripe-Checkout | €900 | Funktionen |
| Google-Maps-Einbindung (eingebettet, API) | €120 | Funktionen |
| Widgets (WhatsApp, Bewertungen, Klick-to-Call) | €120 | Funktionen |
| Cookie-Consent + Analytics (nur Silver) | €250 | Compliance |
| BFSG-Barrierefreiheitspaket | €500 | Compliance |
| DSGVO-/Abmahn-Check (Bestandssite) | €300 | Compliance |
| Google-Profil + lokale SEO (Einrichtung) | €350 | Marketing |
| SEO-Onpage-Optimierung (einmalig) | €450 | Marketing |
| E-Mail-Einrichtung Google Workspace (bis 3 Adressen) | €150 | E-Mail |
| Jede weitere E-Mail-Adresse | €30 | E-Mail |
| KI-Chatbot / Concierge (Setup) | €900 | KI |

### Add-ons — monthly (Monatlich)
| Add-on (DE) | Kalkulationspreis | Kategorie |
|---|---|---|
| Blog-Content-Paket (4 Artikel/Mon.) | €390/Mon. | Inhalte |
| SEO-Betreuung | €299/Mon. | Marketing |
| Google/Meta Ads (Management, zzgl. Budget) | €300/Mon. | Marketing |
| Newsletter-Betreuung | €150/Mon. | Marketing |
| Google-Admin-Betreuung (wir als Admin) | €10/Mon. | E-Mail |
| KI-Chatbot laufend | €49/Mon. | KI |
| KI-Content-Engine | €300/Mon. | KI |
| KI-Bewertungsantworten | €99/Mon. | KI |

*Note: Google-Lizenzgebühren nicht mit inbegriffen (separat direkt an Google).*

### Care plans (Monatlich, choose one)
| Plan | Preis | Kurzbeschreibung |
|---|---|---|
| Basis | €49/Mon. | Hosting DE/EU, SSL, Backups, Updates, Monitoring |
| **Plus (Empfehlung)** | **€79/Mon.** | + Compliance-Updates, 2 Std. Änderungen, lokale SEO-Pflege |
| Pro | €199/Mon. | + Priorität, 5 Std. Änderungen, monatl. Report, 24-Std.-Support |

---

## 6. Content intake fields (Stage 2 — build-ready brief)

Group into light, collapsible sections. **All optional.** Each upload accepts images/PDF/DOC (see §12) or a link.

**Unternehmen (fließt auch ins Impressum)**
- Firmenname, Rechtsform, Anschrift, Geschäftsführer/Inhaber, Telefon, E-Mail, USt-IdNr.
- Öffnungszeiten · Einzugsgebiet / Standorte

**Marke & Bilder (Upload)**
- Logo (Upload) — oder *"Bitte gestalten Sie eins"*
- Markenfarben (falls vorhanden)
- Fotos: Räumlichkeiten, Team, Produkte, **Arbeitsbeispiele / Vorher-Nachher**
- *"Viel Material? Google-Drive-/Dropbox-Link einfügen"*

**Ihre Geschichte (Text oder Sprachnachricht)**
- Was Sie in einem Satz tun
- Leistungen / Produkte (jede wird ein Abschnitt)
- Warum Kunden Sie wählen (USPs)
- Zertifikate, Meister-Titel, Innungen, TÜV, Auszeichnungen

**Nachweise & Social**
- Google-Unternehmensprofil-Link · Social-Profile
- Bewertungen/Testimonials (oder *"aus meinem Google-Profil übernehmen"*)

**Ziel & Geschmack**
- Hauptziel: `Anrufe` · `Terminbuchungen` · `Online-Verkäufe` · `Anfragen`
- 1–2 Beispiel-Websites, die Ihnen gefallen (oder missfallen)

---

## 7. Friction-killer: auto-fill from existing URL / Google profile
- If the visitor provided a **website URL** (intro) or **Google Business link**, attempt to pre-fill: address, opening hours, phone, services, photos, reviews.
- Reduces Stage 2 effort dramatically and signals sophistication.
- Bonus hook: if the existing site lacks a compliant cookie banner / Impressum, surface a gentle *"Wir haben bemerkt: Ihre aktuelle Seite ist evtl. nicht abmahnsicher — fragen Sie uns nach dem DSGVO-Check."*
- *Implementation note:* server-side fetch/scrape or a metadata API; keep it best-effort and never block the flow if it fails.

---

## 8. Submission, notifications & lead handling
- **On Stage 1 submit:** send a **lead notification email** to Thorsten (and optionally Matt) containing: contact details, persona, all answers, chosen bundle, selected add-ons, care plan, **Einmalig total** and **Monatlich total**, free-text goal, timestamp, and source.
- **On Stage 2 additions:** append the enriched content + upload links to the same lead (update email or a second "content received" notification).
- **Store every submission** in a structured record (see open decisions — email-only MVP vs Google Sheet / Airtable / Supabase). Include all fields as JSON for easy hand-off to the build team.
- **Attribution:** every lead is Thorsten's. Include a hidden `source` field (e.g. `configurator`) and capture UTM params if present.
- **File uploads:** store in a single per-lead folder (e.g. cloud storage), include links in the notification.
- **Auto-reply to customer:** friendly confirmation email in German with their configuration summary and *"Thorsten meldet sich in Kürze."*

---

## 9. Design system & branding
- **Logo:** the IntelliPaaS.io electric-blue infinity mark (file: `_fulllogo_transparent_nobuffer.png`). Pair with a small "Web Studio" tag.
- **Colours:**
  - Electric-blue gradient (brand / AI accents): `#1E4FD6 → #22B8D8`
  - Ink / navy: `#0F2440`
  - Accent blue: `#1E5EFF`
  - Premium gold (for "Empfehlung" cues): `#C9A227`
  - Backgrounds: white + `#F5F7FB`; borders `#E4E9F2`
  - Tier colours (match the price book): Silver grey, Gold navy + gold badge, Platinum deep navy, AI Ultimate electric-blue gradient.
- **Typography:** clean geometric sans (Inter / Helvetica Neue). Big tap targets.
- **Feel:** premium, calm, "edel" — lots of whitespace, subtle motion. Toggles animate; the price total counts up smoothly when options change.
- **Mobile-first.** Most SMB owners will use a phone. Sticky price bar at the bottom on mobile.
- **Tone of copy:** warm, plain German, confident, never pushy. Reassure on price transparency and "unverbindlich."

---

## 10. Key German UI copy (reference)
- Start: **"Jetzt starten"**
- Persona: **"Wer sind Sie?"**
- Recommendation: **"Unsere Empfehlung für Sie"**
- Included: **"Das ist alles enthalten"**
- Add-ons: **"Extras hinzufügen"** · badge **"empfohlen"** · **"✓ enthalten"**
- Care: **"Pflege & Sicherheit — wir halten Sie abmahnsicher"**
- Totals: **"Einmalig"** / **"Monatlich"** · *"Unverbindliche Schätzung · zzgl. USt."*
- Primary CTA: **"Anfrage absenden & Gespräch vereinbaren"**
- Post-submit: **"Geschafft! Thorsten meldet sich in Kürze."**
- Stage 2: **"Machen Sie Ihre Website großartig"**
- Confirmation: **"Vielen Dank! Ihre Anfrage ist bei uns."**

---

## 11. Technical requirements
- **Single-page app**, fast, no page reloads between steps; client-side state; back/forward safe.
- **Live calculator:** recompute Einmalig + Monatlich on every toggle; never block on network.
- **Validation:** email + phone required at Stage 1; inline German error messages.
- **File uploads:** accept `.jpg .png .webp .pdf .doc .docx`; multiple files; sensible max size (e.g. 25 MB each); show thumbnails/filenames; graceful fallback to a Drive/Dropbox link.
- **Save & resume:** Stage 2 resumable via a unique link emailed to the customer.
- **Responsive** down to ~360px; sticky mobile price bar.
- **DSGVO for the form itself (we eat our own dogfood):**
  - Consent checkbox before submit, linking to **Datenschutzerklärung**.
  - **Impressum** + **Datenschutz** links in the footer.
  - Cookie-consent banner if any analytics/tracking is used; Google Consent Mode v2 if Google tools present.
  - Store personal data on **EU/DE servers**; encrypt in transit and at rest.
  - Only collect what's needed; make Stage 2 explicitly optional.
- **Analytics (privacy-friendly):** track step completion + drop-off (e.g. Matomo, or GA4 behind consent) to optimise the funnel.
- **Accessibility:** aim for BFSG/WCAG-friendly — keyboard navigable, sufficient contrast, labelled inputs.

---

## 12. MVP scope & phasing
**MVP (build first):**
1. Persona → Questions → Recommendation + configurator with live dual totals.
2. Stage 1 lead capture → email notification to Thorsten + auto-reply + stored record.
3. Confirmation screen.
4. Full DSGVO baseline (consent, Impressum/Datenschutz, EU hosting).

**Phase 1.1:**
- Stage 2 content intake + uploads + "Website-Bereitschaft" meter + resume link.
- URL / Google-profile auto-fill.
- PDF summary email of the configuration.

**Phase 2 (showcase):**
- Conversational / AI-guided version of the configurator (demonstrates AI Ultimate capabilities live).
- Direct hand-off of the structured lead + content into the Claude Design build pipeline.

---

## 13. Open decisions for Matt
1. **Lead storage:** email-only for MVP, or wire into a Google Sheet / Airtable / Supabase / CRM from day one?
2. **Calculator prices for ranged items:** confirm the single "Kalkulationspreis" values in §5 (e.g. extra page €150, eCommerce €900, SEO-Betreuung €299/mo).
3. **Booking the call:** simple "we'll call you" (phone required), or embed a live calendar (Calendly/Cal.com) on the confirmation screen so they self-book with Thorsten?
4. **Domain & hosting** for the tool itself (subdomain of intellipaas.io? separate domain?).
5. **Auto-fill:** build the URL/Google scrape in MVP or defer to 1.1?
6. **AI Ultimate price display:** show "ab €8.500" openly, or "auf Anfrage"?

---

*Prepared for handoff to Claude Design. All customer-facing copy to be delivered in German; prices in EUR, zzgl. USt.*
