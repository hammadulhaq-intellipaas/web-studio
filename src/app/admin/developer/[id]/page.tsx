import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { LocalTime } from '@/components/admin/LocalTime';
import { ONB_STATUS_COLORS, STATUS_COLORS } from '@/lib/admin/format';
import { loadDeveloperClient, type DeveloperOnboarding } from '@/lib/developer/clients';
import { buildPromptContext, REFERENCE_FIELD, type PromptContext } from '@/lib/developer/context';
import { loadVersions, type DesignVersion } from '@/lib/developer/designs';
import { slugify } from '@/lib/developer/drafts';
import { defaultReferences } from '@/lib/developer/messages';
import { cmsBooked, setupCommands } from '@/lib/developer/setup';
import { designsSchemaReady, developerSchemaReady, loadProject, loadPrompts, type DeveloperProject, type StoredPrompt } from '@/lib/developer/store';
import type { Lead } from '@/lib/types';
import { getOnboardingDefinition } from '@/lib/onboarding/definition';
import { BuildPanel } from '@/components/admin/developer/BuildPanel';
import { DesignPromptsPanel, type DesignPromptRow, type ReferenceChoice } from '@/components/admin/developer/DesignPromptsPanel';
import { DesignVersionsPanel } from '@/components/admin/developer/DesignVersionsPanel';
import { HandoverPanel } from '@/components/admin/developer/HandoverPanel';
import type { GeneratedRow } from '@/components/admin/developer/PromptView';
import { DEVELOPER_TABS, parseTab, promptsReady, type DeveloperTab } from '@/lib/developer/filters';

export const dynamic = 'force-dynamic';
// Generating both design proposals is two long model calls; unpacking an upload stores every file.
export const maxDuration = 300;

interface DesignData {
  formReady: boolean;
  schemaReady: boolean;
  locked: boolean;
  notes: string;
  choices: ReferenceChoice[];
  defaults: { A: string | null; B: string | null };
  prompts: DesignPromptRow[];
}

const TAB_LABELS: Record<DeveloperTab, string> = { design: 'Design', build: 'Build', handover: 'Handover' };

function Card({ title, children, testId }: { title: string; children: React.ReactNode; testId?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5" data-testid={testId}>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </div>
  );
}

/** What every tab needs once the Developers tables exist. */
interface Workspace {
  formReady: boolean;
  designsReady: boolean;
  project: DeveloperProject;
  versions: DesignVersion[];
  draftBase: string | null;
}

const generated = (rows: StoredPrompt[]): GeneratedRow[] =>
  rows.map((p) => ({ id: p.id, content: p.content, model: p.model, created_by: p.created_by, created_at: p.created_at }));

