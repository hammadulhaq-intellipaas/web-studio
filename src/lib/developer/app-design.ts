import 'server-only';
import { randomUUID } from 'node:crypto';
import { getOnboardingDefinition } from '@/lib/onboarding/definition';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { modelReachable } from '@/lib/ai/provider';
import { fixtureMode } from '@/lib/onboarding/ai/client';
import {
  APP_FIX_STEP,
  APP_PAGE_STEP,
  APP_SYSTEM_STEP,
  filesFrom,
  pagePlan,
  problemCount,
  problemLines,
  referencedAssets,
  type PageCheck,
} from './app-design-shared';
import { loadDeveloperClient } from './clients';
import { contentTypeFor, DESIGN_BUCKET, nextLabel, siteKey } from './drafts';
import { ensureDraftSlug, ensureReviewToken, loadVersions, type DesignVersion } from './designs';
import type { Proposal } from './messages';
import { callText } from './model-call';
import { downloadAsset, loadSiteRead, siteReadsReady } from './old-site-read';
import { isClientSource } from './reference-sources';
import { loadPrompts } from './store';
import { zip } from './zip';

/**
 * A design made in the app from a proposal's design prompt, by Claude Opus (through OpenRouter) or
 * GPT Sol, stored as a design version like an upload: it gets a review link, comments and the
 * approve button. Made in steps, each its own request (auto.ts): the design system, one page per
 * step, the client's files, the checks at seven screen widths, one round of fixes, the zip.
 */

export type BuildPhase = 'system' | 'page' | 'assets' | 'check' | 'fix' | 'recheck' | 'finish';
export interface BuildStep {
  step: 'build';
  versionId: string;
  phase: BuildPhase;
  index?: number;
}

export interface BuildProgress {
  phase: BuildPhase | 'done';
  pages: { name: string; file: string }[];
  log: string[];
  /** The design prompt it was made from. */
  promptId: string;
  /** Reference picture for the model (the gallery screenshot of the proposal's reference), if any. */
  referenceSlug: string | null;
}

const db = () => createSupabaseAdminClient();
const PAGE_MS = 270_000;

interface VersionRow extends DesignVersion {
  made_by: string | null;
  progress: BuildProgress | null;
  checks: { pages: PageCheck[]; fixed: boolean; problems: string[] } | null;
}

async function loadVersion(versionId: string): Promise<VersionRow | null> {
  const { data } = await db().from('developer_design_versions').select('*').eq('id', versionId).maybeSingle();
  return (data as VersionRow | null) ?? null;
}

async function update(versionId: string, patch: Partial<VersionRow>): Promise<void> {
  const { error } = await db().from('developer_design_versions').update(patch).eq('id', versionId);
  if (error) throw new Error(`Saving the design failed: ${error.message}`);
}

async function note(version: VersionRow, phase: BuildPhase | 'done', line: string, extra: Partial<BuildProgress> = {}) {
  const progress = { ...version.progress!, ...extra, phase, log: [...(version.progress?.log ?? []), `${new Date().toISOString().slice(11, 19)} ${line}`].slice(-40) };
  await update(version.id, { progress });
  version.progress = progress;
}

async function writeFile(version: VersionRow, path: string, data: Buffer | string): Promise<void> {
  const body = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  const { error } = await db().storage.from(DESIGN_BUCKET).upload(siteKey(version.lead_id, version.id, path), body, { contentType: contentTypeFor(path), upsert: true });
  if (error) throw new Error(`Storing ${path} failed: ${error.message}`);
}

async function readFile(version: VersionRow, path: string): Promise<string | null> {
  const { data, error } = await db().storage.from(DESIGN_BUCKET).download(siteKey(version.lead_id, version.id, path));
  return error || !data ? null : Buffer.from(await data.arrayBuffer()).toString('utf8');
}

