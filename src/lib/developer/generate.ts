import 'server-only';
import { generateText } from 'ai';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getLanguageModel } from '@/lib/ai/provider';
import { fixtureMode, modelConfigured } from '@/lib/onboarding/ai/client';
import { getOnboardingDefinition, getOnboardingSecrets } from '@/lib/onboarding/definition';
import { redactSecrets, stripDashes } from '@/lib/onboarding/guardrails';
import { normalizeSiteUrl } from '@/lib/showcase/shared';
import type { PromptId } from '@/lib/onboarding/types';
import { loadDeveloperClient } from './clients';
import { loadComments, markAddressed, type DesignComment } from './comments';
import { buildPromptContext, loadReferenceSpec, REFERENCE_FIELD, REFERENCE_SHOTS_FIELD, type PromptContext } from './context';
import { loadVersions } from './designs';
import { slugify } from './drafts';
import { promptsReady } from './filters';
import {
  buildPromptInput,
  codeWordsOutsideDeliverable,
  designPromptInput,
  handoverPromptInput,
  pageListsFromDesign,
  proposalNumber,
  PROPOSALS,
  revisionPromptInput,
  splitClientSummary,
  type CommentForPrompt,
  type DesignForPrompt,
  type Proposal,
  type ReferenceForPrompt,
} from './messages';
import { DEV_BUILD_PROMPT, DEV_DESIGN_PROMPT, DEV_HANDOVER_PROMPT, DEV_REFERENCE_SPEC_PROMPT, DEV_REVISION_PROMPT } from './prompt-defaults';
import {
  CLIENT_SHOTS,
  clientLinkIndex,
  clientSourceLabel,
  domainOf,
  isClientSource,
  isReadableShot,
  readingSummary,
  shotsInput,
  SHOT_MAX_BYTES,
  SHOT_MAX_COUNT,
  siteInput,
  sourceKey,
  SPEC_SECTIONS,
  specCheck,
} from './reference-sources';
import { latestSpec, referenceSpecsReady, saveSpec, SPEC_MAX_AGE_DAYS } from './reference-specs';
import { readSite, SiteReadError } from './site-reader';
import { cmsBooked } from './setup';
import { designsSchemaReady, developerSchemaReady, insertPrompts, loadProject, loadPrompts, reviewSchemaReady } from './store';

export type GenerateResult = { ok: true } | { ok: false; error: string };

type DevPromptId = Extract<PromptId, 'dev_design' | 'dev_revision' | 'dev_build' | 'dev_handover' | 'dev_reference_spec'>;

const DEFAULTS: Record<DevPromptId, string> = {
  dev_design: DEV_DESIGN_PROMPT,
  dev_revision: DEV_REVISION_PROMPT,
  dev_build: DEV_BUILD_PROMPT,
  dev_handover: DEV_HANDOVER_PROMPT,
  dev_reference_spec: DEV_REFERENCE_SPEC_PROMPT,
};

/** Canned output for e2e runs (ONBOARDING_AI_FIXTURE=1): no key, no cost, deterministic. */
function fixtureText(job: DevPromptId, company: string, detail: string): string {
  const title: Record<DevPromptId, string> = {
    dev_design: `# Website design: ${company}, ${detail}\n\n## Pages in this design\n- Startseite: the homepage\n- Kontakt: the main action`,
    dev_revision: `# Design improvement: ${company}, ${detail}`,
    dev_build: `# Build: ${company}`,
    dev_handover: `# ${company} Website Handoff`,
    dev_reference_spec: `# ${detail}: reference spec\n\n${SPEC_SECTIONS.map((t, i) => `## ${i + 1}. ${t}\nFixture text.`).join('\n\n')}`,
  };
  const tail: Partial<Record<DevPromptId, string>> = {
    dev_design: '\n\n## Pages not designed yet\n- Impressum',
    dev_revision: '\n\n## For the client\n- Fixture change.',
  };
  return `${title[job]}\n\n## Goal\nFixture text.${tail[job] ?? ''}`;
}

