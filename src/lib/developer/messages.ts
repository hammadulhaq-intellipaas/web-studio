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
