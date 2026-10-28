# ATHA Hot Yoga: reference spec

> Source: https://www.athahotyoga.com/ · Crawled 2026-10-27 at 390, 768, 1280 and 1920 px · Category: Health & Yoga · Pages crawled: 8

## 1. Overview
ATHA Hot Yoga is a single hot yoga studio in Calgary that also sells teacher trainings and destination retreats, so the site mixes a studio timetable, a price list and long campaign-style retreat pages. The design is a soft, editorial Squarespace build: a warm cream page (#f9f7f4), a deep slate-plum (#4c4c5c) for dark bands and the footer, a pale sage (#dce3e0) for cards, and a dusty mauve (#a48b86) for every filled button. Three things make it recognisable: large light-weight Cormorant Garamond headlines over warm, close-cropped studio photography; all body copy set in light italic Libre Franklin with very loose line spacing; and gently curved (wave) edges between bands instead of straight cuts. Buttons are square-cornered rectangles, never pills.

## 2. Pages and navigation
| Page | Path | Purpose |
|---|---|---|
| Home | / | Hero, live class schedule, class styles teaser, philosophy statement, newsletter |
| About Us | /about | Studio story, four "pillars" cards, quote over photo, booking call to action |
| Class Styles | /classstyles | Accordion list of every class type flanked by portrait photos |
| Pricing | /pricing | Membership offers, pass cards, gift card band, philosophy call to action |
| Teacher training landing | /atha-method-level-1-online-level-2-in-costa-rica-july-2027 | Long sales page for a two-level teacher training (online plus Costa Rica) with pricing tables |
| Teacher retreat landing | /athacollectivecostaricayogateacherretreat | Sales page for a one-week retreat for yoga teachers |
| Panama retreat landing | /athabeyondthematpanama | Sales page for a public retreat with a day-by-day itinerary |
| Workshops | /workshops-transformations | Event list: image left, event details right |

- Main navigation, in order: Home · About Us · Class Styles · Pricing · Yoga Teacher Trainings & Retreats (dropdown: the teacher training page, the teacher retreat page, the Panama retreat page) · Workshops · Blog · Contact · What is ATHA International. After the links: a cart icon with an item count, then a "Book a Class" outline button. Blog and Contact were not crawled.
- At 1280 the links wrap onto two right-aligned rows (first row ends with the dropdown item, second row starts with Workshops). At 1920 they sit on one row.
- Footer-only links: none beyond About, Contact, Class Styles and Book a Class, which also exist in the header. The footer adds the street address, phone number, email and an Instagram icon.
- Primary call to action: "Book a Class" in the header on every page, repeated as filled mauve buttons at the end of About and Class Styles. Its destination was not captured. Pricing buttons say "Buy now"; retreat pages end with paired "secure your spot" deposit buttons (one per currency).

## 3. Header
- **Announcement bar (all widths, part of the design):** full-width strip above the header with one centred line of offer text in italic Libre Franklin 12.96px, letter spacing 0.7776px, mixing bold italic phrases and light italic phrases separated by pipes, ending with a "click here" link. A small close "×" sits at the far right. Background changes per page: cream #f9f7f4 on Home, Workshops and Pricing; sage #dce3e0 on About and Class Styles; slate #4c4c5c with white text on the retreat pages. Height about 48px at 1280 and 44px at 1920; it wraps to 2 lines at 768 and 4 lines at 390.
- **Header position:** absolutely positioned (not sticky), overlaying the hero photo with a transparent background. On the teacher retreat page, which opens on a cream band, the same header sits on cream with dark slate links and a mauve outline button.
- **Phone 390:** measured header block 236px including the 4-line announcement bar. Logo left (white wordmark "ATHA" in a heavy high-contrast display serif, a thin vertical rule, then "HOT / YOGA" stacked in a thin geometric sans). Right side: cart icon with count, then a two-line hamburger (two thin horizontal strokes, about 34px wide). No links or button visible. How the menu opens was not measured.
- **Tablet 768:** measured 239px including a 2-line announcement bar. Same as phone: logo left, cart and hamburger right, about 75px of padding above the logo row.
- **Laptop 1280:** measured 157px including the announcement bar. Logo at the left gutter (52px), about 250px wide. Nav links right-aligned in two rows, white, italic sans; the current page has a 1px white underline. Cart icon with "0" to the right of the links, then the "Book a Class" outline button (transparent, 1px #f9f7f4 border, square corners, padding 16px 20.8px, Poppins 500 16px, white text) at the right gutter.
- **Large 1920:** measured 171px. All nine links on one row, with the cart and button at the right. Logo at a 78px gutter.

## 4. Footer
- Background slate #4c4c5c, white text, no top border. Measured height: 264px at 1280, 356px at 1920, 338px at 768, 498px at 390.
- Laptop and tablet: one row on a 4-track grid. Track 1: the "ATHA" wordmark alone in white (about 130px wide at 1280). Track 2: address on two lines, then the phone number and email as underlined links. Track 3: a vertical list of four underlined links (About, Contact, Class Styles, Book a Class). Track 4: a single Instagram outline icon, right-aligned. All text is italic Libre Franklin, small, with tall line spacing. The address block starts at about 31% of the width and the link list at about 62%.
- Phone: the wordmark is centred and much larger (about 230px wide), the Instagram icon is centred beneath it, then two columns: address and contacts left, the four links right.
- No newsletter in the footer (the newsletter is a separate band above it on Home). No legal row, no copyright line, no payment or partner logos.

## 5. Page layouts

### Home (laptop page height 6054px)

**1. Full-bleed photo hero with curved bottom edge**
- Layout: one column, text block bottom-left at the 52px gutter, max width about 530px. The photo runs edge to edge from the top of the page (behind the announcement bar's lower edge and the header) to about 1110px. The bottom edge of the photo is a shallow concave wave: the cream band below rises higher on the left than on the right.
- Content: H1 (Cormorant Garamond 400, 62.08px, cream #f9f7f4, 3 lines), a serif paragraph set as H4 (25.216px, cream), then a text link with an underline in italic sans ("learn more about our why" type). No button in the hero.
- Background: a warm, desaturated studio photo of a woman in a deep side stretch, arms crossing the frame diagonally, on a pale grey wall. No overlay colour, the photo itself is light.
- Phone: hero starts under the 4-line announcement bar and is about 680px tall; H1 46.384px; paragraph and link stack below; the photo crop centres on the face.
- Large: the text block moves in to x = 260px and the H1 runs on 2 lines at 66.4px.

**2. Class schedule**
- Layout: H2 ("Schedule" type, 42.112px, slate #4c4c5c) at the left gutter, then an embedded booking widget centred in a column about 790px wide at 1280 (from x 245 to x 1035).
- Content: a centred time-zone pill, a tab pair (Classes / Semesters) with a week/month segmented toggle on the right, a 7-day date strip with round arrow buttons, two pill filter chips and two dropdowns (teachers, locations), then day groups. Each day group starts with an uppercase italic grey label ("TODAY", "TOMORROW", a dated label) and lists rows separated by 1px hairlines. Each row: time and duration with a clock icon, studio name with a pin icon (left, about 20% of the width); class name in Cormorant Garamond with a small round teacher avatar, teacher name in italic and a "Show bio" link (middle); a small rounded grey "Book now" button (#70707d fill, white bold italic text) at the right. Pagination with round arrows below, then a tiny "powered by" credit.
- Background: cream #f9f7f4.
- Phone: the widget fills the width with 24px gutters; the time/location line moves under the class name and the button sits to the right of it.
- Note: this is a third-party booking embed; its pill-shaped controls (radius 100px) are the only rounded controls on the site.

**3. Class styles teaser on a dark band**
- Layout: a slate band about 950px tall with a curved top edge (rising from left to right) and a curved bottom edge. H2 left-aligned at the gutter, then a row of 3 equal square photo tiles with 8px gaps spanning the full content width (each about 386px square at 1280), then a serif paragraph (Cormorant, about 2 lines) and an outline button at the left.
- Content: each tile has a single word or short label centred on the photo in Cormorant Garamond (H3, 34.432px, cream). Button: transparent, 1px #f9f7f4 border, uppercase Poppins 500, square corners, about 235px wide.
- Background: #4c4c5c.
- Phone: tiles stack into 3 full-width landscape strips (about 120px tall each) with 8px gaps; the paragraph runs larger and the button becomes full width.

**4. Philosophy statement with side link**
- Layout: 2 columns, about 62/38. Left: a 3-line serif statement in Cormorant (about 30px, slate). Right: two lines of small italic sans and a mauve outline button below ("Learn more" type: transparent, 1px #a48b86 border, mauve text, Poppins 500, square).
- Background: cream. Height about 270px.
- Phone: the statement comes first at a larger relative size, the side text and button stack below it.

**5. Newsletter over photo**
- Layout: a full-bleed photo band about 720px tall whose top edge is a wave (cream above dips over the photo). Centred content: H-level serif title in cream (about 30px), a one-line italic subtitle, then one row of 3 white inputs (first name, last name, email, each about 280px wide, square, no visible border, italic grey placeholder) and a mauve "Subscribe" button (#a48b86, white uppercase, square) of equal height.
- Background: dim studio photo of a class in a forward fold, darkened enough for white text.
- Phone: title wraps to 2 lines, inputs stack full width, the button is centred below.

**6. Footer** (see section 4).

### About Us (laptop page height 4376px; phone not captured)
**1. Short photo header:** full-bleed photo strip about 390px tall (the header overlays it). H1 "About" type bottom-left in cream Cormorant 62.08px. Photo: a class in plank, dark and moody.
**2. Story split on slate:** slate #4c4c5c band about 640px tall. 2 columns 50/50: a near-square photo on the left (about 530px wide), on the right an H4 in Cormorant (25.216px, cream) and one long italic sans paragraph in cream with tall line spacing, vertically centred. The band ends with a convex curve: the cream below bulges up in the middle.
**3. Pillars grid:** centred H2 in slate, then a 2x2 grid of sage #dce3e0 cards (each about 580px wide, 12px gaps). Each card: H2-level serif title (28.288px), an italic paragraph, and in one card a landscape photo. Cards keep equal heights per row, leaving large empty sage areas under short text.
**4. Quote over photo:** full-bleed dark photo about 760px tall with a centred 3-line serif quote in cream Cormorant (about 30px), with curly quotes.
**5. Closing call to action:** cream band about 350px. Centred serif line (about 30px, slate) and a filled mauve button "Book a class today" type (uppercase, about 285 x 60px).
**6. Footer.**

### Class Styles (laptop page height 2654px)
**1. Short photo header:** same as About section 1 (child's pose class photo), H1 bottom-left.
**2. Accordion between portrait photos:** 3 columns, about 22/41/22 with gaps (left photos x 52 to 336, accordion x 398 to 882, right photos x 944 to 1228). Centre: an H3 serif intro (34.432px, centred, 2 lines), a short centred italic paragraph, then an accordion of 13 rows. Each row: class name in Cormorant (about 22px, slate) with a thin chevron at the right, 1px slate rule above and below. Left and right columns: tall portrait photos with rounded corners (about 12px), staggered vertically (left column starts at the top, right column starts about 290px lower).
**3. Booking band:** sage #dce3e0 band about 540px. Centred H2, a 4-line centred italic paragraph (max about 780px), and a filled mauve button (about 285 x 60px).
**4. Footer.**
- Phone: photos and accordion stack into one column (not inspected in detail).

### Pricing (laptop page height 4642px)
**1. Short photo header:** photo strip about 470px tall; here the H1 sits bottom-right.
**2. Two featured offers:** 2 columns 50/50 on cream, each column inset (text column about 430px wide). Each: H2 serif (42.112px, 2 lines), a price in Cormorant uppercase with a hand-drawn oval circling it (a sketchy grey ring around the price text), an italic paragraph, and a filled mauve button (uppercase, about 285 x 60px).
**3. Pass cards:** a 3-column grid of sage cards (each about 335px wide, 10px gaps, grid left-aligned and only 3 tracks wide so the second row of 2 leaves the third slot empty). Card: serif H3 title (2 lines), the price with a hand-drawn underline stroke, italic paragraph, filled mauve "Buy now" button (about 237 x 60px) at the bottom. Cards in a row share a height.
**4. Gift card band:** full-width sage band about 830px tall with a serif heading near its bottom-left; the area above it was empty in the capture (an image or embed did not render). Its bottom edge is a wave into cream.
**5. Philosophy call to action:** centred: small italic underlined eyebrow label, a 2-line serif heading (about 46px), and a wide outline button (mauve 1px border, mauve text, about 385px wide).
**6. Photo strip:** full-bleed class photo about 280px tall directly above the footer.
**7. Footer.**
- Phone: everything stacks to one column; pass cards become full-width sage cards with 24px inner padding.

### Teacher training landing (laptop page height 11326px)
A long campaign page built from the same tokens, with more decorative type. Sections in order:
1. Full-bleed landscape hero (about 1100px): misty river and rocks photo with a seated meditating figure; a right-aligned text stack in cream: serif wordmark, letter-spaced subtitle, bold italic sans lines for programme name, dates and venue separated by a thin white rule, then a 3-line serif tagline.
2. Intro split on cream: left column (about 30%) with an uppercase italic eyebrow, an uppercase Cormorant heading on 4 lines and a short paragraph; right side three small portrait photo cards (about 85 x 130px) in black and white with centred uppercase captions.
3. Journey band on white #ffffff: centred mauve eyebrow, a mauve uppercase H3 (34.432px, colour #a48b86), a centred paragraph, then two "level" blocks side by side joined by a large "+" sign, each with a mauve bold italic label, uppercase serif title and a portrait photo; then a row of 4 thin line-art icons (lotus, people, dots, leaf) with uppercase letter-spaced captions.
4. Level one block on cream: centred serif heading, a 3-column media row (a mosaic of course thumbnails, a portrait photo, a laptop photo; photos with about 8px rounded corners), then 3 numbered feature columns ("01 /" style serif headings with italic paragraphs).
5. Full-bleed jungle shala photo (about 590px) with a right-aligned 2-line serif title in cream.
6. Three centred serif lines on cream, then a sage band with 4 feature columns: a numeral or line icon on top, uppercase letter-spaced italic title, small centred paragraph.
7. Split on cream: uppercase serif heading with a short rule beneath, two italic paragraphs (left, about 35%), a tall photo with rounded corners (right, about 40%).
8. Sage band: uppercase serif heading left, italic eyebrow right, one photo, then 4 text columns (uppercase serif title and paragraph).
9. Location block on cream: italic eyebrow, short rule, a large serif name, uppercase serif subtitle, a small letter-spaced line, rule, paragraph; then 4 columns separated by 1px vertical rules.
10. Investment band over a photo of leaf shadows on a warm cream wall: centred eyebrow, rule, H2, then two price blocks (title and paragraph left, CAD and USD amounts split by a vertical rule right), then 3 white accommodation cards (photo left, letter-spaced uppercase room name right, CAD and USD prices split by a vertical rule) and two stacked full-width mauve deposit buttons; then 4 info columns with small line icons.
11. Add-on split: eyebrow, rule, serif heading, paragraph, a grey price box with letter-spaced label and two prices split by a rule, a small mauve button; photo of an open-air shala over the sea on the right (about 50%).
12. Footer.

### Teacher retreat landing (laptop page height 4625px)
1. Cream opening band (about 500px, header sits on cream): left column with a 2-line uppercase-mixed Cormorant title (62.08px, slate), letter-spaced italic subtitle, short rule, letter-spaced italic dates (about 22px) and venue line; right, a wide landscape photo (about 57% of the width) of a class on a jungle deck at sunset.
2. Mauve band #a48b86 (about 520px): 2-column intro (letter-spaced eyebrow and a white serif H2 left, a white italic paragraph right), then 3 columns, each a landscape photo, a letter-spaced uppercase italic title, a short white rule and a short paragraph.
3. Split 50/50 full-bleed: a beach photo on the left half, a sage panel on the right half with an eyebrow, a 2-line serif H3 and a paragraph.
4. Location: centred letter-spaced eyebrow between rules, small italic line, uppercase serif name, centred paragraph, then 3 equal landscape photos with rounded corners.
5. Details: centred eyebrow between two rules, a large serif date line, a letter-spaced venue line, two grey price boxes side by side (letter-spaced bold italic label, two prices split by a vertical rule), two stacked mauve deposit buttons, small centred uppercase notes.
6. Sage band with 4 icon columns (plane, shield, lotus, sun line icons left of each text block).
7. Cross-sell split: photo left (about 45%), right: eyebrow, rule, serif heading, letter-spaced date, italic line, grey price box, small mauve button.
8. Footer.

### Panama retreat landing (laptop page height 6228px)
1. Full-bleed sunset city photo hero (about 830px) with a centred stacked title: two serif lines in slate (the second underlined by a short rule), a letter-spaced uppercase subtitle, a bold uppercase serif line and a 3-line italic paragraph.
2. Split: left text on cream (uppercase serif heading, a script-font line in "Alex Brush", paragraph, two bold italic lines), right a full-height beach photo (about 38% of the width) touching the right edge.
3. Itinerary: a centred, very widely letter-spaced mauve serif H2, then 4 columns: landscape photo, italic date, bold uppercase italic venue, short rule, italic place, centred paragraph.
4. Full-bleed resort photo with a large letter-spaced serif name in cream.
5. Three photo tiles with uppercase serif labels and short captions; then a sage "what is included" split with a food photo on the left and a bulleted list on the right; then 4 info columns.
6. Accommodation options: centred heading, three grey cards (letter-spaced bold title, room photo, small description, two prices split by a rule), stacked deposit buttons.
7. Closing split: photo left, serif heading, paragraphs and two small side-by-side mauve buttons right.
8. Footer.

### Workshops (laptop page height 1928px)
**1. Short photo header:** photo strip about 530px (singing bowl close-up) with the H1 centred, cream.
**2. Event list:** each event is a 2-column row, about 33/67: a 3:2 image left (x 52 to 462), details right: serif title (28px), two lines of italic grey meta (date range, venue with a map link), a larger italic tagline (about 22px), a paragraph with a bold lead-in, and a filled mauve "View event →" button with an arrow (padding 16px 20.8px). About 110px between events.
**3. Footer.**

## 6. Responsive behaviour
| Breakpoint | Header | Grid columns | Hero | Type changes | Other changes |
|---|---|---|---|---|---|
| 390 | 4-line announcement bar, logo left, cart and 2-line hamburger right, block 236px | 1 column everywhere; footer becomes centred logo and icon plus 2 columns | Photo about 680px tall, text bottom-left at 24px gutter | H1 46.384px, H2 33.2176px, H3 28.1536px | Class style tiles become stacked landscape strips; newsletter inputs stack; buttons often go full width |
| 768 | 2-line announcement bar, hamburger, block 239px | Footer keeps 4 tracks; content mostly 1 or 2 columns (not inspected in detail) | Photo about 950px tall, text bottom-left | H1 43.648px, H2 31.6672px, H3 27.0592px | Page height 6004px on Home |
| 1280 | Links in 2 right-aligned rows, cart, outline button; block 157px | 2 to 4 columns as described; 52px gutters | About 1110px, text block max about 530px | H1 62.08px, H2 42.112px, H3 34.432px, H4 25.216px | Schedule widget centred at about 790px |
| 1920 | Links on one row; block 171px | Same as 1280; 78px gutters | Text block starts at x 260px | H1 66.4px, H2 44.56px, H3 36.16px | Page height 7100px on Home |

- Maximum content width: no fixed container was measured; content spans the viewport minus gutters of about 4% each side (52px at 1280, 78px at 1920, 24px at 390). Narrow text columns are capped individually (measured widths include 290, 390, 530 and 1000px at 1280).
- Nothing scrolls sideways at any width (overflow 0px on every page).

## 7. Motion and interaction
- Scroll reveals: none detected (no elements hidden at load).
- Video: none. Carousels or sliders: none.
- Libraries: no GSAP, ScrollTrigger, Lenis, Locomotive, Swiper, Framer or Lottie. 66 elements on Home carry CSS transitions (link and button hover states).
- Sticky elements: the header is not sticky; one sticky element was detected on the teacher training page (not identified). The announcement bar can be closed.
- Interaction: the Class Styles accordion opens rows in place (chevron right). The schedule widget has tabs, a week/month toggle, date arrows and pagination.
- Smooth scrolling: not detected.

## 8. Colour
| Role | Hex | Where it is used |
|---|---|---|
| Page background | #f9f7f4 | Default cream on every page, announcement bar on Home |
| Surface (cards) | #dce3e0 | Pricing cards, About pillars, booking band, inner-page announcement bar |
| Surface (white) | #ffffff | Newsletter inputs, accommodation cards, one white band on the training page |
| Primary text | #4c4c5c | Headings and body on cream |
| Body text in widget | #585858 | Schedule rows |
| Light text | #f9f7f4 | Hero H1, text on slate and on photos |
| Accent | #a48b86 | Filled buttons, subscribe button, mauve band on the retreat page, mauve headings on landing pages |
| Primary button | #a48b86 fill, #ffffff text | "Buy now", "Book a class today", deposit buttons |
| Secondary button | transparent, 1px #f9f7f4 or #a48b86 border | Header "Book a Class", "See all class styles", "Learn more" |
| Widget button | #70707d | "Book now" buttons inside the schedule |
| Borders and dividers | #4c4c5c (1px) | Accordion rules, short decorative rules, vertical price separators |
| Dark sections | #4c4c5c | Class styles band, About story band, footer |
| Price boxes on landing pages | not measured (mid warm grey) | Deposit price boxes |

## 9. Typography
| Level | Family | Weight | Size (laptop) | Size (phone) | Line height | Letter spacing | Case |
|---|---|---|---|---|---|---|---|
| H1 | Cormorant Garamond | 400 | 62.08px | 46.384px | 76.48px (1.23) | normal | Sentence case; uppercase on landing pages |
| H2 | Cormorant Garamond | 400 | 42.112px | 33.2176px | 54.95px (1.30) | normal; very wide tracking on one landing heading | Sentence case |
| H3 | Cormorant Garamond | 400 | 34.432px | 28.1536px | 45.89px (1.33) | normal | Sentence or uppercase |
| H4 (serif lead paragraphs) | Cormorant Garamond | 400 | 25.216px | not measured | not measured | normal | Sentence case |
| Body | Libre Franklin | 300 italic | not measured (announcement sample 12.96px) | not measured (sample 13px) | about 2.16 (27.99px on the 12.96px sample) | 0.06em (0.7776px on the sample) | Sentence case |
| Bold lead-ins and labels | Libre Franklin | 700 italic | not measured | not measured | not measured | wide on eyebrows | Uppercase for eyebrows |
| Eyebrow labels | Libre Franklin | 300 italic | not measured (small) | not measured | not measured | widely letter-spaced on landing pages | Uppercase |
| Navigation links | italic sans, visually Libre Franklin (the measured sample was the skip link: Poppins 500 14.4px) | not measured | not measured | hidden | normal | 0.288px on sample | Title case |
| Buttons | Poppins | 500 | 16px (header and filled buttons) | not measured | normal | 0.02em on sample | Title case in header; uppercase on most filled buttons |
| Script accent | Alex Brush | 400 | not measured | not measured | not measured | normal | Sentence case, one line on the Panama page only |

- Loaded fonts also include Inter (inside the schedule widget) and futura-pt, freight-sans-pro and pragmatica-web on landing pages; they are not part of the core look.
- The logo is an image: a heavy, high-contrast display serif "ATHA" with a vertical hairline and a thin sans "HOT YOGA".

## 10. Imagery and icons
- Photos: real studio and class photography in warm, slightly desaturated tones: bare skin, black activewear, wooden floors, large windows with soft daylight. Many images are tight crops of limbs and bodies mid-pose rather than full figures. Landing pages switch to bright travel photography (jungle shalas, beaches, sunset cityscapes, resort rooms).
- Crops: full-bleed landscape heroes; square tiles in the class styles band; tall portrait photos with about 12px rounded corners on Class Styles; 3:2 landscape images in event rows; black-and-white portrait cards on the training page.
- No video anywhere. No illustrations except a few thin single-weight line icons (lotus, leaf, plane, shield, sun, group of people) on landing pages, drawn in black or slate outline.
- UI icons: thin outline cart, two-line hamburger, Instagram outline, chevrons.
- Decorative marks: hand-drawn oval and underline strokes around prices on the Pricing page.
- Not used: gradients, drop shadows, stock-style smiling headshots, icon grids on the core pages, emoji.

## 11. Components
- **Filled button:** background #a48b86, white text, no border, radius 0, horizontal padding 20.8px with a fixed height of about 60px, Poppins 500 16px, usually uppercase text. Width often fixed (about 237 to 285px at 1280) rather than hugging the text.
- **Outline button:** transparent, 1px border in #f9f7f4 (on photos or slate) or #a48b86 (on cream), text in the same colour, radius 0, padding 16px 20.8px, Poppins 500 16px.
- **Text link button:** underlined italic sans in cream on the hero ("learn more" type), no box.
- **Event button:** filled mauve with a trailing "→".
- **Pricing card:** sage #dce3e0 rectangle, square corners, no border or shadow, inner padding about 50px, content top-aligned and the button bottom-aligned.
- **Pillar card:** same sage rectangle, larger, serif title and italic paragraph.
- **Price box (landing pages):** flat warm-grey rectangle, letter-spaced bold italic label, two prices in serif split by a 1px vertical rule.
- **Accordion row:** serif label left, thin chevron right, 1px rules.
- **Newsletter inputs:** white, square, no visible border, italic grey placeholder, about 52px tall.
- **Decorative rule:** short 1px horizontal line (about 40 to 55px long) under eyebrows and above body text on landing pages.
- **Badges or pills:** none in the brand UI; pills only occur inside the third-party schedule widget.

## 12. Section skeletons

```html
<!-- Announcement bar + transparent header over the hero -->
<div><!-- full width, cream/sage/slate per page, about 48px tall, 1 centred italic line, close × far right -->
  <p><strong>Offer phrase</strong> | detail | <strong>second phrase</strong> | <a>Link text</a></p>
  <button aria-label="Close">×</button>
</div>
<header><!-- position absolute over hero, transparent, 52px side gutters -->
  <a><img alt="Logo wordmark"></a><!-- left, about 250px wide, white -->
  <nav><!-- right-aligned, italic sans links, wraps to 2 rows at 1280, 1 row at 1920 -->
    <a aria-current="page">Home</a><a>About</a><a>Classes</a><a>Pricing</a><a>Retreats</a>
  </nav>
  <a>Cart 0</a>
  <a>Book a class</a><!-- outline, 1px cream border, square, 16px 20.8px padding -->
</header>
```

```html
<!-- Home hero: full-bleed photo, text bottom-left, wave-shaped bottom edge -->
<section><!-- about 1110px tall at 1280; photo behind header -->
  <img alt="Close crop of a pose, warm desaturated">
  <div><!-- bottom-left at gutter, max 530px -->
    <h1>Serif headline over three lines</h1><!-- Cormorant 400, 62px, cream -->
    <p>Serif lead paragraph placeholder.</p><!-- Cormorant 25px, cream -->
    <a>Underlined italic text link</a>
  </div>
  <svg><!-- cream wave: higher on the left, lower on the right --></svg>
</section>
```

```html
<!-- Dark band with curved edges and 3 labelled square photo tiles -->
<section><!-- bg #4c4c5c, about 950px, wave top and wave bottom -->
  <h2>Section title</h2><!-- left, cream serif -->
  <div><!-- 3 equal squares, 8px gaps, full content width -->
    <a><img alt=""><h3>Label</h3></a><!-- label centred on the photo, serif 34px cream -->
    <a><img alt=""><h3>Label</h3></a>
    <a><img alt=""><h3>Label</h3></a>
  </div>
  <p>Two-line serif paragraph placeholder.</p>
  <a>See all</a><!-- outline, cream 1px border, uppercase -->
</section>
```

```html
<!-- Newsletter over a dim photo: 3 inputs and a button on one row -->
<section><!-- full-bleed photo, about 720px, wave top edge -->
  <h2>Community title</h2><!-- centred, cream serif -->
  <p>One italic line placeholder.</p>
  <form><!-- one row at laptop, stacked at phone -->
    <input placeholder="First name"><input placeholder="Last name"><input placeholder="Email">
    <button>Subscribe</button><!-- #a48b86, white, square -->
  </form>
</section>
```

```html
<!-- Pricing pass cards: sage rectangles in a 3-track grid -->
<section><!-- cream bg; grid left-aligned, 10px gaps, an incomplete last row stays left -->
  <article><!-- bg #dce3e0, square corners, about 50px padding -->
    <h3>Pass name on two lines</h3><!-- serif -->
    <p><span>Price</span></p><!-- price with a hand-drawn underline stroke -->
    <p>Italic description placeholder.</p>
    <a>Buy now</a><!-- filled mauve, uppercase, bottom of card -->
  </article>
  <!-- repeat -->
</section>
```

```html
<!-- Class list: accordion in the centre, staggered portrait photos either side -->
<section><!-- 3 columns about 22 / 41 / 22 with gaps -->
  <div><img alt=""><img alt=""></div><!-- rounded 12px portraits, start at top -->
  <div>
    <h3>Centred serif intro</h3>
    <p>Centred italic paragraph.</p>
    <details><summary>Class name</summary><p>Description</p></details><!-- serif label, chevron right, 1px rules -->
    <!-- repeat for each class -->
  </div>
  <div><img alt=""><img alt=""></div><!-- portraits start about 290px lower -->
</section>
```

```html
<!-- Event row on Workshops -->
<article><!-- 2 columns about 33 / 67 -->
  <img alt=""><!-- 3:2 landscape -->
  <div>
    <h2>Event title</h2><!-- serif 28px -->
    <p>Date range · venue (map)</p><!-- small italic grey -->
    <p>Larger italic tagline.</p>
    <p><strong>Name</strong> description paragraph.</p>
    <a>View event →</a><!-- filled mauve -->
  </div>
</article>
```

```html
<!-- Footer -->
<footer><!-- bg #4c4c5c, about 264px at 1280, one row on a 4-track grid -->
  <img alt="Wordmark"><!-- white, about 130px -->
  <address>Street<br>City<br><a>Phone</a><br><a>Email</a></address><!-- italic, underlined links -->
  <nav><a>About</a><a>Contact</a><a>Classes</a><a>Book a class</a></nav><!-- vertical, underlined -->
  <a aria-label="Instagram"></a><!-- outline icon, right -->
</footer>
```

## 13. Dos and don'ts
- **Do:** pair a light Cormorant Garamond (weight 400, never bold) for every heading with light italic Libre Franklin for all body copy, and keep the body line height around 2.
- **Do:** use the four-colour system exactly: cream #f9f7f4 pages, slate #4c4c5c dark bands and footer, sage #dce3e0 cards, mauve #a48b86 filled buttons.
- **Do:** cut between some bands with shallow wave curves (at the bottom of the hero, around the dark class band, above the newsletter photo), and keep the rest as straight edges.
- **Do:** keep buttons as square rectangles with a fixed generous height (about 60px) and uppercase Poppins 500 labels.
- **Do:** let the header and its outline button float transparently over a light, warm photo, with the hero text bottom-left.
- **Do:** use real, tightly cropped studio photography with skin, black activewear and daylight.
- **Do:** keep an announcement bar above the header whose background changes with the page theme.
- **Don't:** round the buttons or cards (the only rounded corners are on some portrait and landing-page photos, about 8 to 12px).
- **Don't:** add shadows, borders or hover lifts to cards; sage cards are flat colour fields.
- **Don't:** set body text upright or in a heavy weight; the italic light sans is the voice of the site.
- **Don't:** use a sticky solid header bar or a dark overlay over the hero photo.
- **Don't:** copy the text overlaps and broken letter-spaced wraps that appear on the landing pages at 1280; they are build errors, not style.
- **Don't:** introduce a bright accent colour; the palette stays muted and warm.
- **AI-look traps:** no purple-to-pink gradients or glowing "wellness" blobs; the softness comes from cream, sage and photography. Do not turn the class styles teaser into three white rounded cards with icons; it is three square photos with a centred serif word on each. Avoid pill-shaped buttons and chips (the booking widget's pills are third-party). Avoid emoji, sparkle icons and words like "transform your journey" set in bold sans; headings here are quiet serif sentences. Keep icon rows rare and drawn as thin line art.
