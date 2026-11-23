import type { PromptContext } from './context';
import { CLIENT_SHOTS, clientLinkIndex, domainOf, LIKED_SPEC_SECTIONS, specSections } from './reference-sources';

export type Proposal = 'A' | 'B';
export const PROPOSALS: Proposal[] = ['A', 'B'];

/**
 * The reference each proposal starts from: the client's first and second design example, in the
 * form's order (gallery ticks, then their own links, then their pictures; see exampleChoices).
 * One example means both proposals start on it (the team switches one in the Design tab); none
 * means both work from the client's answers alone. `usable` leaves out the client's own sources
 * while the reference-spec migration has not run.
 */
export function defaultReferences(examples: string[], usable: (value: string) => boolean = () => true): Record<Proposal, string | null> {
  const ok = examples.filter(usable);
  return { A: ok[0] ?? null, B: ok[1] ?? ok[0] ?? null };
}

/** Proposal A and B are shown and sent to the model as 1 and 2. */
export const proposalNumber = (p: Proposal) => (p === 'A' ? 1 : 2);

export interface ReferenceForPrompt {
  slug: string;
  name: string;
  url: string | null;
  spec: string | null;
  /** Set for the client's own references; a library website has none. */
  source?: 'client_link' | 'client_screenshots';
  /** Why there is no spec, or how it was made: shown to the model next to the spec. */
  note?: string | null;
}

/** One of the client's design examples, by its Design tab choice value, with what they like about it. */
export function exampleFacts(context: PromptContext, value: string) {
  const site = context.referenceSites.find((r) => r.slug === value);
  if (site) return { name: site.name, url: site.url, source: 'gallery' as const, liked: site.liked, notes: '', dislikes: site.dislikes, spec: site.spec };
  const index = clientLinkIndex(value);
  const link = index === null ? undefined : context.clientReferences[index];
  if (link) return { name: `The client's link: ${domainOf(link.url)}`, url: link.url, source: 'client_link' as const, liked: link.liked, notes: link.likes, dislikes: link.dislikes, spec: null };
  if (value === CLIENT_SHOTS) return { name: "The client's pictures", url: null, source: 'client_pictures' as const, liked: [], notes: '', dislikes: '', spec: null };
  return null;
}

/**
 * The model's input for one design proposal: the client context as JSON, with the chosen
 * reference website's spec and what the client likes about it, and the client's other design
 * examples, each with its likes and, for a gallery website, the spec sections of the parts they
 * like (its colours, fonts or photos may lend themselves to this proposal).
 */
export interface OtherExample {
  name: string;
  url: string | null;
  source: 'gallery' | 'client_link' | 'client_pictures';
  client_likes: string[];
  client_notes: string | null;
  client_dislikes: string | null;
  leads_other_proposal: boolean;
  spec_excerpts: string | null;
}

/** The client's examples other than this proposal's reference, with the spec sections of the parts they like. */
export function otherExamples(
  context: PromptContext,
  proposal: Proposal,
  reference: Pick<ReferenceForPrompt, 'slug'> | null,
  leads: Record<Proposal, string | null>,
): OtherExample[] {
  return context.examples
    .filter((value) => value !== reference?.slug)
    .map((value): OtherExample | null => {
      const f = exampleFacts(context, value);
      if (!f) return null;
      const sections = [...new Set(f.liked.flatMap((label) => LIKED_SPEC_SECTIONS[label] ?? []))].sort((a, b) => a - b);
      const excerpt = f.spec && sections.length ? specSections(f.spec, sections) : '';
      const leadsOther = PROPOSALS.find((p) => p !== proposal && leads[p] === value);
      return {
        name: f.name,
        url: f.url,
        source: f.source,
        client_likes: f.liked,
        client_notes: f.notes || null,
        client_dislikes: f.dislikes || null,
        leads_other_proposal: !!leadsOther,
        spec_excerpts: excerpt || null,
      };
    })
    .filter((o): o is OtherExample => o !== null);
}

/** Every answer of the form, grouped by section, as the build and handover prompts read them. */
function allAnswers(context: PromptContext) {
  return context.sections.map((s) => ({ section: s.title, items: s.answers.map((a) => ({ question: a.question, answer: a.answer })) }));
}