/** Asks for one rewrite when a design or improvement prompt slips into code words. */
function designLanguageCheck(text: string): string | null {
  const words = codeWordsOutsideDeliverable(text);
  return words.length
    ? `Rewrite your whole answer in design language only. Outside the Deliverable section, replace these technical words by describing the same thing visually: ${words.join(', ')}. Keep every other part as it is.`
    : null;
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

/**
 * One model call, logged, with dashes stripped in code whatever the model wrote. `check` may
 * return a correction; the model then gets exactly one chance to rewrite its answer.
 */
async function runModel(opts: {
  formId: string;
  job: DevPromptId;
  modelId: string;
  system: string;
  prompt: string;
  /** Pictures the model looks at together with the prompt, in the order the prompt names them. */
  pictures?: { image: Buffer; mediaType: string }[];
  fixture: string;
  check?: (text: string) => string | null;
}): Promise<string> {
  const started = Date.now();
  const pictures = opts.pictures ?? [];
  // The log keeps the text; the pictures are only counted.
  const logged = pictures.length ? `${opts.prompt}\n\n[${pictures.length} pictures attached]` : opts.prompt;
  const question = pictures.length
    ? { role: 'user' as const, content: [{ type: 'text' as const, text: opts.prompt }, ...pictures.map((p) => ({ type: 'image' as const, image: p.image, mediaType: p.mediaType }))] }
    : { role: 'user' as const, content: opts.prompt };
  let content: string;
  if (fixtureMode()) {
    content = opts.fixture;
  } else {
    try {
      const model = getLanguageModel(opts.modelId);
      // A full multi-page brief runs to about 10k output tokens plus reasoning; leave headroom.
      const first = await generateText({ model, system: opts.system, messages: [question], maxOutputTokens: 20000 });
      if (first.finishReason === 'length') throw new Error('the model ran out of room before finishing; try again');
      content = first.text;
      const correction = opts.check?.(content);
      if (correction) {
        const again = await generateText({
          model,
          system: opts.system,
          messages: [question, { role: 'assistant', content }, { role: 'user', content: correction }],
          maxOutputTokens: 20000,
        });
        if (again.finishReason !== 'length' && again.text.trim()) content = again.text;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await logCall(opts.formId, opts.job, opts.system, logged, opts.modelId, false, { error: message }, Date.now() - started);
      throw new Error(message);
    }
  }
  content = stripDashes(content.trim());
  await logCall(opts.formId, opts.job, opts.system, logged, opts.modelId, true, { text: content }, Date.now() - started);
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
  const referenceName = (slug: string | null) => {
    if (!slug) return null;
    if (isClientSource(slug)) return clientSourceLabel(slug, context.clientReferences, context.referenceShots) ?? slug;
    return definition.fields.find((f) => f.id === REFERENCE_FIELD)?.options.find((o) => o.value === slug)?.label_en ?? slug;
  };
  return { lead, onboarding, context, definition, project, modelId, company, referenceName } as const;
}

const failure = (err: unknown): GenerateResult => ({ ok: false, error: err instanceof Error ? err.message : String(err) });

/** One of the client's own references, by its choice value: what it is and where its spec is kept. */
function clientSource(value: string, context: PromptContext, leadId: string) {
  if (value === CLIENT_SHOTS) {
    const shots = context.referenceShots.filter(isReadableShot);
    if (!shots.length) return null;
    const label = clientSourceLabel(value, context.clientReferences, context.referenceShots) ?? "The client's screenshots";
    return { kind: 'screenshots' as const, label, typed: '', url: null, shots, key: sourceKey({ kind: 'screenshots', leadId, shots }) };
  }
  const index = clientLinkIndex(value);
  const ref = index === null ? undefined : context.clientReferences[index];
  if (!ref) return null;
  // Opened by our server's browser: public web addresses only (no IPs, no internal names).
  const url = normalizeSiteUrl(ref.url);
  return { kind: 'link' as const, label: `The client's link: ${domainOf(ref.url)}`, typed: ref.url, url, shots: [], key: url ? sourceKey({ kind: 'link', url }) : null };
}

/** Where the spec of each of the client's own references is kept, by choice value (for the Design tab). */
export function clientSpecKeys(context: PromptContext, leadId: string, values: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const value of values) {
    const key = clientSource(value, context, leadId)?.key;
    if (key) out[value] = key;
  }
  return out;
}

/** The client's pictures as the model gets them; files it cannot look at are named, not sent. */
async function loadShots(shots: PromptContext['referenceShots'], question: string) {
  const db = createSupabaseAdminClient();
  const pictures: { image: Buffer; mediaType: string }[] = [];
  const meta: { name: string; question: string }[] = [];
  const skipped: string[] = [];
  for (const shot of shots) {
    if (pictures.length >= SHOT_MAX_COUNT) {
      skipped.push(`${shot.name} (only the first ${SHOT_MAX_COUNT} pictures are used)`);
      continue;
    }
    const { data, error } = await db.storage.from(shot.bucket).download(shot.path);
    if (error || !data) {
      skipped.push(`${shot.name} (could not be loaded)`);
      continue;
    }
    if (data.size > SHOT_MAX_BYTES) {
      skipped.push(`${shot.name} (larger than 8 MB)`);
      continue;
    }
    const type = shot.type.toLowerCase();
    pictures.push({ image: Buffer.from(await data.arrayBuffer()), mediaType: type === 'image/jpg' ? 'image/jpeg' : type });
    meta.push({ name: shot.name, question });
  }
  return { pictures, meta, skipped };
}

export type SpecResult = { ok: true; cached: boolean; summary: string } | { ok: false; error: string };

/**
 * Writes the reference spec for one of the client's own references, a link they gave or their
 * pictures, in the 13 sections of the library specs, and keeps it for the design prompt. A
 * website read in the last 30 days is not read again unless `force` is set.
 */
export async function generateReferenceSpec(leadId: string, value: string, force: boolean, by: string | null): Promise<SpecResult> {
  const ready = await prepare(leadId, false);
  if ('error' in ready) return { ok: false, error: ready.error as string };
  const { onboarding, context, definition, project, modelId, company } = ready;
  if (project.approved_version_id) return { ok: false, error: 'The design is approved and locked. Reopen it first.' };
  if (!(await referenceSpecsReady())) return { ok: false, error: 'Run migration 20261103000028 first.' };
  const source = clientSource(value, context, leadId);
  if (!source || !source.key) {
    return { ok: false, error: source ? `"${source.typed}" is not a public web address, so it cannot be read.` : "This reference is not in the client's form." };
  }

  try {
    if (!force) {
      const cached = await latestSpec(source.key, source.kind === 'link' ? SPEC_MAX_AGE_DAYS : undefined);
      if (cached) return { ok: true, cached: true, summary: cached.summary ?? '' };
    }
    let input: string;
    let pictures: { image: Buffer; mediaType: string }[];
    let summary: string;
    if (source.kind === 'link') {
      const reading = await readSite(source.url!);
      input = siteInput(reading);
      pictures = reading.pictures;
      summary = readingSummary(reading);
    } else {
      const question = definition.fields.find((f) => f.id === REFERENCE_SHOTS_FIELD)?.label_en ?? 'Screenshots of what you like';
      const loaded = await loadShots(source.shots, question);
      const notPictures = context.referenceShots.filter((s) => !isReadableShot(s)).map((s) => `${s.name} (not a picture)`);
      const skipped = [...notPictures, ...loaded.skipped];
      if (!loaded.pictures.length) return { ok: false, error: "None of the client's pictures could be loaded (JPG, PNG, WebP or GIF, up to 8 MB each)." };
      input = shotsInput(company, loaded.meta, skipped, new Date().toISOString());
      pictures = loaded.pictures;
      summary = `Made from ${loaded.pictures.length} ${loaded.pictures.length === 1 ? 'picture' : 'pictures'}${skipped.length ? `; not used: ${skipped.join(', ')}` : ''}.`;
    }
    const content = await runModel({
      formId: onboarding.id,
      job: 'dev_reference_spec',
      modelId,
      system: await instructionFor('dev_reference_spec'),
      prompt: input,
      pictures,
      fixture: fixtureText('dev_reference_spec', company, source.label),
      check: specCheck,
    });
    await saveSpec({
      source_key: source.key,
      kind: source.kind,
      url: source.kind === 'link' ? source.url : null,
      lead_id: source.kind === 'screenshots' ? leadId : null,
      content,
      summary,
      model: modelId,
      created_by: by,
    });
    return { ok: true, cached: false, summary };
  } catch (err) {
    if (err instanceof SiteReadError) return { ok: false, error: `${domainOf(source.url ?? '')}: ${err.message}` };
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
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
  const ready = await prepare(leadId, false);
  if ('error' in ready) return { ok: false, error: ready.error as string };
  const { onboarding, context, definition, project, modelId, company } = ready;
  if (project.approved_version_id) return { ok: false, error: 'The design is approved and locked. Reopen it first.' };

  const options = definition.fields.find((f) => f.id === REFERENCE_FIELD)?.options ?? [];
  const specsReady = await referenceSpecsReady();
  const resolve = async (slug: string | null): Promise<ReferenceForPrompt | null> => {
    if (!slug) return null;
    if (isClientSource(slug)) {
      // The client's own reference: its spec was written a moment ago (generateReferenceSpec).
      const source = clientSource(slug, context, leadId);
      if (!source) return null;
      const row = source.key && specsReady ? await latestSpec(source.key) : null;
      const note = !row
        ? 'No spec could be made for this reference. Follow what the client says about it in other_references.'
        : source.kind === 'link'
          ? 'Spec written automatically from a quick read of the website: exact measurements, fewer pages than a library spec.'
          : "Spec written from the client's pictures only.";
      return {
        slug,
        name: source.label,
        url: source.kind === 'link' ? (source.url ?? source.typed) : null,
        source: source.kind === 'link' ? 'client_link' : 'client_screenshots',
        note,
        spec: row?.content ?? null,
      };
    }
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
          fixture: `${fixtureText('dev_design', company, `Proposal ${proposalNumber(proposal)}`)}\n\n## Layout direction\n${reference ? `Follows ${reference.name}.` : "From the client's answers."}`,
          check: designLanguageCheck,
        }).catch((err) => {
          throw new Error(`Proposal ${proposalNumber(proposal)}: ${err instanceof Error ? err.message : String(err)}`);
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

const commentForPrompt = (c: DesignComment): CommentForPrompt => ({
  page: c.page_title || c.page_path || '',
  device: c.device ?? '',
  near: c.near_text ?? '',
  comment: c.body,
  author: c.author_name,
});

/**
 * Turns everything the client said about one iteration into the prompt for the next one: their
 * pinned and general comments on it, comments on the other proposal they want carried over, and
 * anything the team pasted (WhatsApp, a call). The comments it takes in are marked addressed.
 */
export async function generateRevision(leadId: string, versionId: string, pastedFeedback: string, by: string | null): Promise<GenerateResult> {
  const ready = await prepare(leadId, true);
  if ('error' in ready) return { ok: false, error: ready.error as string };
  const { onboarding, context, project, modelId, company, referenceName } = ready;
  if (project.approved_version_id) return { ok: false, error: 'The design is approved and locked. Reopen it first.' };

  try {
    const versions = await loadVersions(leadId);
    const version = versions.find((v) => v.id === versionId && v.status === 'ready');
    if (!version) return { ok: false, error: 'Choose an uploaded design version.' };
    const open = (await reviewSchemaReady()) ? (await loadComments(leadId)).filter((c) => c.status === 'open') : [];
    const mine = open.filter((c) => c.version_id === version.id);
    const otherIds = new Set(versions.filter((v) => v.proposal !== version.proposal).map((v) => v.id));
    const carry = open.filter((c) => c.carry_over && otherIds.has(c.version_id));
    if (!mine.length && !carry.length && !pastedFeedback.trim()) {
      return { ok: false, error: 'There are no open comments on this iteration yet. Wait for the client, or paste their feedback.' };
    }

    const brief = await latestDesignPrompt(leadId, version.proposal);
    const otherBrief = carry.length ? (await latestDesignPrompt(leadId, version.proposal === 'A' ? 'B' : 'A'))?.content ?? null : null;
    const sameProposal = new Set(versions.filter((v) => v.proposal === version.proposal).map((v) => v.id));
    const earlier = (await loadPrompts(leadId, 'revision'))
      .filter((p) => p.design_version_id && sameProposal.has(p.design_version_id))
      .slice(0, 5)
      .reverse()
      .map((p) => p.content);
    const design: DesignForPrompt = { proposal: version.proposal, iteration: version.version, reference: referenceName(brief?.reference_slug ?? null) };
    const prompt = revisionPromptInput({
      company,
      formLanguage: context.client.formLanguage,
      design,
      designBrief: brief?.content ?? null,
      earlierImprovements: earlier,
      comments: mine.filter((c) => c.kind === 'pin').map(commentForPrompt),
      generalFeedback: mine.filter((c) => c.kind === 'general').map((c) => ({ comment: c.body, author: c.author_name })),
      carryOver: carry.map(commentForPrompt),
      otherProposalBrief: otherBrief,
      pastedFeedback: pastedFeedback.slice(0, 8000),
      internalNotes: project.internal_notes,
    });
    const raw = await runModel({
      formId: onboarding.id,
      job: 'dev_revision',
      modelId,
      system: await instructionFor('dev_revision'),
      prompt,
      fixture: fixtureText('dev_revision', company, `Proposal ${proposalNumber(version.proposal)}, iteration ${version.version + 1}`),
      check: designLanguageCheck,
    });
    const { prompt: content, summary } = splitClientSummary(raw);
    const [promptId] = await insertPrompts([
      {
        lead_id: leadId,
        form_id: onboarding.id,
        kind: 'revision',
        proposal: version.proposal,
        reference_slug: brief?.reference_slug ?? null,
        design_version_id: version.id,
        content,
        client_summary: summary,
        model: modelId,
        created_by: by,
      },
    ]);
    if (promptId) await markAddressed(leadId, [...mine, ...carry].map((c) => c.id), promptId);
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
    design: { proposal: version.proposal, iteration: version.version, reference: referenceName(brief?.reference_slug ?? null) } as DesignForPrompt,
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
    const pages = pageListsFromDesign(approved.brief?.content ?? null);
    const prompt = buildPromptInput(context, {
      project: project.draft_slug ?? slugify(company),
      cms: cmsBooked(lead.config),
      design: approved.design,
      designBrief: approved.brief?.content ?? null,
      pagesInDesign: pages.designed,
      pagesNotDesigned: pages.notDesigned,
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
