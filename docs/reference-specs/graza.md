# Graza: reference spec

> Source: https://www.graza.co/ · Crawled 2026-10-27 at 390, 768, 1280 and 1920 px · Category: Fun & Animation Heavy · Pages crawled: 8

## 1. Overview
Graza is a direct-to-consumer olive oil brand (squeeze bottles, refill cans, mayo, chips) selling through a Shopify store. The design reads like a hand-made zine printed on warm blush paper: one dark olive ink colour does almost everything (text, borders, line illustrations, a giant wordmark), and a few loud food colours (chartreuse, sunflower yellow, mint) are dropped in as whole bands or pill buttons. Three things make it recognisable: a pairing of a tall condensed Garamond for headlines with a typewriter face for everything else; hand-drawn mono-colour characters (olives with faces, farmers, a guy riding an olive) placed loosely in big empty space; and pill buttons that carry a 1px ink outline plus a checkerboard drop shadow. Dashed 1px rules, oval outlined labels and dashed ellipses replace the usual cards and badges.

## 2. Pages and navigation
| Page | Path | Purpose |
|---|---|---|
| Home | / | Video hero, rotating product promos, illustrated brand story, product trio, recipes teaser, social strip |
| The Duo Glass | /products/duo-glass | Product page for a two-bottle set, with long illustrated comparison of the two oils |
| Subscribe | /pages/subscribe | Subscription landing: perks, tabbed bundle picker, product lineup |
| Olive Oil collection | /collections/olive-oil | Product grid with add-to-cart pills |
| Manage Subscription | /apps/retextion (redirects to /apps/retextion/login) | Third-party subscription login form inside the site chrome |
| The Trio | /products/the-trio | Product page for the three-oil set |
| The Starter Kit | /products/the-starter-kit | Product page with refill how-to illustration and comparison |
| Original Mayo | /products/original-mayo | Product page with sliders card, "us vs them" table and FAQ |

- Main navigation at laptop, left to right after the logo: Shop (opens a menu), Get Refills, About, Glog, then a circular search icon button, a circular account icon button and an outlined "Cart [0]" pill. The cart count is always shown in square brackets.
- The Shop menu, from the crawled link list in DOM order: two featured product cards ("View" a bundle, "View" the mayo), "Shop all products", category links Olive Oil, Mayo, Chips, Bundles, then a "More" group: Subscribe & Save, Find Us, About Us, Glog, FAQs, Affiliate, Manage Subscription, Account. Its open layout was not captured.
- Reachable only from the footer: Frizzle, Refill Cans, Gift Cards, Contact, Ambassador Program, Corporate Gifting, Wholesale, Store Locator, Subscribe, Privacy Policy, Terms of Service, and a "Pause animations" toggle.
- Primary calls to action: the hero "Shop now" lime pill and a full-width "Shop All ➛" lime pill under the product trio, both into the shop. Product pages end their buy panel in a lime "Subscribe · old price / new price" pill.

