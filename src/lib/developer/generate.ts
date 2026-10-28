import 'server-only';
import { generateText } from 'ai';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getLanguageModel } from '@/lib/ai/provider';
import { fixtureMode, modelConfigured } from '@/lib/onboarding/ai/client';
import { getOnboardingDefinition, getOnboardingSecrets } from '@/lib/onboarding/definition';
import { redactSecrets, stripDashes } from '@/lib/onboarding/guardrails';
import { loadDeveloperClient } from './clients';
import { buildPromptContext, loadReferenceSpec, REFERENCE_FIELD } from './context';
import { promptsReady } from './filters';
import { designPromptInput, PROPOSALS, type Proposal, type ReferenceForPrompt } from './messages';
import { DEV_DESIGN_PROMPT } from './prompt-defaults';
import { developerSchemaReady, insertPrompts, loadProject } from './store';

export type GenerateResult = { ok: true } | { ok: false; error: string };

/** Canned output for e2e runs (ONBOARDING_AI_FIXTURE=1): no key, no cost, deterministic. */
function fixturePrompt(company: string, proposal: Proposal, reference: ReferenceForPrompt | null): string {
  return `# Website design brief: ${company}, Proposal ${proposal}\n\n## Goal\nFixture prompt.\n\n## Layout direction\n${reference ? `Follows ${reference.name}.` : "From the client's answers."}`;
}

async function logCall(formId: string, system: string, prompt: string, model: string, ok: boolean, response: Record<string, unknown>, ms: number) {
  try {
    await createSupabaseAdminClient().from('onboarding_ai_log').insert({
      form_id: formId,
      job: 'dev_design',
      attempt: 1,
      model,
      prompt: { system: redactSecrets(system).text, prompt: redactSecrets(prompt).text },
      response,
      ok,
      usage: null,
      duration_ms: ms,
    });
  } catch (err) {
    console.error('[developer] log insert failed:', err);
  }
}

/**
 * Generates the Claude Design prompts for Proposal A and B and stores them as a new version.
 * Phase 1 works from the confirmed onboarding form only.
 */
export async function generateDesignProposals(
  leadId: string,
  references: Record<Proposal, string | null>,
  by: string | null,
): Promise<GenerateResult> {
  const client = await loadDeveloperClient(leadId);
  if (!client) return { ok: false, error: 'Client not found.' };
  const { lead, onboarding } = client;
  if (!onboarding || !promptsReady(onboarding.status)) return { ok: false, error: 'The onboarding form has to be confirmed first.' };
  if (!(await developerSchemaReady())) return { ok: false, error: 'Run migration 20261028000021 first.' };
  if (!modelConfigured()) return { ok: false, error: 'No AI provider key is configured.' };

  const [context, definition, secrets, project] = await Promise.all([
    buildPromptContext(lead, onboarding.id),
    getOnboardingDefinition(),
    getOnboardingSecrets(),
    loadProject(leadId),
  ]);
  if (!context) return { ok: false, error: 'The onboarding form could not be loaded.' };

  const options = definition.fields.find((f) => f.id === REFERENCE_FIELD)?.options ?? [];
  const resolve = async (slug: string | null): Promise<ReferenceForPrompt | null> => {
    if (!slug) return null;
    const option = options.find((o) => o.value === slug);
    return { slug, name: option?.label_en ?? slug, url: option?.url ?? null, spec: await loadReferenceSpec(slug) };
  };
  const system = secrets.prompts.find((p) => p.id === 'dev_design')?.content?.trim() || DEV_DESIGN_PROMPT;
  const modelId = fixtureMode() ? 'fixture' : definition.settings.model;
  const company = context.client.company ?? lead.firma ?? 'Client';

  try {
    const drafts = await Promise.all(
      PROPOSALS.map(async (proposal) => {
        const reference = await resolve(references[proposal]);
        const prompt = designPromptInput(context, proposal, reference, project.internal_notes);
        const started = Date.now();
        let content: string;
        if (fixtureMode()) {
          content = fixturePrompt(company, proposal, reference);
        } else {
          try {
            // A full multi-page brief runs to about 10k output tokens plus reasoning; leave headroom.
            const { text, finishReason } = await generateText({ model: getLanguageModel(modelId), system, prompt, maxOutputTokens: 20000 });
            if (finishReason === 'length') throw new Error('the model ran out of room before finishing; try again');
            content = text;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            await logCall(onboarding.id, system, prompt, modelId, false, { error: message }, Date.now() - started);
            throw new Error(`Proposal ${proposal}: ${message}`);
          }
        }
        content = stripDashes(content.trim());
        await logCall(onboarding.id, system, prompt, modelId, true, { text: content }, Date.now() - started);
        return { proposal, reference, content };
      }),
    );
    await insertPrompts(
      drafts.map((d) => ({
        lead_id: leadId,
        form_id: onboarding.id,
        kind: 'design',
        proposal: d.proposal,
        reference_slug: d.reference?.slug ?? null,
        content: d.content,
        model: modelId,
        created_by: by,
      })),
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