/** Whether the version columns exist (migration 20261118000034). */
export async function appDesignsReady(): Promise<boolean> {
  const { error } = await db().from('developer_design_versions').select('made_by').limit(1);
  return !error;
}

/**
 * Starts a design in the app for one proposal, from its newest design prompt. Returns the new
 * version's id; the steps run in the background.
 */
export async function startAppDesign(leadId: string, proposal: Proposal, modelId: string, by: string | null): Promise<{ ok: true; step: BuildStep } | { ok: false; error: string }> {
  if (!(await appDesignsReady())) return { ok: false, error: 'Run migration 20261118000034 first.' };
  if (!fixtureMode() && !modelReachable(modelId)) {
    return { ok: false, error: `${modelId} needs OPENROUTER_API_KEY in the environment.` };
  }
  const prompt = (await loadPrompts(leadId, 'design')).find((p) => p.proposal === proposal);
  if (!prompt) return { ok: false, error: `Proposal ${proposal === 'A' ? 1 : 2} has no design prompt yet.` };
  const project = await db().from('developer_projects').select('approved_version_id, chosen_proposal').eq('lead_id', leadId).maybeSingle();
  if (project.data?.approved_version_id) return { ok: false, error: 'The design is approved and locked. Reopen it first.' };
  // Like an upload (startUpload in designs.ts): the client's draft address and review link exist
  // before the first design, or a client whose first design is made here has no link to open it.
  const client = await loadDeveloperClient(leadId);
  const name = client?.lead.firma || [client?.lead.vorname, client?.lead.nachname].filter(Boolean).join(' ') || 'client';
  await ensureDraftSlug(leadId, name);
  await ensureReviewToken(leadId);
  const existing = await loadVersions(leadId);
  const { version, label } = nextLabel(proposal, existing);
  const id = randomUUID();
  const progress: BuildProgress = {
    phase: 'system',
    pages: [],
    log: [`${new Date().toISOString().slice(11, 19)} started with ${modelId}`],
    promptId: prompt.id,
    referenceSlug: prompt.reference_slug && !isClientSource(prompt.reference_slug) ? prompt.reference_slug : null,
  };
  const { error } = await db()
    .from('developer_design_versions')
    .insert({
      id,
      lead_id: leadId,
      proposal,
      version,
      label,
      original_path: `${leadId}/${id}/original/${label}.zip`,
      original_name: `${label}.zip`,
      status: 'uploading',
      uploaded_by: by,
      made_by: modelId,
      progress,
    });
  if (error) return { ok: false, error: `Starting the design failed: ${error.message}` };
  return { ok: true, step: { step: 'build', versionId: id, phase: 'system' } };
}

/** The gallery screenshot of the proposal's reference website, for the model to look at. */
async function referencePicture(origin: string, slug: string | null): Promise<{ image: Buffer; mediaType: string }[]> {
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return [];
  try {
    const res = await fetch(`${origin}/onboarding/reference-sites/${slug}.jpg`, { signal: AbortSignal.timeout(10_000) });
    return res.ok ? [{ image: Buffer.from(await res.arrayBuffer()), mediaType: 'image/jpeg' }] : [];
  } catch {
    return [];
  }
}

const fence = (path: string, content: string) => `\`\`\`file:${path}\n${content}\n\`\`\``;

