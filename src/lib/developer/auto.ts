import 'server-only';
import { loadDeveloperClient } from './clients';
import { buildPromptContext } from './context';
import { AUTO_BY } from './auto-status';
import { getOnboardingDefinition } from '@/lib/onboarding/definition';
import { SITE_PHASES, type AutoStep } from './auto-trigger';
import { generateDesignProposals, generateReferenceSpec } from './generate';
import { describeSitePhotos, sortSiteContent } from './old-site-content';
import { beginSiteRead, downloadSiteAssets, loadSiteRead, readSitePages, saveSiteRead, siteReadsReady } from './old-site-read';
import { buildOwnSiteSpec } from './old-site-spec';
import { CLIENT_SITE, sourceKey } from './reference-sources';
import { latestSpec } from './reference-specs';
import { normalizeSiteUrl } from '@/lib/showcase/shared';
import { defaultReferences, PROPOSALS } from './messages';
import { clientChoices, isClientSource } from './reference-sources';
import { referenceSpecsReady } from './reference-specs';
import { developerSchemaReady, loadProject, loadPrompts } from './store';

/**
 * Writes both design prompts after the client confirms the onboarding form, so they are ready on
 * the Design tab when the team opens it. Proposal 1 and 2 follow the client's two design examples,
 * in the form's order. Runs as steps (see auto-trigger.ts), each in its own request: `begin` picks
 * the references, a `spec` step reads each of the client's own references, `prompts` writes both.
 *
 * Never overwrites anything: a client who already has design prompts, or an approved design, is
 * left alone. Failures are logged; the team can still generate on the Design tab.
 */
export async function runAutoStep(leadId: string, step: AutoStep, origin = ''): Promise<AutoStep | null> {
  const log = (msg: string) => console.log(`[developer/auto] ${leadId} ${step.step}: ${msg}`);

  if (step.step === 'build') {
    const { runBuildStep } = await import('./app-design');
    const started = Date.now();
    const next = await runBuildStep(leadId, step, origin);
    log(`${step.phase}${step.index !== undefined ? ` ${step.index + 1}` : ''} took ${Math.round((Date.now() - started) / 1000)} s`);
    return next;
  }

  if (step.step === 'begin') {
    if (!(await developerSchemaReady())) return log('developer tables missing'), null;
    const client = await loadDeveloperClient(leadId);
    if (!client?.onboarding) return log('no onboarding form'), null;
    // Form B: read the client's current website first; its content and brand go into the prompts.
    const context = await buildPromptContext(client.lead, client.onboarding.id);
    if (context?.funnel === 'B' && context.existingUrl && (await siteReadsReady())) {
      const url = await beginSiteRead(leadId, context.existingUrl);
      if (url) return log(`reading ${url}`), { step: 'site', phase: 'pages' };
      log(`"${context.existingUrl}" is not a public web address; not read`);
    }
    return { step: 'refs' };
  }

  if (step.step === 'site') {
    const started = Date.now();
    const next = SITE_PHASES[SITE_PHASES.indexOf(step.phase) + 1];
    const onward: AutoStep = next ? { step: 'site', phase: next } : { step: 'refs' };
    try {
      await runSitePhase(leadId, step.phase);
      log(`${step.phase} done in ${Math.round((Date.now() - started) / 1000)} s`);
    } catch (err) {
      const why = err instanceof Error ? err.message : String(err);
      log(`${step.phase} failed: ${why}`);
      const row = await loadSiteRead(leadId);
      if (row) await saveSiteRead(leadId, { notes: [...(row.notes ?? []), `${step.phase}: ${why}`] });
    }
    // A site that could not be read at all: go on with the prompts from the form alone.
    const row = await loadSiteRead(leadId);
    return row?.status === 'failed' ? { step: 'refs' } : onward;
  }

  if (step.step === 'refs') {
    const client = await loadDeveloperClient(leadId);
    if (!client?.onboarding) return log('no onboarding form'), null;
    if (await alreadyDone(leadId)) return log('prompts exist or design approved, left alone'), null;
    const context = await buildPromptContext(client.lead, client.onboarding.id);
    if (!context) return log('form not found'), null;
    const specsReady = await referenceSpecsReady();
    // The client's own sources only when they can be read (a link, or pictures the model can see).
    const usable = new Set(clientChoices(context.clientReferences, context.referenceShots).map((c) => c.value));
    const references = defaultReferences(context.examples, (value) => !isClientSource(value) || (specsReady && usable.has(value)));
    const own = [...new Set(PROPOSALS.map((p) => references[p]).filter((v): v is string => !!v && isClientSource(v)))];
    log(`proposal 1 ${references.A ?? 'none'}, proposal 2 ${references.B ?? 'none'}; ${own.length} own references to read`);
    return own.length ? { step: 'spec', value: own[0], queue: own.slice(1), references } : { step: 'prompts', references };
  }

  if (step.step === 'spec') {
    const started = Date.now();
    const spec = await generateReferenceSpec(leadId, step.value, false, AUTO_BY);
    // Without a spec the prompt still works from what the client wrote about the reference.
    log(spec.ok ? `${step.value} ready in ${Math.round((Date.now() - started) / 1000)} s${spec.cached ? ' (kept from earlier)' : ''}` : `${step.value} failed: ${spec.error}`);
    return step.queue.length
      ? { step: 'spec', value: step.queue[0], queue: step.queue.slice(1), references: step.references }
      : { step: 'prompts', references: step.references };
  }

  // Someone may have generated by hand while the specs were written.
  if (await alreadyDone(leadId)) return log('prompts exist or design approved, left alone'), null;
  const started = Date.now();
  const result = await generateDesignProposals(leadId, step.references, AUTO_BY);
  log(result.ok ? `both prompts written in ${Math.round((Date.now() - started) / 1000)} s` : `failed: ${result.error}`);
  return null;
}

/** One part of reading the client's current website (see old-site-read.ts). */
export async function runSitePhase(leadId: string, phase: (typeof SITE_PHASES)[number]): Promise<void> {
  const client = await loadDeveloperClient(leadId);
  if (!client?.onboarding) throw new Error('no onboarding form');
  const formId = client.onboarding.id;
  // Reading a website is the extraction model's job (dev_extract_model), not the onboarding assistant's.
  const model = (await getOnboardingDefinition()).settings.extractModel;
  if (phase === 'pages') return readSitePages(leadId);
  if (phase === 'assets') return downloadSiteAssets(leadId);
  if (phase === 'content') return sortSiteContent(leadId, formId, model);
  if (phase === 'photos') return describeSitePhotos(leadId, formId, model);
  if (phase === 'design') {
    // The measured design of the site (colours, fonts, layout), as for any reference website.
    const result = await generateReferenceSpec(leadId, CLIENT_SITE, false, AUTO_BY);
    if (!result.ok) throw new Error(result.error);
    return;
  }
  const row = await loadSiteRead(leadId);
  if (!row) throw new Error('No site read started.');
  const url = normalizeSiteUrl(row.url);
  const design = url ? await latestSpec(sourceKey({ kind: 'link', url })) : null;
  await saveSiteRead(leadId, { spec: buildOwnSiteSpec(row, design?.content ?? null), status: 'ready', step: null });
}

async function alreadyDone(leadId: string): Promise<boolean> {
  const [project, existing] = await Promise.all([loadProject(leadId), loadPrompts(leadId, 'design')]);
  return Boolean(project.approved_version_id) || existing.length > 0;
}
