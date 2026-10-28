import 'server-only';
import { generateText } from 'ai';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getLanguageModel } from '@/lib/ai/provider';
import { fixtureMode, modelConfigured } from '@/lib/onboarding/ai/client';
import { getOnboardingDefinition, getOnboardingSecrets } from '@/lib/onboarding/definition';
import { redactSecrets, stripDashes } from '@/lib/onboarding/guardrails';
import type { PromptId } from '@/lib/onboarding/types';
import { loadDeveloperClient } from './clients';
import { buildPromptContext, loadReferenceSpec, REFERENCE_FIELD } from './context';
import { loadVersions } from './designs';
import { slugify } from './drafts';
import { promptsReady } from './filters';
import {
  buildPromptInput,
  designPromptInput,
  handoverPromptInput,
  PROPOSALS,
  revisionPromptInput,
  type DesignForPrompt,
  type Proposal,
  type ReferenceForPrompt,
} from './messages';
import { DEV_BUILD_PROMPT, DEV_DESIGN_PROMPT, DEV_HANDOVER_PROMPT, DEV_REVISION_PROMPT } from './prompt-defaults';
import { cmsBooked } from './setup';
import { designsSchemaReady, developerSchemaReady, insertPrompts, loadProject, loadPrompts } from './store';

export type GenerateResult = { ok: true } | { ok: false; error: string };

type DevPromptId = Extract<PromptId, 'dev_design' | 'dev_revision' | 'dev_build' | 'dev_handover'>;

const DEFAULTS: Record<DevPromptId, string> = {
  dev_design: DEV_DESIGN_PROMPT,
  dev_revision: DEV_REVISION_PROMPT,
  dev_build: DEV_BUILD_PROMPT,
  dev_handover: DEV_HANDOVER_PROMPT,
};

/** Canned output for e2e runs (ONBOARDING_AI_FIXTURE=1): no key, no cost, deterministic. */
function fixtureText(job: DevPromptId, company: string, detail: string): string {
  const title: Record<DevPromptId, string> = {
    dev_design: `# Website design brief: ${company}, ${detail}`,
    dev_revision: `# Design revision: ${company}, ${detail}`,
    dev_build: `# Build: ${company}`,
    dev_handover: `# ${company} Website Handoff`,
  };
  return `${title[job]}\n\n## Goal\nFixture text.`;
}

