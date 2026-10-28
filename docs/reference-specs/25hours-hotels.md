# 25hours Hotels: reference spec

> Source: https://25hours-hotels.com/ · Crawled 2026-10-27 at 390, 768, 1280 and 1920 px · Category: Fun & Animation Heavy · Pages crawled: 8

## 1. Overview
25hours is a group of design hotels (part of Ennismore) with a booking-led brand site. The design is a paper collage: every band is a flat colour field with a visible woven-paper texture, and on top of it sit cut-out photographs of real objects (a globe, a cassette, a typewriter, a megaphone, a ferry), tilted photos with thick black frames, polaroids, graph-paper sheets and strips of coloured tape carrying the headline. Type is one family only, a condensed Trade Gothic, set lowercase and very large, sometimes as hollow outlined text that runs off both edges. Interaction is pill-shaped and outlined in 2px black with an acid lime fill. The recognisable trio: tape-label headlines at an angle, outlined repeating giant words, and colour bands that change every section (teal, pale blue, olive, purple).

## 2. Pages and navigation
| Page | Path | Purpose |
|---|---|---|
| Home | / | Brand collage hero, city reveal, booking bar, restaurants slider, offers slider, community, careers, magazine, newsletter |
| About Us | /about-us | Brand story, video, values carousel, team grid, contact block |
| Gift Vouchers | /gift-vouchers | Collage hero plus two-column voucher information |
| FAQ | /faqs | Collage hero, hotel selector, accordion list |
| Direct Booking Benefits | /direct-booking-benefits | Photo hero plus a centred list of benefits |
| Home (Deutsch) | /de | German homepage, photo-hero variant |
| Home (Français) | /fr | French homepage, photo-hero variant |
| Home (Italiano) | /it | Italian homepage, photo-hero variant |

- Main navigation at laptop, left to right: logo, a 1px vertical divider, "+ Select Location" (opens the hotel picker), then right-aligned: About Us, Gift Vouchers, Magazine, FAQ, Offers, Direct Booking Benefits, a language switcher showing "English" with a chevron (items English, Deutsch, Français, Italiano, Dansk), and the "Find a room" lime pill.
- Reachable only from the footer: Manage booking, Dis-loyalty, News & Press, Contact, 25hours People, Development, Terms & Policies, Imprint, Cookie Policy, Cookie settings, Accessibility.
- Primary call to action: "Find a room" in the header and "Check Availability" at the end of the booking bar, both into the room search. Inner pages also use "Book now" lime pills.

