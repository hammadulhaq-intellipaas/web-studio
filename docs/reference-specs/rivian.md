# Rivian: reference spec

> Source: https://rivian.com/ · Crawled 2026-10-27 and 2026-10-28 at 390, 768, 1280 and 1920 px · Category: Fun & Animation Heavy · Pages crawled: 6 (Home, R1T, R2, Fleet, R1 Shop inventory, Spaces)

## 1. Overview
Rivian sells electric trucks and SUVs, and the site works like a product launch film: almost every section is a full-bleed photo, a looping muted video or a scroll-driven scene. The base is quiet (light greys #f2f2f2 and #ebebeb, near-black #212121, one custom grotesk called Adventure in weight 600 with tight negative tracking). Energy comes from motion and from scale. Three things make it recognisable. First, a floating white navigation bar with 12px rounded corners, inset 12px from the viewport edges, and a single amber pill (#ffaa00) as the only coloured button. Second, oversized model wordmarks (200px to 320px) set behind cut-out vehicle side profiles. Third, pinned scroll scenes: a horizontal vehicle lineup driven by vertical scroll, a stadium-shaped image window that grows to full screen, and flat vector illustrations that zoom out into a mosaic.

## 2. Pages and navigation
| Page | Path | Purpose |
|---|---|---|
| Home | / | Brand showcase: hero video carousel, scroll-driven lineup, charging, software, quick-link tiles, newsletter |
| R1T | /r1t | Product page for the pickup: wordmark hero, feature carousels, illustrated scroll scene, trim comparison, FAQ |
| R2 | /r2 | Product launch page: stadium-masked hero, lineup picker, interior, pinned wheel scene, charging map, comparison |
| Fleet | /fleet | Commercial van page: wordmark hero, feature carousels, spec comparison, dimensions, case study, FAQ |
| R1 Shop | /configurations/list | Inventory list: filter sidebar, promo banners, grouped grids of vehicle cards |
| Spaces | /spaces | Showroom locations: wordmark hero, location grid, video, photo carousel, FAQ |

Discovered but not captured (the network dropped during the crawl): /demo-drive/book, /r1s. The homepage at 1920 also timed out, so large-screen notes come from the R1T, Fleet and Spaces pages.

- Main navigation, in order: Vehicles, Charging, Technology, Discover, Gear Shop. Each opens a mega panel. The Vehicles panel holds 3 vehicle cards (R1S, R1T, R2) and a right-hand text list: Compare models, Demo drive, Trade-in, Current offers, Inventory, Pre-owned, Purchasing, Financing, Insurance, R3, Fleet. Then come a "Demo drive" amber pill, a chat (assistant) icon button and an account icon button.
- Footer-only pages: R1T, R1S, R2, Fleet, Shop new inventory, Shop pre-owned, Spaces, Gear Shop, Our Company, Stories, Pre-Owned, Purchasing, Charging, Insurance, Service, Investors, Careers, Support, plus the legal row.
- Primary call to action: "Demo drive" (booking flow). On product pages, the pair "Design yours" (configurator) and "Book a drive" or "Reserve".

## 3. Header
Measured on Home, R1T, R2 and Fleet.

- **Laptop 1280:** a floating bar, `position: fixed` and always visible. It is a white (#ffffff) rounded rectangle, radius 12px, inset 12px from the top, left and right (box 1256 x 56 px). The wrapper band is 80px tall. Grid split 13/46/41. Left: the "RIVIAN" wordmark as an SVG with very wide letter spacing, about 100px wide. Centre: 5 links, Adventure 14px weight 600, letter spacing -0.14px, colour #000000, each a pill hit area (padding 8px 12px, radius 9999px). The open item gets a light grey pill behind it. Right: the amber "Demo drive" pill (#ffaa00, black text, 103 x 32 px, padding 8px 16px), then two 32px round icon buttons on a light grey fill (chat bubble with sparkle, person outline). The bar sits directly over the hero video and stays white and opaque. There is no transparent-over-hero state.
- **Mega menu (laptop):** clicking a link grows the same white bar downward into a panel about 235px tall. It holds 3 cards on #f2f2f2 (model name 20px semibold, one-line tagline, "From $" price, vehicle render, a black "Design yours" pill and an underlined "Explore" link), plus the vertical text link list in the right quarter at 12px.
- **Large 1920:** identical bar, 1896px wide (still 12px inset). The links stay centred and the logo stays at the far left. Nothing else changes.
- **Tablet 768 and phone 390:** the same floating white bar, 12px inset, about 50px tall. Logo at left, chat icon and a two-line hamburger at right, no visible links. Tapping the hamburger expands the white card to nearly full screen (still 12px inset, rounded): close X top right, the 5 sections as large rows (about 36px, weight 500) with a chevron that opens each accordion, then a #f2f2f2 rounded promo box with a two-line statement and a large amber "Demo drive" pill, then a "Sign in" row with a person icon.
- **Product sub-navigation (R1T, R2, Fleet):** after the hero scrolls away, the main bar is swapped for a product bar with the same floating white style: fixed, top 12px, 48px tall on R2, fading and sliding in with an opacity and transform transition of about 220ms. Left: a menu icon (R1T) or the model name (R2, Fleet). Centre: anchor links such as Overview, Lineup, Features, Technology, Compare (R1T) or Lineup, Performance, Interior, Technology, Charging (R2). The link for the section in view gets a grey pill highlight. Right: a black pill (Compare or Reserve) and an amber pill (Design yours).
- **Floating chat button (all pages):** fixed bottom right (about 24px from the edges), an amber circle about 56px with a black chat-sparkle icon and a small red notification dot.

## 4. Footer
- **Home footer:** background #212121, 496px tall at 1280. A flex row split 20/20/60.
  - Column 1: model links (R1T, R1S, R2, Fleet) as large type, Adventure 32px/40px weight 400, white.
  - Column 2: shopping and company links (Shop new inventory, Shop pre-owned, Spaces, Gear Shop, Our Company, Stories) at 20px/28px, white.
  - Column 3: four small groups (Education, Company, Resources and one more) with 12px/16px #b8b8b8 labels and 14px/20px white links.
  - Bottom row: a "US" region selector with a globe icon, the copyright line, legal links at 10px (Terms, Privacy, Legal, Recalls, Accessibility) spaced 50px apart, a "Your privacy choices" toggle icon, and 4 small white social icons at far right (LinkedIn, Instagram, X, YouTube).
- **Product and inner-page footer:** background #000000, 872px tall at 1280. It adds a newsletter row above the link columns: a 24px/32px white statement at left, Email and ZIP code inputs side by side, a consent line, and a white "Subscribe" pill. The link columns split 25/34/41.
- **Phone:** everything stacks in one column (1544px tall on Fleet). The big model links come first, then the shop links, then the small groups in 2 columns, then the social icons, legal links and region.
- **Above the home footer:** a block of numbered legal footnotes on #212121, white text at roughly 11px, about 960px tall. It reads as part of the footer.

## 5. Page layouts

### Home (laptop page height 15362px, phone 12494px)

**1. Hero video carousel**
- Layout: full-bleed, 680px tall at 1280 (85svh, minimum 650px; 90svh on phone). Text block at left, starting x = 120px, vertically centred in the upper half.
- Content: 4 slides, each an autoplaying, muted, looping video. The slide headline is an H2 at 56px/60px weight 600, letter spacing -2.5px, white. Then 1 short paragraph and 2 buttons, each a 160 x 56 px pill: a solid white pill with black text, and a transparent pill with a white outline ring and white text. A round 40px next-arrow button sits at the right edge, vertically centred (translucent white circle, black arrow). The pagination is a translucent white capsule centred about 20px above the bottom: 4 dots, with the active dot drawn as a short black bar. A small caption line in white can sit bottom-left.
- Background: video, with a dark scrim for legibility.
- Phone: headline 44px/48px, centred near the top; buttons centred at the bottom as two pills side by side. Tablet shows both a previous and a next arrow, 40px circles at both edges.

**2. Vehicle lineup, horizontal scroll scene**
- Layout: a 5429px-tall scroll track (one viewport at 1280 x 800 shows one vehicle) on #f2f2f2. One vehicle panel at a time fills the viewport.
- Content per panel: the model name as a giant H2 (320px, black, tight tracking), top-aligned and partly hidden behind the car. The vehicle is a side-profile render with no background, about 80% of the viewport wide, with a soft floor shadow. Below it, centred: a tagline (Adventure 24px/28px weight 600, #151515), a price line (16px/24px, black), and 2 pills: black "Explore", and white "Design yours" with black text.
- Behaviour: vertical scroll moves the panels horizontally. The next vehicle (R2, then R1T) slides in from the right while the current one slides out to the left, and the giant wordmarks move with their cars.
- Phone: the panels stack vertically. Each panel shows a centred name about 60px tall, then the car render, which enters from the right edge as it scrolls into view, then the tagline, the price and two equal pills (black and white).

**3. Feature carousel with segmented control**
- Layout: 906px, centred. H2 72px/72px weight 600, letter spacing -1.8px, two lines, centred.
- Content: a segmented control (white capsule, radius 56px, holding 3 options; the active option is a black pill, 112 x 40 px, 14px weight 500 white). Below it, a horizontal carousel of rounded video cards: the centre card is about 50% of the viewport wide (16:9), the neighbouring cards peek in from both edges, and corners are about 16px. Then a 14px centred caption and 2 underlined text links, 20px/28px weight 500.
- Background: the top of the next section's sky photo bleeds up behind it (sampled #edeeef at the top, fading to #dce2e6).
- Phone: the control spans the full width, one card is visible with the next peeking, and the caption is 16px.

**4. Safety statement and visit cards over one landscape photo**
- Layout: 1924px, one continuous full-bleed photo (sky, snowy mountains, vehicle on snow; base colour #9fa1b8).
- Content: a small award badge image, an H2 at 72px white centred, and a 20px/24px weight 600 white paragraph, max about 470px wide. Lower down, 2 cards sit side by side over the photo, each about 486px wide with a 24px gap and radius 8 to 12px:
  - Left: a white card with a photo carousel (dot pagination in a white capsule), a location H2 at 44px/48px black, address and hours in 2 small columns, a black pill and an underlined text link.
  - Right: an all-photo card with a 56px white heading at top-left and a white pill at the bottom-left.
- Phone: the cards stack full width with 16px side margins, and the heading drops to 44px/48px weight 500.

**5. Charging block**
- Layout: 1796px. A full-bleed photo strip on top (about 560px), then a dark charcoal area (sampled #242725). The intro is a 2-column row: the H2 at 72px/72px fills about 470px at the left, and on the right sit a 20px/28px paragraph (about 620px wide) and a white pill (padding 8px 20px, 16px weight 500).
- Content: then 3 equal photo cards in a row (portrait, about 4:5, small radius), each with a centred 3-line caption below in white.
- Phone: everything is centred and single column. The cards stack as full-width rounded photos with a caption under each.

**6. Software block**
- Layout: 1336px, background #000000, centred column.
- Content: an H2 at 72px white over 2 lines (720px wide), a paragraph, a white pill, then a wide image of the in-car touchscreen (illustrated camping scene UI), cropped at the bottom edge.
- Phone: same order, with the image full width.

**7. Quick-link tiles and newsletter**
- Layout: 982px on near-black. A centred H2 at 72px "Keep exploring" style heading, then a row of 4 equal tiles about 280px wide and 150px tall with radius 12px:
  - Shop: amber #ffac00
  - Get updates: green #629b5c
  - Trade in: orange-red #e84826
  - Service: sky blue #77afd8
  Each tile has a 32px/36px weight 600 black label at top-left and a black circle with a white arrow at right.
- Content: below the tiles, a black (#000000) rounded card with a 32px/36px weight 500 white statement in the left half. The right half holds the form: Email and ZIP code inputs (#212121, radius 4px, 56px tall, floating label, padding 20px 16px 0), an amber Subscribe pill, and fine print.
- Phone: the tiles form a 2 x 2 grid and the label drops to 24px/28px. The card's form stacks under the text.

**8. Mission photo**
- Layout: 853px, a full-bleed desert dune photo at golden hour with two small vehicles on a ridge.
- Content: an H2 at 72px white centred over 2 lines, a 3-line paragraph, and a black pill with a play triangle and the label "Watch the video" (16px weight 600).
- Phone: same, taller crop.

**9. Legal footnotes** on #212121, then **10. Footer** (see section 4).

### R1T (laptop 17400px)
1. **Wordmark hero:** 640px full-bleed video. The model name is the H1, Liga 200px/192px weight 500, letter spacing -5px, white, at the left in the upper middle. Bottom-left: a 2-line caption at 24px/28.8px weight 500 white, plus a tiny underlined disclosures link. Bottom-right: a black pill "Design yours" and an amber pill "Book a drive", each about 160 x 56 px. Phone: wordmark 96px.
2. **Intro and image card carousel:** white background. A 2-line statement at about 32px, left-aligned in the left half. Then a carousel of tall photo cards (about 3:4, radius about 8px) with a white 36px/40px weight 600 label at the bottom-left, the next card peeking at the right edge. Two round arrow buttons sit centred below (grey disabled, black active).
3. **Trim picker:** on #f2f2f2. A centred segmented control (black active pill), the vehicle render, then 4 stat columns (big number, small label).
4. **Safety photo:** full-bleed photo with the H2 at 56px/67px weight 500 white, centred near the top, a paragraph and a white pill.
5. **Second carousel on light blue (#aac4d6):** an intro statement and square photo cards with white labels, the same arrow buttons.
6. **Illustrated drive-mode scene:** a pinned scene (sticky 100vh inside a 2400px track). Flat vector illustrations of the truck in landscapes (pale sky, peach sun, dark green pines, purple wildflowers) zoom out into a mosaic grid of illustration tiles while a dark scrim fades in. A centred H2, a paragraph and a white pill appear on top of the mosaic.
7. **Email band:** a black strip with a 24px statement left, a short paragraph and an amber "Sign up" pill.
8. **Gallery photo:** full-bleed canyon photo with a centred H2 and a white pill.
9. **Software carousel:** on #252826. An intro paragraph at the left, then a carousel of square cards on flat colours (white, sage, lilac) with illustrations and a label.
10. **Stadium reveal:** on white, an interior photo inside a stadium (pill) shaped mask about 330px tall. On scroll it grows to full screen and loses its rounding. Then a centred heading and 2 pills appear on the photo.
11. **Dimensions:** on #252826. A centred "Size it up" style H2, white line-drawing blueprints of the vehicle (front and side views with lettered dimension markers), and a 2-column table of dimensions with thin divider lines.
12. **Snow forest photo:** full-bleed, no text.
13. **Trim comparison:** on white. A centred H2, 2 pills, then 3 columns. Each column holds a trim name at 20px, a price, small pills, the render, then rows: Range, Performance, Paint swatches (round), Wheels (round icons), Interior swatches, Drive mode icons. Small footnotes follow.
14. **FAQ:** a left-aligned H2, then a 2-column grid of question rows (thin-bordered rounded boxes, radius 12px, padding 16px 20px).
15. Newsletter row and footer (black).

### R2 (laptop 31120px)
1. **Stadium-mask hero:** 801px on #d1d1d1. Giant "R2" lettering where the R is a wide stadium (pill) shaped window playing video, with the "2" to its right. A fixed bottom bar holds a 20px/22px tagline at left, and a black "Reserve" pill, an amber "Design yours" pill and a round black pause button at right.
2. **Lineup picker:** 800px. A 44px H2, a segmented control (Standard, Premium, Performance, Compare), the vehicle render, colour swatch dots and a stat row.
3. **Launch benefit strip:** 184px on olive #63685e. A 32px white H3 and a line of copy at left, a white pill at right.
4. **Three-photo row:** a 56px centred H2 and 3 small portrait photos with captions under each.
5. **Big statement photo:** grey background with a huge 2-line white headline over the photo, then 2 text columns below.
6. **Pinned video scene:** a sticky 100vh element inside a 1600px track, with a full-bleed forest video and a play button, then a landscape photo with 2 caption columns.
7. **"Room for days" type scene:** a 1600px track. The headline's double "o" is drawn as an outlined stadium shape. A full-bleed photo is clipped into, or released from, that stadium as you scroll (the full-page capture shows the stadium empty). It is followed by a 3D render carousel (frunk, cargo) with dot and arrow controls.
8. **Interior:** a 32px H2, a 2-line paragraph, a large rounded interior photo with swatch dots, a "View gallery" pill and a stat row of 4 big numbers.
9. **Haptic wheel scene:** a sticky 100vh panel inside a 3200px (400vh) track on #ebebeb.
10. **Voice assistant:** black background, a centred quote-style H2 at 56px, a screen UI image, and an H3 at 36px.
11. **Phone app:** on #eeeeee, an H2 at 72px and a phone mock-up, then a carousel of photo cards with H3 at 32px.
12. **Driver assistance:** a full-bleed photo with a 72px H2, then 3 video cards.
13. **Safety rings:** a centred H2 at 72px inside thin concentric circle lines (a radar motif), then 3 video cards.
14. **Charging:** a full-bleed road photo with a huge left-aligned H2, a map of the charger network, and 3 photo cards.
15. **Comparison:** 3 columns on white, then "Size it up" on #262626 with blueprints and a 2-column spec table.
16. **Red closing hero:** "Your R2 is waiting", on a red interior photo with 2 pills.
17. **Bento cards:** 2 photo cards with a 44px heading each, and a location card.
18. **Coloured tiles:** labels Technology, Autonomy, Charging, Service, the same 4 colours as Home.
19. **FAQ:** 2 columns of accordion rows with chevrons.
20. Newsletter and footer.

### Fleet (laptop 11435px)
1. **Wordmark hero:** 640px photo on black. "Fleet" as H1, Adventure 200px/192px weight 600, letter spacing -5px, white, top-left. A yellow pill (padding 16px 24px, 16px weight 600) at the bottom-right.
2. **Centred statement:** H2 at 44px/44px weight 400, black on white, 4 lines, 528px band.
3. **Video card:** on #292929 (oklch 0.281). A large rounded video card with a play button at the bottom-left.
4. **Feature carousel:** a statement as in 2, then a carousel of photo cards (about 17% each in the track, with neighbours peeking). Each card has a white 44px H3 and a 14px caption at the bottom-left. Dot and arrow controls sit below.
5. **Discovery grid:** on #292929, an H2 at the top-left, then a 2 x 2 grid of rounded cards, half of them photos, each with a white pill at the bottom-left.
6. **Spec cards:** on white, 2 columns (50/50). A 56px model name, a price, then spec rows with label left, value right and thin dividers.
7. **Dimensions:** a dark min-100svh band with 2 square tabs (radius 4px, padding 0 40px; active black, the other transparent), a list of dimensions with numbered circle markers, a van line drawing, and download links.
8. **Case study:** a 100dvh full-bleed video, with a 56px white H3 at the bottom-left and a white pill.
9. **Cross-sell:** on white, text at the left and a rounded photo at the right.
10. **FAQ:** on black, a 44px H2 and a 2-column accordion.
11. Footer.

### R1 Shop inventory (laptop 4019px)
1. **Header row:** breadcrumb, H1 "R1 Shop" at 44px/48px weight 500, and "Sort by" at the right.
2. **Two-column body:**
   - Left sidebar, about 22% wide: collapsible filter groups (Vehicles, Type, Promotions, Vehicle package, Year, Trim) with small radio buttons and checkboxes and chevrons.
   - Right column: 2 promo banners first, a wide photo and a narrow photo, each with a 24px/28px weight 600 white statement at the bottom-left. Then grouped grids headed by a 24px label with a "See all" link at the right. Each grid has 3 cards per row. A card is a light grey rounded box with 2 small status chips at the top (delivery estimate, reduced price), the vehicle render, the name and year, spec lines and a price.
3. **Phone:** black "Filters" and "Sort by" pills (padding 16px 24px, radius 40px) replace the sidebar, and the cards go to 1 column.

### Spaces (laptop 6146px)
1. **Wordmark hero:** a showroom photo with "Spaces" centred, 120px/115px weight 600 white.
2. **Intro:** a left-aligned paragraph set large (36px/36px weight 600, black), about 4 lines.
3. **Locations:** H2 at 56px with a black "View all spaces" pill at the right, then a 2-column grid of location photo cards (about 3:2, small radius). Under each: the location name at 20px and the address in small type inline.
4. **Video:** a full-width looping video with a pause button.
5. **Statement:** a large left-aligned paragraph.
6. **Photo carousel:** a centred card with a caption overlay, dot and arrow controls.
7. **R2 teaser:** a split row with small text at the left and a photo at the right.
8. **FAQ:** dark, accordion buttons with radius 12px.
9. Newsletter and footer.

## 6. Responsive behaviour
| Breakpoint | Header | Grid columns | Hero | Type changes | Other changes |
|---|---|---|---|---|---|
| 390 | Floating white bar, 12px inset, logo + chat + hamburger; full-height rounded menu card | 1 column; tiles 2 x 2; footer 1 column | 90svh, text centred at top, 2 pills side by side at bottom | H1 wordmark 96px; section H2 44px/48px; hero H2 44px/48px; body 16px/24px | Lineup becomes a vertical stack; cards stack with 16px side margins |
| 768 | Same as phone (hamburger) | 1 to 2 columns | 85svh, centred text, prev and next arrows at both edges | Hero H2 56px/60px; wordmark about 130px | Carousels show 1.5 cards |
| 1280 | Full bar: logo, 5 links centred, amber pill, 2 icon buttons | 3 to 4 columns; footer 20/20/60 | 85svh (680px), text left at x = 120 | Section H2 72px/72px; hero H2 56px/60px; wordmark 200px; lineup names 320px | Lineup is a horizontal scroll scene |
| 1920 | Same bar, 1896px wide | Same as 1280 | R1T hero 864px tall; caption bottom-left, pills bottom-right | Mostly capped: H2 72px, wordmark 200px, R1T H3 grows to 44px/48px | Wider side margins; cards keep fixed widths |

- Maximum content width: no single container. Full-bleed media is the norm. Text columns are capped per block: about 720px for centred H2s, 470 to 620px for paragraphs, and 1056px for the newsletter card at 1280.
- Side padding: 80px at 1280 (section text starts at x = 80; the home hero text at x = 120), 20px at 390, and the navigation bar inset is 12px at every size.
- Horizontal scrolling: the page never overflows (overflowPx 0 at all sizes). Sideways movement happens only inside carousels and in the pinned lineup scene.

## 7. Motion and interaction
Rivian is motion first. No GSAP, ScrollTrigger, Lenis, Locomotive, Framer or Lottie was detected. The scenes are custom: CSS `position: sticky` tracks plus scroll-linked transforms (24 to 40 transformed elements per page). Native scrolling is kept, with no smooth-scroll hijack.

**On load**
- The hero carousel autoplays muted, looping videos (5 to 6 `<video autoplay loop muted>` on Home). Slides advance automatically: the crawler's first and full-page captures show different slides. Pagination is a capsule with 4 dots, and the active dot stretches into a short bar.
- R2 hero: video plays inside the stadium-shaped letterform, with a round pause button beside the pills.
- No intro animation, no preloader, no text-splitting entrance. Content is visible at load: scrollRevealHint found 0 or 1 element hidden before scrolling on every page, so there are no fade-up reveals.

**On scroll (the signature)**
1. Home vehicle lineup: a 5429px track where vertical scroll translates three vehicle panels horizontally. Frames at 700, 1500, 2300 and 3100px show R1S centred, then R1S sliding left while R2 enters from the right, then R2 centred. The giant wordmark travels with its car. On phone the renders slide in from the right edge as each panel enters.
2. R1T illustrated scene: a sticky 100vh panel inside a 2400px track. A full-bleed flat illustration scales down into a mosaic of illustration tiles while a dark scrim fades in, then the headline, paragraph and button fade in centred.
3. R1T stadium reveal: an interior photo starts inside a stadium (pill) mask about a third of the viewport tall. Over about 800px of scroll it widens to full-bleed and the corner rounding drops to 0. The heading and 2 pills appear on top, and the next dark section then slides up over it.
4. R2 "Room for days": a full-bleed photo is clipped through the stadium shape that stands in for the double "o" in the headline (1600px track).
5. R2 wheel scene: sticky 100vh inside a 400vh (3200px) track. The copy steps through while the image stays pinned.
6. Product sub-navigation: appears once the hero leaves the viewport (fixed, opacity and translate, about 220ms), and highlights the active section link with a grey pill.

**Carousels and controls**
- Peeking carousels everywhere (Home feature videos, R1T cards, Fleet features, Spaces photos). The neighbouring cards are cut off at the viewport edges.
- Controls: a pair of 32 to 40px round buttons with arrows (grey when disabled, black when active), or a dot capsule. The segmented control's active pill slides between options.
- Videos inside cards autoplay muted when in view. Some carousel videos are `autoplay: false`, which suggests they start when scrolled into view.

**Hover and transitions**
- Buttons and links: colour and background transitions of 0.3s on `cubic-bezier(0.83, 0, 0.17, 1)` (a strong ease-in-out). Navigation pills use 0.15s with the same curve. Other measured curves: 0.2s and 0.5s on the same curve, and 0.3s `cubic-bezier(0.4, 0, 0.2, 1)`.
- Navigation links gain a light grey pill on hover or open. Underlined text links stay underlined.

**Sticky and fixed elements:** the navigation bar (fixed), the product sub-navigation (fixed), the chat button (fixed bottom-right), the R2 hero bottom bar (fixed until the hero scrolls away), and the sticky scene panels.

## 8. Colour
| Role | Hex | Where it is used |
|---|---|---|
| Page background (light) | #f2f2f2 | Home lineup scene, mega-menu cards, inventory cards |
| Page background (product) | #ebebeb, #eeeeee, #ffffff | R2 sections, app section, comparison and FAQ areas |
| Hero placeholder | #ececec, #d1d1d1 | Behind hero video before it paints |
| Surface (cards, bar) | #ffffff | Navigation bar, location card, segmented control |
| Primary text | #000000 and #151515 | Headings and body on light backgrounds |
| Text on dark and media | #ffffff | Almost all headings over photos, dark sections |
| Muted text | #b8b8b8 | Footer group labels |
| Accent, primary button | #ffaa00 (#ffac00 on some pills) | Demo drive, Book a drive, Design yours, Subscribe, Shop tile, chat button |
| Secondary button | #000000 pill with white text, or #ffffff pill with black text | Explore, Design yours, Reserve, Compare |
| Tile colours | #ffac00, #629b5c, #e84826, #77afd8 | The 4 quick-link tiles |
| Dark sections | #212121, #242725 (sampled), #252826, #262626, #292929, #000000 | Footer, charging, software, dimensions, FAQ |
| Inputs on dark | #212121 | Newsletter fields |
| Olive band | #63685e | R2 launch benefit strip |
| Light blue band | #aac4d6 | R1T second carousel |
| Photo-matched backgrounds | #9fa1b8, #8ba8bd | Safety section sky |
| Borders and dividers | #333333 (oklch 0.321) on dark, #d1d1d1 (oklch 0.861) on light | FAQ boxes, spec table rules |
| Overlay | #000000 at 40% | Scrims and modal backdrop |

There are no gradients in the interface itself. Every soft blend comes from photography.

## 9. Typography
Families: **Adventure** (proprietary grotesk; loaded weights 400, 500, 600, 700; reported as "adventureFont" on some pages) for everything, and **Liga** (weight 500) for the giant product wordmarks. Neither is available publicly. Substitute (our suggestion, not measured): a tight neo-grotesk with a large x-height, set with the same negative tracking.

| Level | Family | Weight | Size (laptop) | Size (phone) | Line height | Letter spacing | Case |
|---|---|---|---|---|---|---|---|
| Product wordmark H1 | Liga | 500 | 200px | 96px | 0.96 (192px) | -5px (-2.4px phone) | As written |
| Lineup model name | not measured | not measured | 320px | about 60px | not measured | tight | As written |
| Page wordmark H1 (Fleet, Spaces) | Adventure | 600 | 200px Fleet, 120px Spaces | 96px, 72px | 0.96 | -5px, -3px | Sentence |
| Section H2 | Adventure | 600 (500 on phone) | 72px | 44px | 72px, 48px phone | -1.8px, -0.88px phone | Sentence |
| Hero slide H2 | Adventure | 600 | 56px | 44px | 60px, 48px phone | -2.5px, -0.88px phone | Sentence |
| Card heading H2 or H3 | Adventure | 600 | 44px/48px (location), 36px/40px (carousel labels) | 36px/40px | 1.1 | -0.88px, -1.5px | Sentence |
| Large statement paragraph | Adventure | 600 | 36px/36px (Spaces), 44px/44px weight 400 (Fleet) | 32px/32px, 36px/36px | 1.0 | -0.72px | Sentence |
| Tagline | Adventure | 600 | 24px | 24px | 28px | -0.5px | Sentence |
| Body | Adventure | 400 | 20px (intro), 16px (default) | 16px | 28px, 24px | normal | Sentence |
| Small caption | Adventure | 400 | 14px | 14px | 20px | -0.14px | Sentence |
| Eyebrow or group label | Adventure | 400 | 12px | 12px | 16px | normal | Sentence (never uppercase) |
| Navigation link | Adventure | 600 | 14px | 36px in open menu | 16px | -0.14px | Sentence |
| Button | Adventure | 500 to 600 | 14px to 16px | 14px to 16px | 16px to 20px | -0.5px | Sentence |
| Footer model links | Adventure | 400 | 32px | 32px | 40px | normal | As written |

Rules: no uppercase anywhere, no italics, no serif. Hierarchy comes from size jumps (72 to 20 to 14) and weight 600, not from colour.

## 10. Imagery and icons
- **Photography:** cinematic, natural-light adventure scenes (desert dunes at golden hour, snowy mountains, redwood forests, canyons, charging stations). The vehicles are always in motion or in the landscape, and people appear candidly (driver at the wheel, family at a showroom). The grading is muted and slightly desaturated, with warm highlights. Crops are wide (16:9 and wider) for full-bleed bands, portrait (about 3:4 or 4:5) for carousel cards, and square for software cards.
- **Product renders:** studio side profiles and three-quarter views on transparent backgrounds with a soft floor shadow, sitting on #f2f2f2 or white. Used in the lineup, the mega menu, inventory cards and the trim comparison.
- **Video:** muted, looping, autoplaying in heroes and cards. A round pause or play control is always provided.
- **Illustration:** flat vector landscapes (R1T drive-mode scene, software cards, in-car UI art) with a limited palette: sage green, peach sun, slate blue, purple flowers, pale sky. No outlines, simple geometric shading.
- **Technical drawings:** thin white blueprint line art of the vehicles with lettered dimension markers, on dark grey.
- **Icons:** simple 1.5px line icons (chat sparkle, person, arrows, chevrons, globe), drawn in black or white, inside round buttons. Social icons are tiny filled squares.
- **Not used:** stock-style office photos, abstract gradient blobs, 3D-rendered illustrations, emoji, decorative patterns, drop-shadowed cards.

## 11. Components
- **Primary button:** amber pill, #ffaa00 background, black text, radius 9999px, no border. Small (navigation): 14px weight 600, padding 8px 16px, 32px tall. Large (hero): 160 x 56 px, 14px to 16px weight 500 to 600, padding 16px 24px on inner pages.
- **Secondary buttons:** black pill (#000000, white text) or white pill (#ffffff, black text), same sizes. Over video there is also a ghost pill: transparent with a white outline ring and white text.
- **Text link:** 16px to 20px weight 500, underlined, black or white. Used in pairs under carousels ("Explore R1S" and "Explore R1T").
- **Segmented control:** a white capsule (radius 56px) with 3 to 4 text options. The active option is a black pill (40px tall, 14px weight 500, white). The Fleet variant uses square tabs (radius 4px, padding 0 40px).
- **Round icon button:** 32 to 40px circle (light grey or translucent white), with an arrow or icon in the centre.
- **Carousel pagination:** a white or translucent capsule holding 4 to 10 small dots. The active dot is a short black bar.
- **Photo card with overlay label:** radius about 8 to 12px, label at the bottom-left in white at 36px/40px weight 600, no gradient box behind the text (the photo is chosen dark enough).
- **Location card:** white, radius about 12px. Image carousel on top, then a 44px name, a 2-column small info block, a black pill and a text link.
- **Quick-link tile:** flat colour block, radius 12px, about 280 x 150 px. The label is at the top-left; at the right there is a 24px black circle with a white arrow.
- **Inventory card:** #f2f2f2 rounded box with 2 small text chips at the top (white background, small radius), the render, the name with the year at the right, spec lines in 12 to 14px, and the price.
- **Inputs (on dark):** #212121 fill, radius 4px, 56px tall, floating label 16px, white text, no border. The submit is an amber or white pill.
- **FAQ row:** a 1px bordered box (#333333 on black), radius 12px, padding 16px 20px, 16px weight 600 question text and a chevron at the right. Arranged in 2 columns.
- **Spec row:** label left, value right, 1px divider below, 14px.
- **Badges:** award logos as small images. No coloured status pills apart from the inventory chips.

## 12. Section skeletons

```html
<!-- Floating navigation bar: fixed, 12px inset, white, radius 12px, 56px tall -->
<header>
  <nav><!-- grid 13/46/41 -->
    <a><svg><!-- letter-spaced wordmark --></svg></a>
    <ul><!-- centred, 5 pill links, 14px weight 600 -->
      <li><button>Vehicles</button></li><li><button>Charging</button></li>
      <li><button>Technology</button></li><li><button>Discover</button></li><li><a>Gear Shop</a></li>
    </ul>
    <div><a>Demo drive</a><!-- amber pill --><button aria-label="Assistant"></button><button aria-label="Account"></button></div>
  </nav>
  <div hidden><!-- mega panel grows out of the same white bar: 3 grey vehicle cards + link list --></div>
</header>
```

```html
<!-- Hero video carousel: 85svh, min 650px, text left at x=120, arrow right, dot capsule bottom centre -->
<section>
  <div><!-- slide track, autoplay -->
    <article>
      <video autoplay muted loop playsinline></video>
      <div><!-- left column, max ~420px -->
        <h2>Headline placeholder</h2><!-- 56px/60px, weight 600, -2.5px -->
        <p>One sentence placeholder.</p>
        <a>Primary action</a><!-- white pill 160x56 --> <a>Secondary action</a><!-- ghost pill, white ring -->
      </div>
    </article>
  </div>
  <button aria-label="Next"></button><!-- 40px translucent circle, right edge -->
  <div><!-- translucent capsule, 4 dots, active = short bar --></div>
</section>
```

```html
<!-- Vehicle lineup: tall track, sticky viewport, vertical scroll moves panels horizontally -->
<section><!-- height ~6.8 x viewport, background #f2f2f2 -->
  <div><!-- position: sticky; top: 0; height: 100vh; overflow: hidden -->
    <div><!-- horizontal strip, translateX driven by scroll progress -->
      <article><!-- one per vehicle, 100vw wide -->
        <h2>Model</h2><!-- 320px, black, behind the car -->
        <img alt="Vehicle side profile"><!-- transparent render, ~80vw -->
        <p>Tagline placeholder</p><!-- 24px weight 600 -->
        <p>Price line placeholder</p><!-- 16px -->
        <a>Explore</a><!-- black pill --> <a>Design yours</a><!-- white pill -->
      </article>
    </div>
  </div>
</section>
```

```html
<!-- Stadium reveal: pill-shaped photo window that grows to full-bleed on scroll -->
<section><!-- track ~2 x viewport, white -->
  <div><!-- sticky 100vh -->
    <figure><!-- clip-path / border-radius: starts as a 9999px stadium ~40vh tall, ends 100vw x 100vh, radius 0 -->
      <img alt="Interior placeholder">
    </figure>
    <div><!-- fades in at the end of the scene, centred -->
      <h2>Heading placeholder</h2>
      <a>Action one</a><a>Action two</a>
    </div>
  </div>
</section>
```

```html
<!-- Illustrated scene: flat illustration zooms out into a mosaic, scrim and headline fade in -->
<section><!-- track 3 x viewport -->
  <div><!-- sticky 100vh -->
    <div><!-- grid of illustration tiles; scale goes from ~3 to 1 with scroll -->
      <img alt=""><img alt=""><img alt=""><img alt=""><img alt=""><img alt="">
    </div>
    <div><!-- black scrim, opacity 0 to 0.6 --></div>
    <div><!-- centred -->
      <h2>Headline placeholder</h2><p>Short paragraph placeholder.</p><a>Action</a><!-- white pill -->
    </div>
  </div>
</section>
```

```html
<!-- Quick-link tiles + newsletter card on near-black -->
<section>
  <h2>Heading placeholder</h2><!-- 72px white, centred -->
  <ul><!-- 4 equal tiles, radius 12px, gap ~16px; 2x2 on phone -->
    <li><a><span>Label</span><i><!-- black circle, white arrow --></i></a></li><!-- #ffac00 -->
    <li><a><span>Label</span><i></i></a></li><!-- #629b5c -->
    <li><a><span>Label</span><i></i></a></li><!-- #e84826 -->
    <li><a><span>Label</span><i></i></a></li><!-- #77afd8 -->
  </ul>
  <form><!-- black card, radius ~12px, 2 columns -->
    <p>Statement placeholder</p><!-- 32px/36px weight 500 white -->
    <div><input type="email" placeholder="Email"><input placeholder="ZIP code"><!-- #212121, radius 4px, 56px -->
      <button>Subscribe</button><!-- amber pill --><small>Consent line placeholder.</small></div>
  </form>
</section>
```

```html
<!-- Product wordmark hero: giant model name left, caption bottom-left, 2 pills bottom-right -->
<section><!-- full-bleed, ~640px at 1280, ~864px at 1920 -->
  <video autoplay muted loop playsinline></video>
  <h1>MODEL</h1><!-- Liga-like 200px/192px, weight 500, -5px, white -->
  <div><p>Caption line one</p><p>Caption line two</p><a>Disclosures</a></div><!-- bottom-left, 24px -->
  <div><a>Design yours</a><!-- black pill --><a>Book a drive</a><!-- amber pill --></div><!-- bottom-right -->
</section>
```

## 13. Dos and don'ts
- **Do:** keep the navigation as a floating white rounded bar inset 12px from the edges, with exactly one amber pill in it.
- **Do:** let full-bleed photography and muted looping video carry each section, and put white 72px headings directly on the image with no boxes behind them.
- **Do:** use one grotesk family with tight negative tracking (about -2.5% at display sizes) and weight 600 for headings. Leave all-caps out entirely.
- **Do:** build at least one pinned scroll scene per page (horizontal lineup, stadium reveal or illustration zoom), and keep everything else static and immediately visible.
- **Do:** alternate light grey (#f2f2f2, #ebebeb) and near-black (#212121, #252826) sections to pace the page.
- **Do:** use pills for every button (black, white or amber) at 56px tall in heroes, and round icon buttons for carousel controls.
- **Do:** set giant wordmarks (200 to 320px) behind or beside cut-out product renders.
- **Don't:** add fade-up reveals on every block. Rivian has none; the motion lives in a few big scroll scenes and in video.
- **Don't:** introduce a second accent colour for buttons. The tile colours (green, orange-red, sky blue) appear only on the quick-link tiles.
- **Don't:** make the header transparent over the hero or turn it into a full-width edge-to-edge bar.
- **Don't:** use drop shadows, borders or gradients on cards. Cards are flat colour or flat photo with an 8 to 12px radius.
- **Don't:** centre-align long body copy on the light sections. Statements are left-aligned at 32 to 36px; only section H2s over photos are centred.
- **Don't:** use outlined icons in colour or filled icon sets.
- **AI-look traps:** a generic AI build will add a purple-to-blue gradient hero, three equal feature cards with icons, and fade-in-up on every element. Here, use a real photo or video hero, peeking carousels instead of static 3-card rows, and motion tied to scroll position. Avoid glossy 3D blobs, emoji and "revolutionary" copy. Taglines are short and plain. Do not let pills multiply into tag chips everywhere: pills are buttons and segmented controls only. Replace em dashes in copy with commas or colons.