async function logCall(formId: string, job: DevPromptId, system: string, prompt: string, model: string, ok: boolean, response: Record<string, unknown>, ms: number) {
  try {
    await createSupabaseAdminClient().from('onboarding_ai_log').insert({
      form_id: formId,
      job,
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

/** The editable instruction for a job (onb_prompts), or the built-in text when the row is missing. */
async function instructionFor(job: DevPromptId): Promise<string> {
  const secrets = await getOnboardingSecrets();
  return secrets.prompts.find((p) => p.id === job)?.content?.trim() || DEFAULTS[job];
}

/** One model call, logged, with dashes stripped in code whatever the model wrote. */
async function runModel(opts: { formId: string; job: DevPromptId; modelId: string; system: string; prompt: string; fixture: string }): Promise<string> {
  const started = Date.now();
  let content: string;
  if (fixtureMode()) {
    content = opts.fixture;
  } else {
    try {
      // A full multi-page brief runs to about 10k output tokens plus reasoning; leave headroom.
      const { text, finishReason } = await generateText({ model: getLanguageModel(opts.modelId), system: opts.system, prompt: opts.prompt, maxOutputTokens: 20000 });
      if (finishReason === 'length') throw new Error('the model ran out of room before finishing; try again');
      content = text;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await logCall(opts.formId, opts.job, opts.system, opts.prompt, opts.modelId, false, { error: message }, Date.now() - started);
      throw new Error(message);
    }
  }
  content = stripDashes(content.trim());
  await logCall(opts.formId, opts.job, opts.system, opts.prompt, opts.modelId, true, { text: content }, Date.now() - started);
  return content;
}

/** The client, their confirmed form and the model, or the reason prompts cannot be generated yet. */
async function prepare(leadId: string, needsDesigns: boolean) {
  const client = await loadDeveloperClient(leadId);
  if (!client) return { error: 'Client not found.' } as const;
  const { lead, onboarding } = client;
  if (!onboarding || !promptsReady(onboarding.status)) return { error: 'The onboarding form has to be confirmed first.' } as const;
  if (!(await developerSchemaReady())) return { error: 'Run migration 20261028000021 first.' } as const;
  if (needsDesigns && !(await designsSchemaReady())) return { error: 'Run migration 20261028000022 first.' } as const;
  if (!modelConfigured()) return { error: 'No AI provider key is configured.' } as const;
  const [context, definition, project] = await Promise.all([
    buildPromptContext(lead, onboarding.id),
    getOnboardingDefinition(),
    loadProject(leadId),
  ]);
  if (!context) return { error: 'The onboarding form could not be loaded.' } as const;
  const modelId = fixtureMode() ? 'fixture' : definition.settings.model;
  const company = context.client.company ?? lead.firma ?? 'Client';
  const referenceName = (slug: string | null) =>
    slug ? (definition.fields.find((f) => f.id === REFERENCE_FIELD)?.options.find((o) => o.value === slug)?.label_en ?? slug) : null;
  return { lead, onboarding, context, definition, project, modelId, company, referenceName } as const;
}

const failure = (err: unknown): GenerateResult => ({ ok: false, error: err instanceof Error ? err.message : String(err) });

/**
 * Generates the Claude Design prompts for Proposal A and B and stores them as a new version.
 * Phase 1 works from the confirmed onboarding form only.
 */
export async function generateDesignProposals(
  leadId: string,
  references: Record<Proposal, string | null>,
  by: string | null,
): Promise<GenerateResult> {
  const ready = await prepare(leadId, false);
  if ('error' in ready) return { ok: false, error: ready.error as string };
  const { onboarding, context, definition, project, modelId, company } = ready;
  if (project.approved_version_id) return { ok: false, error: 'The design is approved and locked. Reopen it first.' };

  const options = definition.fields.find((f) => f.id === REFERENCE_FIELD)?.options ?? [];
  const resolve = async (slug: string | null): Promise<ReferenceForPrompt | null> => {
    if (!slug) return null;
    const option = options.find((o) => o.value === slug);
    return { slug, name: option?.label_en ?? slug, url: option?.url ?? null, spec: await loadReferenceSpec(slug) };
  };
  const system = await instructionFor('dev_design');

  try {
    const drafts = await Promise.all(
      PROPOSALS.map(async (proposal) => {
        const reference = await resolve(references[proposal]);
        const prompt = designPromptInput(context, proposal, reference, project.internal_notes);
        const content = await runModel({
          formId: onboarding.id,
          job: 'dev_design',
          modelId,
          system,
          prompt,
          fixture: `${fixtureText('dev_design', company, `Proposal ${proposal}`)}\n\n## Layout direction\n${reference ? `Follows ${reference.name}.` : "From the client's answers."}`,
        }).catch((err) => {
          throw new Error(`Proposal ${proposal}: ${err instanceof Error ? err.message : String(err)}`);
        });
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
    return failure(err);
  }
}

/** The newest design prompt of a proposal: what Claude Design made that proposal from. */
async function latestDesignPrompt(leadId: string, proposal: Proposal) {
  return (await loadPrompts(leadId, 'design')).find((p) => p.proposal === proposal) ?? null;
}

/** Turns the client's feedback on one design version into the prompt for the next version. */
export async function generateRevision(leadId: string, versionId: string, feedback: string, by: string | null): Promise<GenerateResult> {
  if (!feedback.trim()) return { ok: false, error: "Paste the client's feedback first." };
  const ready = await prepare(leadId, true);
  if ('error' in ready) return { ok: false, error: ready.error as string };
  const { onboarding, context, project, modelId, company, referenceName } = ready;
  if (project.approved_version_id) return { ok: false, error: 'The design is approved and locked. Reopen it first.' };

  try {
    const versions = await loadVersions(leadId);
    const version = versions.find((v) => v.id === versionId && v.status === 'ready');
    if (!version) return { ok: false, error: 'Choose an uploaded design version.' };
    const brief = await latestDesignPrompt(leadId, version.proposal);
    const sameProposal = new Set(versions.filter((v) => v.proposal === version.proposal).map((v) => v.id));
    const earlier = (await loadPrompts(leadId, 'revision'))
      .filter((p) => p.design_version_id && sameProposal.has(p.design_version_id))
      .slice(0, 5)
      .reverse()
      .map((p) => p.content);
    const design: DesignForPrompt = { proposal: version.proposal, version: version.label, reference: referenceName(brief?.reference_slug ?? null) };
    const prompt = revisionPromptInput({
      company,
      formLanguage: context.client.formLanguage,
      design,
      designBrief: brief?.content ?? null,
      earlierRevisions: earlier,
      feedback: feedback.slice(0, 8000),
      internalNotes: project.internal_notes,
    });
    const content = await runModel({
      formId: onboarding.id,
      job: 'dev_revision',
      modelId,
      system: await instructionFor('dev_revision'),
      prompt,
      fixture: fixtureText('dev_revision', company, version.label),
    });
    await insertPrompts([
      {
        lead_id: leadId,
        form_id: onboarding.id,
        kind: 'revision',
        proposal: version.proposal,
        reference_slug: brief?.reference_slug ?? null,
        design_version_id: version.id,
        content,
        model: modelId,
        created_by: by,
      },
    ]);
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

/** The approved version as the build and handover prompts describe it. */
async function approvedDesign(leadId: string, approvedId: string | null, referenceName: (slug: string | null) => string | null) {
  if (!approvedId) return null;
  const version = (await loadVersions(leadId)).find((v) => v.id === approvedId);
  if (!version) return null;
  const brief = await latestDesignPrompt(leadId, version.proposal);
  return {
    design: { proposal: version.proposal, version: version.label, reference: referenceName(brief?.reference_slug ?? null) } as DesignForPrompt,
    brief,
  };
}

/** The Claude Code prompt that builds the real website from the approved design. */
export async function generateBuild(leadId: string, by: string | null): Promise<GenerateResult> {
  const ready = await prepare(leadId, true);
  if ('error' in ready) return { ok: false, error: ready.error as string };
  const { lead, onboarding, context, project, modelId, company, referenceName } = ready;

  try {
    const approved = await approvedDesign(leadId, project.approved_version_id, referenceName);
    if (!approved) return { ok: false, error: 'Approve a design version in the Design tab first.' };
    const prompt = buildPromptInput(context, {
      project: project.draft_slug ?? slugify(company),
      cms: cmsBooked(lead.config),
      design: approved.design,
      designBrief: approved.brief?.content ?? null,
      devInstructions: project.dev_instructions,
      internalNotes: project.internal_notes,
    });
    const content = await runModel({
      formId: onboarding.id,
      job: 'dev_build',
      modelId,
      system: await instructionFor('dev_build'),
      prompt,
      fixture: fixtureText('dev_build', company, ''),
    });
    await insertPrompts([
      {
        lead_id: leadId,
        form_id: onboarding.id,
        kind: 'build',
        proposal: approved.design.proposal,
        reference_slug: approved.brief?.reference_slug ?? null,
        design_version_id: project.approved_version_id,
        content,
        model: modelId,
        created_by: by,
      },
    ]);
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

/** The handover document the client receives with the finished website. */
export async function generateHandover(leadId: string, by: string | null): Promise<GenerateResult> {
  const ready = await prepare(leadId, true);
  if ('error' in ready) return { ok: false, error: ready.error as string };
  const { lead, onboarding, context, project, modelId, company, referenceName } = ready;

  try {
    const approved = await approvedDesign(leadId, project.approved_version_id, referenceName);
    const prompt = handoverPromptInput(context, {
      cms: cmsBooked(lead.config),
      liveUrl: project.live_url,
      cmsUrl: project.cms_url,
      design: approved?.design ?? null,
      internalNotes: project.internal_notes,
    });
    const content = await runModel({
      formId: onboarding.id,
      job: 'dev_handover',
      modelId,
      system: await instructionFor('dev_handover'),
      prompt,
      fixture: fixtureText('dev_handover', company, ''),
    });
    await insertPrompts([
      {
        lead_id: leadId,
        form_id: onboarding.id,
        kind: 'handover',
        proposal: null,
        reference_slug: null,
        content,
        model: modelId,
        created_by: by,
      },
    ]);
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}
