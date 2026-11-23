import type { PromptContext } from './context';
import { exampleFacts, otherExamples, proposalNumber, type Proposal, type ReferenceForPrompt } from './messages';
import type { PhotoNote, SiteContent, SiteFact } from './old-site-content';
import type { SiteRead } from './old-site-read';

/**
 * The source of truth a design prompt is written from: everything we know about one proposal, as
 * Markdown files, assembled in code. It is the model's whole input (the human message); the
 * instruction (DEV_DESIGN_PROMPT) is the system message.
 *
 * - onboarding.md: the client's answers. Deterministic, straight from the form.
 * - quote.md: the package and add-ons they booked. Deterministic.
 * - current-website.md: Form B only. The client's current website as it was read when they
 *   confirmed the form (a browser driven by code, the content sorted by the extraction model).
 * - reference-website.md: the website this proposal follows. A library site's spec is fixed; a
 *   client's own link was read and written up by the extraction model.
 * - other-examples.md: the client's other design examples, with what they like about each.
 *
 * The facts at the top are worked out in code, so the model does not have to guess them.
 *
 * Plain functions only, no server code, so they are easy to test.
 */

export const ASSET_FOLDER = 'assets/current-site';

export interface TruthFile {
  name: string;
  content: string;
}

/** A Form B client's current website, as it was read (developer_site_reads), with its measured design. */
export interface SiteForTruth {
  read: Pick<SiteRead, 'url' | 'pages' | 'found' | 'assets' | 'content' | 'photos' | 'notes' | 'updated_at'>;
  /** The spec of the site's own design (colours, fonts, layout), written like a reference spec. */
  designSpec: string | null;
}

export interface TruthInput {
  context: PromptContext;
  proposal: Proposal;
  reference: ReferenceForPrompt | null;
  leads: Record<Proposal, string | null>;
  site: SiteForTruth | null;
  internalNotes: string;
}

/** A: no website yet. B-keep: has one and keeps logo, colours and fonts. B-fresh: has one, wants a new look. */
export function brandVariant(context: PromptContext, site: SiteForTruth | null): 'A' | 'B-keep' | 'B-fresh' {
  if (context.funnel !== 'B') return 'A';
  return context.brandKeep === false || !site ? 'B-fresh' : 'B-keep';
}