function OnboardingStatus({ onboarding }: { onboarding: DeveloperOnboarding | null }) {
  if (!onboarding) {
    return <p className="text-sm text-slate-600">No onboarding form exists for this quote yet.</p>;
  }
  if (promptsReady(onboarding.status)) {
    return (
      <div className="space-y-3 text-sm text-slate-600">
        <p>
          Confirmed{onboarding.confirmed?.name ? ` by ${onboarding.confirmed.name}` : ''}
          {onboarding.confirmed?.at ? (
            <>
              {' '}on <LocalTime iso={onboarding.confirmed.at} />
            </>
          ) : null}
          . This is the context the design prompts are generated from.
        </p>
        <Link href={`/admin/onboarding/${onboarding.id}`} className="inline-block font-semibold text-blue-700 hover:underline">
          View the form answers
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-3 text-sm text-slate-600">
      <p>
        The client has not confirmed the onboarding form yet
        {onboarding.current_step ? ` (currently on step "${onboarding.current_step}")` : ''}. Design prompts are generated once it is
        confirmed.
      </p>
      <Link href={`/admin/onboarding/${onboarding.id}`} className="inline-block font-semibold text-blue-700 hover:underline">
        Open the onboarding form
      </Link>
    </div>
  );
}

/** The context the prompts are built from, as a readable summary for a final review. */
function FormDataCard({ context }: { context: PromptContext }) {
  const count = context.sections.reduce((n, s) => n + s.answers.length, 0);
  return (
    <Card title="Form data" testId="dev-form-data">
      <p className="mb-3 text-sm text-slate-600">
        {count} answers from the onboarding form{context.confirmedAt ? '' : ' (not confirmed yet, so they can still change)'}. The design
        prompts are built from exactly this.
      </p>
      <div className="mb-4 grid gap-1 text-sm sm:grid-cols-[120px_1fr]">
        <span className="font-semibold text-slate-500">Package</span>
        <span>{context.quote.package ?? <span className="text-slate-400">Not chosen</span>}</span>
        <span className="font-semibold text-slate-500">Add-ons</span>
        <span>{context.quote.addons.length ? context.quote.addons.join(', ') : <span className="text-slate-400">None</span>}</span>
      </div>
      {count === 0 ? (
        <p className="text-sm text-slate-500">The client has not answered anything yet.</p>
      ) : (
        <div className="space-y-2">
          {context.sections.map((s) => (
            <details key={s.screen} className="rounded-lg border border-slate-200" data-testid={`dev-section-${s.screen}`}>
              <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold">
                {s.title} <span className="font-normal text-slate-400">· {s.answers.length}</span>
              </summary>
              <dl className="space-y-3 border-t border-slate-100 px-4 py-3">
                {s.answers.map((a) => (
                  <div key={a.key}>
                    <dt className="text-xs font-semibold text-slate-500">{a.question}</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-800">{a.answer}</dd>
                  </div>
                ))}
              </dl>
            </details>
          ))}
        </div>
      )}
    </Card>
  );
}

function ReferencesCard({ context }: { context: PromptContext }) {
  return (
    <Card title="Reference websites" testId="dev-references">
      {context.referenceSites.length === 0 ? (
        <p className="text-sm text-slate-600">
          The client did not pick any of our example websites. Their own references, if any, are in the form data above.
        </p>
      ) : (
        <ul className="space-y-2">
          {context.referenceSites.map((r) => (
            <li key={r.slug} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-semibold">{r.name}</span>
              {r.url && (
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
                  {r.url.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')}
                </a>
              )}
              {r.spec ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                  Layout spec ready · {r.spec.split('\n').length} lines
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">No layout spec</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function DesignTab({
  leadId,
  onboarding,
  context,
  data,
  workspace,
  revisions,
}: {
  leadId: string;
  onboarding: DeveloperOnboarding | null;
  context: PromptContext | null;
  data: DesignData | null;
  workspace: Workspace | null;
  revisions: StoredPrompt[];
}) {
  const project = workspace?.project;
  return (
    <div className="space-y-4" data-testid="dev-panel-design">
      <Card title="Onboarding form" testId="dev-onboarding">
        <OnboardingStatus onboarding={onboarding} />
      </Card>
      {context && <FormDataCard context={context} />}
      {context && <ReferencesCard context={context} />}
      <Card title="Design prompts">
        <p className="mb-4 text-sm text-slate-600">
          Review the form data, then generate two Claude Design prompts (Proposal A and Proposal B), each built on one reference
          website. Copy each prompt into Claude Design.
        </p>
        {data ? (
          <DesignPromptsPanel leadId={leadId} {...data} />
        ) : (
          <p className="text-sm text-slate-500">Prompts are generated once the client has an onboarding form.</p>
        )}
      </Card>
      <Card title="Design versions" testId="dev-versions-card">
        {workspace && project ? (
          <DesignVersionsPanel
            leadId={leadId}
            schemaReady={workspace.designsReady}
            formReady={workspace.formReady}
            draftBase={workspace.draftBase}
            versions={workspace.versions.map((v) => ({
              id: v.id,
              proposal: v.proposal,
              label: v.label,
              status: v.status,
              error: v.error,
              file_count: v.file_count,
              size_bytes: v.size_bytes,
              original_name: v.original_name,
              uploaded_by: v.uploaded_by,
              created_at: v.created_at,
            }))}
            approved={project.approved_version_id ? { id: project.approved_version_id, at: project.approved_at, by: project.approved_by } : null}
            offline={project.drafts_offline}
            revisions={revisions.map((r) => ({ ...generated([r])[0], design_version_id: r.design_version_id }))}
          />
        ) : (
          <p className="text-sm text-slate-600">
            Uploaded Claude Design exports appear here, each version with its own link, until one is approved.
          </p>
        )}
      </Card>
    </div>
  );
}

/** Shown on Build and Handover while the Developers tables from migration 021 are missing. */
function MigrationNotice() {
  return (
    <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
      This tab needs migrations <code>20261028000021</code> and <code>20261028000022</code> to be run in Supabase first.
    </p>
  );
}

function BuildTab({ lead, company, workspace, prompts }: { lead: Lead; company: string; workspace: Workspace | null; prompts: StoredPrompt[] }) {
  const project = workspace?.project;
  const approved = workspace?.versions.find((v) => v.id === project?.approved_version_id);
  const name = project?.draft_slug ?? slugify(company);
  const cms = cmsBooked(lead.config);
  return (
    <div className="space-y-4" data-testid="dev-panel-build">
      <Card title="Build with Claude Code">
        {workspace && project ? (
          <BuildPanel
            leadId={lead.id}
            schemaReady={workspace.designsReady}
            formReady={workspace.formReady}
            approved={approved ? { label: approved.label, proposal: approved.proposal } : null}
            instructions={project.dev_instructions}
            project={name}
            cms={cms}
            setup={setupCommands(name)}
            prompts={generated(prompts)}
          />
        ) : (
          <MigrationNotice />
        )}
      </Card>
    </div>
  );
}

function HandoverTab({ lead, company, workspace, docs }: { lead: Lead; company: string; workspace: Workspace | null; docs: StoredPrompt[] }) {
  const project = workspace?.project;
  const cms = cmsBooked(lead.config);
  return (
    <div className="space-y-4" data-testid="dev-panel-handover">
      <Card title="Handover document">
        {workspace && project ? (
          <>
            <p className="mb-4 text-sm text-slate-600">
              Add the live website link{cms ? ' and the CMS link' : ''}, then generate the document that walks the client through their
              website{cms ? ' and the CMS' : ''}.
            </p>
            <HandoverPanel
              leadId={lead.id}
              schemaReady={workspace.designsReady}
              formReady={workspace.formReady}
              liveUrl={project.live_url}
              cmsUrl={project.cms_url}
              cms={cms}
              offline={project.drafts_offline}
              hasDrafts={workspace.versions.length > 0}
              fileName={`${slugify(company)}-handover.md`}
              docs={generated(docs)}
            />
          </>
        ) : (
          <MigrationNotice />
        )}
      </Card>
    </div>
  );
}

/** The site's own origin, for full draft links to copy and send. */
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'web-studio.intellipaas.io';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export default async function DeveloperClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  const client = await loadDeveloperClient(id);
  if (!client) notFound();
  const { lead, onboarding } = client;
  const tab = parseTab(rawTab);
  const name = [lead.vorname, lead.nachname].filter(Boolean).join(' ');
  const company = lead.firma || name || 'client';
  const formReady = Boolean(onboarding && promptsReady(onboarding.status));

  let workspace: Workspace | null = null;
  const schemaReady = await developerSchemaReady();
  if (schemaReady) {
    const [project, designsReady] = await Promise.all([loadProject(lead.id), designsSchemaReady()]);
    const versions = designsReady ? await loadVersions(lead.id) : [];
    const draftBase = project.draft_slug ? `${await siteOrigin()}/drafts/${project.draft_slug}` : null;
    workspace = { formReady, designsReady, project, versions, draftBase };
  }
  const kindFor: Record<DeveloperTab, 'revision' | 'build' | 'handover'> = { design: 'revision', build: 'build', handover: 'handover' };
  const tabPrompts = workspace ? await loadPrompts(lead.id, kindFor[tab]) : [];

  const context = tab === 'design' && onboarding ? await buildPromptContext(lead, onboarding.id) : null;
  let design: DesignData | null = null;
  if (context && onboarding) {
    const definition = await getOnboardingDefinition();
    const project = workspace?.project ?? null;
    const prompts = schemaReady ? await loadPrompts(lead.id, 'design') : [];
    const picks = context.referenceSites.map((r) => r.slug);
    design = {
      formReady,
      schemaReady,
      locked: Boolean(project?.approved_version_id),
      notes: project?.internal_notes ?? '',
      choices: (definition.fields.find((f) => f.id === REFERENCE_FIELD)?.options ?? []).map((o) => ({
        value: o.value,
        label: o.label_en,
        pickedByClient: picks.includes(o.value),
      })),
      defaults: defaultReferences(picks),
      prompts: prompts.map((p) => ({
        id: p.id,
        proposal: p.proposal,
        reference_slug: p.reference_slug,
        content: p.content,
        model: p.model,
        created_by: p.created_by,
        created_at: p.created_at,
      })),
    };
  }

  return (
    <div>
      <Link href="/admin/developer" className="text-sm font-semibold text-slate-500 hover:text-blue-600">
        ← Developers
      </Link>

      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold tracking-tight" data-testid="dev-title">
              {lead.firma || name || lead.email}
              {lead.firma && name ? <span className="font-semibold text-slate-400"> · {name}</span> : null}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
              <a className="text-blue-700 hover:underline" href={`mailto:${lead.email}`}>
                {lead.email}
              </a>
              <span className="uppercase">{lead.locale}</span>
              {lead.config?.bundleName && <span>{lead.config.bundleName}</span>}
              <span>
                Quote created <LocalTime iso={lead.created_at} />
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLORS[lead.status] ?? ''}`}>Quote: {lead.status}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                onboarding ? ONB_STATUS_COLORS[onboarding.status] ?? '' : 'bg-slate-100 text-slate-500'
              }`}
            >
              Onboarding: {onboarding ? onboarding.status.replace('_', ' ') : 'not started'}
            </span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-4 text-sm font-semibold">
          <Link href={`/admin/leads/${lead.id}`} className="text-blue-700 hover:underline">
            Open the quote
          </Link>
          {onboarding && (
            <Link href={`/admin/onboarding/${onboarding.id}`} className="text-blue-700 hover:underline">
              Open the onboarding form
            </Link>
          )}
        </div>
      </div>

      <nav className="mb-4 mt-6 flex gap-1" aria-label="Developer steps">
        {DEVELOPER_TABS.map((t) => (
          <Link
            key={t}
            href={`/admin/developer/${lead.id}?tab=${t}`}
            data-testid={`dev-tab-${t}`}
            aria-current={tab === t ? 'page' : undefined}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              tab === t ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {TAB_LABELS[t]}
          </Link>
        ))}
      </nav>

      {tab === 'design' && (
        <DesignTab leadId={lead.id} onboarding={onboarding} context={context} data={design} workspace={workspace} revisions={tabPrompts} />
      )}
      {tab === 'build' && <BuildTab lead={lead} company={company} workspace={workspace} prompts={tabPrompts} />}
      {tab === 'handover' && <HandoverTab lead={lead} company={company} workspace={workspace} docs={tabPrompts} />}
    </div>
  );
}