## 3. Header
- **Phone 390:** fixed, 66px, split 32/68. Logo (circle-flower mark plus "25h") left; right side a lime "Find a room" pill and a three-line hamburger icon (about 36px wide, thin lines). Transparent over the teal hero in the capture; the crawl reports a black #000000 background with white text once scrolled. How the menu opens was not measured.
- **Tablet 768:** same as phone (logo left, pill plus hamburger right), 66px, split 32/68.
- **Laptop 1280:** fixed, 66px, split 31/69. Logo about 105px wide at the 32px gutter, a full-height 1px black divider, then "+ Select Location" in Trade Gothic about 20px. Right side: 7 links in Trade Gothic bold about 14px, 16px apart, then the "Find a room" pill (#bccf00, 2px solid #000000, radius 999px, padding 5px 22px, 14px weight 700). On the globe-hero homepage the header is transparent with black text over teal. On the photo-hero homepage variant it is solid #000000 with white links.
- **Large 1920:** same as laptop, solid #000000 with white text in the capture, contents held to a centred band about 1320px wide (logo near x=300, pill ends near x=1617).
- **Inner pages, all widths:** a 28px black #000000 breadcrumb strip sits above the header ("Home / Page", 14px, white, current page at 50% white). Header plus strip measure 94px. The header itself stays transparent over the page colour.
- The header carries a "scrolling down" state class, so it reacts to scroll direction; the exact hide or show behaviour was not measured.

## 4. Footer
- Height 517px at 1280, 528px at 1920, 503px at 390. Background off-white paper texture (sampled #f8f8f8), no dark footer, no social icons, no newsletter (that is a separate band above).
- Laptop: 2 columns 44/56 (64/36 at 1920). Left: the full logo lockup (flower mark, "25h", "twenty five hours hotels", small tagline) at about 210px wide, starting about 64px from the left. Right: two plain link lists side by side, 6 and 5 links, Trade Gothic about 14px, 32px line spacing, no headings.
- Bottom right row: the parent-group wordmark in outline style plus "© Ennismore <year>" at about 12px.
- About 120px of empty textured space above and below the content.
- Phone: logo lockup on top, then the two link lists side by side in 2 columns, then the group wordmark and copyright left-aligned.

## 5. Page layouts

### Home, globe variant (English at 390, 768 and 1280)

**1. Collage globe hero**
- Layout: 800px (one viewport) tall, no grid. A sticky globe sits in the centre (wrapper 685px tall, 53% of the width) and stays pinned while the next section scrolls under it.
- Content: H1 on two lines, Trade Gothic 700, 90.57px, lowercase, set on two overlapping strips of mustard paper tape (sampled #d1942f) rotated about minus 8 degrees, top-left from about x=55 to 615. A photographic globe (about 420px) in the centre with a small lime "Spin It" pill (with a tiny icon) below it. Cut-out photo objects with soft drop shadows: a cassette tape tilted bottom-left, a person in sunglasses sitting on a silver suitcase bottom-right.
- Background: teal #5ea893 with a fine woven paper texture.
- Phone: tape headline 40px top-left; globe below, cropped by the viewport edge; Spin It pill centred on the globe.

**2. City reveal**
- Layout: 734px, same teal, free placement. Left 60%: two cut-out cloud images and a stencil-lettered city name on a dusty pink tape strip (sampled #af857a) rotated about minus 6 degrees. Right column about 310px wide starting near x=918.
- Content: a photo in a thick black frame (about 4px) rotated about minus 5 degrees; a bold 20px line with the city name and its coordinates; a 4-line paragraph (20px, weight 400); one or two white pill buttons stacked (white fill, 2px black border, 14px bold).
- Background: #5ea893. The city changes with each spin (Copenhagen in the laptop capture, Munich on phone).
- Phone: tape label and framed photo share the top, clouds float, text block and pill centred at the bottom.

**3. Neon sign band**
- Layout: 338px, a single centred image about 890px wide.
- Content: a pink neon script sign mounted on a white die-cut sticker with a soft shadow. It is artwork, not live text.
- Background: teal #49bcae with a dot texture.
- Phone: 187px, the sign spans the full width.

**4. Booking bar**
- Layout: 125px, 2 parts 83/17. Left: one white pill (about 985 x 60px, 2px black border, fully rounded) cut into 4 equal segments by 2px black dividers: Location (select with chevron), Dates, Rooms and Guests (with a small "edit" link), Code. Each segment has a 14px label over a grey #8d8c8c placeholder. Right: lime "Check Availability" pill (20px weight 700, padding 5px 32px, about 195 x 60px).
- Background: #49bcae.
- Phone: collapses to a 64px band (fields hidden behind a trigger; not measured further).

**5. Restaurants and bars slider**
- Layout: 734px, full bleed, 6 slides. Centred stack: kicker, one-line H2, then a cut-out food or drink photo (no frame, about 220 x 440px) in the centre with 3 white city pills stacked to its right, and a 2-line bold paragraph centred near the bottom. Round white arrow buttons (50px, 2px black border, thin chevron) at the far left and right edges, vertically centred.
- Content: H4 kicker 31.4px, H2 90.57px; scattered small cut-out garnishes (mint sprig, popcorn) around the dish.
- Background: a photographed gingham tablecloth, peach and white (sampled #eca77e, #f1c2a7 and #f2f2f2), 60px checks.
- Phone: H2 60.4px over 3 lines, dish photo full width, a single city pill under it, arrows overlap the photo edges.

**6. Offers slider with outlined marquee**
- Layout: 1039px. Top: one line of the word "offers." repeated as hollow outlined text (H1 181.7px, transparent fill, 1px black stroke) running past both edges. A cut-out halftone megaphone held by a hand, with three magenta zigzag "noise" strokes, overlaps the left end of the word. Below: a 2-column slide, about 55/45: a photo (about 700 x 450px) in a 6px black frame rotated about minus 4 degrees on the left; text column (400px) on the right.
- Content: H3 51px lowercase, hotel name 20px, a 4-line paragraph 20px weight 400, two rows with thin line icons (calendar, price tag) and 20px text, a "More Info →" text link. Centred under the slide: a counter pill (white, 2px black border, about 120 x 44px) holding a left chevron, "1 / 6" and a right chevron.
- Background: pale blue #e5f2f9 with dot texture.
- Phone: marquee at 80px, photo stacked above the text, counter pill centred.

**7. Community collage**
- Layout: a 329px heading block, then a 494px collage band that is wider than the viewport (106%).
- Content: H2 146.3px centred lowercase, one bold 28px line, lime pill. The collage: three unframed photos at different sizes and angles (minus 10 to plus 10 degrees), one bleeding off the left edge and one off the right, a small one in the middle, and a black line-drawing tree character overlapping the right photo.
- Background: textured paper white (#ffffff, renders about #f6f6f6).
- Phone: H2 70px over 2 lines; photos stack into an overlapping pile.

**8. Careers band**
- Layout: 1105px. Outlined marquee ("join the tribe." repeated, 181.7px), a centred bold 20px line, a lime pill with an up-right arrow icon, then a carousel of department cards: photos about 305 x 230px with a soft shadow, set at staggered heights (some 340px tall), each with a 20px label under it. A large cut-out black "my name is" button badge (about 300px) overlaps the left edge. Round arrow buttons at both edges.
- Background: olive #a6bb64 with dot texture.
- Phone: marquee 80px; one card at a time.

**9. Magazine feature**
- Layout: 706px, 2 columns about 45/55. Left: the printed magazine cover as a slightly crumpled paper object, about 470 x 640px, tilted about 2 degrees. Right: centred text column.
- Content: H2 51px (title case here), a 3-line bold paragraph about 20px, lime pill.
- Background: purple #9079ae with dot texture.
- Phone: cover on top full width, text centred below.

**10. Newsletter**
- Layout: 362px, 3-column grid. Left third and a half: H2 "newsletter" 146.3px lowercase, under it three small prints (two with white polaroid borders, one plain) tilted at slightly different angles. Right: a 2-line 20px intro, a segmented pill of 3 inputs (First name, E-mail, interest select) with 2px black borders, a square checkbox with a privacy line, and a centred lime "Subscribe" pill (20px bold).
- Background: #e5f2f9 with noise texture.
- Phone: H2 70px, photos in a row, inputs stacked as 3 separate full-width pills.

**11. Footer.** As section 4.

### Home, photo variant (English at 1920; /de, /fr and /it at every width)
- **1. Photo hero with booking bar:** full-bleed lifestyle photograph (a guest on a four-poster bed in a sunlit room), 736px at 1280 and 994px at 1920, under a solid black header. The booking bar from Home section 4 sits over the bottom of the photo (split 80/20 at 1280, 85/15 at 1920, 58/42 at 390).
- **2 onward:** same as Home sections 5 to 11 in the same order. The globe hero, city reveal and neon sign band are absent.

### About Us
1. **Title with cut-out object** (407px, paper white): H1 181.7px lowercase centred, a cut-out vintage typewriter overlapping the right end of the word, a 2-line centred intro paragraph (20px, weight 400) partly covered by the typewriter.
2. **Video** (615px): one embedded video player about 1094 x 615px, centred, no frame.
3. **Statement** (510px, 3 columns 35/30/35): H3 51px over 5 lines in the left column, middle column empty, a paragraph in the right column aligned to its bottom.
4. **Outlined marquee with graph-paper photo** (896px, #e5f2f9): hollow repeating headline (181.7px) with a cut-out seedling in soil over its left end; below, a photo laid on a white graph-paper sheet that is rotated about minus 3 degrees and bleeds off the left edge; right column: H3 31.4px, 4-line paragraph, "Find out more →".
5. **Mission heading** (237px): H3 51px, 2 lines, centred.
6. **Values carousel** (825px, 8 slides): the centre slide is a black-and-white photo on a tilted graph-paper sheet, neighbouring slides peek in greyscale at both edges, round arrow buttons at the edges; under the centre: a lowercase H3 31.4px statement and a 3-line paragraph.
7. **Team grid** (1334px): H2 181.7px "our team", centred intro line, a pill select filter (300 x 60px, 2px border), then 4 columns of polaroid cards (white frame, deeper bottom margin, soft shadow, about 268 x 325px) holding black-and-white studio portraits on black; under each card the name (20px bold) and role (14px). A white "Load More" pill (20px bold) centred.
8. **Contact block on graph paper** (604px, sage #9da47e with a dark 130px grid): a cut-out ferry boat breaks out of the band top-left, H2 90.57px right-aligned, then 2 columns 50/50: building photo in a 4px black frame left; two white boxes (1px black border) side by side right, each with an H4 31.4px and small 14px text.
9. **Footer.**

### Gift Vouchers
1. **Collage title hero** (800px of the 1619px main, #e5f2f9): H1 181.7px over 2 lines flush to the left edge (x=0), lower half of the band; right half a collage: a polaroid photo tilted about plus 5 degrees, a larger photo in a 6px black frame tilted about plus 4 degrees overlapping it, and a cut-out vintage camera overlapping the frame's lower left.
2. **Two-column information** (paper white, 3 columns 35/30/35 with the middle empty): left an H3 51px, paragraphs with bold inline city names, a lime pill (20px bold), a bold question, a lime pill with an up-right arrow; right a paragraph, a bullet list, and two bold 20px links each followed by an up-right arrow.
3. **Footer.**

### FAQ
1. **Collage title hero** (800px, #e5f2f9): same as Gift Vouchers 1, with a cut-out red notebook and pen instead of the camera.
2. **Hotel selector** (220px, paper white): a centred bold line, then a full-width select pill (2px black border, radius 999px, 60px tall, chevron right).
3. **Accordion** (2300px): H2 51px uppercase, an H3 31.4px category heading, then rows 120px tall separated by 2px black rules, question in Trade Gothic bold about 28px on the left, a thin plus icon on the right. Several category groups follow the same pattern.
4. **Newsletter.** Same as Home section 10.
5. **Footer.**
- The phone capture of this page failed.

### Direct Booking Benefits
1. **Photo title hero** (800px): full-bleed dark interior photograph, centred white stack: a 20px kicker, H1 90.57px, lime "Book now" pill (20px bold).
2. **Benefits list** (768px, paper white): a single centred column 540px wide: H1 51px, intro paragraph, then 6 pairs of a bold 20px line plus a 1 to 2 line paragraph, and one underlined text link.
3. **Newsletter.** Same as Home section 10.
4. **Footer.**

## 6. Responsive behaviour
| Breakpoint | Header | Grid columns | Hero | Type changes | Other changes |
|---|---|---|---|---|---|
| 390 | 66px: logo, "Find a room" pill, hamburger (plus 28px breadcrumb strip inside) | Everything single column; team grid 1 card per row; footer links 2 columns | Globe hero 844px: tape H1 40px, globe below | Page H1 80px; outline marquee 80px; section H2 70px; slider H2 60.4px; H3 35.3px; H4 28.3px; body stays 20px | Booking bar collapses to 64px; newsletter inputs stack; collages pile up |
| 768 | Same as phone | Careers 4 columns over 2 rows; newsletter 3-column grid | Globe hero 1024px | Page H1 123.2px | Values and offers sliders show one slide |
| 1280 | Full links, divider, "Select Location", pill | Team 4; statement 35/30/35; contact 50/50 | Globe hero 800px, or photo hero 736px | Page H1 181.7px; home H1 90.57px; H3 51.1px | Collage bands overflow to 106% width |
| 1920 | Black, contents in about 1320px | Same as laptop; footer 64/36 | Photo hero 994px with booking bar | Page H1 and marquee 200px; section H2 160px; slider H2 96px; H3 54px; H4 32px | Body text stays 20px |

- Maximum content width: 1220px at 1280 (32px side padding), about 1320px at 1920. Text columns are narrow: 310px (city text), 400px (offer text), 540px (benefits list).
- Side padding: about 32px at 1280, about 20px at 390. Some headings (Gift Vouchers, FAQ titles) sit flush at x=0.
- Sideways: outlined marquee words and collage photos run past the viewport edges by design; measured page overflow is 0 at every width.

## 7. Motion and interaction
- Libraries: no GSAP, ScrollTrigger, Lenis, Locomotive, Framer or Lottie detected. No background video; one embedded video player on About Us.
- Sticky globe: the globe and its "Spin It" pill are sticky inside the hero and stay pinned while the city reveal scrolls under them. Clicking "Spin It" spins the globe and swaps the city block (a different city appeared in each capture).
- Carousels: 62 to 71 slider elements per page. Restaurants slider (6 slides, round edge arrows), offers slider (counter pill "1 / 6"), careers carousel, values carousel with peeking greyscale neighbours. The starting slide varies between visits.
- Scroll reveals: 11 elements hidden at load on the homepage and still hidden after a scroll pass (careers card photos rendered blank in the capture, which suggests lazy or reveal-on-view loading).
- 9 CSS-animated elements on the homepage and 72 to 103 elements with CSS transitions per page (pills, arrows, accordion). Whether the outlined marquee words actually scroll sideways was not measured.
- Header: fixed, with a scroll-direction state.
- Accordions on FAQ open with a plus icon toggle.

## 8. Colour
| Role | Hex | Where it is used |
|---|---|---|
| Page background (paper) | #ffffff with grain, renders about #f6f6f6 | Inner page bodies, community block, about sections |
| Footer surface | #f8f8f8 (sampled) | Footer |
| Hero teal | #5ea893 | Globe hero and city reveal |
| Booking teal | #49bcae | Neon sign band and booking bar band |
| Pale blue | #e5f2f9 | Offers, newsletter, Gift Vouchers and FAQ heroes |
| Olive | #a6bb64 | Careers band |
| Purple | #9079ae | Magazine band |
| Sage | #9da47e | Contact block with grid lines |
| Primary text, borders, frames | #000000 | All text, 2px pill borders, photo frames, rules, breadcrumb strip, header in photo variant |
| Muted text | #8d8c8c | Input placeholders |
| Primary button | #bccf00 | "Find a room", "Check Availability", "Spin It", all lime pills |
| Secondary button | #ffffff | City pills, "Load More", arrow buttons, counter pill |
| Tape label | about #d1942f (sampled); JSON also lists #f9b038 | Hero headline tape |
| City label tape | about #af857a (sampled) | Stencil city name |
| Gingham | about #eca77e and #f1c2a7 on #f2f2f2 (sampled) | Restaurant slider background image |
| Phone-only teal | #318691 | Reported in the phone homepage colours, element not identified |
| Dark sections | #000000 | Only the header strip and photo heroes; no black content bands |

## 9. Typography
| Level | Family | Weight | Size (laptop) | Size (phone) | Line height | Letter spacing | Case |
|---|---|---|---|---|---|---|---|
| Page title H1 | Trade Gothic (condensed cut as rendered) | 700 | 181.7px (200px at 1920) | 80px | 0.9 (163.5px) | -4px | lowercase |
| Home H1 on tape | Trade Gothic | 700 | 90.57px | 40px | 1.1 (99.6px) | -2px (normal on phone) | lowercase |
| Outline marquee H2 | Trade Gothic | 700 | 181.7px | 80px | 218px | -4px | lowercase, transparent fill, 1px black stroke |
| Section H2 | Trade Gothic | 700 | 146.3px (160px at 1920) | 70px | not measured | not measured | lowercase |
| Slider H2 | Trade Gothic | 700 | 90.57px (96px at 1920) | 60.4px | 1.1; 54.3px phone | -2px | lowercase |
| H3 | Trade Gothic | 700 | 51.1px | 35.3px | 61.4px; 42.3px phone | -1px | lowercase sentence |
| H4 kicker | Trade Gothic | 700 | 31.4px | 28.3px | not measured | not measured | lowercase |
| Body | Trade Gothic | 400 (700 for lead lines) | 20px | 20px (14px for the city coordinate line) | 24px | normal | Sentence |
| Small labels | Trade Gothic | 400 | 14px | 14px | 14px | normal | Sentence (breadcrumb, roles, footer links) |
| Navigation links | Trade Gothic | 700 (visual) | about 14px (not measured directly); "Select Location" about 20px | hidden | not measured | normal | Title case |
| Buttons | Trade Gothic | 700 | 14px small pill, 20px large pill | same | 14px small | normal | Sentence |

- One family only. Headlines are lowercase and very tight; body copy is a light-looking regular weight of the same condensed face, so text columns stay narrow.
- Stencil city names, the neon "Book Now" script and the "my name is" badge lettering are images, not fonts. Open Sans 400 also loads, used only by the third-party cookie dialog.

## 10. Imagery and icons
- Cut-out objects: real photographed objects with their backgrounds removed and a soft drop shadow (globe, cassette tape, suitcase with model, clouds, typewriter, vintage camera, red notebook, megaphone, seedling in soil, ferry boat, garnishes). They overlap headlines and photo edges.
- Framed photos: candid, warm, slightly flash-lit lifestyle shots of guests in rooms and bars, with a thick black frame (4 to 6px) and rotated 3 to 8 degrees.
- Polaroids and prints: small photos with a white border, deeper at the bottom, tilted, in loose piles.
- Graph-paper sheets: white sheets with grey grid lines, tilted, used as mounts behind photos.
- Tape strips: rough-edged paper tape in mustard or dusty pink carrying a headline or stencil city name.
- Black-and-white portraits on black for the team; black-and-white for the values carousel.
- Line drawings: occasional black hand-drawn characters (a tree with a face).
- Icons: thin black line icons (calendar, price tag, chevrons, plus, up-right arrows). Round 50px arrow buttons.
- Textures: every colour band carries a fine woven or dotted paper grain.
- Not used: gradients, glassmorphism, rounded image corners, icon grids, illustrations in colour, stock business photos, emoji, drop shadows on text.

## 11. Components
- **Primary pill:** #bccf00 fill, #000000 text, 2px solid #000000 border, radius 999px. Small: 14px weight 700, padding 5px 22px, about 40px tall. Large: 20px weight 700, padding 5px 32px, about 60px tall. Optional trailing icon (up-right arrow, small globe).
- **Secondary pill:** same with #ffffff fill.
- **Round arrow button:** 50px white circle, 2px black border, thin chevron, placed at the viewport edges of sliders.
- **Counter pill:** white, 2px border, left chevron, "1 / N" in 14px bold, right chevron.
- **Segmented field pill:** one white pill split into equal segments by 2px black dividers; each segment holds a 14px label above a grey placeholder; a chevron on selects.
- **Select pill:** full width or 300px, 2px border, 60px tall, chevron at the right.
- **Accordion row:** 120px, 2px black rule above and below, bold question left, thin plus right.
- **Framed photo:** 4 to 6px solid black border, rotated, no radius.
- **Polaroid card:** white frame with a deeper bottom edge, soft shadow, name and role printed under it in black.
- **Info box:** white, 1px black border, square corners, H4 plus small text.
- **Text links:** bold 20px with a trailing arrow (→ or ↗), or underlined small text.
- **Checkbox:** square 20px, 2px black border.
- **Breadcrumb strip:** 28px black bar, 14px white text, current page at 50% white.

## 12. Section skeletons

```html
<!-- Collage globe hero: teal paper, tape headline, sticky globe, cut-out objects -->
<section><!-- 100vh, #5ea893 with paper grain -->
  <h1><!-- two strips of mustard tape, rotated -8deg, top-left -->
    <span>first line,</span>
    <span>second line.</span> <!-- Trade Gothic 700, 90px, lowercase -->
  </h1>
  <div><!-- sticky, centred, about 53% wide -->
    <img alt=""> <!-- photographic globe cut-out -->
    <button>Spin it</button> <!-- small lime pill, 2px black border -->
  </div>
  <img alt=""> <!-- cut-out object, bottom-left, tilted, soft shadow -->
  <img alt=""> <!-- cut-out person with luggage, bottom-right -->
</section>
```

```html
<!-- City reveal: stencil label on tape left, framed tilted photo and text right -->
<section><!-- 734px, same teal -->
  <img alt=""><img alt=""> <!-- cut-out clouds, scattered -->
  <p><!-- stencil city name artwork on dusty pink tape, rotated -6deg --></p>
  <aside><!-- right column, 310px -->
    <img alt=""> <!-- 4px black frame, rotated -5deg -->
    <p><b>City | coordinates</b></p>
    <p>Four lines about the city.</p>
    <a>Explore hotel</a> <!-- white pill, 2px black border -->
  </aside>
</section>
```

```html
<!-- Booking bar: one segmented white pill plus a lime action pill -->
<form><!-- band #49bcae, 125px, split 83/17 -->
  <fieldset><!-- white pill, 2px black border, 4 equal segments split by 2px lines -->
    <label>Location<select></select></label>
    <label>Dates<input placeholder="Select your dates"></label>
    <label>Rooms and guests<output>1 room, 2 guests</output><a>edit</a></label>
    <label>Code<input placeholder="I have a code"></label>
  </fieldset>
  <button>Check availability</button> <!-- lime, 20px bold, 60px tall -->
</form>
```

```html
<!-- Restaurant slider on a gingham tablecloth -->
<section><!-- 734px, background image: peach and white checks -->
  <h4>kicker placeholder</h4> <!-- 31px -->
  <h2>one-line slide headline</h2> <!-- 90px, lowercase -->
  <img alt=""> <!-- cut-out dish or drink, centred, no frame -->
  <nav><a>City</a><a>City</a><a>City</a></nav> <!-- white pills stacked right of the dish -->
  <p><b>Two centred lines of description.</b></p>
  <button aria-label="Previous"></button><button aria-label="Next"></button> <!-- 50px circles at the viewport edges -->
</section>
```

```html
<!-- Outlined marquee plus framed offer slide -->
<section><!-- #e5f2f9 -->
  <h2 aria-label="offers"><!-- word repeated, 181px, transparent fill, 1px black stroke, runs off both edges --></h2>
  <img alt=""> <!-- cut-out halftone megaphone with magenta zigzags, overlapping the word's left end -->
  <article><!-- 2 columns about 55/45 -->
    <img alt=""> <!-- 6px black frame, rotated -4deg -->
    <div><!-- 400px -->
      <h3>offer title.</h3><p>Hotel name</p><p>Four lines.</p>
      <p><!-- calendar line icon --> Booking window</p>
      <p><!-- tag line icon --> Discount</p>
      <a>More info &rarr;</a>
    </div>
  </article>
  <nav><button></button><span>1 / 6</span><button></button></nav> <!-- counter pill -->
</section>
```

```html
<!-- Collage title hero for inner pages -->
<section><!-- 800px, #e5f2f9 -->
  <h1>page<br>title</h1> <!-- 181px, flush left at x=0, lower half -->
  <figure><!-- right half, overlapping pile -->
    <img alt=""> <!-- polaroid, white border, +5deg -->
    <img alt=""> <!-- larger photo, 6px black frame, +4deg -->
    <img alt=""> <!-- cut-out object overlapping the frame corner -->
  </figure>
</section>
```

```html
<!-- Team grid of polaroids -->
<section>
  <h2>our team</h2> <!-- 181px, centred -->
  <p>One centred line.</p>
  <select></select> <!-- 300px pill, 2px border -->
  <ul><!-- 4 columns, 48px gaps -->
    <li>
      <figure><img alt=""></figure> <!-- white polaroid frame, deep bottom margin, soft shadow, b/w portrait on black -->
      <h3>Name</h3><p>Role</p> <!-- 20px bold, 14px -->
    </li>
  </ul>
  <button>Load more</button> <!-- white pill, 20px bold -->
</section>
```

```html
<!-- Newsletter band -->
<section><!-- #e5f2f9, 3-column grid -->
  <div>
    <h2>newsletter</h2> <!-- 146px -->
    <img alt=""><img alt=""><img alt=""> <!-- small tilted prints, two with polaroid borders -->
  </div>
  <form>
    <p>Two-line invitation.</p>
    <fieldset><input placeholder="First name*"><input placeholder="E-mail*"><select></select></fieldset> <!-- segmented pill -->
    <label><input type="checkbox"> Consent line with privacy link</label>
    <button>Subscribe</button> <!-- lime pill, centred -->
  </form>
</section>
```

## 13. Dos and don'ts
- **Do:** use one condensed grotesque for everything, set headlines lowercase, bold and enormous (180px titles at 1280), with tight negative tracking.
- **Do:** change the band colour section by section (teal, pale blue, paper white, olive, purple, sage) and give every band a visible paper grain.
- **Do:** put the hero headline on tilted strips of paper tape, and the city names on stencil-lettered tape.
- **Do:** treat photos as physical objects: thick black frames, polaroid borders, graph-paper mounts, all rotated a few degrees and overlapping.
- **Do:** add real cut-out objects with soft shadows that break across headline letters and section edges.
- **Do:** run one giant hollow outlined word, repeated, past both edges of the screen as a section opener.
- **Do:** keep every control a 2px black-outlined pill or circle, lime for the main action and white for the rest.
- **Don't:** round the corners of photos or cards; only buttons and inputs are rounded.
- **Don't:** use a second display font, a script font or a serif; the decorative lettering lives in images.
- **Don't:** use soft gradients, glassy overlays or pastel blurs over the flat colour bands.
- **Don't:** line photos up straight in a neat grid outside the team section; collage needs angle and overlap.
- **Don't:** use thin 1px outlines on buttons or fill buttons with brand teal; the lime and black pairing is the signal.
- **Don't:** add a dark footer or icon rows; the footer is quiet off-white with plain text links.
- **AI-look traps:** a centred hero with a gradient and a single rounded photo (use the collage with tape and cut-outs); three icon cards in a row for benefits (this site uses a plain centred list of bold lines); fake "sticker" emoji instead of photographed objects; random rotations on everything (tilt photos and tape, keep body text, pills and forms straight); glossy stock travel photography (use candid, flash-lit guest moments); colourful outline text (the outlined marquee is black stroke only); pill tags scattered as decoration (pills here are always real links or controls).