/** Runs one step of a design made in the app; returns the next one, or null when it is done. */
export async function runBuildStep(leadId: string, step: BuildStep, origin: string): Promise<BuildStep | null> {
  const version = await loadVersion(step.versionId);
  if (!version || version.lead_id !== leadId || version.status !== 'uploading' || !version.progress) return null;
  const client = await loadDeveloperClient(leadId);
  if (!client?.onboarding) return null;
  const formId = client.onboarding.id;
  const settings = (await getOnboardingDefinition()).settings;
  const model = fixtureMode() ? 'fixture' : (version.made_by ?? settings.designModel);
  const brief = (await loadPrompts(leadId, 'design')).find((p) => p.id === version.progress!.promptId)?.content ?? '';
  const company = client.lead.firma ?? 'Client';

  try {
    if (step.phase === 'system') {
      const answer = await callText({
        formId,
        job: 'dev_app_design_system',
        modelId: model,
        system: APP_SYSTEM_STEP,
        prompt: brief,
        pictures: await referencePicture(origin, version.progress.referenceSlug),
        timeoutMs: PAGE_MS,
        maxOutputTokens: 32000,
        fixture: [
          fence('styles.css', 'body{font-family:system-ui;margin:0;font-size:17px}a.btn{display:inline-block;min-height:44px}'),
          fence('header.html', '<header><a href="index.html">Logo</a></header>'),
          fence('footer.html', '<footer>Footer</footer>'),
          fence('site.js', '//'),
          fence('pages.json', JSON.stringify([{ name: 'Startseite', file: 'index.html' }])),
        ].join('\n'),
      });
      const files = filesFrom(answer);
      const pages = pagePlan(files);
      if (!pages.length || !files.some((f) => f.path === 'styles.css')) throw new Error('The design system came back without styles.css or the page list.');
      for (const f of files.filter((f) => ['styles.css', 'header.html', 'footer.html', 'site.js'].includes(f.path))) await writeFile(version, f.path, f.content);
      await note(version, 'page', `design system ready: ${pages.map((p) => p.name).join(', ')}`, { pages });
      return { step: 'build', versionId: version.id, phase: 'page', index: 0 };
    }

    if (step.phase === 'page') {
      const i = step.index ?? 0;
      const page = version.progress.pages[i];
      if (!page) return { step: 'build', versionId: version.id, phase: 'assets' };
      const shared = await Promise.all(['styles.css', 'header.html', 'footer.html', 'site.js'].map(async (p) => fence(p, (await readFile(version, p)) ?? '')));
      const answer = await callText({
        formId,
        job: 'dev_app_design_page',
        modelId: model,
        system: APP_PAGE_STEP,
        prompt: `# The brief\n\n${brief}\n\n# The design system and shared parts\n\n${shared.join('\n\n')}\n\n# Pages of this design\n${version.progress.pages.map((p) => `- ${p.name}: ${p.file}`).join('\n')}\n\n# Your task\nWrite the page "${page.name}" as ${page.file}.`,
        pictures: i === 0 ? await referencePicture(origin, version.progress.referenceSlug) : [],
        timeoutMs: PAGE_MS,
        maxOutputTokens: 32000,
        fixture: fence(page.file, `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${page.name}</title><link rel="stylesheet" href="styles.css"></head><body><header><a href="index.html">${company}</a></header><main><h1>${page.name}</h1><p>Fixture page text that is long enough to be checked by the browser.</p></main></body></html>`),
      });
      const file = filesFrom(answer).find((f) => f.path === page.file) ?? filesFrom(answer).find((f) => f.path.endsWith('.html'));
      if (!file) throw new Error(`${page.name}: no page came back.`);
      await writeFile(version, page.file, file.content);
      const next = i + 1 < version.progress.pages.length;
      await note(version, next ? 'page' : 'assets', `${page.name} ready`);
      return next ? { step: 'build', versionId: version.id, phase: 'page', index: i + 1 } : { step: 'build', versionId: version.id, phase: 'assets' };
    }

    if (step.phase === 'assets') {
      // The client's own files the design uses, copied in next to the pages.
      const texts = await Promise.all(['styles.css', ...version.progress.pages.map((p) => p.file)].map((p) => readFile(version, p)));
      const wanted = referencedAssets(texts.filter((t): t is string => !!t));
      let copied = 0;
      if (wanted.length && (await siteReadsReady())) {
        const read = await loadSiteRead(leadId);
        for (const name of wanted) {
          const file = name.split('/').pop()!;
          const asset = read?.assets.find((a) => a.path.endsWith(`/${file}`));
          const data = asset ? await downloadAsset(asset.path) : null;
          if (!data) continue;
          await writeFile(version, `assets/current-site/${name}`, data);
          copied++;
        }
      }
      await note(version, 'check', `${copied} of ${wanted.length} files of the current website copied in`);
      return { step: 'build', versionId: version.id, phase: 'check' };
    }

    if (step.phase === 'check' || step.phase === 'recheck') {
      const { checkDesign } = await import('./app-design-check');
      const pages = await checkDesign(version, version.progress.pages);
      const problems = problemLines(pages);
      const fixed = step.phase === 'recheck';
      await update(version.id, { checks: { pages, fixed, problems } });
      const total = pages.reduce((n, p) => n + p.widths.reduce((m, w) => m + problemCount(w), 0), 0);
      await note(version, problems.length && !fixed ? 'fix' : 'finish', `checked at 7 widths: ${total ? `${total} problems` : 'no problems'}`);
      return problems.length && !fixed ? { step: 'build', versionId: version.id, phase: 'fix' } : { step: 'build', versionId: version.id, phase: 'finish' };
    }

    if (step.phase === 'fix') {
      const problems = version.checks?.problems ?? [];
      const affected = new Set(problems.map((l) => l.split(' at ')[0]));
      const files = await Promise.all(['styles.css', ...[...affected].filter((f) => f.endsWith('.html'))].map(async (p) => ({ p, c: await readFile(version, p) })));
      const fixModel = fixtureMode() ? 'fixture' : modelReachable(settings.fixModel) ? settings.fixModel : 'gpt-6-sol';
      const answer = await callText({
        formId,
        job: 'dev_app_design_fix',
        modelId: fixModel,
        system: APP_FIX_STEP,
        prompt: `# Problems\n${problems.map((l) => `- ${l}`).join('\n')}\n\n# Files\n\n${files.filter((f) => f.c).map((f) => fence(f.p, f.c!)).join('\n\n')}`,
        timeoutMs: PAGE_MS,
        maxOutputTokens: 32000,
        fixture: '',
      });
      const changed = filesFrom(answer).filter((f) => files.some((x) => x.p === f.path));
      for (const f of changed) await writeFile(version, f.path, f.content);
      await note(version, 'recheck', `${fixModel} fixed ${changed.map((f) => f.path).join(', ') || 'nothing'}`);
      return { step: 'build', versionId: version.id, phase: changed.length ? 'recheck' : 'finish' };
    }

    // finish: the file list, a zip like an upload, and the version is ready for its review link.
    const { data: listed } = await db().storage.from(DESIGN_BUCKET).list(`${leadId}/${version.id}/site`, { limit: 1000 });
    const paths = (listed ?? []).map((f) => Buffer.from(f.name, 'hex').toString('utf8')).filter((p) => !p.startsWith('checks/'));
    const files: { path: string; data: Buffer }[] = [];
    for (const path of paths) {
      const { data } = await db().storage.from(DESIGN_BUCKET).download(siteKey(leadId, version.id, path));
      if (data) files.push({ path, data: Buffer.from(await data.arrayBuffer()) });
    }
    const archive = zip(files);
    await db().storage.from(DESIGN_BUCKET).upload(version.original_path, archive, { contentType: 'application/zip', upsert: true });
    await update(version.id, {
      status: 'ready',
      entry_path: 'index.html',
      file_count: files.length,
      size_bytes: archive.length,
      manifest: Object.fromEntries(files.map((f) => [f.path, f.data.length])),
      error: null,
    });
    await note(version, 'done', `ready: ${files.length} files`);
    return null;
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err);
    await update(version.id, { status: 'failed', error: `${step.phase}${step.index !== undefined ? ` ${step.index + 1}` : ''}: ${why}` });
    await note(version, step.phase, `failed: ${why}`).catch(() => undefined);
    return null;
  }
}