## 3. Header
- **Phone 390:** 60px tall, solid page colour #f6e6d9 on inner pages; on the homepage it is transparent over the hero video with the logo, search icon and [0] in cream #fff4ec. Three zones (measured flex split 47/20/33): hamburger icon far left, the GRAZA wordmark logo centred, search icon and a bare "[0]" cart count on the right (GT Alpina Typewriter 14px, weight 500). No visible links. How the menu opens was not measured.
- **Tablet 768:** identical to phone (hamburger, centred logo, search, [0]); same 47/20/33 split, 60px, and also transparent and cream over the homepage hero.
- **Laptop 1280:** 60px tall, 2 zones split 18/82. Logo image (about 200px wide) at the left gutter (30px); links right-aligned in GT Alpina Typewriter 16px, weight 500, about 36px apart; then two 36px circular outlined icon buttons and the outlined "Cart [0]" pill (1px #3c422e border, fully rounded, cream #fff4ec fill). On the homepage the header sits transparent over the hero video and every element turns cream #fff4ec. On product and collection pages it is solid #f6e6d9 with #3c422e text and the hero starts at y=60.
- **Large 1920:** same as laptop, but the header contents are held to a centred band about 1360px wide (logo starts near x=270, cart pill ends near x=1630), while the page content below stays full width. On the homepage it is transparent with cream elements, as at laptop.
- Position is static in the crawl (not sticky). Height 60px at every width.

## 4. Footer
- Height: 911px at 1280, 954px at 1920, 1127px at 768, 1018px at 390. Background is the page colour #f6e6d9 (no dark footer). Text #3c422e.
- Opens with a full-width 1px dashed rule. Then 2 columns, 50/50, separated by a 1px dashed vertical line.
- Left half: a two-line newsletter invitation in GT Alpina Typewriter (about 20px), lots of empty space, then an "Email" label and an input about 448px wide: 1px #3c422e border, radius about 8px, placeholder left, the word "SUBMIT" and a small mint (#9eef80) rounded-square button with an arrow inside the field on the right.
- Right half: 3 link columns. "Shop" (7 product links, regular weight), "About Us" (10 company links set in a heavier weight, ending with "Pause animations"), "Social" (Instagram, TikTok, Twitter, Facebook as text links, no icons). A bottom row holds Privacy Policy and Terms of Service left and "© GRAZA <year>" right.
- A second dashed rule, then the GRAZA wordmark drawn edge to edge across the content width (about 1220px wide and 330px tall at 1280) in #3c422e. This giant wordmark is the last thing on every page.
- Phone: newsletter block first, dashed rule, links in 2 columns (Shop list left, About list right), dashed rule, Social list left and legal links plus copyright right, dashed rule, wordmark scaled to the 350px content width.

## 5. Page layouts

### Home (1280 from the main crawl; 390, 768 and 1920 from a homepage-only re-crawl on 2026-10-28)

**1. Full-screen video hero**
- Layout: full-bleed, 800px (one viewport) tall. Header overlaid at top. Text block bottom-left at the 30px gutter, about 600px wide.
- Content: H1 on two lines (ITC Garamond Condensed 72px, cream #fff4ec), then a lime pill button about 350px wide and 32px tall with uppercase typewriter label, 1px ink outline and checkerboard shadow.
- Background: autoplay, muted, looping video of hands using the product in a kitchen, under a black overlay at 40% opacity (rgba(0,0,0,0.4)).
- Phone: still one viewport tall (844px at 390, 1024px at 768; 1080px at 1920). The header stays transparent, with the logo, search icon and [0] in cream. H1 46px with 46px line height, 2 lines at 390 and 1 line at 768, bottom-left at about a 20px gutter. The lime pill stretches to the full content width (about 350px at 390, about 728px at 768). At 1920 the text block lines up with the centred 1360px header band (starts near x=270) and the H1 stays 72px.

**2. Origin ticker strip**
- Layout: 112px band. One full-width pill strip (30px inset each side, about 32px tall, fully rounded) centred vertically.
- Content: a single centred typewriter line in two parts separated by a slanted slash: bold label plus value ("Now serving olives from: <region>" / "Harvesting season: <months>"). A small asterisk-flower glyph sits at each far end of the pill.
- Background: band #f6e6d9 (JSON reports #fff4ec for the strip), pill #fff4ec. A 1px dashed ink rule runs under the band.
- Phone: not rendered at 390 or 768; the carousel follows the hero directly. At 1920 the band stays 112px (measured split 53/47).

**3. Colour-block product carousel**
- Layout: 664px tall, 3 slides plus a clone (measured 4 items at 25%). Each slide is 2 columns, about 50/46: a centred text column left, an image card right (about 590 x 590px, 1px dashed ink border, radius about 16px).
- Content: eyebrow in uppercase typewriter flanked by flower glyphs, H2 in Garamond 102px on two lines with line height near 0.9, a two-line typewriter paragraph, a cream pill button (#fff4ec, 1px ink border, checkerboard shadow), and under it a split arrow control: one outlined rounded rectangle about 172 x 32px divided by a vertical line, a left arrow and a right arrow.
- Background: each slide has its own flat colour. The captured slide is sunflower #fbd535; the band reports chartreuse #d1e030 and mint #9eef80 also appears in the page colours. Product packshot on cream inside the card.
- Phone: 819px, one centred column: eyebrow between flower glyphs, H2 72px on 2 lines, the dashed image card at full content width (about 320px square), a 2-line paragraph, the cream pill, then the split arrow control at full content width. Tablet: 496px tall, H2 72px; the slide arrangement was not captured in a screenshot. 1920: 744px, H2 102px.

**4. Illustrated brand story**
- Layout: 2408px tall, no grid. Elements are placed asymmetrically in large empty space.
- Content, top to bottom: a small spot illustration of an olive fitted with a tap and two tiny tilted "*DRIP*" labels; a giant two-line H2 (Garamond 120px) where line one starts at about x=160 and line two is pushed right to start near x=585 (staggered); a line drawing of two olives with cartoon faces lower right; a short text block top right (uppercase typewriter H3 16px plus a 4-line paragraph, about 320px wide, left-aligned, heading centred over it); a farmer character carrying a bowl of olives at left; a second text block under the farmer; finally the GRAZA wordmark at full content width (about 1220 x 330px).
- Background: #f6e6d9. Illustrations are single-colour #3c422e with a slightly wobbly hand-drawn line.
- Phone: 1244px. Spot illustration top-left, then the H2 at 46px centred on 2 lines (the stagger is dropped). Each text block becomes a row of 2 columns (measured 50/50): the character illustration on the left, then an uppercase H3 15px and a narrow paragraph on the right. The wordmark spans the full content width at the bottom. Tablet: 2082px, H2 72px. 1920: 2451px, H2 120px.

**5. Product trio**
- Layout: 1051px. A centred Garamond line (about 60px) as section intro, then 3 equal columns (33/33/33) with about 30px gutters, then a full-width pill.
- Content per card: photo panel about 387 x 470px, radius about 16px, each bottle shot alone on a grey stone backdrop; an oval outlined label top-left (sans, uppercase, about 13px) and the price top-right; under the photo a row with an uppercase flavour word left and the volume right (typewriter, small); the product name centred in Garamond on 2 lines (quoted nickname, then the full name underlined); a one-line typewriter tagline.
- Then a lime #d1e030 pill the full content width (1220 x 80px) with the label in Garamond about 44px plus an arrow glyph, 1px ink border and checkerboard shadow. Dashed rule under the section.
- Phone: 2202px. Cards stack one per row at full content width (photo about 350 x 405px), with the same internal order. The "Shop all" pill spans the content width and is about 60px tall. Tablet: 3508px, which is consistent with one card per row (not seen in a screenshot). 1920: 1116px, 3 columns.

**6. Fun-fact carousel**
- Layout: 598px, 2 halves. Left: a large animated line illustration (an olive branch entering from the left edge, a cartoon character sitting on an olive, hand-lettered "FUN FACT" arched above it), about 610px wide. Right: a 340px text column centred at about x=970.
- Content: a 3-line typewriter fact that crossfades to the next one, then the split arrow control (340 x 32px).
- Background: #f6e6d9 on home; the same block on product pages sits on mint #9eef80.
- Phone: 583px. The illustration sits on top at full width, the fact is centred below it, then the split arrow control (about 270px wide). Tablet: 406px. 1920: 838px.

**7. Recipes teaser with marquee**
- Layout: 684px. A one-line marquee at the top, then 2 columns 50/50.
- Content: marquee of the same uppercase typewriter phrase repeated about every 350px, scrolling sideways. Left column: 7 cooking verbs in Garamond about 60px scattered in two loose staggered columns, each tilted a few degrees in a different direction; one verb is circled by a 1px dashed ellipse. Under them a cream pill button with checkerboard shadow. Right column: recipe photo about 586 x 390px, radius about 12px, then a one-line typewriter caption and an uppercase "Make this dish ➛" link with a dashed underline.
- Background: chartreuse #d1e030.
- Phone: 813px (measured as 2 rows of 50/50). Marquee on top, then the verbs in 2 loose staggered columns with the circled one top-left. Below them the photo at full content width, then the caption and the link. The cream pill moves to the end of the section and spans the full content width. Tablet: 464px, 2 columns 50/50 in a single row. 1920: 722px.

**8. Secondary photo hero with origin card**
- Layout: 444px, full bleed. Text left at the 30px gutter; a card pinned top-right (about 240 x 370px, 30px from the right edge).
- Content: H1 Garamond 72px cream on 2 lines, lime pill button. The card: 1px cream outline, radius about 16px, transparent fill over the photo; inside a dot plus "NOW SERVING OLIVES FROM" (typewriter 12px uppercase), a square-ish photo with rounded corners, the place name bold, a dashed rule, two lines of season text, all centred.
- Background: close-up photo of an olive branch under the 40% black overlay.
- Phone: 390px at 390 and 267px at 768. The H1 is 46px cream, bottom-left on 2 lines, and the lime pill spans the full content width. The origin card is not rendered at 390 or 768 (its label heading is missing from both captures). 1920: 667px, card present.

**9. Social feed strip**
- Layout: 456px. Header row: H2 typewriter 18px left, "FOLLOW US" link right (uppercase, dashed underline) with a 32px mint #9eef80 rounded-square arrow button. A dashed rule under it. Then one horizontal row of about 11 portrait photos, each 200px wide, radius about 16px, 30px gaps, with heights varying between about 250 and 300px and top edges offset so the row looks uneven. The row is cropped by both viewport edges.
- Background: #f6e6d9.
- Phone: 516px. The heading is centred on 2 lines with the FOLLOW US link and mint button centred under it, between dashed rules. Photos are about 180px wide and 2 are visible at a time. Tablet: 515px. 1920: 456px.

**10. Footer.** As section 4.

### The Duo Glass (product page)
**1. Product hero, 2 columns 50/50** (1361px at laptop). Left half: product photo bleeding to the left and top edges (directly under the header), with a vertical stack of 60px circular thumbnails (1px ink ring on the active one) at bottom-left. Right half: a centred buy column about 420px wide: H1 plus H2 in Garamond 60px (the second line underlined), rating row and price in typewriter, then a cream #fff4ec panel (1px ink border, radius about 16px) holding a checklist with filled circle-check bullets, a dashed rule, option tiles in a row (selected tile mint #9eef80 with 1px ink border, radius about 8px, small product thumb plus label), quantity tiles with a dark #3c422e header strip carrying tiny discount text, radio rows for one-time and subscribe with a struck-through old price, a frequency select, a dashed rule, and a lime pill with checkerboard shadow. Below: a second outlined card with a line-drawn gift icon and a one-sentence note; then folder tabs (DETAILS, GLASS, HARVEST, USES): the active tab filled #3c422e with cream text, the others outlined, radius 8px on the top corners only, sitting on a 1px outlined content box.
- Phone: stacks to full-width gallery (thumbnails become a horizontal row of 8), then title, then the panel; H1 46px.

**2. Scroll animation stage** (810px, #fff4ec, 1px solid ink rules top and bottom). Holds animated bottle images driven by scroll; it rendered empty in the static capture.

**3. Two-oils comparison** (2893px, 2 columns 57/43 reported, visually mirrored halves). A 1px dashed vertical spine runs down the centre, starting at a small mint dot; a large solid olive illustration sits on the spine near the top, with a centred uppercase typewriter H2 (20px) above it. Each side: Garamond H3 60px in quotes with an oval outlined label under it, a rounded photo (325 x 390px), an uppercase typewriter heading, a 3-line paragraph; then a character illustration, a stat heading, a paragraph; then a hand-lettered word illustration with a mascot head, an uppercase heading and a paragraph. The words "Drizzle" and "Sizzle" also run vertically (rotated 90 degrees, typewriter) at the far left and right edges.
- Phone: keeps the 2 narrow columns side by side with the dashed spine (H3 32px, H2 14px).

**4. Rounded video panel** (752px). One autoplay looping video, 1220 x 672px, radius about 16px, inset 30px.

**5. Bundle promo card** (482px). A centred lime #d1e030 card about 976px wide, radius about 16px, 2 columns 33/67: rounded product photo left; right a Garamond H2 72px, a dashed rule, a 5-line typewriter list (first line bold in square brackets with a price), and a cream pill button with checkerboard shadow.
- Phone: card stacks, photo on top.

**6. Reviews** (1637px, third-party widget restyled). Summary row 32/68: score with stars and a bar chart left, a strip of square customer photos right. Lime pills "Filters" and "Write a review" (radius 30px, padding 12px 24px, 1px ink border, 16px weight 500). Each review is a row: left a tan #e8d6c8 box (1px ink border) with an initial avatar circle, the reviewed product thumbnail and a recommend line; right stars, a Garamond title, typewriter body, helpful counts. A lime "Show more" pill closes it.

**7. Social feed strip.** Same as Home section 9. **8. Footer.**

### Subscribe
- At phone and tablet the page opens with: (a) a hero with H1 Garamond 72px and a "Meet the perks" link, on #f6e6d9; (b) a perks section headed by an uppercase typewriter label between flower glyphs, then a stack of dashed-outline cards (radius about 24px), each with a Garamond H3 48px, a spot illustration (piggy bank, wrapped gift with hand-written side notes, a flexing bottle mascot), an uppercase subheading and a centred paragraph, plus a hand-lettered "GET COOKIN'" illustration. These two sections are not in the laptop band list.
- **1. Tabbed bundle picker** (872px at laptop, starts at y=190): a sunflower #fbd535 panel with 1px ink border, radius about 8px, and three folder tabs above it (radius 8px 8px 0 0, padding 10px 28px, uppercase 16px; active tab #fbd535, inactive #f6e6d9). Inside: 51/49 split, product photo with circular thumbnails left, cream buy panel right (as Duo Glass section 1). A lime sticker-like blob with rotated hand-lettered text ("now in glass") sits on the photo corner at phone.
- **2. Meet the lineup** (926px): a Garamond H3 60px uppercase title on 2 lines with an asterisk glyph each side; 3 columns 33/33/33, each a Garamond name 60px in quotes, an oval outlined label, a lifestyle photo about 358 x 447px (radius about 16px, saturated tabletop scenes with patterned cloths and bright produce), and a centred 5-line paragraph.
- **3. Rounded video panel.** Same as Duo Glass section 4. **4. Footer.**

### Olive Oil collection
- **1. Collection grid** (2560px at laptop): H1 Garamond 72px, three uppercase filter links, then a grid of product cards: 4 columns at 1280 and 1920, 3 at 768, 2 at 390. Card: photo about 281 x 374px (radius about 16px, single product on grey stone), name in typewriter 20px with quotes, one-line subtitle, then a lime pill the full card width ("Add · price") with ink outline and checkerboard shadow. Column gap about 32px, row gap about 50px.
- **2. Social feed strip.** Same as Home 9. **3. Footer.**

### Manage Subscription (login)
- **1. Login block** (460px, background #f3e5db): one line of text, an email field and a Submit button from the subscription app.
- **2. Social strip** in a variant whose heading is Garamond 19.2px title case. **3. Footer** (875px variant with title-case button labels).

### The Trio
1. Product hero, same as Duo Glass 1 (1622px).
2. Meet the lineup, same as Subscribe 2.
3. Recipe carousel (672px, #fff4ec, 2 columns 50/50 split by a dashed vertical line, solid ink rules top and bottom): italic Garamond heading centred across the split; each half a rounded photo (406 x 370px) with an outlined 80px rounded-square arrow button beside it, an uppercase typewriter kicker and one italic Garamond word filled mint #9eef80 with a dark outline and a soft lime glow behind it.
4. Fun-fact carousel on mint #9eef80, same structure as Home 6.
5. Reviews, same as Duo Glass 6. 6. Social strip. 7. Footer.

### The Starter Kit
1. Product hero (1187px). 2. Video panel with a "Watch the release" button (752px). 3. Kit contents band on chartreuse #d1e030 (870px): label between flower glyphs, Garamond H2 72px, 3 product photos in 3 columns. 4. Scroll animation stage (#f6e6d9, 712px, rendered empty). 5. Refill how-to (894px): Garamond H2 120px centred, a central vertical illustration (can pouring into a funnel into a bottle, standing on a hand-drawn ground line), and 3 instruction callouts in 1px dashed ellipses placed around it, each tagged with a mint #9eef80 numbered circle overlapping the ellipse edge; one centred closing line below. 6. Two-oils comparison, same as Duo Glass 3. 7. Recipe carousel, same as Trio 3. 8. Fun-fact carousel on mint. 9. Reviews. 10. Featured pair (1246px): centred 3-line Garamond heading with two italic underlined lines, 2 product cards as Home 5, a wide lime pill. 11. Social strip. 12. Footer.

### Original Mayo
1. Product hero (1009px, starts under the 60px solid header): flavour tiles in 3 columns and format tiles in 2 columns, selected tile mint; "Find in store" lime pill; tabs DETAILS, USES, INGREDIENTS.
2. Store locator embed (800px, rendered empty).
3. Pull quote (440px): centred Garamond about 60px on 3 lines; key phrases switch to italic and are filled mint #9eef80 with a thin dark outline.
4. Product "trading card" (839px): a sunflower #fbd535 card about 1040px wide, 1px ink border, radius about 12px, split into stacked rows by dashed rules: a hand-lettered script product name; two slider rows (italic typewriter labels at both ends, a cream track with a dark round thumb); an italic "Use me for:" heading over 3 dashed ellipses holding short suggestions, with a hand-drawn arm and spoon reaching in from the right edge; an italic question and a 2-line answer.
5. Comparison table (601px, 21/79 split): an italic mint outlined title with a lime glow left; 4 product columns with dark solid silhouettes of rival jars and the real product photo in the highlighted column, which is a #fff4ec rounded box with a dashed outline running through all rows; rows divided by dashed rules, cells use hand-drawn X and tick marks and a shrug kaomoji.
6. Meet the lineup (770px), as Subscribe 2 with oval labels.
7. FAQ accordion (1279px): left-aligned Garamond H2 72px, then full-width question rows (typewriter 18px) divided by thin rules, a small outlined circle toggle at the right of each.
8. Social strip. 9. Footer.

## 6. Responsive behaviour
| Breakpoint | Header | Grid columns | Hero | Type changes | Other changes |
|---|---|---|---|---|---|
| 390 | Hamburger, centred logo, search, [0]; 60px | Collection 2; product trio and lineup stack to 1 (phone lineup measured as a sideways carousel of 9 items); comparison stays 2 narrow columns | Home video hero 844px, H1 46px on 2 lines, full-width pill; origin ticker and origin card hidden. Product hero stacks: full-width photo, thumbnail row, title, panel | H1 46px, home carousel H2 72px, home story H2 46px, product H3 32px, body 15px/22.5px, nav 14px | Footer links in 2 columns; social strip shows about 2 photos |
| 768 | Same as phone | Collection 3; promo card 2 columns 49/51 | Home video hero 1024px, H1 46px on one line, full-width pill; ticker and origin card hidden. Product hero still stacked (2363px tall) | H1 46px, home carousel H2 72px, home story H2 72px, body 16px | Fun-fact carousel track measured as 4 items (5 at 390, 7 at 1280); only one fact shows at a time |
| 1280 | Logo left, 4 links, 2 icon buttons, cart pill; 60px | Collection 4; trio and lineup 3; recipe teaser 2 | Video hero 800px; product hero 50/50 | H1 72px home, 60px product; display H2 102 to 120px | 30px side gutters everywhere |
| 1920 | Contents centred in about 1360px | Collection 4 (cards grow, page 3413px tall for the grid) | Home video hero 1080px, text aligned to the 1360px header band; product hero 50/50, photo 960px wide | Same as laptop (H1 72px, carousel H2 102px, story H2 120px) | Body content stays fluid full width |

- Maximum content width: none for body content (fluid, 30px gutters at 1280). Header contents are capped near 1360px at 1920. Text measures are narrow: most paragraph blocks are 330 to 400px wide (measured content widths 330, 340, 350, 380, 400).
- Side padding: 30px at 1280; about 20px at 390.
- Sideways scrolling: the marquee and the social photo row move or overflow sideways by design. Page overflow measured 0 except Original Mayo at 768 (214px).

## 7. Motion and interaction
- Libraries: no GSAP, ScrollTrigger, Lenis, Locomotive or Framer. Lottie is present on the homepage (the animated fun-fact illustration).
- Video: up to 5 autoplay, muted, looping videos per page (hero, secondary panels).
- Carousels: the homepage product carousel (arrow pair control, colour changes per slide), the fun-fact text carousel (text crossfades), recipe carousels with square arrow buttons, product galleries with circular thumbnails.
- Marquee: one line of repeated uppercase typewriter text scrolling sideways on the lime recipes band (25 CSS-animated elements on the homepage).
- Scroll reveals on product pages: 22 elements hidden at load, 8 to 13 still hidden after a scroll pass (illustrations and comparison blocks fade or slide in as they enter). Two "animation stage" sections (bottles, cans) are scroll-driven and look empty without scrolling.
- Transitions: 57 to 90 elements with CSS transitions per page (buttons, tiles, tabs).
- Accessibility: a "Pause animations" toggle exists both as a skip-link button and as a footer link.
- Sticky: the header is static. Nothing else sticky was identified besides a third-party popup layer.

## 8. Colour
| Role | Hex | Where it is used |
|---|---|---|
| Page background | #f6e6d9 | Every page, header on inner pages, footer, most bands |
| Surface | #fff4ec | Buy panels, cart pill, cream buttons, ticker pill, scroll-animation bands, recipe carousel; also hero text colour on dark photos |
| Primary text and ink | #3c422e | All text, 1px borders, dashed rules, illustrations, active tab fill, giant wordmark |
| Muted text | not measured | No separate grey text; secondary text uses the same #3c422e at smaller size |
| Accent 1 (primary button) | #d1e030 | Lime pills, recipe band, kit band, promo card, widget buttons |
| Accent 2 | #fbd535 | Sunflower carousel slide, subscription tab panel, mayo trading card |
| Accent 3 | #9eef80 | Fun-fact band on product pages, selected option tiles, numbered step circles, follow and submit icon buttons, italic display words |
| Review surface | #e8d6c8 | Reviewer info boxes |
| Minor neutral | #ccc0b6 | Small fills inside the reviews widget |
| Login page band | #f3e5db | Manage Subscription page |
| Photo overlay | #000000 at 40% | Hero video and secondary photo hero |
| Borders and dividers | #3c422e | 1px solid outlines, 1px dashed section rules and spines |
| Dark sections | none | No dark bands; darkness comes only from overlaid photography |

## 9. Typography
| Level | Family | Weight | Size (laptop) | Size (phone) | Line height | Letter spacing | Case |
|---|---|---|---|---|---|---|---|
| H1 | ITC Garamond Condensed | 400 | 72px (home, collection), 60px (product) | 46px | 72px; 48px product; 46px home phone; 36.8px product phone | -2.16px at 72px, -1.44px at 60 and 46px | Sentence |
| Display H2 | ITC Garamond Condensed | 400 | 102px (carousel), 120px (story, refill), 72px (promo, FAQ) | 72px (home carousel, refill), 46px (home story, promo) | about 0.9 to 1.0 | about -0.03em (not measured per size) | Sentence |
| H3 product names | ITC Garamond Condensed | 400 (300 on subscribe) | 60px | 32px | 60px; 32px phone | -1.8px; -0.96px phone | Title, wrapped in curly quotes |
| Italic accents | Garamond Condensed italic | 400 | same as surrounding heading | same | same | not measured | Sentence, often filled #9eef80 with a dark outline |
| Body | GT Alpina Typewriter | 500 | 16px | 15px | 24px; 22.5px phone | normal | Sentence |
| Eyebrow and small labels | GT Alpina Typewriter | 500 | 16px (12px origin label, 20px comparison label) | 14px | 24px | normal (looks wide because monospaced) | Uppercase |
| Oval category labels | Apercu (only sans loaded) | 600 | not measured, about 13px | not measured | not measured | normal | Uppercase |
| Navigation links | GT Alpina Typewriter | 500 | 16px | 14px | 24px; 21px phone | normal | Title case |
| Buttons | GT Alpina Typewriter | 500 | 16px | 15px | 24px | normal | Uppercase on promo pills, title case in panels |
| Full-width pill label | ITC Garamond Condensed | 400 | not measured, about 44px | not measured | not measured | not measured | Title |

- Hand-lettered words (FUN FACT, PUNCHY, MELLOW, GET COOKIN', the script product name on the mayo card) are drawn illustrations, not fonts. Keep them as images.
- The italic typewriter (GT Alpina Typewriter 400 italic) is used for slider labels and the mayo card headings.

## 10. Imagery and icons
- Illustration is the core: single-colour #3c422e line and fill drawings with a slightly uneven hand-inked stroke. Subjects are olives with cartoon faces, a farmer in a sun hat, a wheelbarrow, a mascot riding an olive, a bottle with flexing arms, a piggy bank, a funnel. They float in empty space at small to medium size, never boxed, never coloured in, and some are animated (Lottie).
- Hand-lettered display words in a bubbly outline style, and small hand-written side notes ("*DRIP*", "1st free gift") set at slight angles.
- Product photography: each bottle or can alone on a mottled grey stone backdrop, soft side light, straight-on, portrait crop about 3:4 or 5:6, rounded corners about 16px.
- Lifestyle photography: overhead or close tabletop food shots with saturated colour (red tomatoes, pink checked cloths, yellow tables), hands in frame, sometimes candid phone-camera quality. Used in lineup columns, the recipe teaser and the social strip.
- Video: kitchen close-ups of hands using the bottle, full-bleed with a 40% black overlay in heroes, or inset with 16px radius.
- Icons: thin outline line icons in circles (search, account), a filled circle with check for bullet lists, hand-drawn X and tick marks in tables, a small flower or asterisk glyph as an ornament around labels, typed arrow glyphs (➛) in links.
- Not used: gradients (except a soft lime glow behind a few italic words), drop shadows on cards, glossy 3D renders, stock people photos, emoji, coloured icon sets, dark mode sections.

## 11. Components
- **Primary pill button:** fill #d1e030, text #3c422e, 1px solid #3c422e border, fully rounded, typewriter 16px weight 500 (uppercase on promotional pills), padding about 0 40px with a fixed height of 32 to 56px. Behind it, offset about 6px right and 6px down, sits a same-shaped shadow filled with a 1px checkerboard of #3c422e and cream, peeking out only along the bottom and right edges.
- **Secondary pill button:** same build with fill #fff4ec.
- **Widget pill:** #d1e030, 1px #3c422e border, radius 30px, padding 12px 24px, 16px weight 500 (reviews widget).
- **Split arrow control:** outlined rounded rectangle (radius about 8px) cut into two halves by a vertical 1px line, a typed left arrow and right arrow; 172 to 340px wide, 32px tall.
- **Square arrow button:** 80 x 80px outlined, radius about 8px, used beside recipe photos.
- **Oval label:** text inside a 1px ink ellipse (not a pill: the ends are curved like a hand-drawn ring), uppercase sans.
- **Dashed ellipse callout:** 1px dashed ellipse around a short typewriter instruction or suggestion, optionally tagged with a mint numbered circle.
- **Buy panel card:** #fff4ec, 1px ink border, radius about 16px, internal dashed rules between groups.
- **Option tiles:** outlined rectangles radius about 8px with a product thumbnail and label; selected state mint #9eef80. Quantity tiles add a dark #3c422e header strip with tiny cream text.
- **Folder tabs:** top corners rounded 8px, bottom square, attached to an outlined content box; active tab filled #3c422e with cream text.
- **Inputs:** 1px ink border, radius about 8px, transparent fill, inline submit text plus mint icon button.
- **Links:** typewriter with a dashed underline and a trailing arrow glyph.
- **Dividers:** 1px dashed #3c422e full-width rules between most sections; 1px solid rules around cream animation bands; a 1px dashed vertical spine in comparison sections.
- **Thumbnails:** 60px circles with a ring on the active one.

## 12. Section skeletons

```html
<!-- Video hero: one viewport tall, 40% black overlay, text bottom-left, header transparent and cream on top -->
<section>
  <video autoplay muted loop playsinline></video> <!-- kitchen close-up, overlay rgba(0,0,0,.4) -->
  <div><!-- bottom-left, 30px gutter, max about 600px -->
    <h1>Headline placeholder over two lines</h1> <!-- Garamond Condensed 72px, #fff4ec -->
    <a>Shop now</a> <!-- lime pill 350x32, 1px ink border, checkerboard offset shadow -->
  </div>
</section>
```

```html
<!-- Origin ticker: cream pill strip inside a 112px band, dashed rule below -->
<aside>
  <p><!-- full width minus 30px each side, 32px tall, fully rounded, #fff4ec -->
    <span><!-- flower glyph, far left --></span>
    <b>Label:</b> Value placeholder <span>/</span> <b>Label:</b> Value placeholder
    <span><!-- flower glyph, far right --></span>
  </p>
</aside>
```

```html
<!-- Colour-block carousel: whole slide is one flat colour (#fbd535, #d1e030 or #9eef80) -->
<section>
  <article><!-- 2 columns about 50/46, 664px tall -->
    <div><!-- centred text column -->
      <p>* Eyebrow placeholder *</p> <!-- uppercase typewriter between flower glyphs -->
      <h2>Two-line headline</h2> <!-- Garamond Condensed 102px, line-height about .9 -->
      <p>Two short lines of typewriter copy.</p>
      <a>Button label</a> <!-- cream pill, checkerboard shadow -->
      <nav><button>&larr;</button><button>&rarr;</button></nav> <!-- one outlined split control 172x32 -->
    </div>
    <figure><img alt=""></figure> <!-- square card, 1px dashed ink border, radius 16px, cream backdrop -->
  </article>
</section>
```

```html
<!-- Illustrated story: free placement in a very tall band, no grid, ends in the giant wordmark -->
<section>
  <img alt=""> <!-- small spot illustration with tiny tilted hand-written labels -->
  <h2>
    <span>First line of the headline,</span> <!-- Garamond 120px, starts about 12% from left -->
    <span>second line pushed right.</span> <!-- starts about 45% from left -->
  </h2>
  <img alt=""> <!-- line drawing, lower right -->
  <div><h3>SHORT LABEL</h3><p>Four short lines.</p></div> <!-- 320px wide, upper right -->
  <img alt=""> <!-- character illustration, left -->
  <div><h3>SHORT LABEL</h3><p>Four short lines.</p></div> <!-- 320px wide, under the character -->
  <svg><!-- brand wordmark spanning the full content width --></svg>
</section>
```

```html
<!-- Product trio: 3 equal cards, oval label + price on the photo, full-width lime pill below -->
<section>
  <p>Centred Garamond intro line</p>
  <ul><!-- 3 columns, 30px gutters -->
    <li>
      <figure><!-- 387x470, radius 16px, single product on grey stone -->
        <span>CATEGORY</span> <!-- top-left, inside a 1px ink ellipse -->
        <span>$00</span> <!-- top-right -->
        <img alt="">
      </figure>
      <p><small>FLAVOUR</small><small>000 ML</small></p>
      <h3><span>"Nickname"</span><u>Full product name</u></h3> <!-- Garamond, centred -->
      <p>One-line typewriter tagline.</p>
    </li>
  </ul>
  <a>Shop all &rarr;</a> <!-- lime pill, full content width, 80px tall, Garamond label -->
</section>
```

```html
<!-- Recipes teaser: lime band, marquee on top, scattered tilted verbs left, photo right -->
<section>
  <div aria-hidden="true">PHRASE · PHRASE · PHRASE · PHRASE</div> <!-- uppercase typewriter, scrolls sideways -->
  <div><!-- 2 columns 50/50 -->
    <div>
      <span>Verb</span><span>Verb</span><span>Verb</span><!-- Garamond about 60px, each rotated -6 to +6deg, staggered, one circled by a dashed ellipse -->
      <a>Secondary action</a> <!-- cream pill, checkerboard shadow -->
    </div>
    <figure>
      <img alt=""> <!-- 586x390, radius 12px -->
      <figcaption>Recipe title placeholder</figcaption>
      <a>MAKE THIS DISH &rarr;</a> <!-- dashed underline -->
    </figure>
  </div>
</section>
```

```html
<!-- Comparison with a dashed spine: mirrored halves, illustrations instead of icons -->
<section>
  <p>1 THING · 2 VARIANTS</p> <!-- uppercase typewriter, centred above the spine -->
  <div><!-- 1px dashed vertical line at centre, mint dot at its top, solid illustration on it -->
    <article><!-- left half; the same structure mirrored on the right -->
      <h3>"Name"</h3><span>LABEL</span> <!-- Garamond 60px; oval outlined label -->
      <img alt=""> <!-- 325x390 photo, radius 16px -->
      <h4>UPPERCASE FACT</h4><p>Three lines.</p>
      <img alt=""> <!-- character illustration -->
      <h4>STAT HEADING</h4><p>Five lines.</p>
    </article>
  </div>
  <span>"Name"</span> <!-- rotated 90deg, pinned to the far edge -->
</section>
```

```html
<!-- Footer: page colour, dashed rules, 50/50 with a dashed vertical divider, giant wordmark last -->
<footer>
  <div>
    <form><!-- left half -->
      <p>Two-line newsletter invitation.</p>
      <label>Email</label>
      <input placeholder="Your email"><button>SUBMIT</button> <!-- 1px ink, radius 8px, mint icon button -->
    </form>
    <nav><!-- right half: 3 link columns, then legal row -->
      <ul><!-- Shop --></ul><ul><!-- Company, heavier weight --></ul><ul><!-- Social as words --></ul>
      <p><a>Privacy</a> <a>Terms</a> <small>© Brand year</small></p>
    </nav>
  </div>
  <svg><!-- wordmark edge to edge, about 330px tall at 1280 --></svg>
</footer>
```

## 13. Dos and don'ts
- **Do:** set every headline in a tall condensed Garamond at weight 400 with tight negative tracking, and every other word (body, buttons, nav, labels) in a monospaced typewriter face. The contrast between the two is the brand.
- **Do:** keep one ink colour (#3c422e) for text, borders, rules and illustrations, on a warm blush page (#f6e6d9). Add colour only as whole flat bands or pill fills: chartreuse, sunflower, mint.
- **Do:** give pill buttons a 1px ink outline and an offset checkerboard shadow; it reads like a printed sticker, not a UI shadow.
- **Do:** use dashed 1px rules, dashed ellipses and hand-drawn oval rings to separate and label things.
- **Do:** let hand-drawn characters float in large empty space with off-centre placement, and stagger long headlines across the width.
- **Do:** finish every page with the brand wordmark drawn edge to edge in the footer.
- **Do:** wrap product nicknames in curly quotes and underline the second line of product titles.
- **Don't:** use a dark footer, a dark navigation bar or any black sections.
- **Don't:** box sections in shadowed white cards; surfaces are flat cream with a 1px ink outline at most.
- **Don't:** colour the illustrations or switch them to a flat vector icon style; they stay one-colour and hand-inked.
- **Don't:** use a geometric sans for body copy or buttons; the only sans is the tiny oval label text.
- **Don't:** centre everything in a narrow container; the layout is full-bleed with 30px gutters and asymmetric placement.
- **Don't:** round corners heavily on everything; photos sit at about 16px, tiles at 8px, buttons are full pills.
- **AI-look traps:** a row of three icon cards with emoji or coloured line icons (use the three-product layout only for real products, with photos and oval labels); purple or blue gradients and glassy blobs (the only glow is a soft lime haze behind an italic word); generic "fun" fonts like a rounded sans or a fake handwriting webfont (hand-lettering here is drawn art); pill-shaped tag chips in many colours (labels are thin ink ellipses); stock smiling-people photos (use real food, hands and product on stone); evenly spaced, perfectly aligned decoration (Graza's charm is the slight tilt, the stagger, the dashed line that looks drawn).
