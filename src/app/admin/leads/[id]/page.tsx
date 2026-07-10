import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { eur } from '@/lib/admin/format';
import { LocalTime } from '@/components/admin/LocalTime';
import { StatusSelect } from '@/components/admin/StatusSelect';
import { PlanPanel, type PlanRow } from '@/components/admin/PlanPanel';
import type { Appointment, Lead } from '@/lib/types';

export const dynamic = 'force-dynamic';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </div>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex gap-2 py-0.5 text-sm">
      <span className="w-44 flex-none text-slate-500">{label}</span>
      <span className="min-w-0 whitespace-pre-wrap font-medium">{value}</span>
    </div>
  );
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: leadData }, { data: filesData }, { data: apptsData }, { data: plansData }] =
    await Promise.all([
      supabase.from('leads').select('*').eq('id', id).maybeSingle(),
      supabase.from('lead_files').select('*').eq('lead_id', id).order('created_at'),
      supabase.from('appointments').select('*').eq('lead_id', id).order('start_time'),
      supabase
        .from('suggested_plans')
        .select('*')
        .eq('lead_id', id)
        .order('version', { ascending: false }),
    ]);

  if (!leadData) notFound();
  const lead = leadData as Lead;
  const appointments = (apptsData ?? []) as Appointment[];
  const plans = (plansData ?? []) as PlanRow[];
  const config = lead.config;
  const s2 = lead.stage2?.fields ?? {};

  // Signed URLs for the private bucket (1 hour). A customer-supplied SVG can carry script,
  // so it is served as a download rather than rendered in the browser.
  const admin = createSupabaseAdminClient();
  const files = await Promise.all(
    (filesData ?? []).map(async (f) => {
      const isSvg = f.mime_type === 'image/svg+xml';
      const { data } = await admin.storage
        .from('lead-uploads')
        .createSignedUrl(f.storage_path, 3600, isSvg ? { download: true } : undefined);
      return { ...f, url: data?.signedUrl ?? null };
    }),
  );

  return (
    <div>
      <Link href="/admin/leads" className="text-sm font-semibold text-slate-500 hover:text-blue-600">
        ← Leads
      </Link>
      <div className="mb-6 mt-2 flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight" data-testid="lead-title">
          {[lead.vorname, lead.nachname].filter(Boolean).join(' ') || lead.email}
          {lead.firma ? <span className="font-semibold text-slate-400"> · {lead.firma}</span> : null}
        </h1>
        <StatusSelect leadId={lead.id} status={lead.status} />
        <span className="text-sm text-slate-400"><LocalTime iso={lead.created_at} /></span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Contact">
          <KV label="Email" value={<a className="text-blue-700" href={`mailto:${lead.email}`}>{lead.email}</a>} />
          <KV label="Phone" value={lead.telefon} />
          <KV label="Company" value={lead.firma} />
          <KV label="Persona" value={lead.persona_id} />
          <KV label="Locale" value={lead.locale} />
          <KV label="Existing site" value={lead.source_url} />
          <KV label="Stated goal" value={lead.ziel} />
          <KV label="Primary goal" value={lead.goal} />
          <KV label="Consent" value={<LocalTime iso={lead.consent_at} />} />
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
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                      canceled
                    </span>
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

        <Section title="Configuration">
          <div className="mb-2 text-sm font-bold">
            {config.bundleName}
            {config.aiBundle ? ' + AI Agentic Bundle' : ''}
          </div>
          <KV label="Care / Support / CF" value={`${config.care} / ${config.support} / ${config.cf}`} />
          <KV label="Backup upgrade" value={config.backupUp ? 'yes' : 'no'} />
          <KV label="Payment cycle" value={config.payYearly ? 'yearly' : 'monthly'} />
          <KV
            label="Voucher"
            value={config.voucher ? `${config.voucher.code} (−${config.voucher.percent}%)` : null}
          />
          <div className="mt-3 border-t border-slate-100 pt-3">
            {config.lines.oneOff.map((l, i) => (
              <div key={`o${i}`} className="flex justify-between py-0.5 text-sm">
                <span>{l.name}</span>
                <span className="font-medium">{eur(l.price)}</span>
              </div>
            ))}
            {config.lines.monthly.map((l, i) => (
              <div key={`m${i}`} className="flex justify-between py-0.5 text-sm text-blue-900">
                <span>{l.name}</span>
                <span className="font-medium">{eur(l.price)}/mo.</span>
              </div>
            ))}
            {config.lines.yearly.map((l, i) => (
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
        </Section>

        <Section title="Questionnaire answers">
          {Object.entries(config.answers).map(([k, v]) =>
            v == null || (Array.isArray(v) && !v.length) ? null : (
              <KV key={k} label={k} value={Array.isArray(v) ? v.join(', ') : String(v)} />
            ),
          )}
        </Section>

        <Section title="Stage 2 — content">
          {Object.keys(s2).filter((k) => s2[k]?.trim()).length === 0 && !lead.drive_link ? (
            <p className="text-sm text-slate-500">No content provided yet.</p>
          ) : (
            <>
              {Object.entries(s2).map(([k, v]) => (v?.trim() ? <KV key={k} label={k} value={v} /> : null))}
              <KV
                label="Material link"
                value={
                  lead.drive_link ? (
                    <a href={lead.drive_link} className="text-blue-700" target="_blank">
                      {lead.drive_link}
                    </a>
                  ) : null
                }
              />
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
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold uppercase text-slate-500">
                    {f.kind}
                  </span>
                  {f.url ? (
                    <a href={f.url} target="_blank" className="font-medium text-blue-700 hover:underline">
                      {f.file_name}
                    </a>
                  ) : (
                    <span>{f.file_name}</span>
                  )}
                  <span className="text-xs text-slate-400">
                    {(f.size_bytes / 1024 / 1024).toFixed(1)} MB
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="mt-8">
        <PlanPanel leadId={lead.id} plans={plans} />
      </div>
    </div>
  );
}
