# Biograph: reference spec

> Source: https://www.biograph.com/ · Crawled 2026-10-27 at 390, 768, 1280 and 1920 px · Category: Health & Yoga · Pages crawled: 8

## 1. Overview
Biograph is a premium preventive health and longevity clinic (full-body MRI, blood panels, physician review) sold as a membership. The site is a Framer build that feels like a luxury tech product page: near-black cinematic photography at the top and bottom of every page, a calm white middle with soft grey (#f9f9f9) rounded tiles, and almost no colour except what the photos bring. Recognisable traits: a geometric grotesk (Aeonik, regular weight only) for big tight headings paired with Apercu for everything else; tiny 10px uppercase eyebrows with 3px tracking above every centred section heading; and every page closing on the same full-bleed looping video band followed by a plain white footer.

## 2. Pages and navigation
| Page | Path | Purpose |
|---|---|---|
| Home | / | Product story: hero, method, proof, pillars, tests, clinics, memberships, specialists, testimonials, FAQ |
| How It Works | /how-biograph-works | Three-step journey told with image cards, alternating light and dark bands |
| Memberships | /memberships | Two tiers (Core, Black) with long detail columns and a comparison |
| For Employers | /for-employers | B2B pitch: stats, bento of proof, tier cards, benefits band |
| New York City | /locations/new-york-city-clinic | Clinic page: storefront photo, address card, interior photo collage |
| Executive Physical | /executive-physical | Landing page: alternating stat image rows, outcome data cards, tests grid |
| Women's Health | /womens-health-screening | Landing page on a warm cream palette: step rows, stories carousel, articles |
| Why Biograph | /why-biograph | Positioning: diagram cards, stat grid on cream, dark stories carousel |

- Main navigation, in order: How It Works · Memberships · For Employers · Locations (dropdown: New York City, San Francisco Bay Area) · Resources (dropdown: Executive Physical, Women's Health, Why Biograph, About Us, Blog, Newsroom, FAQ and further company links) · then, set apart on the right, Login (text) and Join Biograph (button).
- Pages reachable only from the footer: Compare, Partner With Us, Careers, Contact Us, Privacy Policy, Terms of Use, Responsible Disclosure Policy, Payments Notice, Cookie Consent, the trademark list.
- Primary call to action: "Join Biograph", in the header, the hero and the closing video band of every page; secondary actions are "Learn more" buttons and "Compare our memberships" links.

## 3. Header
- **Laptop 1280:** 64px tall, sticky. Logo left: a thin, very widely letter-spaced uppercase wordmark (about 150px wide, image). Five nav links centred in the bar, dropdown items with a small chevron; on the right "Login" as plain text and "Join Biograph" as a small button (radius 8px, about 112 x 34px). On pages with a dark photo hero the bar is transparent with white text, a white button with dark text, and a hairline light border along its bottom edge. On pages that open on white (Memberships) the bar is white with dark text (#27272c) and a dark button.
- **New York City page:** the header is compact even at 1280: logo left, a small dark "Join" button and a menu icon right, no visible links.
- **Large 1920:** same as laptop, content held to the same centred container; links stay the same size.
- **Tablet 768 and phone 390:** 64px, logo left, a small white "Join" button (dark text) and a two-line hamburger icon right. Measured bar background after scroll: #ffffff at 390. How the menu panel opens was not captured.
- Nav link font: Apercu, white or #27272c, sentence case; exact size and weight not measured.

## 4. Footer
- Background #ffffff, height 621px at laptop, 1036px at phone. No newsletter form.
- **Top area, 5 zones:** far left a 39 x 39px logo tile (#27272c, radius 8px, white "B" mark). Then four link columns pushed to the right half: Experience (4 links), Locations (2), Resources (10), Connect (3: Instagram, LinkedIn, X/Twitter). Column headings in dark #27272c at about 13px; links in #686873 at about 13px, about 19px apart.
- **Lower left:** a one-line tagline in #27272c (12px/18px) with a second line in #686873 that contains a link, then a row of 4 small square tiles (40 x 40px, #f9f9f9, radius 8px) each holding a small brand-colour icon.
- **Legal row:** hairline divider, then copyright and trademark lines left (3 short lines, 12px, #686873) and 5 legal links in a row on the right (12px, #686873).
- Phone: logo tile and the 4 icon tiles share the first row, then links in a 2-column grid (Experience and Locations, Resources and Connect), then a "Legal" group listing the legal links vertically, then the copyright lines.

## 5. Page layouts

### Home (laptop height 13328px)

**1. Full-bleed photo hero**
- Layout: 800px (one viewport) at 1280, 1080px at 1920. Text anchored bottom-left in the 1160px container; a row of 3 stats anchored bottom-right. Measured row split 21/39/40.
- Content: H1 (Aeonik 68px, white, one line), one paragraph (16px/24px, white at 70%, 548px wide), one light button. Stats: each a white semi-bold label over a grey sub-label, centred, separated by 1px vertical hairlines.
- Background: night photo of the clinic's lit glass corner on an empty dark street, near-black (#000000) all round, darkened toward the bottom for legibility.
- Phone: 760px tall, the photo occupies the top part, the text block sits below it on black, stats hidden, H1 41px, button stays small.

**2. Method: heading plus 3 image cards**
- Layout: white, centred heading block (eyebrow, H2 52px, a 764px-wide grey paragraph, dark "Learn more" button), then 3 equal image cards in a row inside 1160px with about 16px gaps.
- Cards: portrait photos about 380 x 470px, radius 16px (saturated scenes: a woman lying in red laser light, a hand holding a tablet showing a video call with a doctor, a runner at sunset). Under each photo a numbered title (Apercu 16px, #27272c) and 3 to 4 lines of 14 to 16px grey text. On interaction a translucent panel (white at 8%, radius 16px) with a large figure (Aeonik 46px) overlays the photo.
- Phone: cards stack, each photo 360 x 462px, with the title and text laid over the bottom of the photo in white, plus a small "Tap and hold" chip top-left.

**3. Single quote carousel**
- Layout: white, centred, about 330px tall. Eyebrow, then a quote in Instrument Serif 56px/61.6px (#27272c), 3 lines, max 960px wide, straight quote marks. Under it a 28px square avatar (radius 5px), name with a small blue verified badge, and a grey role line. Below, a pagination row of short grey dashes with the active one darker and longer.
- Phone: quote about 30px (not measured exactly), same centred stack.

**4. Stats card**
- Layout: one white card the full 1160px width, about 386px tall, very faint border and radius about 16px, divided into 3 equal columns by dotted vertical lines. Each column: a huge number top-left (Aeonik 92px/87.4px, #27272c, with a 32px superscript "%" where needed) and a 3 to 4 line description pinned to the bottom (16px, #27272c). A centred dark button follows below the card.
- Phone: one column, each stat centred (number 52px) with a dotted divider between them.

**5. Press logo row**
- Layout: 260px band, eyebrow centred, then 5 black wordmark logos spread evenly across 1160px. Phone: a sideways row that is cropped at the edges.

**6. Dark carousel of 4 pillars**
- Layout: full-bleed dark band (about 1200px) with a subtle diagonal gradient from #09090a toward a blue-grey #161719. Centred eyebrow (white), H2 (white), paragraph (#d0d6e0 at 80%), light button. Then a horizontal carousel of cards about 340 x 400px that overflows to the right edge of the page.
- Card: almost transparent fill (white at 2%), hairline border, radius 16px; a small outlined info icon top-left; a circular macro image or video (about 115px, red or violet organic texture) centred in the upper half; title (16px white) and 2 lines of grey text at the bottom. A small grey circular "next" arrow button sits on the right edge; a thin progress line under the carousel shows position.
- Phone: one card at a time, dot pagination.

**7. Tests: floating thumbnails and a tile grid**
- Layout: white. About 8 rounded-square thumbnails (radius 16px, 60 to 90px, tilted at various angles, abstract medical imagery: scans, tissue, a person in a VO2 mask) float in an arc around a centred heading block (eyebrow, H2 in 2 lines, paragraph). Below, a 3-column grid of 15 tiles.
- Tile: #f9f9f9, radius 16px, 380 x 71px, 8px padding; a 48px rounded thumbnail on the left, then a title (14px, dark) over a one-line grey description. The last row fades to white with a gradient mask; a light grey "See all" button is centred under it.
- Phone: one tile per row, 6 tiles then the fade and a "View more" button.

**8. Clinics: cinematic photo into dark**
- Layout: a full-bleed photo (a woman opening a door in a warm wood-slat corridor) about 950px tall that fades into a #111214 band. Centred over the fade: eyebrow, H2 (white, 2 lines), grey paragraph. Then 2 large location cards side by side, about 640 x 750px, 8px apart, small radius (4px).
- Card: full-bleed interior photo (warm wood, plants, stone), name in white bottom-left with "Learn more" and an arrow under it.
- Phone: cards stack, each about 360 x 450px.

**9. Membership tier cards**
- Layout: white, centred heading block, then 2 cards side by side (about 520px each, 8px gap). Core card #f9f9f9; Black card #111214; both radius 16px, about 32px padding, 729px tall.
- Card content, centred top: a 40px holographic card thumbnail (cyan for Core, violet for Black), tier name (Aeonik 24px), subtitle, a full-width button (dark #161719 on the light card, light on the dark card). Left aligned below: a bold "includes" line, 9 to 11 items each with a small blue check mark (14px text), a hairline, then a "Compare our memberships" text link with an arrow.
- Phone: cards stack.

**10. Specialist institutions grid**
- Layout: band on #f9f9f9. Centred heading block, then a white rounded container (radius about 16px) split into a 4 x 2 grid of logo cells (each about 290 x 180px) by dashed hairlines. University and hospital logos in their own colours, centred in each cell.
- Phone: 2 columns, 4 rows.

**11. Testimonial masonry**
- Layout: white, centred heading block, then a 3-column masonry of social-post cards, faded out at the bottom, with a "View more" button.
- Card: #f9f9f9, radius 16px, 380px wide, variable height; header row with a 28px avatar (radius 8px), name (14px, #27272c) with a blue verified badge, grey role, and the platform logo (X or LinkedIn) at the top right; then the post text in 14px #686873.
- Phone: one column.

**12. FAQ accordion**
- Layout: white, centred heading block with a one-line sub that ends in a blue underlined link (#0095ff). The list is 800px wide, centred: 5 rows about 50px tall separated by dotted hairlines; question text 14 to 16px #27272c, a thin "+" icon at the right.
- Phone: full width, questions wrap to 2 lines.

**13. Closing video band**
- Layout: full-bleed, 810px tall. Muted looping video (a blurred, sepia figure running along a reflective surface). Centred: heading in Aeonik at H1 scale (white), one short line of white text, a light button.
- Phone: 540px tall, heading wraps to 2 lines.

**14. Footer** as described in section 4.

### How It Works
1. **Photo hero:** full-bleed photo (staff member opening a door in a warm wood corridor), H1 bottom-left, paragraph, no stats.
2. **Step 1, white:** tiny "Step 1" eyebrow, centred H2 in 2 lines, paragraph, then 3 photo cards (radius 16px) with captions below, same as Home section 2.
3. **Step 2, dark (#09090a):** same structure in white text; the photo cards carry overlaid UI panels (a translucent results card listing values).
4. **Step 3, white:** same structure; photos of a laptop dashboard, a phone with stacked notification chips overlaid, and a portrait.
5. **Testimonial masonry** on #f9f9f9, same as Home section 11, with a dark button below.
6. **FAQ**, same as Home section 12.
7. **Closing band:** here a still photo (a person at golden hour) instead of the video, same centred text and button.
8. **Footer.**

### Memberships
1. **Title and tier cards on white:** no image hero. H1 (68px) centred under the header, a 2-line paragraph, then 2 cards (about 500 x 560px, radius 16px): Core on #f9f9f9, Black on #111214. Each: tier name (Aeonik 32px) and subtitle top-left, a large holographic card render filling the middle (cyan line-burst for Core, violet for Black), then "Ideal for those who want" and 3 items with small line icons. Under the cards, centred: a dark button and a light grey button side by side.
2. **Tier intro panel:** a #f9f9f9 panel with radius 16px spanning the container, about 900px tall: eyebrow and H2 on the left, a photo of a hand holding the holographic card on the right, and 2 small stats bottom-left separated by a hairline.
3. **Tier detail, 2 columns about 37/63:** left, a sticky #f9f9f9 card (card art, tier name 32px, price line with an info icon, dark button and a text link). Right, stacked #f9f9f9 cards 8px apart, each radius 16px: a statement in Aeonik 32px with a paragraph pinned to its bottom; a "Recommended for" list with line icons and hairline separators; a "What's included" list with 40px rounded thumbnails, a nested check list and a small blue "See all" pill; a journey timeline with thumbnails and small time labels; a list of member quotes.
4. **Second tier:** the same panel and detail columns in dark (#111111 and #111214) with white text.
5. **Comparison:** centred heading, 2 cards side by side (light and dark) with price rows.
6. **Advice strip:** a light grey rounded bar with 2 overlapping avatars, one line of text and a small dark button at the right.
7. **FAQ**, **closing video band**, **footer.**

### For Employers
1. **Photo hero:** office scene of smiling colleagues, warm light; H1 bottom-left, paragraph, light button.
2. **Stat cards:** centred heading block, then 3 #f9f9f9 cards (radius 16px) each with a small square icon thumbnail top-left and a big Aeonik number with a short caption at the bottom.
3. **Bento of proof:** centred heading, then a 2 x 2 bento: a dark #111214 card with a short list of items with small thumbnails, a large portrait photo, another portrait photo, and a warm greige card (#f2f2f2) listing stats in rows.
4. **Tier cards:** same as Home section 9, on a light grey band.
5. **Benefits photo band:** full-bleed warm photo, H2 and a light button on the left, a list of 3 benefits with small icons and short paragraphs on the right, all in white.
6. **FAQ**, **closing video band**, **footer.**

### New York City clinic
1. **Title block on #f9f9f9:** H1 in 2 lines, the second line in grey; a small dark button; then a wide storefront photo (about 1160 x 690px, radius about 8px).
2. **Address and quote:** a small white card with a soft shadow on the left (clinic thumbnail, address lines, directions link, 4 feature lines with icons); on the right a large quote in about 24px #27272c with a small author line.
3. **Two text columns** of 14px grey copy.
4. **Photo collage:** a tall wide photo of a wood-slat lobby, then 2 photos side by side, then a wide lounge photo, each with a small radius.
5. **Staggered image and caption pairs:** small photos (about 280px) alternating left and right, each with a short caption block beside it.
6. **Dark teaser band (#111214)** for the other clinic: H1-size heading bottom-left (Aeonik 52px, white), short paragraph, small light button.
7. **Closing video band**, **footer.**

### Executive Physical
1. **Photo hero:** close crop of an athlete in warm light; H1 bottom-left; a light button and a dark translucent button side by side.
2. **Risk rows:** centred heading, then alternating rows: a dark image card (radius 16px) with a huge stat in white overlaid bottom-left on one side, and on the other a 24px H3, paragraph and a short icon list. Rows swap sides.
3. **Press logo row** as Home section 5.
4. **Outcomes band on #f1f4f4:** centred heading, a full-width photo (radius 16px), then a bento of white data cards with big numbers, a photo card and stat cards with small coloured round badges.
5. **Tests grid** as Home section 7.
6. **Dark band (#111214):** centred heading, then a 2-column card: photo with a stat overlay on the left, a list with check marks on the right.
7. **Testimonial masonry**, **FAQ**, **closing band**, **footer.**

### Women's Health
1. **Photo hero:** two women in soft sunset light; H1 bottom-left; light button.
2. **Three image cards** as Home section 2; one card is a coral to peach gradient panel listing life-stage labels.
3. **Press logo row.**
4. **Programme steps on cream (#faf6f2):** centred heading; then step rows, each opened by a hairline with a tiny "Step N" label and a small icon at the right; a photo card (radius 16px) on the left, title, paragraph and a small dark button or link on the right.
5. **Full-bleed photo band:** a woman standing in the sea; H2 left, paragraph right, white text.
6. **Stories carousel:** centred heading, wide cards mixing a portrait photo with a serif quote panel.
7. **Article cards on #f9f6f3:** centred heading, 3 cards (photo radius 16px, title, 2 lines of text).
8. **FAQ**, **closing video band**, **footer.**

### Why Biograph
1. **Photo hero:** a woman lying under red and blue scanning light; H1 bottom-left; light button.
2. **Diagram cards:** centred heading, then 3 #f9f9f9 cards with abstract diagrams (an orbit of labelled chips, a device screen, a ring of portraits) and captions below.
3. **Stat section on cream (#faf6f2):** centred heading, a wide photo (golden bubbles, radius 16px) with a huge stat overlaid bottom-left, then a 2 x 2 grid of white stat cards each with a small coloured icon, a big number and a caption.
4. **Dark stories carousel (#27272c):** centred heading, large image cards (radius 16px) mixing photos and text panels, an arrow button and a progress line.
5. **Delivery rows:** centred heading, then rows of a photo (radius 16px) on the left and a title, paragraph and icon list on the right.
6. **FAQ**, **closing band** (still photo), **footer.**

## 6. Responsive behaviour
| Breakpoint | Header | Grid columns | Hero | Type changes | Other changes |
|---|---|---|---|---|---|
| 390 | Logo, small white "Join" button, hamburger, 64px | 1 column; specialist logos 2 columns | 760px: photo on top, text block below on black | H1 41px/38.95px, H2 32px/32px, stats 52px, body stays 16px/24px | Image cards carry their caption over the photo; carousels show one card with dots; masonry becomes one column |
| 768 | Same as phone | 1 column for most blocks | 922px | Same as phone (H1 41px, H2 32px) | Page grows to 15603px tall on Home |
| 1280 | Full links, Login and button, 64px | 3-column cards, tile grid and masonry; 2 tier cards; 4 x 2 logo grid | 800px, text bottom-left, stats bottom-right | H1 68px, H2 52px, stats 92px | Content in a 1160px container |
| 1920 | Same as 1280 | Same as 1280 | 1080px | Body 18px/27px | Container stays centred; outer margins grow |

- Maximum content width: 1160px (measured at 1280: 60px side padding). Location cards and some carousels extend wider than the container (up to 1400px).
- Phone side padding: 15px (content measured at 360px of 390).
- No horizontal page scroll (measured overflow 0); the pillars carousel and the press row are clipped sideways inside their bands.

## 7. Motion and interaction
- Built with Framer (Framer runtime detected); no GSAP, ScrollTrigger, Lenis, Locomotive or Lottie.
- Video: 5 muted looping videos on Home (pillar circles and the closing band), started by script rather than the autoplay attribute; inner pages each have 1 or 2 (closing band, memberships art).
- Carousels: the single-quote testimonial carousel (dash pagination), the pillars carousel (arrow button plus progress line), stories carousels on Women's Health and Why Biograph.
- Floating thumbnails around the tests heading are positioned at angles and move with scroll (exact motion not measured).
- Image cards in the method section reveal an overlay panel on interaction ("Tap and hold" chip on phone).
- Sticky: the header. On Memberships the left price card stays in view while the right column scrolls.
- No CSS scroll-reveal classes were detected (0 elements hidden at load); hover styles were not measured.

## 8. Colour
| Role | Hex | Where it is used |
|---|---|---|
| Page background | #ffffff | Most bands, footer |
| Surface | #f9f9f9 | Tiles, testimonial cards, Core tier card, specialist band, detail cards |
| Primary text | #27272c | Headings and strong text on light backgrounds, footer logo tile |
| Muted text | #686873 | Paragraphs, roles, footer links |
| Text on dark | #ffffff, #ffffff at 70%, #d0d6e0 at 80% | Headings, hero paragraph, dark-band paragraphs |
| Primary button (on light) | #161719 fill, #ffffff text | "Learn more", "Discover Core", most actions |
| Primary button (on dark) | #ffffff at 90% fill, #27272c text | Hero, dark bands, closing band, Black tier card |
| Link accent | #0095ff | Inline links in FAQ intros and lists; the same blue tints check marks and verified badges |
| Dark sections | #111214, #09090a, #000000 | Clinics band, Black tier, step 2 band, hero surroundings |
| Dark gradient end | #161719 | Right side of the pillars band |
| Dark surface (Memberships) | #111111 | Black tier panels |
| Warm cream | #faf6f2, #f9f6f3 | Women's Health programme and articles, Why Biograph stat section |
| Cool tint | #f1f4f4 | Outcomes band on Executive Physical |
| Translucent card | #ffffff at 2% to 8% | Cards and overlay panels on dark bands |
| Borders and dividers | not measured (hairline light grey, often dotted or dashed) | Stats card, FAQ rows, logo grid, footer divider |

## 9. Typography
Fonts loaded: Aeonik Regular (headings and numbers), Apercu Pro Regular, Medium and Bold (text, labels, buttons), Instrument Serif (quotes).

| Level | Family | Weight | Size (laptop) | Size (phone) | Line height | Letter spacing | Case |
|---|---|---|---|---|---|---|---|
| H1 | Aeonik Regular | 400 | 68px | 41px | 64.6px (0.95) | -1.36px | Sentence case |
| H2 | Aeonik Regular | 400 | 52px | 32px | 52px (1.0) | -0.52px (-0.32px phone) | Sentence case |
| H3 statements and tier names | Aeonik Regular | 400 | 24 to 32px | not measured | 28.8px at 24px | normal | Sentence case |
| H3 card titles | Apercu Pro Regular | 400 | 16px | 16px | 24px | normal | Sentence case |
| Big stats | Aeonik Regular | 400 | 92px (superscript % 32px) | 52px | 87.4px | not measured | n/a |
| Quote | Instrument Serif | 400 | 56px | not measured | 61.6px | normal | Sentence case |
| Body | Apercu Pro Regular | 400 | 16px (18px at 1920) | 16px | 24px | normal | Sentence case |
| Small text | Apercu Pro Regular | 400 | 14px, 12px in footer | same | 21px, 18px | normal | Sentence case |
| Eyebrow | Apercu Pro Medium | 500 | 10px | 10px | 10px | 3px | Uppercase |
| Navigation links | Apercu (size and weight not measured) | not measured | not measured | in menu | not measured | normal | Title case |
| Buttons | Apercu Pro Regular | 400 | 14px | 14px | not measured | normal | Sentence case |

Headings are never bold; weight contrast comes only from size. Large headings are tightly tracked and set solid (line height at or below 1).

## 10. Imagery and icons
- Photography: cinematic and low-key. Night architecture, warm amber interiors with vertical wood slats, stone and indoor trees; clinical technology lit in saturated red, magenta and blue; runners and swimmers at golden hour; candid portraits in soft daylight on Women's Health. Every hero is a full-bleed photo with text bottom-left; never a split hero.
- Treatment: no filters or duotones; darkness comes from the photos themselves plus a bottom fade. Image cards radius 16px; location cards and collage photos radius 4 to 8px.
- Product renders: holographic membership cards drawn as fine radiating lines (cyan for Core, violet for Black) with a rounded "B" mark.
- Abstract thumbnails: macro textures and scan imagery as small rounded squares (tests) or circles (pillars).
- Video: closing band on most pages; small looping videos inside the pillar circles.
- Icons: small thin line icons (about 14px) in lists, blue check marks, outlined info icons, platform logos on testimonial cards. Press and institution logos shown in their own colours (press in black).
- Not used: illustrations, stock icon sets in coloured circles, gradients as section backgrounds on light pages (only the coral card on Women's Health and the dark pillar band), emoji, drop-shadowed hero cards.

## 11. Components
- **Dark button:** #161719 fill, white Apercu 14px, radius 8px, padding 10px 20px, 41px tall, sentence case. Full width inside tier cards.
- **Light button:** #ffffff at 90% fill, #27272c text, otherwise identical. Used on dark photos and dark bands.
- **Grey button:** #f9f9f9 or similar light grey fill, dark text, radius 8px ("See all", "Compare memberships", "View more").
- **Text link with arrow:** 14px, "Compare our memberships" style, small arrow after the label.
- **Eyebrow:** 10px Apercu Medium, uppercase, 3px tracking, centred above every H2.
- **Tile:** #f9f9f9, radius 16px, 8px padding, 48px rounded thumbnail plus title and one-line description.
- **Image card:** photo radius 16px with caption below on laptop and overlaid on phone.
- **Tier card:** radius 16px, light or dark, centred head (art, name, subtitle, full-width button), left-aligned list with blue checks, hairline, text link.
- **Social-post card:** #f9f9f9, radius 16px, avatar radius 8px, verified badge, platform logo top-right.
- **Stats card:** white, faint border, radius about 16px, dotted column dividers, huge numbers top, captions bottom.
- **FAQ row:** dotted hairline separators, question left, thin "+" right.
- **Pills:** only the small blue "See all" pill on Memberships.
- **Forms:** none on the crawled pages.

## 12. Section skeletons

```html
<!-- Hero: full-bleed photo, text bottom-left, 3 stats bottom-right -->
<section><!-- 100vh at laptop, #000 around the photo, bottom fade -->
  <img alt="Cinematic photo">
  <div><!-- container 1160px, anchored bottom -->
    <div><!-- left, about 550px -->
      <h1>Short headline placeholder</h1><!-- Aeonik 68px, -1.36px tracking -->
      <p>Two-line paragraph placeholder.</p><!-- 16px, white 70% -->
      <a>Primary action</a><!-- light button, radius 8px -->
    </div>
    <ul><!-- right; 3 items split by 1px vertical hairlines -->
      <li><strong>Stat label</strong><span>Sub label</span></li>
    </ul>
  </div>
</section>
```

```html
<!-- Centred section head used everywhere -->
<header>
  <small>EYEBROW</small><!-- 10px, uppercase, 3px tracking -->
  <h2>Two-line heading placeholder</h2><!-- Aeonik 52px, line height 1 -->
  <p>Grey paragraph, max 764px.</p>
  <a>Learn more</a><!-- dark button -->
</header>
```

```html
<!-- Stats card: one bordered card, 3 columns, dotted dividers -->
<section>
  <div><!-- 1160px, radius 16px, faint border -->
    <div><span>96<sup>%</sup></span><p>Caption pinned to bottom.</p></div><!-- number 92px -->
    <div><span>1 in 6</span><p>Caption.</p></div>
    <div><span>2 of 3</span><p>Caption.</p></div>
  </div>
  <a>Secondary action</a>
</section>
```

```html
<!-- Tests: floating tilted thumbnails around a head, then a 3-column tile grid with a fade -->
<section>
  <div aria-hidden="true"><!-- 8 rounded-square images, 60 to 90px, rotated, arranged in an arc --></div>
  <header><small>EYEBROW</small><h2>Heading</h2><p>Paragraph.</p></header>
  <ul><!-- 3 columns, 8px gaps -->
    <li><img alt=""><!-- 48px, radius 8px --><strong>Test name</strong><span>One-line description</span></li>
    <!-- 15 tiles, last row masked to white -->
  </ul>
  <a>See all</a><!-- grey button, centred -->
</section>
```

```html
<!-- Membership tiers: light and dark cards side by side -->
<section>
  <header><small>EYEBROW</small><h2>Heading</h2><p>Paragraph.</p></header>
  <div><!-- 2 columns, 8px gap -->
    <article><!-- #f9f9f9, radius 16px, 32px padding -->
      <img alt=""><!-- 40px holographic card art -->
      <h3>Tier name</h3><p>Subtitle</p>
      <a>Discover tier</a><!-- full-width dark button -->
      <p><strong>Includes:</strong></p>
      <ul><li>Item with blue check</li></ul>
      <hr><a>Compare memberships →</a>
    </article>
    <article><!-- #111214, white text, light button --></article>
  </div>
</section>
```

```html
<!-- Testimonial masonry of social-post cards -->
<section>
  <header><small>EYEBROW</small><h2>Heading</h2></header>
  <div><!-- 3-column masonry, fades out at bottom -->
    <article><!-- #f9f9f9, radius 16px -->
      <header><img alt=""><!-- 28px, radius 8px --><strong>Name</strong><span>Role</span><!-- platform logo top right --></header>
      <p>Post text, 14px grey.</p>
    </article>
  </div>
  <a>View more</a>
</section>
```

```html
<!-- Closing band: full-bleed looping video, centred head and button -->
<section><!-- 810px at laptop -->
  <video autoplay muted loop playsinline></video>
  <div><!-- centred -->
    <h2>Closing headline</h2><!-- Aeonik, H1 scale, white -->
    <p>One short line.</p>
    <a>Primary action</a><!-- light button -->
  </div>
</section>
```

## 13. Dos and don'ts
- **Do:** use Aeonik at weight 400 only, large and tight (line height 0.95 to 1, negative tracking), and let size alone carry hierarchy.
- **Do:** open each section with a 10px uppercase eyebrow tracked at 3px, then a centred H2 and a short grey paragraph.
- **Do:** keep the palette to white, #f9f9f9, #27272c, #686873 and near-blacks; let photography and the holographic tier art supply all colour.
- **Do:** round cards and image cards at 16px and buttons at 8px, and keep buttons small (41px tall, 14px text).
- **Do:** bookend every page with dark cinematic photography: a full-bleed hero with bottom-left text and a full-bleed closing video band.
- **Do:** separate items with hairlines, often dotted or dashed, rather than with shadows or boxes.
- **Do:** pair a light #f9f9f9 tier card with a near-black twin when presenting two levels.
- **Don't:** use bold headings, uppercase headings or a serif for headings; the serif is for quotes only.
- **Don't:** add a brand accent colour to buttons; buttons are near-black or near-white only, blue is reserved for inline links and checks.
- **Don't:** use drop shadows on cards; surfaces are flat grey tiles.
- **Don't:** centre the hero text or split the hero into text and image columns.
- **Don't:** use stock illustrations or icon circles; icons are tiny line glyphs.
- **AI-look traps:** a purple or teal gradient background behind the hero (use a real dark photo). A three-card "features" row with emoji or big coloured icons (use photo cards or tiles with real thumbnails). Pill-shaped buttons and badge chips everywhere (buttons are 8px-radius rectangles). Glassmorphism on every card (translucent fills appear only on dark bands). Buzzword headlines with exclamation marks; keep headings short, calm and in sentence case.