/** The design version a prompt is about, as the model sees it. */
export interface DesignForPrompt {
  proposal: Proposal;
  iteration: number;
  /** The reference website the proposal followed, by name. */
  reference: string | null;
}
const designForModel = (d: DesignForPrompt) => ({ proposal: proposalNumber(d.proposal), iteration: d.iteration, reference_website: d.reference });

/** One client comment, as the improvement prompt reads it. */
export interface CommentForPrompt {
  /** Its number in this prompt, the same as in its screenshot's name; null for a general comment. */
  number: number | null;
  page: string;
  device: string;
  /** Where the marked thing sits, in words: 'Section 3 of 7 ("Unsere Kurse") > button "Jetzt buchen"'. */
  place: string;
  near: string;
  /** The picture of the marked place (comment-03.jpg), attached in the order of the numbers; null if there is none. */
  screenshot: string | null;
  comment: string;
  author: string;
}

/** The model's input for an improvement prompt: everything the client said about one design. */
export function revisionPromptInput(input: {
  company: string;
  formLanguage: string;
  design: DesignForPrompt;
  designBrief: string | null;
  earlierImprovements: string[];
  comments: CommentForPrompt[];
  generalFeedback: { comment: string; author: string }[];
  carryOver: CommentForPrompt[];
  otherProposalBrief: string | null;
  pastedFeedback: string;
  internalNotes: string;
}): string {
  return JSON.stringify(
    {
      client: { company: input.company, form_language: input.formLanguage },
      proposal: proposalNumber(input.design.proposal),
      iteration: input.design.iteration,
      design_brief: input.designBrief,
      earlier_improvements: input.earlierImprovements,
      comments: input.comments,
      general_feedback: input.generalFeedback,
      carry_over: input.carryOver,
      other_proposal_brief: input.carryOver.length ? input.otherProposalBrief : null,
      pasted_feedback: input.pastedFeedback.trim() || null,
      internal_notes: input.internalNotes.trim() || null,
    },
    null,
    2,
  );
}

/**
 * The client's page list from the form: one page per line, sub-pages start with a dash. Form B
 * (a client with a website) has it ready: the old site's pages kept, then the new ones.
 */
export function clientPageList(context: PromptContext): string[] {
  if (context.pages?.length) return context.pages;
  const answer = context.sections.flatMap((s) => s.answers).find((a) => a.key === 'page_list')?.answer ?? '';
  return answer.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim());
}

/**
 * The pages a design prompt covers and the ones it leaves for later, so the build knows which pages
 * the design has. Since 23 Nov 2026 a prompt has one "### Page" per designed page under "## Pages"
 * and a "## Not designed yet" list; older prompts open with a "## Pages in this design" list
 * ("- Page: reason", only the name before the first ": " is kept) and close with "## Pages not
 * designed yet". Both are read.
 */
