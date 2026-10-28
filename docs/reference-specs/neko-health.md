# Neko Health: reference spec

> Source: https://www.nekohealth.com/gb/en · Crawled 2026-10-27 at 390, 768, 1280 and 1920 px · Category: Health & Yoga · Pages crawled: 8

## 1. Overview
Neko Health sells a one-hour, full-body preventive health scan in its own clinics, and the site works like a premium consumer-tech product launch: one product, one price, one call to action ("join the waitlist"). The look is clinical but warm: white pages washed with a pale lemon yellow (#fff597) and a pale ice blue (#def2f7), near-black slate text (#262c2e), and a single saturated cyan-blue (#019dc9) reserved for the waitlist button. Three things make it recognisable: a light, high-contrast display serif (Orleans, weight 400) at very large sizes (100px H1, 68px H2) set against small, tidy IBM Plex Sans; large rounded media cards (about 24px corners) holding muted, skin-toned photography, device renders and dotted 3D body scans; and scroll-driven storytelling, where sections pin in place while tabs, images or text colour change as you scroll.

## 2. Pages and navigation
| Page | Path | Purpose |
|---|---|---|
| Home (UK) | /gb/en | Video hero, scan overview, pinned feature card, locations carousel, reviews, press, footer call to action |
| Health scan | /gb/en/health-scan | Product page: split hero, step-by-step explanation, app and wearables, testimonials, safety, FAQ |
| Technology | /gb/en/technology | Long scroll-driven showcase of in-house devices, research cards and sources |
| About us | /gb/en/about | Mission story with statistics, founders, clinicians, investors |
| Careers | /gb/en/careers | Team pitch, career areas, filterable job list, culture and benefits |
| Book a scan | /gb/en/book-a-scan | Waitlist flow shown as a single modal card over a blurred photo |
| Home (Sweden) | /se/sv | Swedish-language copy of the UK homepage, same layout |
| Home (US) | /us/en | US homepage variant: announcement bar, city opening section, FAQ |

- Main navigation, in order: Health scan · Technology · About us · Careers. No dropdowns. The logo links home. A filled cyan "Join the waitlist" button with a right arrow sits at the far right.
- Footer-only pages: Press room, Find a location, Clinical Studies, Transparency, Login, Download app, FAQ, Support, Privacy policy, Terms of service, Cookie settings, plus social links (Instagram, LinkedIn, YouTube, X, TikTok) and a country and language switcher.
- Primary call to action: "Join the waitlist" (header, footer call to action band, phone sticky bar), which leads to the book-a-scan flow. Secondary dark buttons lead to the Health scan page.

## 3. Header
- **All widths:** the header sits at the top and is sticky (measured as a sticky element). At the top of the page it has no visible background: logo and links sit directly on the hero media. Whether it gains a background after scrolling was not measured.
- **Logo:** an app-icon tile: a dark #262c2e rounded square (60 x 60px at 1280, corner radius about 12px seen in screenshots) holding a white "N" monogram. No wordmark in the header.
- **Phone 390:** 64px tall. Logo tile (about 48px) at the left with a 20px gutter, a two-line hamburger icon at the right. No links, no button in the bar. A separate sticky bar (88px) is pinned to the bottom of the viewport: white background, product name and "duration | price" in two small lines at the left, a cyan "Join the waitlist" button at the right. How the menu opens was not measured.
- **Tablet 768:** same as phone: 64px, logo left, hamburger right, sticky bottom product bar.
- **Laptop 1280:** 104px tall. Logo tile at x 40. Four links centred in the page, IBM Plex Sans 400 16px, line height 24px, colour #262c2e, about 48px apart, no underline. The cyan button at the right edge (x 1031 to 1240, 60px tall, white 18px 500 text and a thin right arrow).
- **Large 1920:** 104px tall, logo at x 100, links centred, button at the right with a 100px gutter.
- **Health scan page variant:** the right side of the header holds a white rounded container (about 16px radius) with a small product thumbnail, the product name, "1 hour | price" and the cyan button inside it, so the price is always visible.
- **US variant:** a thin full-width announcement bar above the header on a #f1f4f4 background, one centred line of small text with an underlined link.

## 4. Footer
The footer is one 1940px tall block at 1280 (1986px at 390, 1876px at 768, 1996px at 1920) in three layers:
1. **Closing call to action band:** vertical gradient from white into a pale tint, which changes per page: ice blue #def2f7 on Home, Technology, About and Careers, lemon #fff597 on Health scan and the US home. Centred: uppercase eyebrow (IBM Plex Sans 500, 16px, tracking 0.6px), H2 in Orleans 68px, a cyan "Join the waitlist" button. About 500px of empty tint below it.
2. **Link panel:** same tint, with large rounded bottom corners (about 40px seen) that overlap the dark base. A section label row ("brand name" in small uppercase with a small dark square marker before it and a 1px rule running to the right edge). Then a 2-column grid (50/50) of four link groups in two rows: Company (7 links), Members (4 links, one with a tiny yellow app icon), Our policies (3 links), Follow us (5 social names as text, no icons). Group headings uppercase IBM Plex Sans 500 16px; links IBM Plex Sans 400, about 16px, #262c2e, 25px apart, no underline.
3. **Dark base:** #01202c navy, about 170px. Left: a letter-spaced uppercase "NEKO" wordmark in white thin sans; under it a flag icon and an underlined country and language link. Right: "© year" and the company name in two small right-aligned lines; under it a contact card (about 248 x 50px, background white at 10%, radius about 12px) with a small photo of a clinician, a bold white title and an underlined email.
- No newsletter form. Social links are plain text, not icons.
- Phone: link groups stay in 2 columns, the call to action band shrinks (H2 40px), the base stacks wordmark, locale link and contact card.

## 5. Page layouts

### Home (laptop page height 15043px)

**1. Full-viewport video hero**
- Layout: one centred column. Visible frame is 800px (one viewport) at 1280; the band reserves 1400px, so it holds in place briefly while you scroll. H1 centred vertically slightly above middle, button centred about 50px from the bottom of the frame.
- Content: H1 (Orleans 400, 100px, line height 100px, #262c2e, 2 lines), one dark button ("discover the product" type) with arrow. No eyebrow, no paragraph.
- Background: a muted, looping, sound-off video that cycles clips: a soft-focus close-up of skin on a sage background, a clinician beside a glowing cylindrical scan pod in a cream room, a cyan dotted 3D body scan with floating data callouts (numbers in a thin monospace style with short labels). At 1920 the frame shows a thin dark edge around it, suggesting the frame scales on scroll (not confirmed).
- Phone: 844px tall, H1 54px, 3 lines, the button near the bottom; the sticky product bar appears below the hero.

**2. Product overview on a white-to-yellow gradient**
- Layout: single centred column about 600px wide (x 340 to 940 at 1280). Band height 2096px. Background fades from near white at the top to #fff597 at the bottom.
- Content: uppercase eyebrow (IBM Plex Sans 500 16px, tracking 0.6px), H2 (Orleans 68px, line height 80px), a 2-line centred paragraph, then a stack of 5 white list rows (8px gaps, about 16px radius, 72px tall): a 64px square rounded thumbnail at the left, an uppercase title in 14px tracking type and a muted #496970 subtitle. Then a white card (same 600px width, about 16px radius): a landscape photo of a consultation on top, an eyebrow, an H3 (Orleans 32px), and a list of 5 items with small dark square bullets. Then a centred dark button.
- Phone: same stack at full width with 20px gutters; H2 40px.

**3. Pinned tabbed feature card (scroll-driven)**
- Layout: on solid #fff597, a single card spanning the content width (1200px at 1280) and about 800px tall, corner radius about 24px. Split about 41/59: media on the left (photo or video filling its half, its own rounded corners), white panel on the right. The band is 4200px tall: the card stays pinned while scrolling and the tabs switch.
- Content (right panel, left-aligned at about 37% into the panel): a row of 4 uppercase tab labels (active in #262c2e, others grey), H2 (Orleans 68px, 4 lines), a 3-line paragraph, then a "learn more" control: a 60px dark #262c2e rounded-square icon button with a white arrow, followed by a bold text label.
- Media treatment: close-up skin with small white square markers drawn around moles.
- Phone: the card stacks: media on top with a tab row underneath, then heading, text and the control; the yellow band continues long below because of the pin distance.

**4. Mission statement with scroll colour reveal**
- Layout: white background (a yellow-to-white fade above it). H2 in the right half (starting at about 50% of the width), 4 lines, followed by the icon button plus "About us" label. Height 420px plus spacer bands.
- Content: the H2 starts light grey and darkens to #262c2e as it scrolls into view.
- Phone: full width, same grey-to-dark effect.

**5. Preventive care collage**
- Layout: a section label row (small 10px dark rounded square, uppercase label, 1px #262c2e rule filling the rest of the row). Then a collage of rounded image cards (about 24px radius) placed at different heights, with a text block at the right (about 23% wide, starting at x 950).
- Content: each image card has a tiny white uppercase label in its top-left corner (categories such as science, care, doctor-led). Text block: H3 (Orleans 44px, 4 lines), paragraph, icon button with "About us".
- Note: at 1280 only one image card was in its final position in the capture; the others are moved by scroll. On phone the cards sit in a staggered 2-column arrangement.

**6. Locations carousel**
- Layout: label row, H2 left-aligned (68px), then a horizontal row of tall portrait cards (about 440 x 865px at 1280, radius about 24px, gap about 170px between visible cards, the next card cut off at the right edge). Below: a left arrow, a short progress bar (dark segment on a grey track) and a right arrow, centred.
- Content: each card is a full-bleed photo of a clinic exterior with a frosted pill label (city) top-left, and at the bottom-left the location name in Orleans 32px white and the street address in small white sans.
- Phone: one card about 215px wide with the next one peeking.

**7. Rating and reviews**
- Layout: centred H2 (68px), a one-line centred subtitle, then 3 equal columns (33% each).
- Content: each column: a large cyan #019dc9 opening quote mark, centred quote in IBM Plex Sans about 18px, five small black stars, then the reviewer name in bold with location in muted text.
- Phone: the three quotes stack, separated by 1px rules.

**8. Latest news**
- Layout: label row, then 2 columns 50/50. Left: H2, a 3-line paragraph, icon button with "press room" label. Right: one featured story card (about 590 x 590px, radius about 24px): an image filling the card with a white "Featured" pill top-left, and at the bottom over a dark gradient an uppercase date, an Orleans 32px white title and a small underlined source link with a "↗".
- Phone: stacks, card full width.

**9. Press logo strip**
- Layout: a 48px tall row of 5 black publication wordmarks spaced across the width, cut off at both edges (reads as a marquee; animation not measured).

**10. Footer** (see section 4, ice blue tint).

### Health scan (laptop page height 11701px)
1. **Split hero:** left half on a lemon-to-white vertical gradient with H1 (Orleans 68px, line height 72px, 2 lines) at x 40, about 200px from the top. Right: a large video panel from about x 495 to the right edge, touching the top of the page, with a rounded bottom-left corner (about 24px). Band height 1600px; the lower part is empty white (scroll space).
2. **Step sequence on #fff597** (2724px): H2 left-aligned (68px). Then 4 steps, each led by a label row (dark square marker, uppercase label, 1px rule across). Each step: left text column (about 33%): H3 (Orleans 32px), paragraph, 2 to 4 bullet points with small dark square bullets, an optional underlined link. Right column (about 60%): a large rounded photo that stays pinned while the steps scroll past.
3. **Signals list:** white; H2 left (3 lines) with a short paragraph; right side a vertical list of body areas each with a thin "+" and label, beside a pale pink rounded card (colour not measured).
4. **App and wearables panel:** on an ice blue #def2f7 band, a dark slate-teal rounded panel (about 24px radius, colour not measured) with 2 columns 50/50. Left: white eyebrow, white H2, paragraph in white at 70%, a bordered card (1px white at 20%, radius about 12px) with a bold title and small text. Right: a pale cyan rounded image of a phone app with line drawings of a ring and a watch, then a yellow app icon tile and a caption.
5. **Members:** H2 in the right half with a paragraph and a star rating line ("4.9 · number of reviews"); below, a portrait video testimonial card (about 220 x 440px, radius about 16px, name label top-left, play button centred) and quotes in 2 columns with "name, city" attributions.
6. **Safety panel:** a rounded panel (about 24px radius) with a diagonal white-to-lemon gradient. Centred H2, a subtitle, then 4 columns: small dark square marker, bold title, 3-line muted centred text.
7. **FAQ:** centred H2, a 620px accordion: bold question left, a small "+" in a light grey rounded square right, 1px dividers.
8. **Footer** with the lemon call to action band.

### Technology (laptop page height 22654px)
1. **Hero:** full-width photo looking into a pale yellow circular scanner opening, centred eyebrow and H1 (Orleans 100px). Directly under the photo, a 3-column strip of product tab names (uppercase, small) separated by thin vertical rules.
2. **Pinned product story on cream #fdfbe9:** about 11600px of scroll in which device renders and videos appear one at a time with H2 headings at 44px and frosted stat chips (background white at 10%, 1px white at 20% border, radius 29px, 20px padding, 16px text). The static capture shows mostly empty cream because the content is driven by scroll position.
3. **Dark band #1b2022:** centred white H2 and paragraph, framed photos, a 3-option segmented control (dark pills, the active one white), a bold caption and short text.
4. **Bright sky-blue band (colour not measured):** two product sections in an alternating collage: text block (eyebrow, H2 44px, paragraph, an outlined certification badge) on one side; a large pale grey product photo card (about 16px radius, a "Learn more +" chip top-right) on the other; smaller dark chart cards and photo thumbnails offset around it with tiny uppercase captions. It ends with a cyan dotted 3D figure fading into white.
5. **Engineering intro:** label row, a large 3-line H2 left and a paragraph right.
6. **Quote carousel:** centred cyan quote mark, a 2-line Orleans quote, uppercase attribution, arrows and progress bar.
7. **Research cards:** label row, H2 left with an intro paragraph beside it, then 4 cards (25% each): pale #f1f4f4 rounded cards, a lemon-tinted chart image on top, a small category line, a title in IBM Plex Sans 450 24px (line height 28px, tracking -0.3px), a cyan "learn more" link.
8. **Sources:** a small numbered reference list with underlined links, centred column.
9. **Footer.**

### About us (laptop page height 18692px)
1. **Photo hero:** a full-bleed, soft-focus profile portrait on a sage background. White uppercase eyebrow and white H1 (Orleans 100px, 2 lines) at the top-left; a white 3-line paragraph (about 18px, not measured) placed lower right at about x 646. Band 1400px.
2. **Intro statement:** a 4-line Orleans statement (H4, 32px) in a narrow column right of centre; below, a small "established" note at the left and a rounded photo of an optical device (about 24% / 76% split).
3. **Problem story on photos:** rounded full-width photo panels (sky, then a portrait) carrying white H2s, short paragraphs and big statistics in Neko Sans weight 200 (thin, very large) with small captions; a closing line in bright yellow #ffff78.
4. **Origin story:** label row, H2 in the right column, paragraphs, a founders photo with a small caption at its left.
5. **Quote on photo:** rounded photo card with a yellow #ffff78 Orleans quote.
6. **Engineering:** label row, H2 left, paragraph at the right, a small thumbnail of a clinic at the left.
7. **Grey photo panel:** a rounded panel darkened with black at 20%, white H2 and paragraphs.
8. **Clinical team:** H2 and paragraphs, a large rounded photo card with a yellow quote, then a list of clinicians: small rounded portrait, uppercase name, role and a short bio.
9. **Investors:** label row, H2 and paragraph, a 4-column grid of investor logos in white tiles with a 1px light border.
10. **Future:** a rounded split card: photo left (about 41%), pale grey-blue panel right with H2 and paragraphs.
11. **Learn more:** centred H2 and two compact link rows (thumbnail, bold title, short text).
12. **Footer.**

### Careers (laptop page height 18604px)
1. **Hero:** eyebrow and H1 (Orleans 100px) at the left; at the right a "see open roles" text link with a dark square arrow-down icon button. Below, a full-width rounded photo of a scan room with a floating frosted pill tab bar (5 items, the active one white). The tab bar is sticky (64px) as you scroll.
2. **Team intro:** centred H2 and paragraph, then 3 career-area cards (33% each, rounded about 16px, tinted backgrounds #f3f1df, #e9eef1, #f4f4f4): photo top with a "+" button in its corner, Orleans title, short text.
3. **Job finder:** label row, H2 left with intro text, then a row of a search field and 3 dropdowns (white, 1px #c5d6dd border, radius 13px, 16px text). Below, job groups: a category heading with a count and a collapse chevron, rows with role name left and muted meta text right, 1px dividers, a "see all" link.
4. **Why we exist:** H2 left, paragraph and icon link right; then a dark navy #01202c card split photo left / white Orleans quote right with an attribution and a small white icon button.
5. **Where we work, benefits, growth and values:** a centred heading with a small office photo; a rounded lemon gradient panel with 4 benefit items; a dotted globe image above a centred H2 and a cyan button; a centred "vitals" heading over 5 stacked lemon-gradient cards each with a thin line icon, uppercase title and text; a checklist card with green check circles; a rounded split card with a photo.
6. **Footer.**

### Book a scan (laptop page height 800px)
- A single centred modal card (about 548px wide, radius about 24px) over a heavily blurred warm photo filling the viewport. Top of the card: a photo of a scan room with a white rounded-square close button (×) at the top-left and a centred white title. Bottom: the product name in Orleans (about 44px), a faint price line, and a full-width cyan button (about 60px tall, radius about 16px) with a right arrow. No site header or footer on this page.

### Home (US) and Home (Sweden)
- Sweden: same layout as the UK home with Swedish copy.
- US: announcement bar above the header; hero photo of the scan pod; a pale blue gradient intro with 5 white rows that each end with a "+"; a dotted globe over a centred city-opening H2 and a cyan button; a rounded white split card (photo left, tabs and text right); a centred heading with quotes; a 4-column "why choose" row with thin line icons; an FAQ; latest news; press strip; footer with the lemon band.

## 6. Responsive behaviour
| Breakpoint | Header | Grid columns | Hero | Type changes | Other changes |
|---|---|---|---|---|---|
| 390 | 64px: logo tile, hamburger; sticky 88px bottom bar with price and cyan button | 1 column; footer links 2 columns; reviews stack | 844px video, H1 centred, button near bottom | H1 54px/54px, H2 40px/44px, H3 28px/32px, eyebrow 14px/16px, button 16px | Feature card stacks media over text; carousels show one card with the next peeking |
| 768 | Same as phone | Mostly 1 column (content width measured 620px) | 1024px video | Same sizes as phone | Sticky bottom bar stays |
| 1280 | 104px: logo, 4 centred links, cyan button | 2 to 4 columns; content width 1200px | 800px visible, band 1400px | H1 100px/100px, H2 68px/80px, H3 32px/40px (44px on some), eyebrow 16px/20px, button 18px | Pinned sections active |
| 1920 | 104px, 100px gutters | Same as 1280; content width 1720px | 1080px visible, band 1890px | Same sizes as 1280 (type does not grow) | More empty space around the fixed type sizes |

- Maximum content width: 1200px at 1280 (40px side padding) and 1720px at 1920 (100px side padding), so the container follows the viewport with fixed gutters rather than a hard cap. Text columns are narrower: 590 to 600px for centred intros, about 340px for side text blocks.
- Phone gutters about 20px (seen in screenshots).
- Nothing scrolls sideways at any width (overflow 0px on every page); the carousels and logo strip clip inside their sections.

## 7. Motion and interaction
- Libraries: none of GSAP, ScrollTrigger, Lenis, Locomotive, Swiper, Framer Motion or Lottie were detected; effects are custom scroll-linked code.
- Video: 5 muted, looping videos on Home (started by script, not the autoplay attribute), including the hero; 5 on Technology; video testimonial cards with play buttons on Health scan.
- Pinned scrolling: sections reserve far more height than they show (hero 1400px for an 800px frame, feature card 4200px, Technology story about 11600px). Content stays in place while tabs switch, images swap or devices assemble. 2 sticky elements on Home, 7 on Health scan.
- Text reveal: the mission H2 changes from light grey to dark as it scrolls in (1 element hidden after scroll on Home).
- Carousels: locations (arrows plus a progress bar), quotes on Technology. The press logo strip is clipped at both edges like a marquee.
- Hover: 52 elements with CSS transitions on Home (buttons, cards, links); exact hover styles not measured.
- Sticky UI: header, phone bottom bar with price and button, Careers tab bar.
- Accordions: FAQ rows with "+" toggles; job groups with chevrons.

## 8. Colour
| Role | Hex | Where it is used |
|---|---|---|
| Page background | #ffffff | Default for every page |
| Signature tint | #fff597 | Lemon gradient bands, pinned feature band, safety panel, footer band on some pages |
| Second tint | #def2f7 | Ice blue footer band, app panel background |
| Surface | #f1f4f4 | Research cards, US announcement bar |
| Card tints | #f3f1df · #e9eef1 · #f4f4f4 | Careers area cards |
| Primary text | #262c2e | Headings, body, links, dark buttons, logo tile |
| Muted text | #496970 | Subtitles in list rows, review meta, job meta |
| Accent | #019dc9 | "Join the waitlist" button, quote marks, research links |
| Highlight on dark | #ffff78 | Yellow quotes and closing lines on dark photos (About) |
| Primary button | #019dc9 fill, #ffffff text | Waitlist button everywhere |
| Secondary button | #262c2e fill, #ffffff text | Product buttons, square icon buttons |
| Borders and dividers | #262c2e (label rules), #e7edee, #c5d6dd (inputs) | Section label rules, FAQ dividers, form fields |
| Dark sections | #01202c | Footer base, Careers quote card |
| Dark band (Technology) | #1b2022 | Blood lab band |
| Cream (Technology) | #fdfbe9 | Pinned product story |
| Frosted overlays | #ffffff at 10% with #ffffff at 20% border | Stat chips, footer contact card |

## 9. Typography
| Level | Family | Weight | Size (laptop) | Size (phone) | Line height | Letter spacing | Case |
|---|---|---|---|---|---|---|---|
| H1 | Orleans | 400 | 100px (68px on Health scan) | 54px | 100px (72px at 68px) | normal | Sentence case |
| H2 | Orleans | 400 | 68px (44px inside product sections) | 40px | 80px | normal | Sentence case |
| H3 | Orleans | 400 | 32px (44px for side headings) | 28px | 40px (52px at 44px) | normal | Sentence case |
| Card titles (Technology) | IBM Plex Sans | 450 | 24px | not measured | 28px | -0.3px | Sentence case |
| Lead paragraph | IBM Plex Sans | 450 | 28px (Health scan) | not measured | 32px | -0.5px | Sentence case |
| Body | IBM Plex Sans | 400 | not measured | not measured | not measured | normal | Sentence case |
| Eyebrow and section labels | IBM Plex Sans | 500 | 16px | 14px | 20px (16px phone) | 0.6px | Uppercase |
| Navigation links | IBM Plex Sans | 400 | 16px | hidden | 24px | normal | Sentence case |
| Buttons | IBM Plex Sans | 500 | 18px | 16px | 24px | -0.1px | Sentence case |
| Statistics | Neko Sans | 200 | not measured (very large) | not measured | not measured | not measured | Numerals |
| Footer wordmark | thin sans, letter-spaced | not measured | not measured | not measured | not measured | very wide | Uppercase |

- Orleans is used only at weight 400 and only for headings, quotes and location names; it is never bold or italic.
- Headings are short (2 to 4 words per line) and often broken over 3 or 4 lines in narrow columns.

## 10. Imagery and icons
- Photos: soft, warm and desaturated: skin close-ups with visible texture and freckles, people in white or cream robes and knitwear, clinicians in pale grey uniforms, cream and pale yellow clinic interiors with glowing round light fixtures, clinic facades at dusk. Backgrounds are muted sage, cream and stone. Nobody poses toward the camera with a big smile; expressions are calm.
- Product imagery: studio renders of white and black devices on pale grey, exploded component views, dark chart cards with thin cyan lines, and cyan dotted 3D body scans with floating data labels.
- Crops: full-bleed video heroes, tall portrait carousel cards, near-square collage cards, all with about 16 to 24px rounded corners except the hero.
- Video: used heavily (hero, feature card, devices, testimonials), always muted and looping.
- Icons: thin single-line icons (arrows, plus, chevrons, small outline icons in feature rows); small solid dark squares as bullets and section markers; cyan quote marks; green check circles on Careers.
- Not used: illustrations, gradients with more than one hue (each gradient goes from white to one tint), drop shadows on cards, emoji, stock handshake or laptop photos, icon-in-circle feature grids on the main pages.

## 11. Components
- **Primary button:** cyan #019dc9, white IBM Plex Sans 500 18px text, a thin right arrow after the label, about 60px tall at 1280 with soft corners (about 14px seen in screenshots; the crawler read radius 29px and padding 8px 16px from the button element). Phone: 16px text, radius 20px.
- **Secondary button:** same shape in #262c2e with white text and arrow.
- **Icon button with label:** a 60px dark #262c2e rounded square (about 12px radius) with a white arrow, followed by a bold 16px text label outside the square. Used for every "learn more" type link.
- **Section label row:** a 10px dark rounded square, an uppercase 16px label with 0.6px tracking, then a 1px rule that runs to the right edge. Opens most sections after the hero.
- **List row:** white, about 16px radius, 72px tall, 64px rounded thumbnail, uppercase title, muted subtitle; optional "+" at the right.
- **Media card:** photo or video filling a rounded rectangle (about 24px), small uppercase white label or a frosted pill label in a corner, title in Orleans white at the bottom-left.
- **Frosted chip:** white at 10% fill, 1px white at 20% border, radius 29px, 20px padding.
- **FAQ row:** bold 16px question, small light grey rounded square with "+", 1px divider.
- **Form fields:** white, 1px #c5d6dd border, radius 13px, 16px padding at the sides, 16px text, a chevron in dropdowns.
- **Carousel controls:** thin left and right arrows with a short progress bar between them.
- **Badges:** small outlined boxes holding certification marks (CE, FDA), 1px border.

## 12. Section skeletons

```html
<!-- Header: logo tile, centred links, cyan button; transparent over the hero, sticky -->
<header><!-- 104px at 1280, 40px side padding; 64px with hamburger below 1280 -->
  <a aria-label="Home"><!-- 60px dark rounded square with white monogram --></a>
  <nav><a>Product</a><a>Technology</a><a>About</a><a>Careers</a></nav><!-- centred, 16px, 48px apart -->
  <a>Primary action →</a><!-- #019dc9, white 18px 500, 60px tall, soft corners -->
</header>
<!-- Phone only: sticky bottom bar, 88px, white: product name + "duration | price" left, cyan button right -->
```

```html
<!-- Full-viewport video hero with a centred serif headline -->
<section><!-- band 1400px, frame 100vh pinned while scrolling -->
  <video muted loop playsinline></video><!-- muted, warm, soft-focus clips -->
  <h1>Short headline over two lines</h1><!-- Orleans 400, 100px/100px, #262c2e, centred -->
  <a>Secondary action →</a><!-- dark #262c2e button, centred near the bottom of the frame -->
</section>
```

```html
<!-- Product overview: centred column on a white-to-lemon gradient -->
<section><!-- background: linear white to #fff597 top to bottom; column 600px centred -->
  <p>EYEBROW LABEL</p><!-- 16px 500 uppercase, tracking 0.6px -->
  <h2>Product name</h2><!-- Orleans 68px/80px -->
  <p>Two-line centred summary.</p>
  <ul><!-- 5 white rows, 8px gaps, 16px radius -->
    <li><img alt=""><!-- 64px rounded square --><strong>ROW TITLE</strong><span>Muted subtitle</span></li>
  </ul>
  <article><!-- white card, 16px radius: photo top, eyebrow, H3 32px, list with small square bullets --></article>
  <a>Secondary action →</a>
</section>
```

```html
<!-- Pinned tabbed feature card: media left, text right, tabs change on scroll -->
<section><!-- solid #fff597, height about 4200px; inner card sticky -->
  <div><!-- card 1200px x 800px, radius 24px, split 41 / 59 -->
    <video muted loop></video><!-- left, with drawn square markers over skin -->
    <div><!-- white panel -->
      <nav><a aria-current="true">TAB ONE</a><a>TAB TWO</a><a>TAB THREE</a><a>TAB FOUR</a></nav>
      <h2>Headline over four lines</h2><!-- Orleans 68px -->
      <p>Three-line explanation.</p>
      <a><span><!-- 60px dark square, white arrow --></span>Learn more</a>
    </div>
  </div>
</section>
```

```html
<!-- Section label row followed by a portrait-card carousel -->
<section>
  <div><span><!-- 10px dark square --></span><span>SECTION LABEL</span><hr><!-- 1px rule to the right edge --></div>
  <h2>Where to find us</h2><!-- left-aligned, 68px -->
  <ul><!-- horizontal track, next card cut off at the right edge -->
    <li><!-- about 440 x 865px, radius 24px, full-bleed photo -->
      <span>City</span><!-- frosted pill, top-left -->
      <h3>Location name</h3><p>Street address</p><!-- white, bottom-left -->
    </li>
  </ul>
  <div><button>←</button><span><!-- progress bar --></span><button>→</button></div>
</section>
```

```html
<!-- Reviews: centred heading and three quotes -->
<section>
  <h2>Rating headline</h2><p>One-line subtitle.</p>
  <div><!-- 3 columns, 33% each, centred text -->
    <blockquote><span>“</span><!-- large cyan #019dc9 mark --><p>Quote text.</p><p>★★★★★</p><cite><strong>Name</strong> City · Clinic</cite></blockquote>
  </div>
</section>
```

```html
<!-- Footer: call to action band, rounded link panel, dark base -->
<footer>
  <section><!-- white to #def2f7 (or #fff597) gradient -->
    <p>EYEBROW</p><h2>Closing headline</h2><a>Primary action →</a>
  </section>
  <div><!-- same tint, bottom corners about 40px, overlaps the dark base -->
    <div><span></span><span>BRAND LABEL</span><hr></div>
    <nav><!-- 2 x 2 grid of groups: uppercase heading + plain text links --></nav>
  </div>
  <div><!-- #01202c base -->
    <span>LETTER-SPACED WORDMARK</span><p>© year · company</p>
    <a>Country, language</a>
    <a><!-- white 10% card, photo thumb, bold title, underlined email --></a>
  </div>
</footer>
```

## 13. Dos and don'ts
- **Do:** set every heading in one light display serif at weight 400 and very large sizes (100px H1, 68px H2 at 1280), with everything else in a plain sans at 16 to 18px.
- **Do:** keep colour almost entirely white, pale lemon and ice blue, with dark slate text and one cyan used only for the main call to action.
- **Do:** use single-hue vertical gradients from white into one tint to move between sections.
- **Do:** open sections with the label row (small dark square, uppercase label, hairline rule to the edge).
- **Do:** put photos and video in large rounded cards (16 to 24px) and let the hero video run full bleed.
- **Do:** use the dark square icon button plus a bold text label for secondary links.
- **Do:** give the page room: sections are separated by 200px spacers and pinned areas are several screens tall.
- **Do:** on phone, keep a sticky bottom bar with the product, the price and the main button.
- **Don't:** use bold or italic serif headings, or a second display font.
- **Don't:** add borders or drop shadows to cards; separation comes from white on tint and rounded corners.
- **Don't:** use the cyan for anything except the waitlist button, quote marks and small links.
- **Don't:** fill the hero with multiple buttons, badges or bullet points; it is one headline and one button.
- **Don't:** use saturated or high-contrast photography; keep it soft, warm and calm.
- **AI-look traps:** the lemon and blue gradients are pale, single-tint washes from white; never a multi-colour or purple gradient. Do not turn the overview into a row of three icon cards; it is a single centred column of thumbnail rows. Avoid pill-shaped "badge" labels with emoji and avoid glowing glassmorphism panels; the only frosted elements are small chips and pills on photos. Do not invent dashboard-style stat tiles; statistics appear as thin oversized numerals on photos. Keep headings short and plain, without buzzwords.
