# deVOL Kitchens: reference spec

> Source: https://www.devolkitchens.co.uk/ · Crawled 2026-10-28 at 390, 768, 1280 and 1920 px · Category: Warm & Friendly · Pages crawled: 7 URLs, 6 unique pages (Home, Kitchens, The Real Shaker Kitchen, Shaker catalogue: Base Cabinets, Heirloom Accessories collection, Amelie Doorknob product). /pages/real-shaker-kitchen and /pages/the-real-shaker-kitchen render the same page.

## 1. Overview
deVOL is an English maker of handmade kitchens, cabinetry, brassware and homewares, with showrooms in Leicestershire, London, Bath, New York and Los Angeles. The site feels like a printed catalogue or a country-house magazine: a centred serif wordmark, a pale grey (#f2f2f2) navigation strip, generous white space, and page after page of warm, softly lit room photography in a calm grid. Three things make it recognisable:
- EB Garamond for everything, in a soft warm grey (#595959) instead of black, with italic serif price ranges under each title;
- photography that does all the colour work (sage greens, oxblood reds, aged brass, terracotta, oak), framed by white space with square corners and no shadows;
- quiet, catalogue-like grids (4-up kitchens, 3-up shop categories, alternating 3-up and 2-up project rows), each card a photo, a serif title, an italic price line and two lines of description.

## 2. Pages and navigation
| Page | Path | Purpose |
|---|---|---|
| Home | / | Slideshow hero, a one-line statement, "Our Kitchens" 4-up grid, "Our Online Shop" 3-up category grid, newsletter |
| Kitchens | /pages/kitchens | Overview of the kitchen ranges: captioned slideshow, centred intro, 4-up range cards |
| The Real Shaker Kitchen | /pages/the-real-shaker-kitchen | Range landing page: slideshow, centred intro, a long gallery of customer projects, craft story, brochure promo |
| Base Cabinets (Shaker catalogue) | /pages/shaker-kitchen-base-cabinets | Price list: category sidebar plus a 3-up grid of cabinet cut-outs with dimensions and prices |
| Heirloom Accessories | /collections/heirloom-accessories | Shop collection: captioned slideshow, centred intro, alternating 3-up and 2-up product rows in sub-sections |
| The Amelie Doorknob | /products/amelie-doorknob-romilly-backplate | Product page: gallery and buy box, accordions, related products grid |

- Main navigation, in order: Kitchens, Design Service, Online Shop, Brochure & Book, About Us, Contact, then "Basket (0)" at the far right.
  - **Kitchens:** grouped by range. Each group holds the range page, Projects, About the Range, Catalogue & Price List with its sub-pages (Base Cabinets, Worktops, Taps & Sinks, Wall Cupboards and others), and 2 featured project links. The ranges are The Real Shaker Kitchen, The Classic English Kitchen, The Heirloom Collection, The Sebastian Cox Kitchen and The Haberdasher's Kitchen.
  - **Online Shop:** grouped by category (New Arrivals, Taps & Sinks, Cupboard Hardware, Architectural Hardware, Lighting, Switches & Sockets, Furniture, Bathrooms, Homeware, Handmade Tiles, Wallpaper & Paint, Flooring by deVOL, Collections, Support). Each group lists sub-categories, an "All ..." link and 2 featured products.
  - **About Us:** Our Story, Meet the Staff, deVOL's TV Show, Our Journal, Press, Careers.
  - **Contact:** Kitchen Enquiries, Online Accessory Sales, Our Showrooms.
  - How the dropdowns open was not captured (the cookie dialog blocked hover in the crawler).
- Footer-only pages: Delivery, Returns, Help & FAQs, Ordering Online, Payments, Flooring support, Manage Cookies, Cookie Policy, Privacy, Terms & Conditions, plus the 6 showroom contact blocks.
- Primary calls to action: "TAKE A LOOK" or "SHOP NOW" on slideshow captions, a range page or shop category from every card, "Add to basket" on product pages, and "Sign me up" for the newsletter. There is no persistent coloured call-to-action button in the header.

## 3. Header
- **Laptop 1280:** 142px in total, in 2 rows. Not transparent and never over the hero.
  - **Row 1 (white, 94px):** the logo image is centred, 320 x 62 px, at y = 17. It contains the "deVOL" serif wordmark in warm grey and, under it, a small line of showroom towns separated by middle dots (Leicestershire · London · Bath · New York · Los Angeles).
  - **Row 2 (navigation strip):** full-width #f2f2f2, 48px tall. The 6 links are centred as a group (the nav box is 717px wide starting at x = 281), EB Garamond 16px/20.8px weight 400, #595959, sentence case, about 45px apart. "Basket (0)" sits at the right end of the same strip, 16px.
- **Sticky behaviour:** when scrolling, the white logo row scrolls away and only the grey navigation strip stays pinned to the top of the viewport, about 48px tall. Measured at scroll positions 1000 and 1500.
- **Large 1920:** the same 2 rows, still centred. Only the photo and grid widths grow.
- **Tablet 768 and phone 390:** a single white row, 110px tall at 390. A thin 3-line hamburger at the left, the "deVOL" wordmark centred (no towns line), and an outline shopping-bag icon at the right. A hairline separates it from the hero. The menu opens as a drawer from the hamburger; its styling was not captured.

## 4. Footer
- **Newsletter band directly above the footer:**
  - Background #f2f2f2, 337px at 1280, everything centred.
  - Heading: EB Garamond 18px/23.4px weight 500, letter spacing 1.5px, the text written in capitals, #595959.
  - Then 2 short lines of copy at 16px/28px in a 320px column.
  - Then an outlined rectangular button: 135 x 39 px, background #f2f2f2, 1px border in black at 30%, padding 5px 32px 8px, 16px text, radius 0.
  - A thin divider line separates the band from the footer.
- **Footer (laptop):**
  - Background #f2f2f2, 651px tall at 1280 (480px at 1920), padding 64px top and 8px bottom.
  - 3 columns split 29/36/36. Column 1: "SUPPORT", with the accessory sales phone and email, then Delivery, Returns, Help & FAQs. Columns 2 and 3 share "CONTACT": 6 showroom blocks, each a place name, a phone number and an email, laid out in 2 sub-columns.
  - Column headings: 16px with 1px letter spacing, in capitals, declared as "Libre Baskerville" weight 300. That font is not in the loaded list, so it renders as a fallback serif.
  - Links: EB Garamond 16px/24px, #595959.
  - Below the columns: a row of 5 small grey social icons at the left (Instagram, Pinterest, Facebook, X, YouTube), then a bottom bar with a hairline above it. The bar holds the copyright at the left at 11px, the legal links in the centre (Manage Cookies, Cookie Policy, Privacy, Terms & Conditions; EB Garamond 11px/18.7px, #6d6d6d), and at the right the currency selector "United Kingdom | GBP £" (gill-sans-nova 12px, #6d6d6d, padding 12px 32px) plus a "Change to US & Canada >" link.
- **Phone:**
  - Footer 661px. Two columns, "ABOUT" and "SUPPORT", with 22px capital headings and a thin vertical rule between them.
  - Then the social icons, the legal links in 2 rows, the currency selector, and the copyright at 11px.
  - The showroom contact blocks are not shown on phone.

## 5. Page layouts

### Home (laptop 5496px, phone 13513px)
**1. Slideshow hero**
- Layout: full width, 500px tall at 1280 (142 to 642). 8 slides. A white thin chevron arrow sits at the left and right edges, vertically centred. 8 small round dots sit at the bottom-left (a group 160 x 20 px starting at x = 42); the active dot is white and solid, the others translucent.
- Content: photos only, no caption on the home slides. A white circular award roundel (a crest with ring text) sits over the top-right of every slide, about 180px across.
- Background: warm interior photos (green panelled kitchen with a marble-topped table, pink-walled kitchen, cream Shaker kitchen).
- Phone: 605px tall with a portrait crop, the roundel at the top-right, the dots centred at the bottom.

**2. One-line statement**
- Layout: centred, about 90px of white above and below. An H2 in EB Garamond 24px/31.2px weight 500, #595959, side padding 60px.
- Phone: 28.8px/35px, wrapping onto 3 short centred lines.

**3. Kitchen ranges grid ("Our Kitchens")**
- Layout: an H3 at the top-left, EB Garamond 24px/31.2px weight 500, at x = 51 with a 24px bottom margin. Then 4 equal columns (25% each, about 270px, gap about 24px) and 2 rows (8 cards).
- Card:
  - a photo, portrait about 4:5, square corners;
  - 16px below it, a title at 18px/27px weight 500 that underlines on hover (the underline thickness animates, 0.1s);
  - an italic price range at 16px/24px (a "from and to" figure pair such as "£12,000 to £40,000"; the source joins the figures with a dash, so write "to" in our builds);
  - 2 to 3 lines of description at 16px/24px, #595959.
- The 8 cards: 5 kitchen ranges, the design service, the brochure and book, and the showrooms.
- Phone: 1 column, cards full width with 24px side margins. The photo is about 4:5.

**4. Divider**: a 1px light grey hairline across the content width.

**5. Shop categories grid ("Our Online Shop")**
- Layout: an H3 at the top-left with a 36px top margin, then 3 equal columns (33% each) and 4 rows (12 categories).
- Card: a taller portrait photo (about 4:5) styled as a still life (tap over a copper pan, a brass knocker on a blue door, a hand-painted switch plate), then a title at 18px weight 500 and 2 lines of description at 16px. No price line.
- Phone: 1 column.

**6. Newsletter band** and **7. Footer** (see section 4).

### Kitchens (laptop 2980px)
1. **Captioned slideshow:** 500px, the same as Home section 1 with 4 dots. Bottom-left caption block at x = 50: an eyebrow line (EB Garamond 19.2px/25px, white), a large serif title (about 32px, white; size not measured), and a "TAKE A LOOK" text link (16px, capitals, white) with no box.
2. **Centred intro:** H1 "Our Kitchens" style heading, EB Garamond 24px/26.4px weight 500, centred, then 2 lines of copy in weight 300, 16px/24px, max 560px wide, centred.
3. **Range grid:** the same 4-up cards as Home section 3, inside a narrower container (content starts at x = 90, about 1100px wide).
4. Newsletter band and footer.

### The Real Shaker Kitchen (laptop 21734px, phone 42916px)
1. **Captioned slideshow:** the same as on Kitchens, with the caption naming a featured project.
2. **Centred intro:** the range title, a smaller price-range line, a 4-line paragraph, and a text link to the catalogue, all centred in about 560px.
3. **Project gallery:** a very long gallery of customer kitchens, made of alternating rows: 3-up rows of portrait photos (about 3:4), then 2-up rows of larger photos (about 4:5). Under each photo: the project name (small serif, about 14px) and an italic line such as "Cupboards from £..." (about 13px). There are no filters and no pagination, around 80 projects in one scroll.
4. **Craft story:** a "Beautifully Understated" style heading at the top-left, 2 text columns, then a 2 x 2 arrangement of workshop photos (hands cutting dovetails, a cabinetmaker at work) interleaved with paragraphs.
5. **Brochure promo:** centred. A photo of the printed brochure (about 230px wide), its title, 2 lines of copy and a text link.
6. Footer.
- Phone: the gallery becomes 1 column, which makes the page 42916px tall.

### Base Cabinets, Shaker catalogue (laptop 7496px)
1. **Two-column catalogue layout:**
   - Left sidebar: about 18% wide, starting at x = 90. A vertical list of catalogue categories (Base Cabinets, Worktops, Taps & Sinks, Wall Cupboards, Countertop Cupboards, Full Height Cabinets, Freestanding Cupboards, Prep Tables, Canopies, Additions, Fittings, Paint Colours) at 16px/24px. The current one is bold (weight 700).
   - Main column: a title and a 4-line intro paragraph, then a 3-up grid of cabinet cut-outs. The cabinets are grey painted with oak sides, photographed on white with a soft floor shadow.
   - Each item: a name at 16px weight 500, a dimension line "w 600  h 890  d 560 mm" at 16px, a 13px gap, the price at 16px, and an optional note line.
2. Footer.
- Phone: the sidebar is removed. The page opens with the category title between 2 hairlines, then the intro, then 1 column of items.

### Heirloom Accessories collection (laptop 11709px)
1. **Captioned slideshow:** a "SHOP NOW" link in the caption.
2. **Centred intro:** a heading and 2 lines of copy.
3. **Product rows:** alternating 3-up rows (square-ish lifestyle photos) and 2-up rows (taller photos), so the rhythm stays editorial rather than a uniform grid. Each product shows a name at 16 to 18px, then "from £00.00" at 16px, then "available in N finishes" at 16px with 0.4px letter spacing.
4. **Sub-sections:** each starts with an H3 at 24px/31.2px weight 500 at the left (36px top margin) and a "View all >" link at 18px weight 500 at the right. Examples: Heirloom Platters, Cupboard Fittings, Switches & Sockets.
5. Footer.

### The Amelie Doorknob, product page (laptop 3401px)
1. **Gallery and buy box:** 2 columns.
   - Left: a large photo gallery, about 610px wide, with white chevron arrows and dots at the bottom-left.
   - Right: a details column, 400px wide, starting at x = 790. In order:
     - breadcrumb ("Shop / ...") at 14px;
     - product name as H1, EB Garamond 18.24px/22.8px weight 400;
     - price in weight 600 with "(sold as a pair)" in regular;
     - "In Stock" in #898989;
     - a "Quantity" label (14.4px, #898989, 0.4px letter spacing) and a 100 x 39 px stepper (minus, number, plus) with a thin border;
     - beside the stepper, the "Add to basket" button (#27333f fill, white 15px text, square corners, about 200px wide);
     - a hairline;
     - the description in 16px/24px paragraphs that fade out at the bottom;
     - a "Read More ▾" toggle at 17px weight 500.
2. **Accordions:** full-width rows "Product Specification" and "Delivery & Returns" (17.12px weight 500, capitalised), each with a small triangle at the right and a hairline below.
3. **Related products:** an H3 at 24px at the left, then 4 equal columns of product photos (dark painted doors with brass knobs). Each shows a name, a price with "(sold as a pair)", and "available in N styles".
4. Footer.
- Phone: the gallery is full width (about 455px tall) with dots, followed by the details stacked, then the related products in 1 column.

## 6. Responsive behaviour
| Breakpoint | Header | Grid columns | Hero | Type changes | Other changes |
|---|---|---|---|---|---|
| 390 | One white row 110px: hamburger, centred wordmark (no towns line), bag icon | Every grid becomes 1 column; footer 2 columns (About, Support) | Slideshow 605px tall with a portrait crop, dots centred | Statement 28.8px/35px; card titles 20px; body copy 15px/22.5px | Catalogue sidebar removed; showroom contacts hidden in the footer |
| 768 | Same as phone; hero arrows visible | 2 columns for the kitchen grid (other grids not measured) | 500px, landscape crop, dots bottom-right | Statement 24px/31.2px | Section titles stay left-aligned at about x = 46 |
| 1280 | 2 rows: centred logo with towns line, grey 48px nav strip; strip sticks on scroll | Kitchens 4-up, shop 3-up, projects alternating 3-up and 2-up, catalogue sidebar plus 3-up | 500px, arrows at both edges, dots bottom-left | Base sizes (see section 9) | Content 1180px on Home, 1100px on inner pages |
| 1920 | Same 2 rows, centred | Same column counts with wider cards | 500px tall, same composition (wider crop) | Same sizes, no fluid type | Home content about 1600px wide; footer drops to 480px tall |

- Maximum content width: 1180px at 1280 on Home (content starts at x = 51) and 1100px on inner pages (x = 90). About 1600px at 1920 on Home. The slideshow hero and the grey bands (navigation strip, newsletter, footer) are always full-bleed.
- Side padding: about 51px on Home and 90px on inner pages at 1280. About 30px at 390 (content 330px wide).
- Horizontal scrolling: none at page level. The project page at 390 reports 2px of overflow, so treat it as none. Slideshows move sideways inside their frames.

## 7. Motion and interaction
Calm and gentle. Everything is native Shopify (Dawn-based) behaviour. No GSAP, ScrollTrigger, Lenis, Locomotive, Framer, Lottie or video was detected.

**Slideshow (every page hero)**
- Autoplays. The crawler's captures and later frames showed different slides. 8 slides on Home and 4 on inner pages.
- Captures taken mid-change show two photos overlapping, and once a hard vertical edge between them. The change is a soft dissolve or slide of roughly half a second; the exact easing was not measured.
- Controls: thin white chevrons at the left and right edges, and small round dots (white active, translucent inactive).
- 18 to 29 slider or carousel elements are counted per page, which includes the product gallery on product pages.

**Scroll reveals (present and gentle)**
- Grid cards, headings and footer blocks start invisible and fade in as they enter the viewport. Measured: 75 elements hidden at load and 0 after scrolling on the project gallery page. On Home, 41 are hidden at load and 20 after scrolling; the remainder are inactive slides.
- The laptop full-page capture of Home shows the footer still mid-fade (very pale), which confirms the fade.
- This matches Dawn's "reveal on scroll" (fade with a short upward slide). Keep it subtle: about 0.5s, a 20 to 30px rise. The distance was not measured.
- 13 to 102 elements carry a CSS animation name per page; these are the reveal animations.

**Sticky:** the grey navigation strip pins to the top once the logo row has scrolled away (2 to 3 sticky elements per page). Nothing else is pinned. The catalogue sidebar scrolls with the page in the captures.

**Hover and interaction**
- Card and title links: the underline appears and thickens (`text-decoration-thickness`, 0.1s ease).
- The outlined button's ring grows (box-shadow, 0.1s ease).
- Image hover effects were not observed in the captures.
- Product page: the description is clipped with a fade-to-white and a "Read More" toggle, and accordions open with a small triangle.

**Not used:** parallax, scroll-pinned scenes, cursor effects, marquees, counters, video backgrounds.

## 8. Colour
| Role | Hex | Where it is used |
|---|---|---|
| Page background | #ffffff | All content areas, cards, catalogue cut-out backgrounds |
| Surface (bands) | #f2f2f2 | Navigation strip, newsletter band, footer, currency selector |
| Primary text | #595959 | Every heading, title, body line, nav link (warm mid grey, never black) |
| Muted text | #6d6d6d | Legal links, currency selector |
| Light label text | #898989 | "In Stock", "Quantity" label |
| Accent | none in the interface | Colour comes from the photographs (sage green, oxblood, aged brass, terracotta, oak) |
| Primary button (product) | #27333f fill, #ffffff text | "Add to basket" |
| Secondary button | #f2f2f2 fill, #595959 text, 1px border in black at 30% | "Sign me up" |
| Text on photos | #ffffff | Slideshow captions, chevrons, dots |
| Borders and dividers | Light grey hairlines (exact hex not measured); black at 30% on outlined buttons | Section divider, accordion rules, header hairline on phone |
| Image placeholder tint | #121212 at 10% | Behind photos while they load |
| Dark sections | none | The site has no dark bands. The darkest blocks are photographs. |

## 9. Typography
Families: **EB Garamond** (Google font; weights 400, 500 and 400 italic loaded) for all visible text. **gill-sans-nova** (Adobe Fonts; 300 to 600 loaded) only for small UI such as the currency selector and the cookie dialog. Footer column headings declare "Libre Baskerville", which is not loaded, so they fall back to a system serif.

| Level | Family | Weight | Size (laptop) | Size (phone) | Line height | Letter spacing | Case |
|---|---|---|---|---|---|---|---|
| Logo | Image (serif wordmark plus towns line) | n/a | 320 x 62 px | smaller, no towns line (not measured) | n/a | n/a | "deVOL" |
| Page H1 (centred intro) | EB Garamond | 500 | 24px | 24px | 26.4px | normal | Title case |
| Product H1 | EB Garamond | 400 | 18.24px | not measured | 22.8px | normal | Title case |
| Statement H2 | EB Garamond | 500 | 24px | 28.8px | 31.2px, 35px phone | normal | Title case |
| Section H3 ("Our Kitchens") | EB Garamond | 500 | 24px | 24px | 31.2px | normal | Title case |
| Card title | EB Garamond | 500 | 18px | 20px | 27px | normal | Title case |
| Price range | EB Garamond | 400 italic | 16px | 16px | 24px | normal | As written |
| Body and descriptions | EB Garamond | 400 (300 for intros) | 16px | 15px to 16px | 24px | normal | Sentence |
| Slideshow eyebrow | EB Garamond | 400 | 19.2px | not measured | 25px | normal | Sentence |
| Slideshow link ("TAKE A LOOK") | EB Garamond | 400 | 16px | not measured | 24px | normal | Capitals as written |
| Newsletter heading | EB Garamond | 500 | 18px | 18px | 23.4px | 1.5px | Capitals as written |
| Navigation link | EB Garamond | 400 | 16px | n/a (drawer) | 20.8px | normal | Title case |
| Button | EB Garamond | 400 | 15px to 16px | same | 18px to 24px | normal | Sentence ("Sign me up", "Add to basket") |
| Form label | EB Garamond | 400 | 14.4px | 14.4px | 21.6px | 0.4px | Sentence, #898989 |
| Footer heading | Libre Baskerville (fallback serif) | 300 | 16px | 22px | 20.8px | 1px | Capitals |
| Footer link | EB Garamond | 400 | 16px | 16px | 24px | normal | Sentence |
| Legal and fine print | EB Garamond | 400 | 11px | 11px | 18.7px | normal | Title case |
| Currency selector | gill-sans-nova | 400 | 12px | 12px | 18px | normal | As written |

Rules: one serif family, small and even, all in warm grey #595959. Hierarchy comes from weight 500 against 400 and from the italic price lines, not from size: nothing on the page is larger than about 32px. Avoid bold (600 or more) except for the price on product pages and the active catalogue category.

## 10. Imagery and icons
- **Room photography:**
  - Warm, natural daylight interiors of lived-in English and American homes.
  - Typical scenes: painted Shaker cupboards in sage, cream, teal and oxblood; marble and oak worktops; brass taps; copper pans; plate racks; checkerboard floors; houseplants and cut flowers; old paintings on the walls.
  - Slightly muted, film-like grading with soft shadows. No people in most shots; occasionally a craftsperson in the workshop.
  - Square corners everywhere. Portrait crops (about 4:5 and 3:4) for grid cards; wide landscape for the 500px slideshow.
- **Still lifes for shop categories:** a single product in situ (a brass knocker on a blue door, a tap over a copper pan, a pendant light over a marble counter), shot close and warm.
- **Catalogue cut-outs:** cabinets photographed on white with a soft floor shadow, all from the same three-quarter angle, which makes the price list feel orderly.
- **Badge:** a white circular award roundel overlaid on the hero slideshow (top-right).
- **Icons:** very thin line icons in grey (hamburger, shopping bag, chevrons, small accordion triangles) and small filled social glyphs in the footer. No icon sets in content.
- **Not used:** video, illustrations, 3D renders, gradients, coloured blocks, emoji, stock-looking people, rounded image corners, drop shadows, decorative patterns. Even the brand's own patterned tiles appear only inside photographs.

## 11. Components
- **Primary button (commerce):** "Add to basket": #27333f fill, white EB Garamond 15px, square corners, about 200 x 39 px, sitting beside the quantity stepper.
- **Secondary button:** outlined rectangle. #f2f2f2 (or white) fill, 1px border in black at 30%, #595959 16px text, padding 5px 32px 8px, radius 0, about 39px tall. The ring thickens on hover.
- **Text links as calls to action:** "TAKE A LOOK", "SHOP NOW", "View all >", "Read More ▾". Serif, no box, sometimes in capitals. Most calls to action on the site are links, not buttons.
- **Card (range, category or project):** photo on top with square corners and no border, then the title (18px weight 500, underline on hover), then an optional italic price range, then 2 to 3 lines of description. The whole card is a link. No background, padding, shadow or tag.
- **Catalogue item:** a cut-out photo, the name, a dimension line ("w 600  h 890  d 560 mm") and the price, left-aligned, with generous space below (about 60px between rows).
- **Quantity stepper:** 100 x 39 px, a thin grey border, minus and plus glyphs with the number between them.
- **Accordion:** a full-width row, title 17px weight 500, a small solid triangle at the right, a hairline below.
- **Slideshow controls:** thin white chevrons (about 20 x 30 px), with no circle behind them; small round dots.
- **Sidebar list (catalogue):** plain stacked links at 16px with the current one bold, no bullets or boxes.
- **Inputs:** the newsletter uses a button to a signup page, not an inline field. Product forms use thin grey borders with square corners.
- **Dividers:** 1px light grey hairlines between major groups (between the home grids, under the accordions, above the footer bottom bar).
- **Badges:** none in the interface, apart from the award roundel on the hero.

## 12. Section skeletons

```html
<!-- Header: centred logo row (scrolls away) + full-width grey nav strip (sticks) -->
<header>
  <div><!-- white, 94px -->
    <a><img alt="Wordmark with showroom towns line"></a><!-- centred, 320x62 -->
  </div>
  <nav><!-- background #f2f2f2, 48px, position: sticky; top: 0 -->
    <ul><!-- centred group, ~45px gaps, EB Garamond 16px #595959 -->
      <li><a>Kitchens</a></li><li><a>Design Service</a></li><li><a>Online Shop</a></li>
      <li><a>Brochure &amp; Book</a></li><li><a>About Us</a></li><li><a>Contact</a></li>
    </ul>
    <a>Basket (0)</a><!-- right end of the strip -->
  </nav>
</header>
```

```html
<!-- Slideshow hero: 500px, photos only or with a bottom-left caption, award roundel top-right -->
<section>
  <div><!-- slides, autoplay, soft change -->
    <figure>
      <img alt="Kitchen interior placeholder">
      <figcaption><!-- optional, bottom-left at ~50px -->
        <p>Eyebrow line</p><!-- 19.2px white -->
        <h2>Project or range name</h2><!-- ~32px serif white -->
        <a>TAKE A LOOK</a><!-- 16px capitals, no box -->
      </figcaption>
    </figure>
  </div>
  <img alt="Award roundel"><!-- top-right, ~180px, white -->
  <button aria-label="Previous"></button><button aria-label="Next"></button><!-- thin white chevrons at edges -->
  <div><!-- 4 to 8 small dots, bottom-left --></div>
</section>
```

```html
<!-- Statement + 4-up range grid -->
<section>
  <h2>Short statement placeholder</h2><!-- centred, 24px weight 500, #595959 -->
</section>
<section><!-- content 1180px, starts at x=51 -->
  <h3>Section title</h3><!-- left, 24px weight 500 -->
  <ul><!-- 4 equal columns, ~24px gap, 2 rows; 1 column on phone -->
    <li><a>
      <img alt="Room photo"><!-- portrait ~4:5, square corners -->
      <h4>Range name</h4><!-- 18px weight 500, underline on hover -->
      <p><em>£00,000 to £00,000</em></p><!-- 16px italic -->
      <p>Two lines of description placeholder.</p><!-- 16px/24px #595959 -->
    </a></li>
  </ul>
</section>
```

```html
<!-- Project gallery: alternating 3-up and 2-up rows of portrait photos with small captions -->
<section>
  <div><!-- row of 3, portrait ~3:4 -->
    <figure><img alt=""><figcaption>Project name<br><em>Cupboards from £00,000</em></figcaption></figure>
    <figure><img alt=""><figcaption>Project name<br><em>Cupboards from £00,000</em></figcaption></figure>
    <figure><img alt=""><figcaption>Project name<br><em>Cupboards from £00,000</em></figcaption></figure>
  </div>
  <div><!-- row of 2, larger, ~4:5 -->
    <figure><img alt=""><figcaption>Project name<br><em>Cupboards from £00,000</em></figcaption></figure>
    <figure><img alt=""><figcaption>Project name<br><em>Cupboards from £00,000</em></figcaption></figure>
  </div>
  <!-- repeat; each figure fades in on scroll -->
</section>
```

```html
<!-- Catalogue price list: sidebar of categories + 3-up cut-out grid -->
<section>
  <aside><!-- ~18% wide, plain links, current = bold -->
    <a><strong>Base Cabinets</strong></a><a>Worktops</a><a>Taps &amp; Sinks</a><a>Wall Cupboards</a>
  </aside>
  <div>
    <h1>Category name</h1><p>Four-line intro placeholder.</p>
    <ul><!-- 3 columns; 1 column on phone -->
      <li><img alt="Cabinet on white"><h3>000mm Single Door Cabinet</h3><p>w 000  h 000  d 000 mm</p><p>£000.00</p></li>
    </ul>
  </div>
</section>
```

```html
<!-- Product buy box: gallery left, details right (400px) -->
<section>
  <div><!-- gallery ~610px, chevrons + dots --><img alt="Product in situ"></div>
  <div>
    <nav>Shop / Category</nav><!-- 14px -->
    <h1>Product name</h1><!-- 18.24px weight 400 -->
    <p><strong>£000.00</strong> (sold as a pair)</p>
    <p>In Stock</p><!-- #898989 -->
    <label>Quantity</label><div><button>-</button><input value="1"><button>+</button></div><!-- 100x39 -->
    <button>Add to basket</button><!-- #27333f, white 15px, square -->
    <div>Description placeholder that fades out at the bottom.</div><button>Read More</button>
  </div>
</section>
<details><summary>Product Specification</summary></details><!-- full width, hairline -->
<details><summary>Delivery &amp; Returns</summary></details>
```

```html
<!-- Newsletter band + grey footer -->
<section><!-- #f2f2f2, centred, 337px -->
  <h2>KEEP IN TOUCH STYLE HEADING</h2><!-- 18px, letter-spacing 1.5px -->
  <p>Two short lines placeholder.</p>
  <a>Sign me up</a><!-- outlined: 1px black at 30%, radius 0 -->
</section>
<footer><!-- #f2f2f2, 3 columns 29/36/36, padding-top 64px -->
  <div><h3>SUPPORT</h3><a>Link</a><a>Link</a></div>
  <div><h3>CONTACT</h3><p>Showroom name<br>Phone<br>Email</p></div>
  <div><p>Showroom name<br>Phone<br>Email</p></div>
  <div><!-- 5 small grey social icons --></div>
  <div><small>© Brand year</small><a>Legal link</a><button>Country | Currency</button></div><!-- 11px, #6d6d6d -->
</footer>
```

## 13. Dos and don'ts
- **Do:** set everything in one book serif (EB Garamond) at modest sizes (16 to 24px), in warm grey #595959 rather than black.
- **Do:** centre the wordmark above a full-width pale grey navigation strip, and let only that strip stick on scroll.
- **Do:** let warm, daylight interior photography carry all of the colour, in portrait crops with square corners and no frames.
- **Do:** build catalogue-like grids: 4-up for ranges, 3-up for shop categories, alternating 3-up and 2-up rows for galleries. Each card is a photo, a serif title, an italic price line and 2 lines of description.
- **Do:** use text links ("TAKE A LOOK", "View all >") for most calls to action, and keep the only filled button for commerce (#27333f).
- **Do:** keep motion soft: an autoplaying slideshow, and a gentle fade as grid items enter the viewport.
- **Do:** finish every page with a #f2f2f2 newsletter band and footer, listing showrooms with phone and email like a printed directory.
- **Don't:** use black text, bold headings or large display type. Nothing should exceed about 32px.
- **Don't:** add coloured buttons, accent bars or background colour blocks between sections. The page is white with grey bands only at the top and bottom.
- **Don't:** round image corners, add card shadows or put cards on tinted panels.
- **Don't:** use a sans-serif for content text. The sans (gill-sans-nova) is reserved for tiny UI.
- **Don't:** crop interiors into wide cinematic strips inside grids, or use stock lifestyle photography with posed people.
- **Don't:** add scroll-pinned scenes, parallax or video. They break the quiet catalogue feel.
- **AI-look traps:** a generator will reach for a full-screen hero with a big overlaid headline and a pill CTA, a cream or beige page background with terracotta buttons, icon feature rows, testimonial carousels with star ratings, and rounded "cozy" cards. deVOL does none of this: a 500px photo slideshow without a headline, a white page, square corners, grey serif text and plain text links. Also avoid fake handwritten fonts and emoji, and write price ranges with "to" rather than dashes.
