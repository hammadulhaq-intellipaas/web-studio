import type { ContextSection, PromptContext } from './context';
import { exampleFacts, otherExamples, proposalNumber, type Proposal, type ReferenceForPrompt } from './messages';
import { specSections } from './reference-sources';

/**
 * The design prompt, assembled from fixed blocks around the creative part a model writes. The code
 * locks what must not drift: the brand (exact colours, fonts, logo), the parts of the references
 * to take (word for word from their specs), the client's content (word for word), the photos with
 * their file names, the rules, the seven screen sizes, the work order and the self-check. The model
 * writes the pages, the layout, the sections and the motion (DEV_DESIGN_PROMPT).
 *
 * Three variants of the brand block, by funnel:
 * - A: no website yet; the brand comes from the form (their colours, guidelines, mood, lettering);
 * - B-keep: has a website and keeps its logo and colours; the brand is measured on that site;
 * - B-fresh: has a website but wants a completely new look; only the logo stays.
 */

export const CREATIVE_SECTIONS = ['Pages in this design', 'Layout direction', 'Pages and sections', 'Motion', 'Pages not designed yet'] as const;

/** The "## Heading" sections of a Markdown text, by heading. */
export function sectionsOf(md: string): Map<string, string> {
  const out = new Map<string, string>();
  const parts = md.replace(/\r\n/g, '\n').split(/^## +/m);
  for (const part of parts.slice(1)) {
    const nl = part.indexOf('\n');
    const title = (nl < 0 ? part : part.slice(0, nl)).trim();
    out.set(title.toLowerCase(), (nl < 0 ? '' : part.slice(nl + 1)).trim());
  }
  return out;
}

/** Which creative sections are missing, for one rewrite of the model's answer. */
export function missingCreative(md: string): string[] {
  const have = sectionsOf(md);
  return CREATIVE_SECTIONS.filter((s) => !have.get(s.toLowerCase()));
}

export function creativeCheck(md: string): string | null {
  const missing = missingCreative(md);
  return missing.length ? `Your answer is missing these sections: ${missing.map((m) => `## ${m}`).join(', ')}. Rewrite the whole answer with all five sections, in order.` : null;
}

/** The layout always comes from the reference: these spec sections, word for word. */
const LAYOUT_SECTIONS = [2, 3, 4, 5, 6, 11, 12];
/** And these as well when the client ticked that they like that part. */
const LIKED_EXTRA: Record<string, number[]> = { Layout: [7], Colours: [8], Fonts: [9], Photos: [10], 'Overall feel': [1, 13] };

const answerOf = (sections: ContextSection[], key: string) => sections.flatMap((s) => s.answers).find((a) => a.key === key);
const fileName = (path: string) => path.split('/').pop() ?? path;

/** Answers that are the brand, the examples or bookkeeping: they have blocks of their own. */
const NOT_CONTENT = new Set([
  'contact_name',
  'contact_email',
  'booked_package',
  'booked_page_band',
  'project_type',
  'brand_keep',
  'brand_guidelines',
  'brand_guidelines_link',
  'brand_colours',
  'colour_mood',
  'typography_feel',
  'example_sources',
  'references',
  'reference_sites',
  'reference_likes',
  'favourite_examples',
  'reference_screenshots',
  'tone_scale',
  'tone_note',
  'personality_scale',
  'personality_note',
  'address_form',
]);
/** Screens whose answers are content or direction for the pages. */
const CONTENT_SCREENS = new Set(['project', 'business', 'design', 'pages', 'integrations']);

export interface CurrentSite {
  /** The spec of the current site (old-site-spec.ts). */
  spec: string;
  /** The measured design of the current site, in the 13 spec sections, or null. */
  designSpec: string | null;
  logos: string[];
  fontFiles: { family: string; file: string; weight?: string; style?: string }[];
  googleFonts: string[];
}

export interface AssembleInput {
  context: PromptContext;
  proposal: Proposal;
  reference: ReferenceForPrompt | null;
  leads: Record<Proposal, string | null>;
  creative: string;
  site: CurrentSite | null;
  /** Where the current site's files are, in the design zip and later in the client's repository. */
  assetFolder?: string;
}

export function brandVariant(context: PromptContext, site: CurrentSite | null): 'A' | 'B-keep' | 'B-fresh' {
  if (context.funnel !== 'B') return 'A';
  return context.brandKeep === false || !site ? 'B-fresh' : 'B-keep';
}

function brandBlock(input: AssembleInput, folder: string): string[] {
  const { context, site } = input;
  const variant = brandVariant(context, site);
  const lines: string[] = ['## Brand and identity'];
  const fromForm = ['brand_colours', 'brand_guidelines', 'brand_guidelines_link', 'colour_mood', 'typography_feel']
    .map((k) => answerOf(context.sections, k))
    .filter(Boolean)
    .map((a) => `- ${a!.question} ${a!.answer}`);
  const feel = ['tone_scale', 'tone_note', 'personality_scale', 'personality_note']
    .map((k) => answerOf(context.sections, k))
    .filter(Boolean)
    .map((a) => `- ${a!.question} ${a!.answer}`);
  if (variant === 'B-keep') {
    lines.push("The client keeps their brand. Use exactly the logo, colours and fonts of their current website; everything else is new.");
    if (site!.logos.length) lines.push(`Logo: ${site!.logos.map((l) => `${folder}/${fileName(l)}`).join(', ')}.`);
    if (site!.fontFiles.length) {
      lines.push('Their own font files, in ' + `${folder}/fonts/: ` + site!.fontFiles.map((f) => `${f.family} ${f.weight ?? '400'}${f.style === 'italic' ? ' italic' : ''} (${fileName(f.file)})`).join(', ') + '.');
    }
    if (site!.googleFonts.length) lines.push(`Google Fonts they use: ${site!.googleFonts.join(', ')}.`);
    const measured = site!.designSpec ? specSections(site!.designSpec, [8, 9]) : '';
    if (measured) lines.push('', 'Measured on their current website:', '', measured.replace(/^## /gm, '### '));
  } else {
    lines.push(
      variant === 'B-fresh'
        ? 'The client wants a completely new look: new colours and new fonts. Keep only their logo' +
            (site?.logos.length ? ` (${site.logos.map((l) => `${folder}/${fileName(l)}`).join(', ')})` : '') +
            '. Choose the palette and the fonts from what they told us and from what they like about their examples.'
        : "The client's brand, from their answers. Where they have brand colours or a guideline, they win; otherwise choose the palette and fonts from their colour mood, their lettering style and what they like about their examples.",
    );
    if (fromForm.length) lines.push('', ...fromForm);
  }
  if (feel.length) lines.push('', 'How the site should feel:', ...feel);
  return lines;
}

function referenceBlock(input: AssembleInput): string[] {
  const { context, reference } = input;
  if (!reference) return ['## Reference website', 'None: derive the layout from the answers and the other examples.'];
  const facts = exampleFacts(context, reference.slug);
  const liked = facts?.liked ?? [];
  const keepBrand = brandVariant(context, input.site) === 'B-keep';
  const wanted = new Set(LAYOUT_SECTIONS);
  for (const l of liked) for (const n of LIKED_EXTRA[l] ?? []) wanted.add(n);
  // A client who keeps their brand keeps their colours and fonts, whatever they like elsewhere.
  if (keepBrand) {
    wanted.delete(8);
    wanted.delete(9);
  }
  const lines = [`## Reference website: ${reference.name}`];
  if (reference.url) lines.push(`${reference.url}`);
  lines.push(
    `The client likes about it: ${liked.length ? liked.join(', ') : 'nothing ticked; take its layout'}.` +
      (facts?.notes ? ` In their words: "${facts.notes}".` : '') +
      (facts?.dislikes ? ` They do not like: "${facts.dislikes}"; leave that out.` : ''),
  );
  lines.push("Take its layout, and the other parts below, as they are written; never its text, photos, logo, brand name or illustrations.");
  const excerpt = reference.spec ? specSections(reference.spec, [...wanted].sort((a, b) => a - b)) : '';
  if (excerpt) lines.push('', excerpt.replace(/^## /gm, '### '));
  else if (reference.note) lines.push('', reference.note);
  return lines;
}

function othersBlock(input: AssembleInput): string[] {
  const others = otherExamples(input.context, input.proposal, input.reference, input.leads).filter((o) => o.client_likes.length || o.client_notes);
  if (!others.length) return [];
  const keepBrand = brandVariant(input.context, input.site) === 'B-keep';
  const lines = ['## The client\'s other examples', 'Take only the parts the client likes about each, never their layout. ' + (keepBrand ? 'Their colours and fonts never replace the brand above.' : '')];
  for (const o of others) {
    lines.push('', `### ${o.name}${o.leads_other_proposal ? ' (leads the other proposal: borrow only what nothing else offers)' : ''}`);
    lines.push(`The client likes: ${o.client_likes.join(', ') || 'see their words'}.${o.client_notes ? ` "${o.client_notes}"` : ''}${o.client_dislikes ? ` Not: "${o.client_dislikes}".` : ''}`);
    if (o.spec_excerpts) lines.push('', o.spec_excerpts.replace(/^## /gm, '#### '));
  }
  return lines;
}

function contentBlock(input: AssembleInput): string[] {
  const { context, site } = input;
  const lines = ['## Content, word for word', "Use the client's text exactly as written here, in its language. Never translate, shorten or improve it. A [[OFFEN: …]] item is shown as a visible placeholder."];
  if (site) {
    const content = sectionsOf(site.spec).get('2. content, word for word');
    if (content) lines.push('', 'From their current website:', '', content.replace(/^### /gm, '#### '));
    if (context.pages?.length) lines.push('', 'Their pages for the new site (kept, changed or added):', ...context.pages.map((p) => `- ${p}`));
  }
  const answers = context.sections
    .filter((s) => CONTENT_SCREENS.has(s.screen))
    .flatMap((s) => s.answers)
    .filter((a) => !NOT_CONTENT.has(a.key) && !a.key.startsWith('contact_'));
  if (answers.length) {
    lines.push('', 'From their answers:');
    for (const a of answers) lines.push(`- ${a.question} ${a.answer.includes('\n') ? `\n  ${a.answer.replace(/\n/g, '\n  ')}` : a.answer}`);
  }
  return lines;
}

function photosBlock(input: AssembleInput, folder: string): string[] {
  const { site, context } = input;
  const lines = ['## Photos and files'];
  const photos = site ? sectionsOf(site.spec).get('4. photos') : null;
  if (photos) {
    lines.push(`Their photos from their current website, in ${folder}/. Use the good ones where they fit; never a poor one large.`, '', photos);
  }
  const files = context.files.filter((f) => !/screenshot/i.test(f.question));
  if (files.length) lines.push('', 'Files they uploaded:', ...files.map((f) => `- ${f.name} (${f.question})`));
  if (!photos && !files.length) lines.push('No photos yet: describe neutral, realistic placeholder images by subject.');
  return lines;
}

export const SCREEN_SIZES = [
  { width: 360, name: 'Small phone' },
  { width: 390, name: 'Phone' },
  { width: 430, name: 'Large phone' },
  { width: 768, name: 'Tablet, upright' },
  { width: 1024, name: 'Tablet sideways, small laptop' },
  { width: 1440, name: 'Laptop' },
  { width: 1920, name: 'Large screen' },
] as const;

const RESPONSIVE = [
  '## Responsive behaviour',
  'The design works at every one of these widths, not only at phone and laptop: ' + SCREEN_SIZES.map((s) => `${s.width} px (${s.name.toLowerCase()})`).join(', ') + '.',
  '- Nothing scrolls sideways or is cut off at any width.',
  '- Body text is at least 16 px on phones; headlines scale down without breaking words.',
  '- Buttons and links are at least 44 px tall to tap.',
  '- The menu collapses into a menu button below 1024 px and opens as a clear full-width panel.',
  '- From 1440 to 1920 px the content keeps its maximum width and the margins grow; nothing stretches.',
];

const RULES = (addressForm: string | null) => [
  '## Must not',
  "- Never copy the text, photos, logo, brand name or illustrations of a reference or example website.",
  '- Never invent facts: numbers, years, prices, reviews, testimonials, awards, certificates, names, guarantees. A missing fact is a visible [[OFFEN: …]] placeholder.',
  `- Address visitors ${addressForm === 'du' ? 'with "du"' : 'with "Sie"'} on every page.`,
  '- No gradients, no rows of three identical icon cards, no floating pill badges above headlines, no emoji or stock icons as bullet points, no cursor effects, no decorative fade-ins.',
  '- No buzzwords ("elevate", "unlock", "seamless", "tailored solutions") and no sentence that would be just as true for a competitor.',
  '- No em dashes and no en dashes in any text.',
  '- No section repeated across pages with the same content.',
  '- Booking, shop, map, forms, video and cookie banner are shown as they will look, not built.',
];

const WORK_ORDER = [
  '## How to work',
  '1. Read this whole brief first, including the reference parts and the content.',
  '2. Audit: for every page in this design, list the content it gets from "Content, word for word". Nothing is left out that belongs there, and nothing is invented.',
  '3. Design system: set the colours, the type scale, spacing, buttons, cards, forms, header and footer once, at every screen size, before any page.',
  '4. Pages: design them one by one, in the order of "Pages in this design", from the design system only.',
  '5. Self-check against the list at the end and fix everything before you deliver.',
];

const SELF_CHECK = [
  '## Self-check before you deliver',
  "- Every text from \"Content, word for word\" that a page needs is on it, exactly as written.",
  '- Every [[OFFEN: …]] placeholder is still visible; none was filled with an invented fact.',
  '- Nothing of a reference website was copied: no text, photo, logo or name.',
  '- At 360 px nothing scrolls sideways, body text is 16 px or more and every button is 44 px or taller.',
  '- Text contrast meets WCAG AA; buttons and links show a visible focus outline.',
  '- Nothing on the "Must not" list is in the design.',
];

const DELIVERABLE = [
  '## Deliverable',
  'A static, clickable design of exactly the pages in "Pages in this design", working from 360 to 1920 px, with the links between these pages working and the language switch shown but not working. No working forms, bookings, maps or other integrations. Ready to export as HTML.',
];

/** The whole design prompt: the creative part in its place, the fixed blocks around it. */
export function assembleDesignPrompt(input: AssembleInput): string {
  const folder = input.assetFolder ?? 'assets/current-site';
  const creative = sectionsOf(input.creative);
  const part = (title: (typeof CREATIVE_SECTIONS)[number]) => [`## ${title}`, creative.get(title.toLowerCase()) || '(not written)'];
  const company = input.context.client.company ?? 'Client';
  const address = answerOf(input.context.sections, 'address_form')?.answer ?? null;
  const goal = [
    '## Goal',
    `A static design of the key pages of ${company}'s new website, Proposal ${proposalNumber(input.proposal)}. The client looks at it to decide whether they like the look: typography, colours, layout and imagery. The real site is built later from the approved design.` +
      (input.context.funnel === 'B' ? ' The client has a website today; this is its successor, with their content and a new design.' : ''),
  ];
  const blocks = [
    [`# Website design: ${company}, Proposal ${proposalNumber(input.proposal)}`],
    part('Pages in this design'),
    goal,
    WORK_ORDER,
    brandBlock(input, folder),
    referenceBlock(input),
    othersBlock(input),
    part('Layout direction'),
    part('Pages and sections'),
    contentBlock(input),
    photosBlock(input, folder),
    part('Motion'),
    RESPONSIVE,
    RULES(/du/i.test(address ?? '') && !/sie/i.test(address ?? '') ? 'du' : 'sie'),
    SELF_CHECK,
    DELIVERABLE,
    part('Pages not designed yet'),
  ];
  return blocks
    .filter((b) => b.length)
    .map((b) => b.join('\n'))
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