const answerOf = (context: PromptContext, key: string) => context.sections.flatMap((s) => s.answers).find((a) => a.key === key)?.answer ?? null;
const fileName = (path: string) => path.split('/').pop() ?? path;
const indent = (text: string) => text.replace(/\r\n/g, '\n').trim().replace(/\n/g, '\n  ');
/** Spec headings one level down, so they sit under the file's own heading. */
const demote = (md: string, by = 1) => md.replace(/\r\n/g, '\n').replace(/^(#{1,5}) /gm, (_m, h: string) => `${h}${'#'.repeat(by)} `);

/** Answers that are design examples: reference-website.md and other-examples.md hold them, structured. */
const EXAMPLE_KEYS = new Set(['references', 'reference_sites', 'reference_likes', 'favourite_examples', 'example_sources', 'reference_screenshots']);
/** Not needed for a design, and personal. */
const LEFT_OUT = new Set(['contact_email']);

function factsBlock(input: TruthInput, variant: ReturnType<typeof brandVariant>): string {
  const { context, proposal, reference, leads } = input;
  const address = answerOf(context, 'address_form');
  const languages = answerOf(context, 'languages');
  const other = (['A', 'B'] as const).find((p) => p !== proposal);
  const lines = [
    '# Source of truth',
    `Everything we know for the design of ${context.client.company ?? 'the client'}'s new website, Proposal ${proposalNumber(proposal)}. Every client gets two proposals, each led by a different reference website.`,
    '',
    '## Facts worked out in code',
    `- Funnel: ${context.funnel === 'B' ? `B, the client has a website today (${context.existingUrl ?? 'address not given'}); the new site is its successor.` : 'A, the client has no website yet.'}`,
    `- Brand: ${
      variant === 'B-keep'
        ? 'the client keeps their logo, colours and fonts from their current website (see current-website.md). Colours and fonts of any reference never replace them.'
        : variant === 'B-fresh'
          ? 'the client wants a completely new look; only their logo stays.'
          : 'from their answers (brand colours, guidelines, colour mood, lettering) and what they like about their examples.'
    }`,
    `- How the site addresses visitors: ${address ? address : 'not answered in the form'}.`,
    `- Languages of the new site: ${languages ?? 'not answered'}. The form was filled in in ${context.client.formLanguage === 'de' ? 'German' : 'English'}.`,
    `- This proposal follows: ${reference ? reference.name : 'no reference website; the layout comes from the answers and the other examples'}.`,
  ];
  if (other && leads[other] && leads[other] !== reference?.slug) lines.push(`- The other proposal follows a different example; keep this one distinct from it.`);
  if (input.internalNotes.trim()) {
    lines.push('', '## Internal notes from the team', 'They win where they conflict with anything below.', '', input.internalNotes.trim());
  }
  return lines.join('\n');
}

export function onboardingMd(context: PromptContext): string {
  const out = ['# onboarding.md', `The client's answers from the onboarding form, by screen. Questions are in English; the client's own words stay exactly as they wrote them.`];
  out.push('', `- Company: ${context.client.company ?? '(not given)'}`);
  if (context.client.contact) out.push(`- Contact person: ${context.client.contact}`);
  for (const section of context.sections) {
    const answers = section.answers.filter((a) => !EXAMPLE_KEYS.has(a.key) && !LEFT_OUT.has(a.key));
    if (!answers.length) continue;
    out.push('', `## ${section.title}`);
    for (const a of answers) out.push(`- ${a.question} ${a.answer.includes('\n') ? `\n  ${indent(a.answer)}` : a.answer}`);
  }
  if (context.pages?.length) out.push('', '## Pages of the new site', 'From the pages they keep, change and add:', ...context.pages.map((p) => `- ${p}`));
  const files = context.files.filter((f) => !/screenshot/i.test(f.question));
  if (files.length) out.push('', '## Files they uploaded', ...files.map((f) => `- ${f.name} (${f.question})`));
  return out.join('\n');
}

export function quoteMd(context: PromptContext): string {
  const out = ['# quote.md', 'What the client booked.'];
  out.push('', `- Package: ${context.quote.package ?? '(not recorded)'}`);
  out.push(`- Add-ons: ${context.quote.addons.length ? context.quote.addons.join(', ') : 'none'}`);
  return out.join('\n');
}

/**
 * "8eb3a3acc9e9-nina-143.webp" and "dac3dc756fc1-nina-143.jpg" are the same photo: our storage
 * prefix, a size suffix and the format differ. Keeps the largest file of each.
 */
export function photoKey(path: string): string {
  return fileName(path)
    .toLowerCase()
    .replace(/^[0-9a-f]{12}-/, '')
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/-(\d+x\d+|scaled|e\d{10,})$/, '');
}

export function uniquePhotos(photos: PhotoNote[], bytes: Map<string, number>): PhotoNote[] {
  const best = new Map<string, PhotoNote>();
  for (const p of photos) {
    const key = photoKey(p.path);
    const held = best.get(key);
    if (!held || (bytes.get(p.path) ?? 0) > (bytes.get(held.path) ?? 0)) best.set(key, p);
  }
  const keep = new Set([...best.values()].map((p) => p.path));
  return photos.filter((p) => keep.has(p.path));
}

/** Text that is only Cloudflare's cover for a hidden email address, never content. */
const HIDDEN_EMAIL = /\[email(?:&#160;|\s| )protected\]/i;

export function currentWebsiteMd(site: SiteForTruth): string {
  const { read } = site;
  const content = (read.content ?? { summary: '', facts: [], missing: [] }) as SiteContent;
  const out = ['# current-website.md', `The client's current website, ${read.url}, read on ${read.updated_at.slice(0, 10)}: ${read.pages.length} pages, ${read.assets.length} files. Its files are in ${ASSET_FOLDER}/ (the designer gets them as a zip).`];
  if (content.summary) out.push('', content.summary);
  if (read.found.menu.length) out.push('', `Menu, in order: ${read.found.menu.map((m) => `"${m.text}"`).join(', ')}.`);

  out.push('', '## Content, word for word, by page', 'Copied from the pages and checked against them. Each item says what it is: about, service, price, testimonial and so on.');
  const facts = content.facts.filter((f) => f.verified && !HIDDEN_EMAIL.test(f.text));
  const byPage = new Map<string, SiteFact[]>();
  for (const f of facts) byPage.set(f.page.replace(/\/$/, ''), [...(byPage.get(f.page.replace(/\/$/, '')) ?? []), f]);
  const pages = [...read.pages.map((p) => ({ url: p.url.replace(/\/$/, ''), title: p.title, legal: p.kind === 'legal' }))];
  for (const url of byPage.keys()) if (!pages.some((p) => p.url === url)) pages.push({ url, title: url, legal: false });
  for (const page of pages) {
    const own = byPage.get(page.url);
    if (!own?.length) continue;
    out.push('', `### ${page.title || page.url}${page.legal ? ' (legal page: company details only)' : ''}`, page.url);
    for (const f of own) out.push(`- (${f.topic}) ${f.text.includes('\n') ? `\n  ${indent(f.text)}` : f.text}`);
  }
  const open = content.facts.filter((f) => !f.verified || HIDDEN_EMAIL.test(f.text));
  if (open.length || content.missing.length) {
    out.push('', '## Not found or not confirmed on the site', 'Never content: a page that needs one of these shows a visible [[OFFEN: …]] placeholder.');
    for (const f of open) out.push(`- ${HIDDEN_EMAIL.test(f.text) ? `${f.title} (hidden on the site)` : f.title}`);
    for (const m of content.missing) out.push(`- ${m}`);
  }

  out.push('', '## Brand files');
  const logos = read.assets.filter((a) => a.kind === 'image' && a.logo);
  out.push(logos.length ? `- Logo: ${logos.map((l) => `${ASSET_FOLDER}/${fileName(l.path)}`).join(', ')}` : '- No logo file was found.');
  const fonts = read.assets.filter((a) => a.kind === 'font');
  for (const family of [...new Set(fonts.map((f) => f.label))]) {
    const cuts = fonts.filter((f) => f.label === family).map((f) => `${f.weight ?? '400'}${f.style === 'italic' ? ' italic' : ''} (${fileName(f.path)})`);
    out.push(`- Font ${family}, served by the site itself, in ${ASSET_FOLDER}/fonts/: ${cuts.join(', ')}`);
  }
  if (read.found.googleFonts.length) out.push(`- Google Fonts: ${read.found.googleFonts.join(', ')}`);

  const bytes = new Map(read.assets.map((a) => [a.path, a.bytes]));
  const photos = uniquePhotos((read.photos ?? []) as PhotoNote[], bytes).filter((p) => p.quality !== 'poor' && p.use !== 'none' && p.subject !== 'icon');
  out.push('', '## Photos', `What each one shows, as a model saw it. Same photo in several formats listed once; poor ones left out.`);
  if (photos.length) for (const p of photos) out.push(`- ${ASSET_FOLDER}/${fileName(p.path)}: ${p.description} (${p.subject}, ${p.quality} quality; fits: ${p.use})`);
  else out.push('- No usable photos were found.');
  const pdfs = read.assets.filter((a) => a.kind === 'pdf');
  if (pdfs.length) out.push('', '## Documents', ...pdfs.map((d) => `- ${ASSET_FOLDER}/${fileName(d.path)}${d.label ? `: ${d.label}` : ''}`));

  if (site.designSpec) {
    out.push('', '## Its measured design', 'Measured by our browser and written up by a model. Measurements can be wrong: a value that looks like a measuring error is one.', '', demote(stripTitle(site.designSpec), 2));
  }
  if (read.notes?.length) out.push('', '## Could not be read', ...read.notes.map((n) => `- ${n}`));
  return out.join('\n');
}

/** A spec without its own "# Title" and source line: the file heading says what it is. */
function stripTitle(spec: string): string {
  return spec.replace(/\r\n/g, '\n').replace(/^# .*\n(> .*\n)?/, '').trim();
}

export function referenceMd(context: PromptContext, reference: ReferenceForPrompt): string {
  const facts = exampleFacts(context, reference.slug);
  const out = ['# reference-website.md', `The website this proposal follows: ${reference.name}${reference.url ? `, ${reference.url}` : ''}.`];
  out.push('', '## What the client says about it');
  out.push(`- They like: ${facts?.liked.length ? facts.liked.join(', ') : 'nothing ticked'}`);
  if (facts?.notes) out.push(`- In their words: "${facts.notes}"`);
  if (facts?.dislikes) out.push(`- They do not like: "${facts.dislikes}"`);
  if (reference.note) out.push('', reference.note);
  out.push('', '## Its spec');
  out.push(reference.spec ? demote(stripTitle(reference.spec), 1) : 'No spec exists for it.');
  return out.join('\n');
}

export function otherExamplesMd(input: TruthInput): string | null {
  const others = otherExamples(input.context, input.proposal, input.reference, input.leads);
  if (!others.length) return null;
  const out = ['# other-examples.md', "The client's other design examples, with what they like about each."];
  for (const o of others) {
    out.push('', `## ${o.name}${o.url ? ` (${o.url})` : ''}${o.leads_other_proposal ? ': leads the other proposal' : ''}`);
    out.push(`- They like: ${o.client_likes.length ? o.client_likes.join(', ') : 'nothing ticked'}`);
    if (o.client_notes) out.push(`- In their words: "${o.client_notes}"`);
    if (o.client_dislikes) out.push(`- They do not like: "${o.client_dislikes}"`);
    if (o.spec_excerpts) out.push('', `The parts of its spec they like:`, '', demote(o.spec_excerpts, 1));
  }
  return out.join('\n');
}

/** The source of truth of one proposal: its files, and the whole text as the model reads it. */
export function sourceOfTruth(input: TruthInput): { files: TruthFile[]; text: string; variant: ReturnType<typeof brandVariant> } {
  const variant = brandVariant(input.context, input.site);
  const files: TruthFile[] = [
    { name: 'onboarding.md', content: onboardingMd(input.context) },
    { name: 'quote.md', content: quoteMd(input.context) },
  ];
  if (input.site) files.push({ name: 'current-website.md', content: currentWebsiteMd(input.site) });
  if (input.reference) files.push({ name: 'reference-website.md', content: referenceMd(input.context, input.reference) });
  const others = otherExamplesMd(input);
  if (others) files.push({ name: 'other-examples.md', content: others });
  const text = [factsBlock(input, variant), ...files.map((f) => f.content)]
    .join('\n\n---\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { files, text, variant };
}

/** Hex colours in a text, lower case, as #rrggbb. */
export function hexColours(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    const h = m[1].toLowerCase();
    out.add(`#${h.length === 3 ? h.replace(/./g, (c) => c + c) : h}`);
  }
  return out;
}
