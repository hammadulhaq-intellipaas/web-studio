# ConductLaw: reference spec

> Source: https://www.conductlaw.com/ · Crawled 2026-10-27 at 390, 768, 1280 and 1920 px · Category: Minimal & Corporate · Pages crawled: 8

## 1. Overview
ConductLaw is a small Canadian business law firm (corporate, trusts and estates, real estate) whose site is a Webflow build aimed at entrepreneurs who want a consult. The design is corporate and restrained: deep navy (#0c173f), white and pale grey, with a single bright emerald green (#00c27f) used for every call to action, every link and a short horizontal rule above every heading. Three things make it recognisable: a classic serif (Playfair Display, regular weight, very large) paired with an ultra-light sans (Montserrat 200) for all body copy; panels that deliberately break the grid by overlapping the band above or below and stopping short of one page edge; and small decorative dot grids (alternating navy and green dots) tucked behind the top-left corner of photos and forms.

## 2. Pages and navigation
| Page | Path | Purpose |
|---|---|---|
| Home | / | Long sales page: video hero, credentials, practice areas, resources, proof, team, contact, metrics |
| What We Do | /services/what-we-do | Firm approach: two alternating text and image blocks, testimonials |
| Team Members | /team-members | Grid of attorney cards |
| Attorney profile | /team/jeffrey-jp-mcavoy | One attorney: long bio beside a portrait |
| Blog | /blog | Article index: featured row plus paginated 3-column grid |
| Contact | /contact | Contact details and form |
| Business Law | /services/business-law | Practice page: intro, checklist, accordion topics, CTA panel, related articles, testimonials |
| Trusts & Estate Planning | /services/trusts | Practice page, same template as Business Law |

- Main navigation, in order: SERVICES (dropdown: What We Do, Business law, Trusts & Estate Planning, Trademarks, Commercial Real Estate) · ATTORNEYS (dropdown: one item per attorney, 4 names) · RESOURCES (dropdown: Blog, Podcast, Course) · CONTACT · REQUEST A CONSULT. Dropdown parents carry a small chevron after the label.
- Pages reachable only from the footer: Privacy, Terms.
- Primary call to action: "Request a consult", repeated in the header, the hero, after almost every content block and in the green band above the footer. Its link target was not measured.

## 3. Header
- **Laptop 1280:** band 80px tall, transparent, laid over the hero image or video. Logo left, links right, split 20/80. The logo is a wordmark: a swoosh "C" mark in white and green, "CONDUCT" in white and "LAW" in green, about 200px wide. Links are plain uppercase text, Montserrat 200, 14.08px, letter spacing 1.5px, #fefefe; "REQUEST A CONSULT" in the header is a plain text link, not a filled button. A 1px translucent white rule runs under the header across the container width (20px in from each edge at 1280).
- **Large 1920:** same layout inside a 1440px container (240px margins). Links grow to 18px. Measured band height 66px; at this width the band reported a solid #0c173f background, which is the scrolled state of the sticky bar.
- **Tablet 768:** logo left, hamburger right (three thin white lines), no visible links, band 81px.
- **Phone 390:** logo left at roughly half the bar width, hamburger right, band 81px. The menu panel background is #0c173f at 85% opacity; the open animation was not captured.
- Sticky: yes, the navbar is detected as sticky at every width.

## 4. Footer
The footer is two stacked parts that overlap.
- **Green "get started" band:** #00c27f with a faint photo of city buildings blended into its right half. It starts at the left page edge and stops about 5% short of the right edge (ends near x=1215 at 1280), and its lower part overlaps the top of the navy footer, so a sliver of navy shows to its right. Content: H2 in white Playfair 64px on the left with one white paragraph under it; on the right a dark indigo button (#150341, white uppercase text, 24px 50px padding, 2px letter spacing, square corners). Height about 180px at laptop.
- **Navy footer:** #0c173f, white text. Grid of 3 columns, 56/13/31. Column 1: logo, a tiny uppercase letter-spaced grey eyebrow ("Disclaimer"), a 4-line disclaimer paragraph, then 4 social icons (Facebook, Twitter, Instagram, LinkedIn) drawn as 32px outlined circles with a green 1px ring and green glyph. Column 2: eyebrow "Explore" and 5 stacked white links (Services, Attorneys, Blog, Privacy, Terms) about 26px apart. Column 3: eyebrow "Connect", then an email and two phone numbers, all in green.
- **Legal row:** full-width 1px divider in a lighter navy, then copyright left and "Designed by <agency>" right with the agency name in green.
- No newsletter form.
- Total height including the green band: 983px at laptop, 1002px at 1920, 1113px at 768, 1445px at 390. Tablet grid 46/16/38. Phone stacks everything in one column, left aligned, green band first with its button full width below the text.

## 5. Page layouts

### Home (laptop height 10350px)

**1. Full-bleed video hero**
- Layout: one column, text left aligned in the container, vertically centred in the visible area. Band height 1137px at 1280 (starts under the transparent header).
- Content: a 44px horizontal green rule placed in the left gutter, level with the first line of the H1; H1 in two lines (Playfair 68px, white); one paragraph (Montserrat 200, 18px/28.8px, white, about 560px wide); one green "Request a consult" button. At 1920 a thin white outlined circle (about 80px) with a down chevron sits bottom right as a scroll cue; at 768 it sits under the button on the left.
- Background: muted autoplay looping video, a top-down shot of people meeting around an office table, under a #0c173f overlay at 70%.
- Phone: 726px tall, the green rule moves above the H1 instead of beside it, H1 drops to 35px, the button becomes full width.

**2. Accreditation logo strip**
- Layout: a white panel with a soft drop shadow that overlaps the bottom 118px of the hero. It is flush with the left page edge and stops about 80px short of the right edge (115px at 1920). Five logos in five equal 20% cells, one row, 203px tall.
- Content: 5 professional-body logos in their own colours, about 120px wide each.
- Background: #fefefe panel over the pale grey of the next band.
- Phone: 255px, logos in 2 columns over 3 rows with the last one centred.

**3. About block**
- Layout: band 733px on pale grey (#0c173f at 6%, which renders as #f0f0f3). Two columns at laptop, text left and photo right, the same component as the service-page intro (Business Law section 2).
- Content: green rule, H2 (64px, two lines), one paragraph, green button; a colour photo of two smiling professionals in suits, with a dot grid behind the photo's top-left corner.
- Phone: text first, then the photo full width with the dot grid running down its right side.

**4. Practice areas, 3 cards**
- Layout: band 1223px, white. Heading block left aligned (green rule, H2 64px, one intro paragraph about 460px wide). Below it, 3 equal cards (33% each, about 16px gaps), one row.
- Content per card: an outline line icon about 50px (black strokes with one green detail), a 30px green rule, H3 (Playfair 700, 24px), 3 to 4 lines of light body copy, and a green "Learn More" text link followed by a long thin arrow.
- Card: white, 1px light grey border, very soft shadow, square corners, about 40px inner padding, about 312px tall.
- Phone: cards stack full width with about 20px between them.

**5. Offset navy CTA panel**
- Layout: band 716px. A pale grey strip fills the lower part of the band on the left; a navy panel starts about 75px from the left edge and runs to the right page edge, overlapping both the white area above and the grey strip. Inside, 2 columns measured 56/44: copy column and action column.
- Content: green rule, H2 (64px, white, up to 3 lines), one muted paragraph, a green filled button and a white 1px outlined "Learn More" button (transparent fill, Montserrat 300 uppercase).
- Background: #0c173f with a faint diagonal line texture (image).
- Phone: everything centred in one column, green rule centred above the H2, the two buttons stacked full width.

**6. Resources, 3 article cards**
- Layout: band 1349px, white. Heading block left (green rule, H2, paragraph). A 3-column grid (33% each) of article cards, then a centred green "Full Collection" button.
- Card: a landscape photo (about 4:3) fills the column; a white text card overlaps the lower third of the photo, inset about 12px on each side, with border and soft shadow. Inside: green rule, Playfair 700 title (2 to 3 lines), excerpt, green "Read More" link plus arrow.
- Phone: one card per row; the text card still overlaps the photo.

**7. Why us, signature block**
- Layout: band 860px. A near-black panel (the colour data reports #1d1d23; the panel is a background image) holds the copy; a large photo below or beside it overlaps a blush-pink strip.
- Content: green rule, H2 in white, a grey paragraph, a thin divider, then a handwritten signature image beside a name (Playfair 700, white) and title (grey). Photo: a bright, high-key shot of colleagues shaking hands in a glass office, with a dot grid at its lower right.
- Phone: panel full width, photo below it straddling the dark panel and the pink strip.

**8. Testimonials, 3 cards**
- Layout: band 1165px, white. Heading row: green rule hanging in the left gutter, H2 and a short paragraph on the left; five solid green stars (about 32px each) on the right. Then 3 equal cards (33%), then a centred green button.
- Card: white, 1px light grey border, square corners, about 300px tall. A circular headshot (about 115px) overlaps the card's top edge, aligned left. Quote in Montserrat 200 with straight quotation marks. Name in Playfair 700 with a 30px green rule inline to its right, company in muted grey below.
- A row of decorative dots runs above the cards.
- Phone: cards stack; stars sit under the heading.

**9. Team slider**
- Layout: band 1234px, #0c173f. Heading block (green rule, H2 white, paragraph), two square outlined arrow buttons (prev, next) about 60px wide, then the slider of attorney cards.
- Card: slightly lighter navy panel with a shadow, circular headshot overlapping its top edge and centred, green rule, name (Playfair 600, 24px, white), role, a hairline divider, "Phone:" and "Email:" with bold labels, a green "View Profile" link with arrow. Everything centred.
- Phone: one card visible, arrows above it.

**10. Contact block**
- Layout: band 923px, #f0f0f3. Grid 40/60. Left: green rule in the gutter, H2, paragraph, then 3 contact rows (phone, second phone, email) each with a 26px navy filled circle holding a white line icon. Right: a white form card with a soft shadow, about 48px padding.
- Form: 2 fields per row (first name and last name, phone and email), then a full-width message textarea, then a green "Send Message" button (not full width). Labels are small uppercase Montserrat with wide letter spacing, navy, semi-bold. Inputs have no box, only a 1px grey bottom border, light grey placeholder text.
- A dot grid sits behind the bottom-left corner of the form card.
- Phone: one column, left block first, fields one per row, button full width.

**11. Metrics strip**
- Layout: band 156px, #f0f0f3, 4 equal columns, centred text.
- Content: a number in Playfair 64px (#150341) with a "+" suffix, and a short Montserrat 200 label in grey below. Numbers count up when scrolled into view.
- Phone: 2 x 2 grid, numbers 40px, band 380px.

**12. Footer** as described in section 4.

### What We Do
1. **Inner-page hero:** band 406px. Background photo of glass skyscrapers shot from below, tinted navy. H1 (68px, white) centred horizontally and vertically. Header overlays it. Phone 366px, H1 35px.
2. **Text and image block:** same as Home section 3, on white, 721px.
3. **Second text and image block:** same component on pale grey (#0c173f at 6%), 721px.
4. **Testimonials:** same as Home section 8.
5. **Footer.**

### Team Members
1. **Inner-page hero**, 386px, same as What We Do section 1.
2. **Attorney grid:** pale grey band, 3 columns (33% each), 4 cards over 2 rows (3 then 1, left aligned). Card as in Home section 9 but standing alone on the grey page, navy fill (#0c173f), shadow, circular photo overlapping the top. Phone: one per row, about 50px between cards to leave room for the overlapping photo.
3. **Footer.**

### Attorney profile
1. **Inner-page hero** with the attorney's name as H1.
2. **Bio block:** pale grey band, 2 columns about 60/35. Left: several light paragraphs; bold statements in Montserrat 600 in #1d1d23; a bulleted list with small navy dots; contact lines with bold labels and underlined links. Right: a portrait headshot on a pale grey studio background with the dot grid behind its top-left corner. Phone: text first, portrait below.
3. **Footer.**

### Blog
1. **Inner-page hero**, 386px, glass facade against sky, tinted navy.
2. **Featured row:** H2 left, then 3 article cards exactly as Home section 6.
3. **Recent grid:** H2 left, then 12 article cards in 3 columns and 4 rows, with a plain "Next" pagination link (Montserrat 200, 14px, #333333) underneath.
4. **Footer.**

### Contact
1. **Inner-page hero**, 386px.
2. **Contact block:** same as Home section 10.
3. **Footer.**

### Business Law (practice page template)
1. **Inner-page hero**, 406px, glass tower photo, centred H1.
2. **Intro, text and image:** pale grey (#f0f0f3), 836px. Two columns: text left about 55% (green rule, H2 64px in two lines, two paragraphs, green button); right about 35%, a portrait-format photo (meeting at a table) with a dot grid of 9 dots across its top and 9 down its left side, alternating navy and green, offset about 20px outside the photo.
3. **Checklist:** darker grey band (#e3e3e8), 861px. Large H2 spanning about 60% of the width in three lines, then a 2-column list of 6 items each; each item has a thin navy check mark and Montserrat 200 text at 18px. Trusts uses a single column list.
4. **Topic with accordion:** white, 935px. H2 and one short paragraph (about 460px wide), then stacked full-width accordion bars: #0c173f, about 80px tall, 20px apart, a white outline icon about 30px at the left, then a white Montserrat 600 label at about 15px. The bars hold collapsed paragraphs.
5. **Offset navy CTA panel, centred:** white band, 687px. A navy panel inset about 100px from the left edge and running to the right edge, faint diagonal texture. Inside, centred: green rule, H2 white (2 lines), a muted paragraph up to 5 lines (about 840px wide), green button.
6. **Second topic with accordion:** pale grey band, same as section 4 with 2 bars.
7. **Related articles:** H2, 3 article cards as Home section 6, no collection button.
8. **Testimonials:** same as Home section 8.
9. **Footer.**

### Trusts & Estate Planning
Same template as Business Law: hero, text and image intro, single-column checklist on grey, a white text section with a centred H2 and centred paragraphs (no accordion), the offset navy CTA panel, a grey accordion section with 3 bars, related articles, testimonials, footer.

## 6. Responsive behaviour
| Breakpoint | Header | Grid columns | Hero | Type changes | Other changes |
|---|---|---|---|---|---|
| 390 | Logo and hamburger, 81px | 1 column everywhere; logo strip 2 columns; metrics 2 x 2 | 726px, rule above H1, button full width | H1 35px, H2 35px, H3 22 to 25px, body 15px/24px, buttons 15px | All buttons full width; overlapping panels keep their offset; footer one column |
| 768 | Logo and hamburger, 81px | Practice cards stacked; resources 2 columns; testimonials stacked; contact 2 columns; metrics 4 | 1031px | Same sizes as laptop (H1 68px, H2 64px, body 18px) | Footer grid 46/16/38; scroll cue under the button |
| 1280 | Full link row, 80px | 3-column cards; contact 40/60; metrics 4; footer 56/13/31 | 1137px | H1 68px, H2 64px, H3 24px, body 18px/28.8px | Logo strip panel overlaps hero by 118px |
| 1920 | Full link row inside 1440px container | Same as 1280 | 1150px | Body 20px/32px, nav links 18px | Content held in a 1440px container, scroll cue circle bottom right |

- Maximum content width: 1440px (seen at 1920: content from x=240 to x=1680). At 1280 the header spans 1240px (20px side padding) and section content spans about 1200px (about 40px side padding, seen in screenshots).
- Phone side padding: about 20 to 30px, seen in screenshots; not measured.
- Nothing scrolls sideways at any width (measured overflow 0).

## 7. Motion and interaction
- Scroll reveals: Webflow interactions hide 29 elements at load on the homepage and reveal them as they enter the viewport. The exact effect (fade, slide distance, duration) was not measured; keep it a short, plain fade or small rise.
- Video: the home hero is a muted, autoplaying, looping background video.
- Carousels: Webflow slider elements detected (21 nodes); the team block is a slider with square prev and next arrow buttons.
- Counters: the metrics numbers count up on scroll (each capture showed different values).
- Hover: 74 elements carry CSS transitions (buttons, links, cards); the hover styles themselves were not measured.
- Sticky: the header is sticky and takes a solid navy background once the page scrolls.
- Dropdowns open from the Services, Attorneys and Resources items.
- Libraries: Webflow runtime only. No GSAP, no ScrollTrigger, no Lenis or Locomotive smooth scrolling, no Lottie, no Framer.

## 8. Colour
| Role | Hex | Where it is used |
|---|---|---|
| Page background | #fefefe | White bands: practice areas, resources, testimonials, accordion sections |
| Pale grey band | #f0f0f3 (also #0c173f at 6% over white) | About, contact, metrics, inner-page intros, team grid |
| Darker grey band | #e3e3e8 | Checklist band on practice pages |
| Surface | #ffffff | Cards, form card, logo strip panel |
| Primary text and headings | #0c173f | All headings and most body text on light backgrounds |
| Body text on dark | #fefefe | Hero, navy panels, footer |
| Muted text | #aaaebd | Labels, captions, secondary lines |
| Strong inline text | #1d1d23 | Bold statements on the attorney profile; near-black "why us" panel |
| Accent | #00c27f | Short rules above headings, buttons, text links, arrows, stars, footer contact links, social rings |
| Primary button | #00c27f fill, #fefefe text | All "Request a consult" buttons on light or navy backgrounds |
| Dark button | #150341 fill, #fefefe text | The button on the green footer band; also metrics numbers |
| Dark sections | #0c173f | Team band, CTA panels, accordion bars, attorney cards, footer |
| Hero overlay | #0c173f at 70% | Over the hero video and inner-page hero photos |
| Borders and dividers | not measured (light grey, about 1px) | Card outlines, input underlines, footer divider in a lighter navy |
| Blush strip | not measured (pale pink) | Behind the "why us" photo only |

## 9. Typography
Fonts loaded: Playfair Display (headings), Montserrat in all weights 100 to 900 with italics (everything else), Muli 300 (loaded; use not measured).

| Level | Family | Weight | Size (laptop) | Size (phone) | Line height | Letter spacing | Case |
|---|---|---|---|---|---|---|---|
| H1 | Playfair Display | 400 | 68px | 35px | 81.6px (1.2) | normal | Title case |
| H2 | Playfair Display | 400 | 64px | 35px | 70.4px (1.1) | normal | Title case |
| H3 (card titles) | Playfair Display | 700 (600 on attorney cards) | 24px | 22 to 25px | 28px | normal | Title case |
| Metric numbers | Playfair Display | 400 | 64px | 40px | not measured | normal | n/a |
| Body | Montserrat | 200 | 18px (20px at 1920) | 15px | 28.8px (1.6) | normal | Sentence case |
| Eyebrow labels (footer, form) | Montserrat | semi-bold, not measured | not measured (about 12 to 14px) | not measured | not measured | wide, not measured | Uppercase |
| Navigation links | Montserrat | 200 | 14.08px (18px at 1920) | hidden in menu | not measured | 1.5px | Uppercase |
| Buttons | Montserrat | 600 (300 on the outlined button) | 18px | 15px | 18px | normal (2px on the dark button) | Uppercase |
| Accordion labels | Montserrat | 600 | about 15px, not measured | not measured | not measured | normal | Title case |

The contrast between a heavy-feeling serif at 64 to 68px and a hairline-thin 200-weight sans is the core of the look. Headings are never bold except the small H3 card titles.

## 10. Imagery and icons
- Photos: stock corporate photography of people in business dress (meetings, handshakes, smiling colleagues), glass office interiors, and upward shots of glass towers and facades. Inner-page heroes are always architecture (glass skyscrapers, curtain walls against sky), tinted navy.
- Treatment: hero photos and video sit under a heavy navy overlay so they read as navy texture. Content photos are full colour, unfiltered, square cornered, often with a soft shadow.
- Aspect ratios: hero full bleed; intro photos portrait (about 4:5); article thumbnails landscape (about 4:3); headshots circular crops on a light grey studio background.
- Video: one background video in the home hero only.
- Icons: thin outline line icons (black strokes with one green accent detail) on practice cards; white outline icons on accordion bars; white line icons in filled navy circles for contact rows; solid green five-point stars; outlined circle social icons.
- Decoration: small dot grids, rows of 9 dots alternating navy and green, placed at the corner of photos and the form card; a signature image in the "why us" block.
- Not used: illustrations, gradients (other than the photo blend in the green footer band), rounded cards, pill buttons, emoji, 3D renders, icon tiles with coloured backgrounds.

## 11. Components
- **Primary button:** #00c27f fill, #fefefe text, no border, radius 0, padding 24px 50px (25px 44px in the hero), Montserrat 600 18px uppercase. Phone: padding 20px 30 to 40px, 15px text, full width.
- **Secondary button:** transparent, 1px solid #ffffff border, white Montserrat 300 18px uppercase, radius 0, padding 24px 43px. Used only on navy panels next to a primary button.
- **Dark button:** #150341 fill, white Montserrat 600 18px uppercase with 2px letter spacing, radius 0, padding 24px 50px. Only on the green footer band.
- **Text link with arrow:** green Montserrat 200 at body size, followed by a long thin arrow (about 24px) in green. Used for "Learn More", "Read More", "View Profile".
- **Heading rule:** a green line about 44px wide and 2px thick. Either above the heading with about 20px space, or hanging in the left gutter level with the first line of the heading (hero, testimonials, contact).
- **Practice card:** white, 1px light grey border, soft shadow, square corners, icon, rule, H3, text, arrow link.
- **Article card:** photo with a white text card overlapping its lower third, inset about 12px.
- **Testimonial card:** bordered white card with a circular headshot breaking its top edge.
- **Attorney card:** navy card, centred, circular photo breaking its top edge, hairline divider between role and contact lines.
- **Accordion bar:** full-width navy bar about 80px tall with a white outline icon and a semi-bold white label; corners square or barely rounded (not measured).
- **Form inputs:** no box; 1px grey bottom border; uppercase letter-spaced navy label above; light grey placeholder.
- **Contact row:** 26px navy filled circle with white icon, then light text.
- **Checklist item:** thin navy check mark, light 18px text.
- **Stars:** 5 solid green stars in a row.
- No badges, pills or tags anywhere.

## 12. Section skeletons

```html
<!-- Header: transparent over hero, sticky, turns solid navy on scroll -->
<header>
  <a><img alt="Logo wordmark"><!-- about 200px wide, left --></a>
  <nav><!-- right aligned, uppercase, 1.5px tracking, weight 200 -->
    <a>Services ▾</a><a>Attorneys ▾</a><a>Resources ▾</a><a>Contact</a><a>Request a consult</a>
  </nav>
  <hr><!-- 1px translucent white rule across the container -->
</header>
```

```html
<!-- Home hero: navy-tinted background video, left text, green rule in the gutter -->
<section><!-- 1137px at 1280, video under #0c173f at 70% -->
  <video autoplay muted loop playsinline></video>
  <div><!-- container; text column about 640px -->
    <span aria-hidden="true"><!-- 44px green line, sits left of the H1 first line --></span>
    <h1>Two-line serif headline placeholder</h1>
    <p>One light paragraph placeholder, about four lines.</p>
    <a>Primary action</a><!-- green, square, uppercase -->
  </div>
  <a aria-label="Scroll down"><!-- 80px outlined circle with chevron, bottom right --></a>
</section>
<!-- Logo strip: white panel, overlaps hero bottom by about 118px, flush left, stops short of right edge -->
<div><!-- 5 equal cells, one logo each, soft shadow -->
  <img alt="Accreditation logo"><img><img><img><img>
</div>
```

```html
<!-- Practice cards: heading block left, 3 equal bordered cards -->
<section>
  <span aria-hidden="true"><!-- green rule --></span>
  <h2>Section heading placeholder</h2>
  <p>Short intro placeholder, about 460px wide.</p>
  <div><!-- 3 columns, 33% each, 16px gaps -->
    <article><!-- white, 1px light border, soft shadow, square, 40px padding -->
      <img alt=""><!-- 50px outline icon with one green detail -->
      <span aria-hidden="true"><!-- 30px green rule --></span>
      <h3>Card title</h3>
      <p>Three lines of light text.</p>
      <a>Learn more ⟶</a>
    </article>
    <!-- repeat x 3 -->
  </div>
</section>
```

```html
<!-- Offset CTA panel: navy panel inset from the left, bleeding off the right edge -->
<section><!-- a pale grey strip sits behind the lower left -->
  <div><!-- navy #0c173f, faint diagonal texture, starts about 75 to 100px from the left page edge -->
    <span aria-hidden="true"><!-- green rule, centred on the practice-page variant --></span>
    <h2>Question-style heading placeholder</h2>
    <p>Muted paragraph placeholder.</p>
    <a>Primary action</a>
    <a>Secondary action</a><!-- 1px white outline, transparent -->
  </div>
</section>
```

```html
<!-- Testimonials: heading left, stars right, 3 cards with avatars breaking the top edge -->
<section>
  <header><!-- 2 columns -->
    <div><h2>Heading placeholder</h2><p>Short paragraph.</p></div>
    <div aria-label="5 stars"><!-- 5 solid green stars --></div>
  </header>
  <div><!-- 3 columns, row of decorative dots above -->
    <figure><!-- white, 1px border; avatar 115px circle overlapping top edge, left aligned -->
      <img alt="Client headshot">
      <blockquote>"Quote placeholder, about seven lines."</blockquote>
      <figcaption><strong>Client name</strong><!-- serif bold + 30px green rule inline --> <span>Company</span></figcaption>
    </figure>
  </div>
  <a>Primary action</a><!-- centred -->
</section>
```

```html
<!-- Contact: 40/60 grid, details left, white form card right with dot grid behind -->
<section><!-- #f0f0f3 -->
  <div>
    <h2>Heading placeholder</h2>
    <p>One sentence.</p>
    <ul><li><!-- 26px navy circle icon --> Phone</li><li>Phone</li><li>Email</li></ul>
  </div>
  <form><!-- white card, soft shadow, about 48px padding -->
    <div><!-- 2 per row -->
      <label>FIRST NAME<input placeholder="Placeholder"></label><!-- bottom border only -->
      <label>LAST NAME<input></label>
    </div>
    <div><label>PHONE<input></label><label>EMAIL<input></label></div>
    <label>MESSAGE<textarea></textarea></label>
    <button>Send message</button><!-- green, not full width -->
  </form>
</section>
```

```html
<!-- Practice page topic block: heading, short intro, stacked navy accordion bars -->
<section>
  <h2>Topic heading</h2>
  <p>Short intro, about 460px wide.</p>
  <details><!-- full width, #0c173f, about 80px tall, 20px gap -->
    <summary><img alt=""><!-- 30px white outline icon --> Topic label</summary>
    <p>Collapsed answer text.</p>
  </details>
  <!-- repeat 2 to 5 times -->
</section>
```

```html
<!-- Pre-footer green band overlapping the navy footer -->
<footer>
  <div><!-- #00c27f, building photo blended at right, flush left, stops about 5% short of right edge, overlaps navy below -->
    <div><h2>Closing heading</h2><p>One sentence.</p></div>
    <a>Primary action</a><!-- #150341 fill, 2px tracking -->
  </div>
  <div><!-- #0c173f, grid 56/13/31 -->
    <div><img alt="Logo"><small>DISCLAIMER</small><p>Short legal note.</p><!-- 4 green outlined circle social icons --></div>
    <nav><small>EXPLORE</small><a>Link</a><a>Link</a><a>Link</a><a>Privacy</a><a>Terms</a></nav>
    <div><small>CONNECT</small><a>email</a><a>phone</a><a>phone</a><!-- green --></div>
  </div>
  <div><!-- 1px divider, then copyright left, credit right --></div>
</footer>
```

## 13. Dos and don'ts
- **Do:** pair Playfair Display at weight 400 and 64 to 68px with Montserrat at weight 200; the thinness of the body text is part of the identity.
- **Do:** put a 44px green rule above or beside every section heading, and use green for nothing except actions, links, rules, stars and footer contact details.
- **Do:** keep every corner square: buttons, cards, form card, panels, images. Only headshots and icon circles are round.
- **Do:** break the grid with offset panels: the logo strip overlapping the hero, the navy CTA panel inset from the left and bleeding off the right, the green footer band stopping short of the right edge and overlapping the navy footer.
- **Do:** alternate white, #f0f0f3 and #0c173f bands so no two neighbours share a background.
- **Do:** tint every hero photo heavily in navy so it reads as texture, and use architecture shots for inner-page heroes.
- **Do:** repeat the consult button after nearly every block, always in the same green, square, uppercase style.
- **Do:** add the alternating navy and green dot grid behind the corner of key photos and the form card.
- **Don't:** use bold or semi-bold serif headings at H1 or H2 size; they are regular weight.
- **Don't:** round the buttons or turn them into pills, and don't add icons inside them.
- **Don't:** add a second accent colour; the indigo #150341 appears only as the dark button on green and the metric numbers.
- **Don't:** centre-align the main heading blocks; they are left aligned, except inside the navy CTA panels on practice pages and the inner-page hero H1.
- **Don't:** box the form inputs; they are bottom-border only.
- **Don't:** put cards on coloured tiles or give icons coloured background squares.
- **AI-look traps:** a purple-to-blue gradient hero or glassy gradient buttons (use the flat navy overlay and flat green). Generic three-feature rows with emoji or filled icon tiles (use bordered square cards with thin line icons and a green rule). Pill-shaped tag chips and "trusted by" badges (use the real logo strip panel). Rounded 16px cards with large shadows (use square cards, 1px border, faint shadow). Heavy 600 to 700 body text (keep body at 200). Buzzword headlines; keep headings plain and short, in title case.
