import 'server-only';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import type { Lead, SuggestedPlanPhase } from '../types';
import { buildLeadContext, buildPipeline } from './pipeline';

const planSchema = z.object({
  phases: z.array(
    z.object({
      key: z.string(),
      title: z.string(),
      tool: z.enum(['claude_design', 'claude_code']),
      prompt_markdown: z.string(),
      inputs: z.array(z.string()),
    }),
  ),
});

export async function generatePhases(
  lead: Lead,
  fileNames: string[],
): Promise<{ phases: SuggestedPlanPhase[]; model: string }> {
  const modelId = process.env.OPENAI_PLAN_MODEL ?? 'gpt-4o';
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const pipeline = buildPipeline(lead.config);
  const context = buildLeadContext(lead, fileNames);

  const pipelineSpec = pipeline
    .map(
      (p, i) =>
        `### Phase ${i + 1} — key: "${p.key}", tool: ${p.tool}, title: "${p.title}"\n` +
        `Goal: ${p.goal}\n` +
        (p.expectedInputs.length
          ? `This phase's prompt MUST embed the literal placeholder token(s) ${p.expectedInputs.join(
              ', ',
            )} where the result of the earlier phase should be pasted, and list them in "inputs".`
          : `This phase has no inputs from earlier phases ("inputs" must be []).`),
    )
    .join('\n\n');

  const { object } = await generateObject({
    model: openai(modelId),
    schema: planSchema,
    system: `You write execution-ready prompts for a web agency that builds customer websites with two tools:
- **Claude Design** (claude.ai/design) — AI mockup/design tool that exports HTML handoff bundles.
- **Claude Code** — AI coding agent working in a repository.

You are given a fixed pipeline of phases and a customer lead. For EACH phase, write the markdown prompt that a team member will paste into the specified tool. Rules:
1. Produce EXACTLY the phases specified — same order, same "key", same "tool", same count. Use the given titles (you may refine wording slightly).
2. Each prompt must be fully self-contained: restate every customer fact it needs (never say "see above" or "as previously discussed").
3. Write with minimum ambiguity: concrete page lists, exact texts to use (quote the customer's own wording where available), explicit acceptance criteria, and explicit out-of-scope notes.
4. Where a phase depends on an earlier phase's result, embed the literal placeholder token exactly as specified (e.g. {{phase_1.output}}) at the spot where that result should be pasted, and list every used token in that phase's "inputs" array.
5. Prompts are written in English. Customer-facing website content stays in the customer's language (German unless stated otherwise).
6. Do not invent facts about the customer. Where information is missing, instruct the operator to use a clearly marked TODO placeholder instead of guessing.
7. Every "prompt_markdown" is valid Markdown following EXACTLY this section skeleton, in this order, each introduced by a level-3 heading:

### Context
### Task
### Requirements
### Acceptance criteria
### Out of scope

Formatting rules for the prompt body: use "###" for these section headings and never any other heading level; use "-" for bullet lists; wrap file paths, commands and code in backticks or fenced code blocks; never emit HTML. Put the placeholder tokens (e.g. {{phase_1.output}}) inside the "### Context" section where the earlier phase's result belongs.`,
    prompt: `# Pipeline to generate prompts for\n\n${pipelineSpec}\n\n# Customer lead\n\n${context}`,
  });

  // Enforce the deterministic pipeline shape regardless of model output quirks.
  const phases: SuggestedPlanPhase[] = pipeline.map((spec, i) => {
    const generated =
      object.phases.find((p) => p.key === spec.key) ?? object.phases[i] ?? null;
    return {
      key: spec.key,
      title: generated?.title || spec.title,
      tool: spec.tool,
      prompt_markdown: generated?.prompt_markdown ?? '',
      inputs: spec.expectedInputs,
    };
  });

  return { phases, model: modelId };
}
