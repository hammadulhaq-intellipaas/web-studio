import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LocalTime } from '@/components/admin/LocalTime';
import { ONB_STATUS_COLORS, STATUS_COLORS } from '@/lib/admin/format';
import { loadDeveloperClient, type DeveloperOnboarding } from '@/lib/developer/clients';
import { DEVELOPER_TABS, parseTab, promptsReady, type DeveloperTab } from '@/lib/developer/filters';

export const dynamic = 'force-dynamic';

const TAB_LABELS: Record<DeveloperTab, string> = { design: 'Design', build: 'Build', handover: 'Handover' };

function Card({ title, children, testId }: { title: string; children: React.ReactNode; testId?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5" data-testid={testId}>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </div>
  );
}

/** A Phase 1 action that is planned but not wired up yet: shown, never clickable. */
function PendingAction({ label, note }: { label: string; note: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled className="cursor-not-allowed rounded-lg bg-slate-200 px-4 py-2 text-sm font-bold text-slate-500">
        {label}
      </button>
      <span className="text-xs text-slate-500">{note}</span>
    </div>
  );
}

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

function DesignTab({ onboarding }: { onboarding: DeveloperOnboarding | null }) {
  return (
    <div className="space-y-4" data-testid="dev-panel-design">
      <Card title="Onboarding form" testId="dev-onboarding">
        <OnboardingStatus onboarding={onboarding} />
      </Card>
      <Card title="Design prompts">
        <p className="mb-4 text-sm text-slate-600">
          Review the form data, then generate two Claude Design prompts (Proposal A and Proposal B) built from the client&apos;s chosen
          reference websites.
        </p>
        <PendingAction label="Generate the prompt for design" note="Not available yet: arrives in the next Phase 1 update." />
      </Card>
      <Card title="Design versions">
        <p className="text-sm text-slate-600">
          Uploaded Claude Design exports (HTML) appear here, each version with its own link, until one is approved.
        </p>
      </Card>
    </div>
  );
}

function BuildTab() {
  return (
    <div className="space-y-4" data-testid="dev-panel-build">
      <Card title="Developer instructions">
        <textarea
          disabled
          rows={4}
          placeholder="Tech stack and anything else Claude Code needs to know."
          className="mb-4 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
        />
        <PendingAction label="Generate the prompt for Claude Code to build" note="Not available yet: unlocks once a design is approved." />
      </Card>
    </div>
  );
}

function HandoverTab() {
  return (
    <div className="space-y-4" data-testid="dev-panel-handover">
      <Card title="Handover document">
        <p className="mb-4 text-sm text-slate-600">
          Add the live website link (and the CMS link, if there is one) to generate a handover document that walks the client through the
          website and the CMS.
        </p>
        <PendingAction label="Generate the handover document" note="Not available yet: unlocks once the website is live." />
      </Card>
    </div>
  );
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

      {tab === 'design' && <DesignTab onboarding={onboarding} />}
      {tab === 'build' && <BuildTab />}
      {tab === 'handover' && <HandoverTab />}
    </div>
  );
}