export function pageListsFromDesign(md: string | null): { designed: string[]; notDesigned: string[] } {
  const lines = md ? md.replace(/\r\n/g, '\n').split('\n') : [];
  const body = (title: RegExp): string[] | null => {
    const start = lines.findIndex((l) => title.test(l));
    if (start < 0) return null;
    const end = lines.findIndex((l, i) => i > start && /^#{1,2}\s/.test(l));
    return lines.slice(start + 1, end < 0 ? undefined : end);
  };
  const items = (part: string[] | null) =>
    (part ?? [])
      .map((l) => l.match(/^\s*(?:[-*]|\d+[.)])\s+(.+)$/)?.[1].trim())
      .filter((l): l is string => !!l)
      .map((l) => l.replace(/\*\*/g, '').trim());
  const listed = body(/^##\s+Pages in this design/i);
  const designed = listed
    ? items(listed).map((l) => l.split(': ')[0].trim())
    : (body(/^##\s+Pages\s*$/i) ?? []).map((l) => l.match(/^###\s+(.+)$/)?.[1].replace(/\*\*/g, '').trim()).filter((l): l is string => !!l);
  return { designed, notDesigned: items(body(/^##\s+(Pages )?not designed yet/i)) };
}

/** Splits the client-facing "What changed" list off an improvement prompt. */
export function splitClientSummary(md: string): { prompt: string; summary: string | null } {
  const m = md.match(/(^|\n)##\s+For the client[^\n]*\n/i);
  if (!m || m.index === undefined) return { prompt: md.trim(), summary: null };
  return { prompt: md.slice(0, m.index).trim(), summary: md.slice(m.index + m[0].length).trim() || null };
}

/**
 * Code words a design prompt must not use outside its Deliverable section: they pull Claude
 * Design towards building a website instead of designing one.
 */
const CODE_WORDS = /\b(HTML5?|CSS3?|JavaScript|TypeScript|React|Next\.js|Tailwind|jQuery|div|className|iframe|API|aria-[a-z]+|onClick|z-index)\b/gi;
export function codeWordsOutsideDeliverable(md: string): string[] {
  const text = md.replace(/\r\n/g, '\n').replace(/\n##\s+Deliverable[^\n]*\n[\s\S]*?(?=\n##\s|$)/i, '\n');
  return [...new Set((text.match(CODE_WORDS) ?? []).map((w) => w.toLowerCase()))];
}

/** The model's input for the Claude Code build prompt. */
export function buildPromptInput(
  context: PromptContext,
  input: {
    project: string;
    cms: boolean;
    design: DesignForPrompt;
    designBrief: string | null;
    pagesInDesign: string[];
    pagesNotDesigned: string[];
    devInstructions: string;
    internalNotes: string;
  },
): string {
  return JSON.stringify(
    {
      client: context.client,
      quote: context.quote,
      cms_booked: input.cms,
      project: { name: input.project, github_repository: input.project, vercel_project: input.project, supabase_project: input.project },
      approved_design: { ...designForModel(input.design), folder: './design' },
      client_page_list: clientPageList(context),
      pages_in_design: input.pagesInDesign,
      pages_not_designed: input.pagesNotDesigned,
      design_brief: input.designBrief,
      answers: allAnswers(context),
      uploaded_files: context.files,
      developer_instructions: input.devInstructions.trim() || null,
      internal_notes: input.internalNotes.trim() || null,
    },
    null,
    2,
  );
}

/** The answers that say how the client's website should come across, for the handover's tone. */
const VOICE_KEYS: Record<string, string> = {
  tone_scale: 'feel',
  tone_note: 'feel_in_their_words',
  personality_scale: 'boldness',
  personality_note: 'boldness_in_their_words',
  tagline: 'slogan',
  business_one_liner: 'what_they_do',
};

export function voiceOf(context: PromptContext): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of context.sections.flatMap((s) => s.answers)) if (VOICE_KEYS[a.key]) out[VOICE_KEYS[a.key]] = a.answer;
  return out;
}

/**
 * The Pages and CMS sections of a build prompt (its "## Pages" with every subsection, and "## CMS"):
 * what the site has and what the client edits, for the handover document.
 */
export function sitePlanFromBuild(md: string | null): string | null {
  if (!md) return null;
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const keep: string[] = [];
  let inside = false;
  for (const line of lines) {
    if (/^##\s/.test(line)) inside = /^##\s+(Pages|CMS)\b/i.test(line);
    if (inside) keep.push(line);
  }
  const text = keep.join('\n').trim();
  return text || null;
}

/** The model's input for the client's handover document. */
export function handoverPromptInput(
  context: PromptContext,
  input: {
    cms: boolean;
    liveUrl: string;
    cmsUrl: string;
    design: DesignForPrompt | null;
    /** The newest build prompt: its Pages and CMS sections go in as the site plan. */
    buildPrompt: string | null;
    handoverInstructions: string;
    internalNotes: string;
  },
): string {
  return JSON.stringify(
    {
      client: context.client,
      owner: context.client.contact,
      quote: context.quote,
      cms_booked: input.cms,
      live_url: input.liveUrl.trim() || null,
      cms_url: input.cms ? input.cmsUrl.trim() || null : null,
      approved_design: input.design ? designForModel(input.design) : null,
      voice: voiceOf(context),
      site_plan: sitePlanFromBuild(input.buildPrompt),
      answers: allAnswers(context),
      uploaded_files: context.files,
      handover_instructions: input.handoverInstructions.trim() || null,
      internal_notes: input.internalNotes.trim() || null,
    },
    null,
    2,
  );
}
