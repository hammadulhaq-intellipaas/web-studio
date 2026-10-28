import type { PromptContext } from './context';

export type Proposal = 'A' | 'B';
export const PROPOSALS: Proposal[] = ['A', 'B'];

/**
 * The reference website each proposal starts from: the client's first and second pick. One
 * pick means both proposals start on it (the team switches one in the Design tab); none means
 * both work from the client's answers alone.
 */
export function defaultReferences(picks: string[]): Record<Proposal, string | null> {
  return { A: picks[0] ?? null, B: picks[1] ?? picks[0] ?? null };
}

export interface ReferenceForPrompt {
  slug: string;
  name: string;
  url: string | null;
  spec: string | null;
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
      proposal,
      client: context.client,
      quote: context.quote,
      answers: context.sections.map((s) => ({
        section: s.title,
        items: s.answers.filter((a) => a.key !== 'references').map((a) => ({ question: a.question, answer: a.answer })),
      })),
      reference_website: reference ? { name: reference.name, url: reference.url, spec: reference.spec } : null,
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
  version: string;
  /** The reference website the proposal followed, by name. */
  reference: string | null;
}

/** The model's input for a revision prompt: the client's feedback on one design version. */
export function revisionPromptInput(input: {
  company: string;
  formLanguage: string;
  design: DesignForPrompt;
  designBrief: string | null;
  earlierRevisions: string[];
  feedback: string;
  internalNotes: string;
}): string {
  return JSON.stringify(
    {
      client: { company: input.company, form_language: input.formLanguage },
      proposal: input.design.proposal,
      version: input.design.version,
      design_brief: input.designBrief,
      earlier_revisions: input.earlierRevisions,
      feedback: input.feedback.trim(),
      internal_notes: input.internalNotes.trim() || null,
    },
    null,
    2,
  );
}

/** The model's input for the Claude Code build prompt. */
export function buildPromptInput(
  context: PromptContext,
  input: { project: string; cms: boolean; design: DesignForPrompt; designBrief: string | null; devInstructions: string; internalNotes: string },
): string {
  return JSON.stringify(
    {
      client: context.client,
      quote: context.quote,
      cms_booked: input.cms,
      project: { name: input.project, github_repository: input.project, vercel_project: input.project, supabase_project: input.project },
      approved_design: { ...input.design, folder: './design' },
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

/** The model's input for the client's handover document. */
export function handoverPromptInput(
  context: PromptContext,
  input: { cms: boolean; liveUrl: string; cmsUrl: string; design: DesignForPrompt | null; internalNotes: string },
): string {
  return JSON.stringify(
    {
      client: context.client,
      quote: context.quote,
      cms_booked: input.cms,
      live_url: input.liveUrl.trim() || null,
      cms_url: input.cms ? input.cmsUrl.trim() || null : null,
      approved_design: input.design,
      answers: allAnswers(context),
      uploaded_files: context.files,
      internal_notes: input.internalNotes.trim() || null,
    },
    null,
    2,
  );
}
