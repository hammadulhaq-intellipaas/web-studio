import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eur, STATUS_COLORS } from '@/lib/admin/format';
import { loadLeadDetail } from '@/lib/quotes/admin';
import { readableAnswers, readableStage2 } from '@/lib/quotes/answers';
import { diffConfigs } from '@/lib/quotes/diff';
import { customerLink } from '@/lib/quotes/links';
import { formLink } from '@/lib/onboarding/emails';
import { ensureOnboardingForm } from '@/lib/onboarding/ensure-form';
import { pickLocale } from '@/lib/types';
import { LocalTime } from '@/components/admin/LocalTime';
import { StatusSelect } from '@/components/admin/StatusSelect';
import { PlanPanel } from '@/components/admin/PlanPanel';
import { ActivityPanel } from '@/components/admin/leads/ActivityPanel';
import { LeadToolbar } from '@/components/admin/leads/LeadToolbar';
import { MigrationNotice } from '@/components/admin/leads/MigrationNotice';
import { OwnerSelect } from '@/components/admin/leads/OwnerSelect';
import { ChangeList, VersionsTimeline, type VersionRow } from '@/components/admin/leads/VersionsTimeline';

export const dynamic = 'force-dynamic';

function Section({ title, children, right, testId }: { title: string; children: React.ReactNode; right?: React.ReactNode; testId?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5" data-testid={testId}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex gap-2 py-0.5 text-sm">
      <span className="w-40 flex-none text-slate-500">{label}</span>
      <span className="min-w-0 whitespace-pre-wrap font-medium">{value}</span>
    </div>
  );
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await loadLeadDetail(id);
  // A removed lead is out of the CMS: its row lives on in the database, but nothing here
  // opens it again.
  if (!detail || detail.lead.archived_at) notFound();
  const { ready, lead, catalog, files, appointments, plans, versions, activity, live, onboardingForms, adminUsers } = detail;
  const config = lead.config;
  const link = lead.session_id ? customerLink(lead.session_id, lead.locale) : null;
  const persona = catalog.personas.find((p) => p.id === lead.persona_id);
  const personaLabel = persona ? pickLocale(persona as unknown as Record<string, unknown>, 'label', 'en') : lead.persona_id;
  const answers = readableAnswers(config?.answers, 'en');
  const stage2 = readableStage2(lead.stage2, 'en');
  const name = [lead.vorname, lead.nachname].filter(Boolean).join(' ');

  // Each version's changes against the one before it (oldest → newest, then back to newest first).
  const chronological = [...versions].sort((a, b) => a.version - b.version);
  const versionRows: VersionRow[] = chronological
    .map((v, i) => ({
      id: v.id,
      version: v.version,
      actor: v.actor,
      reason: v.reason,
      createdAt: v.created_at,
      oneTime: Number(v.totals?.oneTimeEffective ?? 0),
      monthly: Number(v.totals?.monthlyEffective ?? 0),
      yearly: Number(v.totals?.yearlyEffective ?? 0),
      bundleName: v.config?.bundleName ?? '—',
      addonCount: v.config?.addons?.length ?? 0,
      changes: i > 0 ? diffConfigs(chronological[i - 1].config, v.config) : [],
      lines: v.config?.lines ?? { oneOff: [], monthly: [], yearly: [] },
      voucher: v.config?.voucher ? `${v.config.voucher.code} (−${v.config.voucher.percent}%)` : null,
    }))
    .reverse();

  // Leads submitted since the brief went live already have a form; opening an older one
  // here backfills it, so the link the team copies is the same link the customer is sent.
  let onboarding = onboardingForms[0] ?? null;
  if (!onboarding) {
    const backfilled = await ensureOnboardingForm(lead.id).catch(() => null);
    if (backfilled) onboarding = { id: backfilled, company: lead.firma, status: 'in_progress', locale: lead.locale, created_at: new Date().toISOString() };
  }
  const onboardingLink = onboarding ? formLink(onboarding.id, lead.locale) : null;

  return (
    <div>
      <Link href="/admin/leads" className="text-sm font-semibold text-slate-500 hover:text-blue-600">
        ← Leads
      </Link>

      {!ready && <div className="mt-4"><MigrationNotice /></div>}

      {/* ------------------------------------------------------------ header */}
      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold tracking-tight" data-testid="lead-title">
              {name || lead.email}
              {lead.firma ? <span className="font-semibold text-slate-400"> · {lead.firma}</span> : null}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
              <a className="text-blue-700 hover:underline" href={`mailto:${lead.email}`}>
                {lead.email}
              </a>
              {lead.telefon && <a className="hover:underline" href={`tel:${lead.telefon}`}>{lead.telefon}</a>}
              <span className="uppercase">{lead.locale}</span>
              {lead.source === 'team' && (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">team quote</span>
              )}
              <span>
                Created <LocalTime iso={lead.created_at} />
              </span>
              {lead.submitted_at && lead.submitted_at !== lead.created_at && (
                <span>
                  Last submit <LocalTime iso={lead.submitted_at} />
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusSelect leadId={lead.id} status={lead.status} />
            <OwnerSelect leadId={lead.id} owner={lead.owner_email} users={adminUsers} disabled={!ready} />
          </div>
        </div>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <LeadToolbar
            leadId={lead.id}
            ready={ready}
            customerLink={link}
            configuratorHref={link ? `${lead.locale === 'en' ? '/en' : '/'}?c=${lead.session_id}` : null}
            status={lead.status}
            onboardingFormId={onboarding?.id ?? null}
            onboardingFormHref={onboarding ? `/admin/onboarding/${onboarding.id}` : null}
            onboardingCustomerLink={onboardingLink}
          />
          {link && (
            <div className="mt-2 text-xs text-slate-500" data-testid="lead-customer-link">
              Customer link: <a className="text-blue-700" href={link} target="_blank" rel="noreferrer">{link}</a>
            </div>
          )}
          {onboardingLink && (
            <div className="mt-1 text-xs text-slate-500" data-testid="lead-onboarding-link">
              Brief link: <a className="text-blue-700" href={onboardingLink} target="_blank" rel="noreferrer">{onboardingLink}</a>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------ body */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section
            title={lead.status === 'draft' ? 'Draft quote' : 'Submitted quote'}
            testId="lead-quote"
            right={
              lead.agreed_version_id || lead.agreed_one_time != null ? (
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLORS.agreed}`} data-testid="lead-agreed-amount">
                  agreed: {eur(lead.agreed_one_time ?? 0)} + {eur(lead.agreed_monthly ?? 0)}/mo.
                </span>
              ) : null
            }
          >
            <div className="mb-2 text-sm font-bold">
              {config.bundleName}
              {config.aiBundle ? ' + AI Agentic Bundle' : ''}
            </div>
            <KV label="Care / Support / CF" value={`${config.care} / ${config.support} / ${config.cf}`} />
            <KV label="Backup upgrade" value={config.backupUp ? 'yes' : 'no'} />
            <KV label="Payment cycle" value={config.payYearly ? 'yearly' : 'monthly'} />
            <KV label="Voucher" value={config.voucher ? `${config.voucher.code} (−${config.voucher.percent}%)` : null} />
            <div className="mt-3 border-t border-slate-100 pt-3">
              {(config.lines?.oneOff ?? []).map((l, i) => (
                <div key={`o${i}`} className="flex justify-between py-0.5 text-sm">
                  <span>{l.name}</span>
                  <span className="font-medium">{eur(l.price)}</span>
                </div>
              ))}
              {(config.lines?.monthly ?? []).map((l, i) => (
                <div key={`m${i}`} className="flex justify-between py-0.5 text-sm text-blue-900">
                  <span>{l.name}</span>
                  <span className="font-medium">{eur(l.price)}/mo.</span>
                </div>
              ))}
              {(config.lines?.yearly ?? []).map((l, i) => (
                <div key={`y${i}`} className="flex justify-between py-0.5 text-sm">
                  <span>{l.name}</span>
                  <span className="font-medium">{eur(l.price)}/yr.</span>
                </div>
              ))}
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-sm font-extrabold">
                <span>Totals</span>
                <span data-testid="lead-totals">
                  {eur(lead.total_one_time)} + {eur(lead.total_monthly)}/mo.
                  {Number(lead.total_yearly) > 0 ? ` + ${eur(lead.total_yearly)}/yr.` : ''}
                </span>
              </div>
            </div>
            {live?.differs && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3" data-testid="lead-live-differs">
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-bold text-amber-900">Live configuration differs from the submitted quote</span>
                  <span className="text-xs text-amber-800">
                    {live.lastActor?.startsWith('team:') ? live.lastActor.slice(5) : 'Customer'} · <LocalTime iso={live.updatedAt} /> · now{' '}
                    {eur(live.priced.totals.oneTimeEffective)} + {eur(live.priced.totals.monthlyEffective)}/mo.
                  </span>
                </div>
                <ChangeList changes={live.changes} />
                <p className="mt-2 text-xs text-amber-800">Not submitted yet. It is saved as a version automatically when the editing pauses, or with “Save version now”.</p>
              </div>
            )}
            {live && !live.differs && lead.session_id && (
              <p className="mt-3 text-xs text-slate-400">
                Live configuration matches the submitted quote · last opened <LocalTime iso={live.updatedAt} />
              </p>
            )}
          </Section>

          <Section title={`Versions (${versions.length})`} testId="lead-versions-section">
            <VersionsTimeline leadId={lead.id} versions={versionRows} agreedVersionId={lead.agreed_version_id} ready={ready} />
          </Section>

          <Section title="Questionnaire" testId="lead-answers">
            <KV label="Persona" value={personaLabel} />
            <KV label="Existing site" value={lead.source_url} />
            {answers.length === 0 ? (
              <p className="text-sm text-slate-500">No questionnaire answers (team-created quote).</p>
            ) : (
              <div className="mt-2 divide-y divide-slate-100">
                {answers.map((a) => (
                  <div key={a.id} className="grid grid-cols-1 gap-1 py-1.5 text-sm sm:grid-cols-2">
                    <span className="text-slate-500">{a.question}</span>
                    <span className="font-medium" data-testid={`answer-${a.id}`}>
                      {a.answer}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {config.siteNotes && <KV label="Notes on existing site" value={config.siteNotes} />}
            <KV label="Stated goal" value={lead.ziel} />
          </Section>

          <Section title="Content intake" testId="lead-stage2">
            {stage2.length === 0 && !lead.drive_link ? (
              <p className="text-sm text-slate-500">No content provided yet.</p>
            ) : (
              <>
                {stage2.map((f) => (
                  <KV key={f.key} label={f.label} value={f.key === 'driveLink' ? <a href={f.value} className="text-blue-700" target="_blank">{f.value}</a> : f.value} />
                ))}
              </>
            )}
          </Section>

          <Section title="Uploaded files">
            {files.length === 0 ? (
              <p className="text-sm text-slate-500">No files uploaded.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center gap-2">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold uppercase text-slate-500">{f.kind}</span>
                    {f.url ? (
                      <a href={f.url} target="_blank" className="font-medium text-blue-700 hover:underline">
                        {f.file_name}
                      </a>
                    ) : (
                      <span>{f.file_name}</span>
                    )}
                    <span className="text-xs text-slate-400">{(f.size_bytes / 1024 / 1024).toFixed(1)} MB</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Appointment">
            {appointments.length === 0 ? (
              <p className="text-sm text-slate-500">No appointment scheduled yet.</p>
            ) : (
              appointments.map((a) => (
                <div key={a.id} className="mb-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                  <div className="font-bold">
                    <LocalTime iso={a.start_time} />
                    {a.status === 'canceled' && (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">canceled</span>
                    )}
                  </div>
                  <div className="text-slate-600">
                    {a.invitee_name} · {a.invitee_email}
                  </div>
                  {a.cancel_reason && <div className="text-xs text-slate-500">Reason: {a.cancel_reason}</div>}
                </div>
              ))
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Activity & notes" testId="lead-activity-section">
            <ActivityPanel leadId={lead.id} activity={activity} ready={ready} />
          </Section>

          <Section title="Details">
            <KV label="Company" value={lead.firma} />
            <KV label="Phone" value={lead.telefon} />
            <KV label="Locale" value={lead.locale} />
            <KV label="Source" value={lead.source === 'team' ? 'Created by the team' : 'Website configurator'} />
            <KV label="Primary goal" value={lead.goal} />
            <KV label="Consent" value={lead.consent_at ? <LocalTime iso={lead.consent_at} /> : 'not given yet'} />
            <KV label="Owner" value={lead.owner_email} />
            {lead.agreed_at && (
              <KV label="Agreed" value={<><LocalTime iso={lead.agreed_at} />{lead.agreed_by ? ` by ${lead.agreed_by}` : ''}</>} />
            )}
            <KV label="Link" value={link ? 'active' : ready ? 'none yet (create one above)' : 'available after the migration'} />
          </Section>

          <Section title="Onboarding" testId="lead-onboarding">
            {!onboarding ? (
              <p className="text-sm text-slate-500">No onboarding form yet — it is created with the lead, so this only happens if that failed.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {(onboardingForms.length ? onboardingForms : [onboarding]).map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-2">
                    <Link href={`/admin/onboarding/${f.id}`} className="font-semibold text-blue-700 hover:underline">
                      {f.company || f.id}
                    </Link>
                    <span className="text-xs text-slate-500">
                      {f.status.replace('_', ' ')} · <LocalTime iso={f.created_at} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>

      <details open className="mt-8 rounded-xl border border-slate-200 bg-white" data-testid="lead-plan-details">
        <summary className="cursor-pointer px-5 py-4 text-sm font-bold uppercase tracking-wide text-slate-500">Suggested build plan</summary>
        <div className="border-t border-slate-100 p-5">
          <PlanPanel leadId={lead.id} plans={plans} />
        </div>
      </details>
    </div>
  );
}
