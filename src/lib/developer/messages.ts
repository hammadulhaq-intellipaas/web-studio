import type { PromptContext } from './context';

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

/**
 * The model's input for one design proposal: the client context as JSON, with the chosen
 * reference website's spec and the client's own references pulled out on their own.
 */
export function designPromptInput(
  context: PromptContext,
  proposal: Proposal,
  reference: ReferenceForPrompt | null,
  internalNotes: string,
): string {
  const own = context.sections.flatMap((s) => s.answers).find((a) => a.key === 'references');
  return JSON.stringify(
    {
      proposal: proposalNumber(proposal),
      client: context.client,
      quote: context.quote,
      answers: context.sections.map((s) => ({
        section: s.title,
        items: s.answers.filter((a) => a.key !== 'references').map((a) => ({ question: a.question, answer: a.answer })),
      })),
      reference_website: reference
        ? {
            name: reference.name,
            url: reference.url,
            ...(reference.source ? { source: reference.source } : {}),
            ...(reference.note ? { note: reference.note } : {}),
            spec: reference.spec,
          }
        : null,
      other_references: own?.answer ?? null,
      uploaded_files: context.files,
      internal_notes: internalNotes.trim() || null,
    },
    null,
    2,
  );
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
  page: string;
  device: string;
  near: string;
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

/** The client's page list from the form: one page per line, sub-pages start with a dash. */
export function clientPageList(context: PromptContext): string[] {
  const answer = context.sections.flatMap((s) => s.answers).find((a) => a.key === 'page_list')?.answer ?? '';
  return answer.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim());
}

/**
 * The two page lists a design prompt opens and closes with ("Pages in this design" and "Pages
 * not designed yet"), so the build knows which pages the design covers. A designed line reads
 * "- Page: reason"; only the name before the first ": " is kept.
 */
export function pageListsFromDesign(md: string | null): { designed: string[]; notDesigned: string[] } {
  const section = (title: RegExp): string[] => {
    if (!md) return [];
    const lines = md.replace(/\r\n/g, '\n').split('\n');
    const start = lines.findIndex((l) => title.test(l));
    if (start < 0) return [];
    const out: string[] = [];
    for (const line of lines.slice(start + 1)) {
      if (/^#{1,2}\s/.test(line)) break;
      const m = line.match(/^\s*(?:[-*]|\d+[.)])\s+(.+)$/);
      if (m) out.push(m[1].trim());
    }
    return out;
  };
  return {
    designed: section(/^##\s+Pages in this design/i).map((l) => l.split(': ')[0].replace(/\*\*/g, '').trim()),
    notDesigned: section(/^##\s+Pages not designed yet/i).map((l) => l.replace(/\*\*/g, '').trim()),
  };
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
