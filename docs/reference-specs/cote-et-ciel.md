# côte&ciel: reference spec

> Source: https://www.coteetciel.com/ · Crawled 2026-10-27 at 390, 768, 1280 and 1920 px · Category: Minimal & Corporate · Pages crawled: 8 (Home, Fall Winter collection, All products, Signature Forms collection, Seasonal News journal, About Us, plus 2 utility pages: account login redirect and returns portal)

## 1. Overview
côte&ciel is a Paris-founded maker of sculptural technical bags and backpacks. The site is a strict black-and-white Shopify store (Dawn theme base) that behaves like a gallery: monochrome campaign photography, products cut out on a pale grey (#f7f7f7) field with no text until hover, and almost no colour beyond black, white and 75% white. Three things make it recognisable:
- one typeface family, Everett, used in only two cuts (Regular and Bold) at small sizes (12 to 18px), with display moments capped at about 32 to 37px in bold uppercase;
- square-cornered rectangular buttons (radius 0) in white on images and black on white;
- black bands (header, About strip, newsletter, footer) that frame each page like a picture mount.

## 2. Pages and navigation
| Page | Path | Purpose |
|---|---|---|
| Home | / | Campaign banners alternating with 3-up product rows, About strip, journal cards, newsletter |
| Fall Winter '26 | /collections/fall-winter-26 | Season collection: image banner, filter and sort row, product grid |
| All products | /collections/all-products | Same template as the season collection, full catalogue |
| Signature Forms | /collections/signature-forms | Same template, with a short centred description in the banner |
| Seasonal News | /blogs/seasonal_news | Journal index: newsletter strip, 2-column article cards, numbered pagination |
| About Us | /pages/about-us | Brand story: black hero with spiral logo, centred text blocks between strips of 3D material renders |
| Log in | /customer_authentication/redirect | Utility (redirect to the account login), no design content |
| Return and Exchange | /a/506-returns-manager | Utility (third-party returns portal), no design content |

- Main navigation, in order:
  - **SHOP** (dropdown): New Arrivals, All products, Signature Forms, Shop by Use/Capacity (nested: Essential Carry, Daily Carry, Work & Laptop, Travel & Overnight, Transformable), Shop by Form (nested: Backpacks, Crossbody bags / Sling bags, Shoulder bags / Tote bags, Pouches & Accessories), Ready to Wear.
  - **MATERIALS** (dropdown): a list of material names such as Alias Leather, Carbon, EcoYarn, Gathered, Komatsu Onibegie Nylon, Obsidian, Onyx, Satellite, Sleek Nylon, Smooth Nylon, Taupe Reflective, Tweed Anthracite, Tweed Black&Cream.
  - **JOURNAL** (dropdown): Seasonal News, Horizon Series.
  - **ABOUT US** (dropdown): About Us, Stockists, and 5 store pages.
  - **FW26**: a plain link.
  - Right side: region (globe), search, account and cart icons.
- Footer-only pages: Contact Us, FAQs, Terms & Conditions, Privacy, Stockists, Asia Pacific Site, EU/UK Site, Return and Exchange, Return and Exchange Policy, Shipping Info, Warranty.
- Primary call to action: "SHOP THE COLLECTION" on each campaign banner, leading to the season collection. "View all" under each product row leads to that collection.
- A region-picker modal ("Are you in the right place?") opens on first visit. It is a popup and is not part of this spec.

## 3. Header
- **Laptop 1280:**
  - A solid black (#000000) bar, 60px tall, full width. Padding 8.35px 46.4px. Grid split 11/76/13.
  - Left: the "côte&ciel" lowercase wordmark in white, about 112px wide.
  - Centre-left (not centred; it starts right after the logo at x = 188): the 5 menu items. Everett-Regular 12.99px, letter spacing 0.56px, the labels written in capitals, colour #ffffff at 75% opacity. Each dropdown item has a thin chevron. The current section is underlined in full white.
  - Right: 4 thin line icons in white, about 40px apart (globe, search, account, bag).
- **Behaviour:** sticky on scroll up. It hides when scrolling down (gone at 1200px) and slides back in when scrolling up (visible again at 600px). It is never transparent over the hero. Every hero starts below it.
- **Dropdown:** clicking an item opens a small black panel (about 185px wide) directly under it. The links are in sentence case at about 12px, white at 75%. Nested groups open in place with a chevron. There is no mega menu and no imagery in menus.
- **Large 1920:** the bar stays full-bleed black, but its content sits in a centred container about 1390px wide (logo at x = 265, bag icon ending at about x = 1655). The menu stays left-grouped next to the logo.
- **Tablet 768 and phone 390:** a black bar 44px tall (as measured). Hamburger icon at the left, the wordmark centred, globe, search and bag icons at the right. The account icon moves into the drawer (it is visible as a "Log in" text link at 768).
- **Phone menu:** a black drawer slides in from the left and covers about 90% of the width. The top-level items are large uppercase bold labels (about 24px) with a right arrow at the far right. Each opens a sub-panel. At the bottom: a "Log in" row with a person icon, then the Facebook, Instagram and YouTube icons.

## 4. Footer
- **Newsletter band** (always directly above the footer, part of the footer look):
  - Background #000000, 276px tall at 1280.
  - A centred H2 in Everett-Bold 32.48px/42.2px, white, sentence case.
  - A one-line subtitle at 13.92px/25px, white at 75%.
  - A single email field 334 x 42 px: transparent, drawn with a 1px ring of white at 55% (box-shadow, not a border), placeholder "Email" at 14.8px, and a thin right-arrow submit button inside the right end.
- **Footer:**
  - Background #000000, 500px tall at 1280 and 1920, 855px on phone.
  - 3 equal columns (33/33/33) with 46.4px side padding. Column 1 is "INFORMATION" (7 links), column 2 "Quick links" (5 links), column 3 the company name with a 3-line address.
  - Column headings: Everett-Bold 14px, white. Links: Everett-Regular 11.97px/21.5px, white at 75%, no underline.
  - Under the columns: a centred row of 3 social icons (Facebook, Instagram, YouTube), each with a 41px hit area. Then a thin divider and a centred copyright line in 10px, white at 75%, with "Powered by Shopify".
  - No logo in the footer and no payment icons.
- **Phone:** the 3 columns stack into one, left-aligned, with 24px between groups. Social icons stay centred.

## 5. Page layouts

### Home (laptop 5618px, phone 5418px)
**1. Campaign banner, full-bleed image**
- Layout: 696px tall at 1280 (60 to 756), 768px on phone. A single image fills the width. The content box is centred horizontally and sits low (its top at about 70% of the banner height). Box 490 x 185 px, padding 37px 32px.
- Content: H2 in Everett-Bold 32.48px/42.2px, white, the label in capitals. Then 2 white rectangular buttons side by side (each 208 x 42 px, 10px gap): black text in Everett-Regular 12px, letter spacing 0.93px, capitals, radius 0.
- Background: a black-and-white, motion-blurred, low-key campaign photo (night street, reflective bags glowing).
- Phone: a portrait crop with the text block in the lower third. The buttons stack and run full width inside a 24px margin.

**2. Product row, 3 up on a grey field**
- Layout: 635px. The section title sits at top-left (x = 46): Everett-Bold 18.56px/24px, capitals, black. Below it, a #f7f7f7 panel spans the content width (1188px; 46.4px page padding) and holds 3 equal cells (33/33/33).
- Content: 3 product cut-out photos (black bags on the grey field, about 280px tall, centred in each cell), with no text. On hover the product name (Everett-Bold 13.92px) and price (Everett-Regular 13px, letter spacing 0.65px) appear at the bottom of the cell. A centred black "View all" button follows below the panel: 114 x 42 px, white text 13.92px, a 1px black ring, radius 0.
- Phone: a 2-up horizontal slider of cards. Under each image there is a short black bar (the active image indicator) on a grey hairline, then the always-visible name and price. Below the slider: a "1 / 2" counter flanked by thin chevrons. "View all" moves to the title row as an underlined text link at the right.

**3. Spacer**, 60px of white.

**4. Diptych banner**
- Layout: 720px. One wide image that is itself a diptych (two photos joined edge to edge, 50/50): a close crop at the left, a full-length figure at the right, both on a pale concrete wall.
- Content: a centred H2 in Everett-Bold 37.12px, white, then 1 white rectangular button.
- Phone: a single portrait photo (the close crop), 768px tall, with the text in the lower third.

**5. Product row**: same as Home section 2, with its own title.

**6. About strip**
- Layout: 497px, background #000000, 2 columns. Text at the left (starting x = 65, about 510px wide). A graphic in the right half.
- Content: H2 in Everett-Bold 32.48px, white, capitals. Two short paragraphs in Everett-Regular 13.92px/25px, white at 75%, with key words set in bold. A white rectangular button 181 x 42 px.
- Graphic: the "côte&ciel" wordmark repeated around a twisted ring (a spiral of white type on black), as an image.
- Phone: the graphic first (centred), then the text block below, left-aligned.

**7. Spacer**, 50px.

**8. Journal cards, 2 up**
- Layout: 526px on white. The section title at the top-left, as in section 2. Then 2 columns (50/50, about 584px each).
- Content: each card has a landscape photo (about 2:1), then an info block (padding 27.84px) with the article title in Everett-Bold at about 14px. No date, excerpt or button on the home page.
- Phone: a 1-up slider with a "1 / 2" counter.

**9. Journal cards, 2 up**: same as section 8 (second journal series).

**10. Newsletter band** and **11. Footer** (see section 4).

### Collection pages (Fall Winter '26, All products, Signature Forms; laptop 5778 to 6393px)
1. **Collection banner:**
   - Laptop: 480px full-bleed photo. Centred H1 in Everett-Bold, white, capitals: 32.48px/42.2px on the season collection, 50px/65px on Signature Forms. Signature Forms adds a 3-line centred description (Everett-Regular 14px/20px, white, about 570px wide).
   - Phone: 380px, H1 at 23.2px/30.16px.
2. **Filter row:** white, about 150px tall with generous vertical padding. "Filters" with a chevron at the far left (Everett-Regular 13.92px) and "Sort" with a chevron at the far right (12.06px, letter spacing 0.65px), both black at 75%. On phone, one "Filters & Sort" control (12px bold) opens a drawer.
3. **Product grid:**
   - A #f7f7f7 field across the full width, edge to edge with no side padding and no gutters: 3 cells per row, each 427 x 550 px at 1280. Each cell shows one cut-out product photo, centred, with no frame, border or text until hover. The card info (padding 20px 18px 20px 22px) holds the name and price that fade in on hover. The products vary in scale and orientation (bags, straps, key rings), so the grid has an irregular, curated rhythm.
   - At 390 and 768: 2 columns, and the name (Everett-Bold 12 to 13px) and price (13px) are always shown under each image.
4. **Load more:** a centred outlined rectangular button (white with a thin black ring, small text) under the grid. It loads more products; there is no page-number pagination on collections.
5. Newsletter band (not on every collection) and footer.

### Seasonal News, journal index (laptop 2587px)
1. **Newsletter strip:** black, 215px. A centred email field with a ring, as in the footer band, and one line of subtitle text below it.
2. **Title:** H1 in Everett-Bold 32.48px, black, capitals, left-aligned at x = 46.
3. **Article grid:**
   - 2 columns (50/50), 3 rows. Each card has a landscape photo on top (about 2:1, full card width).
   - Below the photo, an info panel on a faint grey fill (black at 4%) holds: the title in Everett-Bold 18.56px; the date in small capitals with wide letter spacing, black at 75%; a 3-line excerpt in 13.92px/25px, black at 75%.
   - No category tags and no read-more buttons. The whole card is the link.
4. **Pagination:** small numbers centred with a chevron ("1 2 3 ... 6 ›"). The current page is underlined.
5. Footer.
- Phone: 1 column, H1 23.2px.

### About Us (laptop 3759px)
1. **Black hero:**
   - 645px, background #000000. The left half holds the spiral wordmark graphic, large (about 400px).
   - The right half holds a statement H2 in Everett-Bold 32.48px, white, sentence case, about 5 lines, left-aligned.
2. **Centred manifesto blocks, alternating with render strips:**
   - The text blocks are centred, 578px wide, in Everett-Bold 18px/23.4px, black. Selected words are written in capitals for emphasis, for example "WAS FOUNDED in PARIS".
   - Each text block sits alone in about 400px of white space.
   - The strips between them are full-bleed rows of abstract 3D material renders (folded and twisted surfaces). One strip has 2 panels, sage green. The next has 2 panels, light grey. The last has 4 panels: beige, pale blue, black and sage.
3. **Black closing band:** 291px. A centred capitals line in Everett 18px/25px weight 700, white, a subtitle line, and a white button (166 x 50 px, black text 14px, 2px white border, radius 2px, padding 12px 22px 10px).
4. Footer.
- Phone: the hero stacks (graphic on top, statement below). The render strips go to 2 panels per row.

## 6. Responsive behaviour
| Breakpoint | Header | Grid columns | Hero | Type changes | Other changes |
|---|---|---|---|---|---|
| 390 | Black 44px bar: hamburger left, centred wordmark, 3 icons right; left drawer | Product rows become 2-up sliders with a "1 / 2" counter; collection grid 2 columns; journal 1-up slider; footer 1 column | 768px portrait crop, text in lower third, buttons stacked full width | Banner H2 23.2px; section titles 15.78px; product names 12px | Product name and price always visible; "View all" becomes an underlined text link in the title row |
| 768 | Same as phone, plus a "Log in" link | Product rows 3-up as on laptop; journal rows not measured; footer 3 columns | 932px tall, portrait-leaning crop | Banner H2 32.48px, diptych H2 37.12px, section titles 18.56px | About strip shrinks to 323px |
| 1280 | Black 60px bar: logo, 5 capital labels, 4 icons | Product rows 3-up on #f7f7f7; collection grid 3 columns edge to edge; journal 2-up | 696px, text box centred low | Banner H2 32.48px; diptych H2 37.12px; section titles 18.56px | Product info appears on hover only |
| 1920 | Content in a centred ~1390px container | Same as 1280 | About 940px tall, same composition | Same sizes as 1280 (no fluid scaling) | Wider empty margins; images scale up |

- Maximum content width: about 1188px of content at 1280 (46.4px side padding). At 1920 the page width is capped at about 1390px for the header, titles, product panels and footer. Banners and collection grids stay full-bleed.
- Side padding: 46.4px at 1280 and 768 (logo and titles at x = 46), about 20px at 390.
- Horizontal scrolling: none at page level (overflowPx 0). On phone, the product and journal rows scroll sideways inside their sliders.

## 7. Motion and interaction
This is a near-static site. Motion is limited to standard Shopify Dawn micro-interactions.
- **Scroll reveals:** none. scrollRevealHint shows 0 elements hidden at load on every page. All content is visible immediately.
- **Libraries:** none detected (no GSAP, ScrollTrigger, Lenis, Locomotive, Framer or Lottie). No video on any crawled page.
- **Sticky header:** hides on scroll down and slides back on scroll up (Dawn "on scroll up" behaviour). It is not shrunk and does not change colour.
- **Sliders:** on phone and tablet, product rows and journal rows are swipeable sliders (66 slider elements counted on Home) with a "1 / 2" text counter between thin prev and next chevrons. There is no autoplay and no dots.
- **Hover:**
  - Product cells reveal the name and price at the bottom of the grey cell. A small chevron appears for the next product image.
  - Header labels gain an underline (text-decoration, 0.1s ease).
  - Buttons thicken their ring (box-shadow, 0.1s ease). They do not change fill colour.
- **Dropdowns:** native details and summary, so the panel opens instantly, with no slide or fade.
- **Phone drawer:** slides in from the left over the page.
- **Animated graphic:** the spiral wordmark image in the About strip; whether it rotates was not measured. It appeared static in every capture.
- **CSS animations:** 2 elements with an animation name on Home (theme utilities). Nothing decorative.

## 8. Colour
| Role | Hex | Where it is used |
|---|---|---|
| Page background | #ffffff | All content areas between bands |
| Product field (surface) | #f7f7f7 | Behind every product cut-out, home rows and collection grids |
| Journal card panel | #000000 at 4% (renders about #f5f5f5) | Info block under journal card photos |
| Primary text | #000000 | Section titles, product names, prices |
| Muted text on white | #000000 at 75% | Body copy, filter labels, dates and excerpts |
| Text on black | #ffffff, and #ffffff at 75% for links and body | Header labels, footer links, About paragraphs |
| Accent | none | No accent colour. Contrast is the accent. |
| Primary button on images and black | #ffffff fill, #000000 text | Banner and About buttons |
| Primary button on white | #000000 fill, #ffffff text | "View all" |
| Borders and dividers | #000000 at 10%, and white at 55% rings on dark | Hairlines under product sliders, the email field ring |
| Dark sections | #000000 | Header, About strip, newsletter band, footer, About hero and closing band |
| Imagery tones | Monochrome photography; pastel 3D renders (sage, beige, pale blue) on About only | The only colour comes from photos |

## 9. Typography
Families: **Everett** (a contemporary grotesk, loaded as two separate families, "Everett-Regular" and "Everett-Bold", both reported as weight 400 because the weight is in the file). Questrial 400 also loads on phone and tablet (used only by the region modal). Substitute (our suggestion, not measured): a neutral grotesk with a straight-sided bold cut.

| Level | Family | Weight | Size (laptop) | Size (phone) | Line height | Letter spacing | Case |
|---|---|---|---|---|---|---|---|
| Collection H1 (banner) | Everett-Bold | Bold cut | 32.48px (50px on Signature Forms) | 23.2px | 1.3 (42.2px) | 0.56px | Capitals as written |
| Banner H2 | Everett-Bold | Bold cut | 32.48px, 37.12px on diptych banners | 23.2px, 27.84px | 1.3 | 0.56px | Capitals as written |
| Statement H2 (About hero, newsletter) | Everett-Bold | Bold cut | 32.48px | 23.2px | 42.2px | 0.56px | Sentence |
| Section title H2 | Everett-Bold | Bold cut | 18.56px | 15.78px | 24.1px | 0.56px | Capitals as written |
| Manifesto text | Everett-Bold | Bold cut | 18px | not measured | 23.4px | 0.56px | Mixed, key words in capitals |
| Product name H3 | Everett-Bold | Bold cut | 13.92px (13px on collections) | 12px | 18.1px | 0.56 to 0.65px | Title case |
| Body | Everett-Regular | Regular | 13.92px | 13.92px | 25.06px (1.8) | 0.56px | Sentence |
| Price | Everett-Regular | Regular | 13px | 13px | 15.6px | 0.65px | As written, "$355.00 USD" |
| Navigation label | Everett-Regular | Regular | 12.99px | about 24px bold in drawer | 16.9px | 0.56px | Capitals as written |
| Button | Everett-Regular | Regular | 12px (banners), 13.92px (View all) | same | 14.4 to 16.7px | 0.93px | Capitals as written |
| Footer heading | Everett-Bold | Bold cut | 14px | 14px | 18.2px | 0.56px | Capitals (first column), sentence (others) |
| Footer link | Everett-Regular | Regular | 11.97px | 11.97px | 21.5px | 0.56px | Sentence |
| Fine print | Everett-Regular | Regular | 10.05px | 10.05px | 17.1px | 0.65px | Sentence |

Rules: everything is small and evenly tracked with positive letter spacing (0.56px to 0.93px). Capitals come from the text itself, not text-transform. No italics, no serif, no display sizes above 50px.

## 10. Imagery and icons
- **Campaign photography:**
  - Black-and-white or heavily desaturated, often motion-blurred and low-key: night shots with reflective bags glowing, figures in dark technical clothing against concrete.
  - Crops are wide (about 16:9) for home banners and portrait on phone. Diptychs pair a tight crop with a full-length figure.
  - Never a coloured filter, never a gradient overlay. Contrast inside the photo carries the white type.
- **Product photography:** studio cut-outs of the bag alone, black or dark tweed on a #f7f7f7 field, photographed straight-on or at three-quarter view. No model, no props, no shadow box. The scale varies per product, so small accessories float in large empty cells.
- **Journal photography:** editorial and documentary (street scenes, dancers, interiors), sometimes in colour, cropped about 2:1.
- **3D renders (About only):** abstract folded and twisted surfaces in soft pastel monochromes (sage, light grey, beige, pale blue, black), lit softly, in full-bleed strips.
- **Graphic mark:** the lowercase wordmark repeated around a twisted spiral ring, white on black.
- **Icons:** thin 1.5px line icons in white (globe, magnifier, person, bag, chevrons, arrows). Social icons are small filled marks.
- **Not used:** colour accents, illustrations, emoji, lifestyle stock photos, rounded image corners, drop shadows, badges like "New" or "Sale", star ratings.

## 11. Components
- **Primary button on images and black:** white fill, black text, radius 0, no visible border. Everett-Regular 12px with letter spacing 0.93px, in capitals. Padding 8.35px 27.84px 10.21px, 42px tall, width set by text (181 to 208px). Hover thickens the ring.
- **Primary button on white:** black fill, white text, a 1px black ring (box-shadow), radius 0, 42px tall, 13.92px.
- **Outlined button:** white fill, black text, thin black ring ("Load more").
- **About closing button:** the exception, white fill, 2px white border, radius 2px, padding 12px 22px 10px, 14px/24px.
- **Text link:** underlined, 12 to 14px ("View all" on phone).
- **Product cell:** a grey (#f7f7f7) rectangle with no border or radius, holding a centred cut-out. The name and price sit at the bottom-left on hover (always on phone), with padding 20px 18px 20px 22px. On phone there is a short black indicator bar on a grey hairline under the image.
- **Journal card:** a photo with a grey info block below it (padding 27.84px): bold title, small spaced date, 3-line excerpt.
- **Slider controls:** "1 / 2" counter in 12 to 14px between thin chevrons, centred under the row.
- **Email field:** transparent, 42px tall, a 1px white ring at 55% opacity, padding 13.92px 46.4px 13.92px 13.92px, a thin arrow submit inside the right edge.
- **Dropdown panel:** black, about 185px wide, small sentence-case links, square corners.
- **Filter and sort:** text labels with chevrons (native details elements), no boxes.
- **Dividers:** none between sections. Bands of white space (50 to 60px spacers) separate blocks instead.

## 12. Section skeletons

```html
<!-- Header: black 60px bar, logo + left-grouped capital labels, 4 line icons right; hides on scroll down -->
<header>
  <a><img alt="wordmark"></a><!-- white, ~112px wide -->
  <nav><!-- starts right after the logo, 12.99px, white 75%, letter-spacing 0.56px -->
    <details><summary>SHOP</summary><ul><!-- small black panel, sentence-case links --></ul></details>
    <details><summary>MATERIALS</summary><ul></ul></details>
    <details><summary>JOURNAL</summary><ul></ul></details>
    <details><summary>ABOUT US</summary><ul></ul></details>
    <a>FW26</a>
  </nav>
  <div><button aria-label="Region"></button><button aria-label="Search"></button><a aria-label="Account"></a><a aria-label="Bag"></a></div>
</header>
```

```html
<!-- Campaign banner: full-bleed monochrome photo, centred text box low, 2 square white buttons -->
<section><!-- 696px at 1280, 768px portrait on phone -->
  <img alt="Campaign photo placeholder">
  <div><!-- centred, top at ~70% of height, padding 37px 32px -->
    <h2>COLLECTION NAME</h2><!-- Everett-Bold 32.48px, white -->
    <a>SHOP THE COLLECTION</a><!-- white fill, black 12px, radius 0, 208x42 -->
    <a>EXPLORE THE EDITORIAL</a><!-- 10px gap; stacked full width on phone -->
  </div>
</section>
```

```html
<!-- Product row: title top-left, 3 cut-outs on one grey panel, centred black View all -->
<section><!-- 46px side padding -->
  <h2>SECTION TITLE</h2><!-- Everett-Bold 18.56px -->
  <ul><!-- background #f7f7f7, 3 equal cells, no gaps; 2-up slider on phone -->
    <li><a><img alt="Product cut-out"><div><h3>Product name</h3><span>$000.00 USD</span></div><!-- info shows on hover --></a></li>
    <li><a><img alt=""><div><h3>Product name</h3><span>$000.00 USD</span></div></a></li>
    <li><a><img alt=""><div><h3>Product name</h3><span>$000.00 USD</span></div></a></li>
  </ul>
  <a>View all</a><!-- black fill, white text, 114x42, radius 0 -->
</section>
```

```html
<!-- About strip: black, text left, spiral wordmark graphic right -->
<section><!-- 497px, 2 columns 50/50 -->
  <div>
    <h2>ABOUT US</h2><!-- Everett-Bold 32.48px white -->
    <p>Short paragraph with <strong>BOLD</strong> key words.</p><!-- 13.92px/25px white 75% -->
    <a>DISCOVER MORE</a><!-- white fill, black text, radius 0 -->
  </div>
  <img alt="Spiral wordmark graphic">
</section>
```

```html
<!-- Collection grid: banner, text-only filter row, edge-to-edge grey cells -->
<main>
  <section><img alt=""><h1>COLLECTION</h1><p>Optional 3-line description.</p></section><!-- 480px -->
  <div><details><summary>Filters</summary></details><details><summary>Sort</summary></details></div><!-- far left / far right -->
  <ul><!-- #f7f7f7, 3 columns of 427x550 cells at 1280, no gutter; 2 columns on phone -->
    <li><img alt="Product cut-out"><div><h3>Name</h3><span>Price</span></div></li>
  </ul>
  <button>Load more</button><!-- outlined, centred -->
</main>
```

```html
<!-- Newsletter band above footer: black, centred, single ringed email field -->
<section>
  <h2>Offer line placeholder</h2><!-- Everett-Bold 32.48px white -->
  <p>One-line subtitle placeholder.</p><!-- 13.92px white 75% -->
  <form><input type="email" placeholder="Email"><!-- 334x42, 1px ring white 55% --><button aria-label="Subscribe"></button><!-- thin arrow inside right --></form>
</section>
```

```html
<!-- About manifesto: centred bold text block alone in white space, then a strip of 3D renders -->
<section><p>Text with KEY WORDS in capitals placeholder.</p></section><!-- 578px wide, Everett-Bold 18px/23.4px, ~400px band -->
<section><!-- full-bleed strip, 2 or 4 equal panels, no gaps -->
  <img alt="Material render"><img alt="Material render"><img alt="Material render"><img alt="Material render">
</section>
```

## 13. Dos and don'ts
- **Do:** stay strictly black, white and #f7f7f7. Let monochrome photography provide all the tonal range.
- **Do:** use one grotesk at small sizes with positive letter spacing (about 0.04em), and bold capitals for titles that are typed in capitals, not transformed.
- **Do:** keep every button a square-cornered rectangle, white on images and black on white, about 42px tall.
- **Do:** show products as cut-outs on a flat pale grey field, with the name and price revealed on hover on desktop.
- **Do:** frame the page with black bands: header, About strip, newsletter, footer.
- **Do:** leave large empty areas around small text blocks (manifesto blocks sit alone in about 400px of white).
- **Do:** place section titles at the top-left in small bold capitals, never centred over product rows.
- **Don't:** add an accent colour, coloured badges or sale tags.
- **Don't:** round corners on images, cards or buttons, or add shadows.
- **Don't:** enlarge the type into a big display hero. The largest banner heading is 32 to 50px.
- **Don't:** add scroll animations, parallax or autoplay sliders. The calm comes from stillness.
- **Don't:** put product names permanently under every desktop grid item, or wrap cells in borders.
- **Don't:** use warm lifestyle stock photos or bright colour photography on the main banners.
- **AI-look traps:** generic generators will add rounded pill buttons, soft drop shadows, a three-card feature row with icons, gradient overlays on photos, and "Elevate your everyday" style copy. Here, use radius 0, no shadows, flat grey product fields and terse labels. Avoid centring everything: titles sit top-left and only banner text is centred. Do not introduce a second typeface for headings, and never use emoji or em dashes in copy.
