# Lanserhof: reference spec

> Source: https://lanserhof.com/en · Crawled 2026-10-27 at 390, 768, 1280 and 1920 px · Category: Health & Yoga · Pages crawled: 8

## 1. Overview
Lanserhof runs four medical spa resorts (Austria, Bavaria, Sylt, Marbella) and sells stays built around a medical concept, so the site reads like a hushed luxury brochure rather than a clinic. The design is almost colourless: cool light greys (#f4f4f5, #eeeeef), near-black text (#1b1d21), dark cinematic photography and video, and soft blurred-light gradient panels that look like frosted paper. Three things make it recognisable: every heading is a two-part lockup, a light italic serif line (Frutiger Serif LT Pro) stacked over an uppercase sans line (Neue Frutiger World) at about 1.15 times the size; the page is built from full-viewport panels split on a golden-section grid (62/38 and 38/62) that alternate image and text sides; and all controls are small pill buttons that float in "liquid glass" capsules over the content.

## 2. Pages and navigation
| Page | Path | Purpose |
|---|---|---|
| Home | /en | Video hero, concept and expertise panels, focus areas selector, resorts, awards |
| AI chat onboarding | /en/chat | "Start your journey" assistant: consent steps in a centred card, no site footer |
| Home (German) | /de | German-language copy of the homepage |
| Contact | /en/contact | Photo hero, then addresses, phones and emails per resort |
| Booking | /en/booking | Step one of the booking flow: choose a resort from 4 image cards |
| Lanserhof Concept | /en/lanserhof-concept | Older-template concept page: text sections, white tile grid, accordions, resort images |
| Nutrition & Fasting | /en/nutrition-fasting | Pillar page: alternating split panels, stage list, links to the other pillars |
| Medicine & Naturopathy | /en/medicine-naturopathy | Pillar page in the same template, mostly text and gradient panels |

- Header controls (there is no row of text links): a menu capsule at the left (round menu icon plus "Start your journey" with a sparkle icon), the logo in the centre, and a capsule at the right holding "Contact us" (with a phone icon) and a filled "Book now" pill.
- The menu button opens a large panel (not captured as a screenshot) whose measured contents are: top-level items in Neue Frutiger World 800 at 24px (Home, Concept and others), sub-items at 20px weight 800 with 14px weight 300 descriptions, resort names at 24px with 12px country labels, a language switch (EN, DE), a search field with a keyboard shortcut hint, and a "Classic Detox" style promo with the serif/sans lockup at 36px.
- Footer-only pages: the six concept pillars (Lanserhof Concept, Nutrition & Fasting, Medicine & Naturopathy, Movement & Recovery, Mental Health & Coaching, Nature & Architecture, Beauty & Glow), the four resorts, thirteen focus areas, News & Stories, Careers (external), Expertise, Legal Information, Privacy policy, Cookie settings.
- Primary call to action: "Book now", which leads to the booking flow (/en/booking). Secondary: "Contact us" and the AI chat.

## 3. Header
- **Position:** fixed at the top on every width, 128px tall at 1280 and 1920, with no background bar of its own. Its controls sit in translucent capsules ("liquid glass": light fill at about 85% opacity, a hairline light border, soft blur) so they read over both dark video and light panels.
- **Logo:** an image of the word "LANSERHOF" broken into three stacked lines of three letters (LAN / SER / HOF) in a bold, tightly tracked sans, about 95px wide and 105px tall at 1280, centred horizontally, white over the hero and near-black on light pages.
- **Laptop 1280:** left capsule at x 16 to 240 (about 46px tall, fully rounded): a 32px light round button with a three-line menu icon, then "Start your journey" in Neue Frutiger World 400 14px (line height 20px) with a small four-point sparkle icon. Right capsule at x 1024 to 1262: "Contact us" with a phone outline icon as a plain text pill, then "Book now" as a filled pill (light #e3e5e8 over the dark hero, dark #26282b with #fafafa text on light pages). Pill padding 8px 14px, fully rounded.
- **Large 1920:** same arrangement with the same 128px height and type size; capsules stay at 16px from the edges.
- **Tablet 768 and phone 390:** a thin top row (53px on phone, 61px on tablet) with only the round menu button at the left and "Start your journey" at the right; the logo moves down into the hero frame. A fixed bottom bar holds two equal pill buttons side by side, "Contact us" (light #e3e5e8) and "Book now" (dark #26282b), each about 178 x 36px on phone with 12px gaps and margins. How the menu opens on phone was not captured.
- **Booking and chat pages:** the same three-part header but the left capsule becomes "Leave booking" or "Return to homepage" with a close icon, and the right capsule reads "Need help?" with a dark pill ("Get assistance" or "Contact us") and an icon.

## 4. Footer
- Starts with a closing call to action, on the page grey #f4f4f5: a centred two-part lockup ("Questions about" in italic serif over a caps sans line, about 52px), a 3-line centred paragraph in Neue Frutiger World 450 16px at 80% of #1b1d21, and a small dark "Contact us" pill.
- Below it, a white #ffffff rounded card (about 12px radius, inset 28px from the page sides at 1280) with 4 equal columns (25% each): Concept (7 links), Resorts (4), Focus areas (13), Company (3). Column headings in Neue Frutiger World 500 14px, uppercase, tracking 1.12px, #6e737d. Links in Neue Frutiger World 450 18px, line height 28px, #1b1d21 at 80%, no underline. Generous inner padding (about 64px).
- Under the card, centred on grey: a row of three small legal links (12px weight 300, #6e737d), a language switch (EN bold dark, DE grey), and a copyright line with a year range.
- No newsletter, no social icons, no logo in the footer.
- Measured heights: 1266px at 1280 and 1920, 1572px at 768, 1917px at 390 (columns wrap to 2 x 2 on tablet and stack on phone).

## 5. Page layouts

### Home (laptop page height 6322px)
Each section is close to one viewport tall (800px at 1280, exactly 1080px at 1920), so the page reads as a sequence of full-screen panels.

**1. Full-screen video hero**
- Layout: one centred column over a full-bleed video, 800px tall (100% of the viewport). The lockup sits slightly above the vertical centre; a 2-line paragraph and a small round "scroll for more" chevron button sit near the bottom.
- Content: H1 lockup: "Home of" type line in Frutiger Serif LT Pro 300 italic 60px (tracking 3.87px), then a caps line in Neue Frutiger World with the ampersand in the serif italic at 69px. Paragraph in Neue Frutiger World 300, 16px, line height 24px, tracking 0.2032px, white, centred, max about 430px.
- Background: muted, dusky, looping video of the resorts (thatched-roof building on dunes at sunset, aerial of a building in forest and lake). A dark overlay keeps it low-contrast. Underneath, #000000.
- Phone: the video sits in an inset frame (about 12px from the sides, rounded corners about 12px) between the top row and the bottom button bar; the logo is inside the frame at the top; the paragraph runs on 3 lines.

**2. Concept split panel (62/38, image right)**
- Layout: 2 columns on a golden-section grid. Left column 38% (x 0 to 490) is itself split vertically: an upper square-ish gradient panel (about 490px tall) with the centred lockup, and a lower plain panel with a left-aligned paragraph and a dark pill button. Right column 62%: a full-height photo. Height 800px.
- Content: lockup (italic serif 36px over caps sans 41.4px weight 450, tracking 1.53594px, 2 caps lines), paragraph in 16px weight 300, one dark pill "medical expertise" type.
- Background: left panels are soft gradient fields in warm grey and beige with a blurred light glow (a frosted, grainy look); photo is a man resting in a glass pavilion at golden hour.
- Phone: stacks to text panel then image (band 1044px tall).

**3. Focus areas selector (38/62, image left)**
- Layout: 2 columns flipped: a full-height photo on the left (62%, about 790px wide) and a right column (38%) split into an upper gradient panel and a lower plain panel. Height 859px.
- Content: lockup at the top of the upper panel (italic 30px over caps 34.5px), a one-line subtitle, then a vertical "wheel" list of focus area names in Neue Frutiger World 300 whose size and colour fall off from the selected item: 28px #1b1d21 (selected, with hairline rules above and below), 22px #44484f, 18px #6e737d, 16px #9ea3ad. The lower panel shows a 3-line description of the selected area and a dark "Learn more" pill. The photo changes with the selected item (26 images loaded).
- Background: photo of a woman standing in dune grass by the sea; panels in pale grey with a warm glow.
- Phone: becomes a 5-column grid in 2 rows (measured), list and image stacked.

**4. Medical expertise split panel**
- Same as Home section 2 (62/38, gradient panel with lockup over a plain text panel, photo right). The gradient here is warmer, peach to beige. Photo: a doctor showing a tablet to a guest in a wood-panelled lounge.

**5. Resorts strip**
- Layout: an upper row 38/62: a white panel on the left with the lockup (italic serif 48px on 2 lines, caps sans 55.2px on 2 lines, left-aligned) and a pale grey panel on the right with a 2-line paragraph at the lower-left. Below, 4 equal portrait image cards edge to edge (each 25%, about 320 x 570px at 1280) separated by 2px gaps. Height 926px.
- Content: each card has a dark gradient at the bottom with the resort name in Frutiger Serif LT Pro 300 italic 48px (tracking 3.096px, #fafafa) over the region in Neue Frutiger World 450 18px uppercase (tracking 0.6678px). No buttons; the whole card is the link.
- Phone and tablet: the 4 cards become a 2 x 2 grid.

**6. Awards panel (62/38)**
- Layout: photo left (62%, a white spiral staircase), right column: an upper gradient panel with centred lockup (italic over caps), a 4-line centred paragraph; a lower strip with a horizontal carousel of award seals (round grey badge images about 80px) each with a bold 14px weight 500 title and a 12px #6e737d subtitle, then a control row: "Awards" label, a progress line and two small chevron buttons. Height 870px.
- Phone: stacks, carousel stays horizontal.

**7. Footer** (see section 4).

### AI chat onboarding (laptop page height 800px)
- No footer and no hero. The three-part header (with "Return to homepage" and a "Need help? / Contact us" capsule) sits over a #f4f4f5 page. In the centre a white card about 448px wide with a 1px light border and about 8px radius: a dark grey gradient image block with an outline sparkle icon, a heading in Neue Frutiger World bold (about 26px), two grey paragraphs with an underlined link, a divider, then a step indicator (one long dark dash and four grey dots) at the left and a dark "Next" pill at the right. Under the card, two lines of small grey disclaimer text and a row of underlined legal links.

### Contact (laptop page height 2892px)
1. **Short photo hero:** full-bleed landscape photo (a resort among pine trees with mountains), 694px tall, with the lockup at the bottom-left (italic serif over caps sans) and a short white line under it.
2. **Addresses:** on #f4f4f5, a single left-aligned text column starting at about 37% of the width (x 480): for each resort a bold title (about 20px), the address in 3 to 4 small lines, then the phone number and email as underlined links. About 50px between resorts. Height 868px.
3. **Footer.**

### Booking (laptop page height 800px)
- A full-screen step of a flow: the header capsules ("Leave booking" at the left, "Need help? / Get assistance" at the right) above a light top panel (329px) with the centred logo and a centred lockup ("Choose" italic over a caps line). Then a row of 4 equal resort image cards (about 288 x 337px, 24px gaps, radius about 4px) with the name in large serif italic and the region in caps beneath, all in white; one card is washed out with a "coming soon" note. A bottom bar (108px, translucent #f4f4f5 at 33%) holds a "Back" pill with an arrow at the left.

### Lanserhof Concept (laptop page height 8466px)
This page uses an older template and is the least characteristic; use it only for the hero.
1. **Photo hero:** full-bleed, 800px, a warm golden photo (gold tap and cup), H1 in caps sans at the left middle in white, followed by two white paragraphs.
2. **Text sections** on #f4f4f5 and white: a centred narrow column (about 490px) with a small bold heading, paragraphs and a bulleted list with bold lead-ins.
3. **Tile grid:** a 3-column grid of small white tiles with a soft shadow, each a bold title and a tiny black "Learn more" button, after an image card with a caption.
4. **Accordion** of three rows with chevrons, a centred text block, a large black pill "Request a stay" button, and a 3-column resort image row.
5. **Footer.**

### Nutrition & Fasting (laptop page height 8525px)
1. **Photo hero:** full-bleed photo (a plated vegetable rose on a dark table, lit from the side), 800px, lockup bottom-left in white ("Nutrition &" italic serif over caps), a 2-line white paragraph and a small round chevron button below it.
2. **Intro panel:** full-width gradient panel (#eeeeef base with a warm blurred glow), 800px, centred lockup and a 4-line centred paragraph.
3. **Split panel 62/38, image left:** dining photo left; right column with an upper gradient panel (lockup) and a lower plain panel with left-aligned paragraphs.
4. **Stages list (38/62, golden-section):** left: a gradient panel with centred lockup and short text, plus a small grey note below; right: a stacked list of 5 stages, each a caps title (Neue Frutiger World about 15px, tracking) and a 2 to 3 line grey description, separated by hairline rules.
5. **Split panel, image left (62/38):** food photo left, gradient lockup panel and paragraph right.
6. **Full-bleed photo strip** (about 500px) followed by a 38/62 row: gradient lockup panel left, paragraphs right.
7. **Split panel flipped:** paragraphs left, gradient lockup panel right.
8. **Full-width gradient panel** with centred lockup and two centred paragraphs.
9. **Pillar links:** centred lockup and a small outlined pill "discover" button, then 5 equal portrait image cards edge to edge (20% each, 2px gaps) with white caps labels centred at the bottom.
10. **Footer.**

### Medicine & Naturopathy (laptop page height 10066px)
- Same template as Nutrition & Fasting: a photo hero (hands holding a tablet with a diagnostic graphic), a full-width gradient intro panel, then seven 38/62 rows where a tall gradient panel with a lockup alternates sides with a column of paragraphs (very little photography), a full-width gradient panel, the 5-card pillar links row and the footer.

## 6. Responsive behaviour
| Breakpoint | Header | Grid columns | Hero | Type changes | Other changes |
|---|---|---|---|---|---|
| 390 | 53px top row: menu button left, "Start your journey" right; fixed bottom bar with "Contact us" and "Book now" pills | Split panels stack; resorts 2 x 2; footer columns stack | Video in an inset rounded frame, 730px tall, logo inside the frame | Lockups scale down (not measured) | Page scrolls inside an inner layout; only the first screen was captured |
| 768 | 61px top row, same bottom bar | Split panels stack; resorts 2 x 2; footer 2 x 2 | Inset frame, 956px tall | Not measured | Only the first screen was captured |
| 1280 | 128px fixed, capsules left and right, logo centred | 62/38 and 38/62 splits; resorts and pillar cards edge to edge in 4 or 5 columns | 800px, full bleed | H1 serif line 60px; H2 serif 30 to 48px over caps 34.5 to 55.2px | Panels about one viewport tall (800 to 926px) |
| 1920 | 128px, same layout | Same splits | 1080px, full bleed | Not measured at 1920 | Every home section exactly 1080px tall |

- Maximum content width: none; panels run edge to edge. Text inside panels is capped at measured widths of about 380 to 490px (laptop) and 610 to 620px (large). Section photos always touch the viewport edges.
- Side padding: header capsules sit 16px from the edges; text in panels is inset about 20 to 40px; the footer card is inset about 28px.
- Nothing scrolls sideways (overflow 0px on every page).
- Crawl limitation: at 390 and 768 the site renders inside a fixed-height layout, so full-page phone and tablet screenshots show only the first screen. Section heights at those widths come from the JSON only.

## 7. Motion and interaction
- Hero: one muted, looping video per page header on Home (started by script). Other pages use still photos.
- Focus areas selector: a vertical "wheel" list where the active item is largest and darkest; selecting an item swaps the photo and the description. 26 images are preloaded for it.
- Carousels: the awards strip (progress line plus chevrons). The booking flow advances in steps; the chat onboarding has a 5-step dot indicator.
- Scroll reveal: 1 element hidden at load and 1 after scroll (subtle fade-ins).
- Hover: 234 elements carry CSS transitions on Home (pills, cards, links); exact hover styles not measured.
- Fixed elements: header capsules on all widths, bottom action bar on phone and tablet.
- Libraries: no GSAP, ScrollTrigger, Lenis, Locomotive, Swiper, Framer Motion or Lottie detected.
- Glass effect: header capsules and the booking bottom bar use translucent fills with background blur ("liquid glass").

## 8. Colour
| Role | Hex | Where it is used |
|---|---|---|
| Page background | #f4f4f5 | Default light grey on every page, footer background |
| Alternate panel | #eeeeef | Full-width gradient intro panels (base colour) |
| Surface | #ffffff | Footer link card, chat card, resort heading panel |
| Glass fill | #eeeeef at 85% | Header capsules |
| Primary text | #1b1d21 | Headings, links (often at 80% opacity for footer links and paragraphs) |
| Secondary text | #44484f | Second level of the focus wheel |
| Muted text | #6e737d | Footer headings, captions, legal links, nav labels on light pages |
| Faint text | #9ea3ad | Outer items of the focus wheel |
| Light text | #fafafa | Text on photos and video, text on dark pills |
| Dark button | #26282b | "Book now" on light pages, "Learn more", "Contact us" in the footer |
| Light button | #e3e5e8 | "Book now" over the hero, "Contact us" on the phone bar |
| Hero base | #000000 | Behind the hero video and photos |
| Image overlays | #08090c at 12%, #808080 at 20%, #ffffff at 60% | Darkening and frosting on photos and panels |
| Warm gradient tints | not measured (beige, stone, peach glows) | Lockup panels; soft radial glows on grey |
| Accent | none | The site has no brand accent colour |

## 9. Typography
| Level | Family | Weight | Size (laptop) | Size (phone) | Line height | Letter spacing | Case |
|---|---|---|---|---|---|---|---|
| H1 serif line | Frutiger Serif LT Pro | 300 italic | 60px | not measured | 60px (1.0) | 3.87px | Sentence case |
| H1 caps line | Neue Frutiger World | not measured (the ampersand in it is serif italic 69px) | about 69px | not measured | 1.0 | not measured | Uppercase |
| H2 serif line | Frutiger Serif LT Pro | 300 italic | 30 to 48px | not measured | 1.0 | 0.0645em (1.935px at 30px, 3.096px at 48px) | Sentence case |
| H2 caps line | Neue Frutiger World | 450 | 34.5 to 55.2px (1.15 x the serif line) | not measured | 1.0 | 0.037em (1.27995px at 34.5px) | Uppercase |
| H3 resort name | Frutiger Serif LT Pro | 300 italic | 48px | not measured | 48px | 3.096px | Title case |
| H3 region label | Neue Frutiger World | 450 | 18px | not measured | 18px | 0.6678px | Uppercase |
| Body | Neue Frutiger World | 300 | 16px | not measured | 24px | 0.2032px | Sentence case |
| Body on light (footer intro) | Neue Frutiger World | 450 | 16px | not measured | 24px | 0.2032px | Sentence case |
| Small labels | Neue Frutiger World | 500 | 14px | not measured | 20px | 1.12px | Uppercase |
| Captions and legal | Neue Frutiger World | 300 to 400 | 12px | not measured | 16px | 0.1524px | Sentence case |
| Header controls | Neue Frutiger World | 400 | 14px | 14px | 20px | normal | Sentence case |
| Buttons | Neue Frutiger World | 400 | 14px | 14px | 20px | normal | Sentence case |
| Footer links | Neue Frutiger World | 450 | 18px | not measured | 28px | 0.2032px | Title case |
| Menu items | Neue Frutiger World | 800 | 24px | not measured | 32px | 0.48px | Title case |

- The two-part lockup is the signature: the serif italic line is light and widely tracked; the caps line is slightly larger, regular weight and modestly tracked; both are centred (or left-aligned inside resort headings) with no gap between them.
- The H tags themselves report 16px; the sizes above are the measured spans inside them.

## 10. Imagery and icons
- Photography: dark, cinematic, desaturated and warm: resort architecture at dusk (thatched roofs, timber facades, glass pavilions), dune grass and sea, alpine meadows, a white spiral staircase, plated food lit from the side on dark tables, guests and doctors in calm, candid poses. Low contrast, lots of shadow, no bright skies.
- Crops: full-bleed heroes; tall full-height photos filling 62% of a panel; portrait cards in rows of 4 or 5 with 2px gaps; no rounded corners on section photos (only the phone hero frame and booking cards are rounded).
- Gradient panels: soft, grainy, blurred-light fields in grey, stone, beige and peach, used as backgrounds for every lockup. They look like light falling on paper, never like a colour gradient.
- Video: one looping hero video on Home.
- Icons: thin outline icons only (menu, sparkle, phone, chevrons, close, arrows), small and grey or white.
- Not used: illustrations, bright colours, emoji, drop shadows (except on the old-template Concept tiles), icon grids, stock smiling portraits.

## 11. Components
- **Pill button (dark):** #26282b fill, #fafafa text, Neue Frutiger World 400 14px, padding 8px 14px, fully rounded, about 36px tall.
- **Pill button (light):** #e3e5e8 fill, #1b1d21 text, same size.
- **Text pill:** no fill, icon plus 14px label inside a glass capsule ("Contact us", "Start your journey").
- **Glass capsule:** a fully rounded container (about 46px tall) with a translucent light fill (#eeeeef at 85%), a hairline border and background blur, grouping one to three controls.
- **Round icon button:** about 32px circle, light fill, a menu or chevron icon.
- **Lockup:** italic serif line over caps sans line, as in section 9.
- **Gradient panel:** a flat-edged rectangle with a blurred light glow, holding a centred lockup and up to 4 lines of small text.
- **Resort card:** portrait photo, bottom gradient, large italic serif name over a caps region label, all white, centred.
- **Pillar card:** portrait photo with a 2-line caps label centred at the bottom.
- **Focus wheel list:** stacked items whose size and colour fade with distance from the selected one; the selected item has hairline rules above and below.
- **Stage list:** caps title, grey description, hairline divider between items.
- **Footer card:** white, about 12px radius, 4 link columns.
- **Booking card:** photo card with about 4px radius, centred white serif name and caps label.

## 12. Section skeletons

```html
<!-- Fixed header: two glass capsules and a centred stacked logo -->
<header><!-- fixed, 128px at 1280, no background bar -->
  <div><!-- glass capsule, left 16px -->
    <button aria-label="Menu"><!-- 32px circle --></button>
    <a>Start your journey ✧</a><!-- 14px 400 -->
  </div>
  <a aria-label="Home"><img alt="Logo in three stacked lines"></a><!-- centred, about 95 x 105px -->
  <div><!-- glass capsule, right 16px -->
    <a>Contact us</a><!-- phone icon, no fill -->
    <a>Book now</a><!-- pill: light over hero, dark on light pages -->
  </div>
</header>
<!-- Phone and tablet: fixed bottom bar with two equal pills: light "Contact us", dark "Book now" -->
```

```html
<!-- Full-screen video hero with a two-part lockup -->
<section><!-- 100vh, #000 under a dimmed video -->
  <video muted loop playsinline></video>
  <h1>
    <span>Serif line</span><!-- Frutiger Serif 300 italic 60px, tracking 3.87px -->
    <span>CAPS LINE</span><!-- Neue Frutiger World caps about 69px -->
  </h1>
  <p>Two-line centred paragraph.</p><!-- 16px 300, white, near the bottom -->
  <button aria-label="Scroll for more"><!-- small round chevron --></button>
</section>
```

```html
<!-- Golden-section split panel: text column 38%, photo 62% -->
<section><!-- one viewport tall; flip sides on the next section -->
  <div><!-- 38% column -->
    <div><!-- upper gradient panel: grainy blurred light, warm grey -->
      <h2><span>Serif line</span><span>CAPS LINE</span></h2><!-- 36px italic over 41.4px caps -->
    </div>
    <div><!-- lower plain panel -->
      <p>Four-line paragraph.</p>
      <a>Secondary action</a><!-- dark pill -->
    </div>
  </div>
  <img alt="Full-height cinematic photo"><!-- 62%, edge to edge, no radius -->
</section>
```

```html
<!-- Focus areas wheel: photo left, fading list right -->
<section><!-- 38/62 flipped: photo 62% left -->
  <img alt="Photo for the selected area">
  <div>
    <div><!-- gradient panel -->
      <h2><span>Serif line</span><span>CAPS LINE</span></h2>
      <p>One-line subtitle.</p>
      <ul><!-- sizes 16 / 18 / 22 / 28 / 22 / 18 / 16px, colours fade to #9ea3ad -->
        <li><button>Area</button></li>
        <li aria-current="true"><button>Selected area</button></li><!-- 28px #1b1d21, hairlines above and below -->
      </ul>
    </div>
    <div><p>Description of the selected area.</p><a>Learn more</a></div>
  </div>
</section>
```

```html
<!-- Resorts: heading row, then four portrait cards edge to edge -->
<section>
  <div><!-- 38 / 62 -->
    <h2><span>Serif line on two lines</span><span>CAPS ON TWO LINES</span></h2><!-- white panel, left-aligned -->
    <p>Two-line paragraph.</p><!-- pale grey panel, lower-left -->
  </div>
  <ul><!-- 4 x 25%, 2px gaps, portrait -->
    <li><a><img alt=""><h3><span>Name</span><span>REGION, COUNTRY</span></h3></a></li><!-- serif italic 48px over caps 18px, white, bottom gradient -->
  </ul>
</section>
```

```html
<!-- Stage list next to a lockup panel -->
<section><!-- 38 / 62 -->
  <div><h2><span>Serif line</span><span>CAPS LINE</span></h2><p>Short centred text.</p></div><!-- gradient panel -->
  <ol><!-- hairline dividers -->
    <li><h3>STAGE TITLE</h3><p>Two-line grey description.</p></li>
  </ol>
</section>
```

```html
<!-- Footer: closing lockup, white link card, legal row -->
<footer><!-- #f4f4f5 -->
  <h2><span>Serif line</span><span>CAPS QUESTION?</span></h2>
  <p>Three-line centred paragraph.</p>
  <a>Contact us</a><!-- dark pill -->
  <nav><!-- white card, about 12px radius, 4 x 25% columns, 64px padding -->
    <section><h3>GROUP</h3><a>Link</a><a>Link</a></section><!-- heading 14px caps #6e737d, links 18px 450 -->
  </nav>
  <p><a>Legal</a> <a>Privacy</a> <a>Cookies</a></p><p><b>EN</b> DE</p><p>© years</p>
</footer>
```

## 13. Dos and don'ts
- **Do:** set every heading as the two-part lockup: light italic serif with wide tracking over a slightly larger uppercase sans, with no gap between them.
- **Do:** build pages from full-viewport panels on a 38/62 golden-section split, alternating the image side from one panel to the next.
- **Do:** keep the palette colourless: light greys, white, near-black text and the colour that comes from the photography.
- **Do:** use soft, grainy blurred-light gradient panels behind headings instead of flat fills.
- **Do:** let photos run edge to edge with no rounded corners and only 2px gaps between cards.
- **Do:** keep controls tiny and quiet: 14px pill buttons inside translucent glass capsules, fixed at the top.
- **Do:** on phone, inset the hero video in a rounded frame and pin "Contact us" and "Book now" to the bottom.
- **Don't:** add a bright accent colour or coloured buttons; buttons are dark or light grey only.
- **Don't:** set headings in bold, or in one font only; the serif and sans pair carries the brand.
- **Don't:** use a classic horizontal navigation bar with text links; the menu lives behind the round button.
- **Don't:** add shadows, borders or rounded corners to section imagery, or card grids with icons.
- **Don't:** use bright, high-key photography; keep it dusky, warm and low contrast.
- **Don't:** copy the older Concept page template (centred text columns, shadowed white tiles, black square buttons); it is inconsistent with the rest of the site.
- **AI-look traps:** the gradient panels are blurred light on grey paper, not colourful mesh gradients or glassmorphism cards. Do not replace the lockup with a single bold headline and a coloured eyebrow pill. Avoid three-card feature rows with icons and avoid sparkle or AI motifs outside the one "Start your journey" control. Do not add big rounded "Book now" buttons with gradients; the pills are small and flat.
