import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isValidSessionId } from '@/lib/session-id';
import { ONB_STATUS_COLORS } from '@/lib/admin/format';
import { LocalTime } from '@/components/admin/LocalTime';
import { OnboardingToolbar } from '@/components/admin/OnboardingToolbar';
import { getOnboardingDefinition } from '@/lib/onboarding/definition';
import { displayValue } from '@/lib/onboarding/export';
import { loadBriefVersions } from '@/lib/onboarding/briefs';
import { formLink } from '@/lib/onboarding/emails';
import { fieldLabel, visibility } from '@/lib/onboarding/logic';
import { loadFiles, loadForm } from '@/lib/onboarding/records';
import type { OnboardingBrief } from '@/lib/onboarding/types';
import { loc } from '@/lib/onboarding/types';

export const dynamic = 'force-dynamic';

function Section({ title, children, testId }: { title: string; children: React.ReactNode; testId?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5" data-testid={testId}>
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
      <span className="min-w-0 break-words whitespace-pre-wrap font-medium">{value}</span>
    </div>
  );
}

interface AiLogRow {
  id: string;
  job: string;
  attempt: number;
  model: string;
  ok: boolean;
  duration_ms: number | null;
  created_at: string;
  prompt: { system?: string; prompt?: string };
  response: unknown;
}

/**
 * Everything the team needs from one form: the answers screen by screen (with don't-know
 * and follow-up provenance), the sales flags, the follow-up history, every brief version,
 * the uploaded files, delivery state and the AI log — plus PDF / JSON downloads.
 */
export default async function OnboardingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidSessionId(id)) notFound();
  const record = await loadForm(id);
  if (!record) notFound();

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const [definition, files, briefs, logRes] = await Promise.all([
    getOnboardingDefinition(),
    loadFiles(id),
    loadBriefVersions(id),
    supabase.from('onboarding_ai_log').select('*').eq('form_id', id).order('created_at', { ascending: false }).limit(40),
  ]);
  const aiLog = (logRes.data ?? []) as AiLogRow[];
  const currentBrief: OnboardingBrief | undefined = briefs.find((b) => b.version === record.brief_version) ?? briefs[0];

  // Signed URLs for the private bucket (1 hour); SVGs download rather than render.
  const signed = await Promise.all(
    files.map(async (f) => {
      const isSvg = f.mime_type === 'image/svg+xml';
      const { data } = await admin.storage.from(f.bucket).createSignedUrl(f.storage_path, 3600, isSvg ? { download: true } : undefined);
      return { ...f, url: data?.signedUrl ?? null };
    }),
  );

  const locale = record.locale;
  const { visible } = visibility(definition.fields, record.answers);
  const questionScreens = definition.screens.filter((s) => s.kind === 'questions');
  const title = record.company || record.name || record.email || id;

  return (
    <div>
      <Link href="/admin/onboarding" className="text-sm font-semibold text-slate-500 hover:text-blue-700">
        ← Onboarding forms
      </Link>
      <div className="mt-2 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight" data-testid="onb-admin-title">
          {title}
        </h1>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ONB_STATUS_COLORS[record.status] ?? ''}`} data-testid="onb-admin-status">
          {record.status.replace('_', ' ')}
        </span>
        <span className="text-xs uppercase text-slate-400">{record.locale}</span>
        <span className="text-xs text-slate-400">
          updated <LocalTime iso={record.updated_at} />
        </span>
        {record.lead_id && (
          <Link href={`/admin/leads/${record.lead_id}`} className="text-xs font-semibold text-blue-700 hover:underline" data-testid="onb-admin-lead-link">
            Created from lead →
          </Link>
        )}
      </div>

      <div className="mb-6">
        <OnboardingToolbar
          formId={id}
          formUrl={formLink(id, record.locale)}
          pdfUrl={currentBrief ? `/admin/onboarding/${id}/pdf` : null}
          jsonUrl={`/admin/onboarding/${id}/export`}
          status={record.status}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Section title="Client">
            <KV label="Company" value={record.company} />
            <KV label="Contact" value={record.name} />
            <KV label="Email" value={record.email} />
            <KV label="Form id" value={<code className="text-xs">{record.id}</code>} />
            <KV
              label="Client link"
              value={
                // One line with the full address on hover; the toolbar has the copy button.
                <a
                  href={formLink(id, record.locale)}
                  title={formLink(id, record.locale)}
                  className="block truncate text-blue-700 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {formLink(id, record.locale)}
                </a>
              }
            />
            <KV label="Current step" value={record.current_step} />
            <KV label="Model calls" value={String(record.ai_calls)} />
            <KV label="Created" value={<LocalTime iso={record.created_at} />} />
            {record.confirmed && (
              <KV label="Confirmed" value={<>{record.confirmed.name} · <LocalTime iso={record.confirmed.at} /> · terms {record.confirmed.terms_version}</>} />
            )}
          </Section>

          <Section title={`Flags (${record.flags.length})`} testId="onb-admin-flags">
            {record.flags.length === 0 ? (
              <p className="text-sm text-slate-500">None.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {record.flags.map((f, i) => {
                  const rule = definition.flagRules.find((r) => r.code === f.code && (r.detail ?? null) === (f.detail ?? null));
                  return (
                    <li key={i} className="flex flex-wrap items-baseline gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          f.severity === 'sales' ? 'bg-violet-100 text-violet-700' : f.severity === 'warn' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {f.code}
                        {f.detail ? ` · ${f.detail}` : ''}
                      </span>
                      <span className="text-xs text-slate-400">{f.source}</span>
                      {rule?.note_de && <span className="text-slate-600">{rule.note_de}</span>}
                      {f.data && <code className="text-xs text-slate-500">{JSON.stringify(f.data)}</code>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section title={`Follow-ups (${record.review?.history.length ?? 0})`} testId="onb-admin-followups">
            {!record.review?.history.length ? (
              <p className="text-sm text-slate-500">{record.review ? 'No follow-up questions were needed.' : 'The review has not run yet.'}</p>
            ) : (
              <ol className="space-y-2 text-sm">
                {record.review.history.map((h) => (
                  <li key={h.question_id} className="rounded-lg bg-slate-50 px-3 py-2">
                    <div className="text-slate-600">{h.question[locale] ?? h.question.de}</div>
                    <div className={`font-semibold ${h.skipped ? 'text-slate-400' : ''}`}>
                      {h.skipped ? 'skipped' : h.answer}
                      {h.target && <span className="ml-2 text-xs font-normal text-slate-400">→ {h.target.field}{h.target.sub ? `.${h.target.sub}` : ''}</span>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {record.review && (
              <p className="mt-3 text-xs text-slate-400">
                round {record.review.round} · {record.review.queue.length - record.review.cursor} pending · budget left {record.review.budget_left}
              </p>
            )}
          </Section>

          <Section title={`Files (${signed.length})`}>
            {signed.length === 0 ? (
              <p className="text-sm text-slate-500">No uploads.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {signed.map((f) => (
                  <li key={f.id} className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{f.field_key}</span>
                    {f.url ? (
                      <a href={f.url} className="text-blue-700 hover:underline" target="_blank" rel="noreferrer">
                        {f.file_name}
                      </a>
                    ) : (
                      <span>{f.file_name}</span>
                    )}
                    <span className="text-xs text-slate-400">{Math.round(f.size_bytes / 1024)} KB</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {record.delivery && (
            <Section title="Delivery" testId="onb-admin-delivery">
              <KV label="PDF" value={record.delivery.pdf_path ?? (record.delivery.pdf_error ? `error: ${record.delivery.pdf_error}` : 'pending')} />
              <KV label="Client email" value={record.delivery.client_email_sent_at ? <LocalTime iso={record.delivery.client_email_sent_at} /> : 'not sent'} />
              <KV label="Team email" value={record.delivery.team_email_sent_at ? <LocalTime iso={record.delivery.team_email_sent_at} /> : 'not sent'} />
              <KV label="Email error" value={record.delivery.email_error} />
            </Section>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Section title="Answers" testId="onb-admin-answers">
            <div className="space-y-5">
              {questionScreens.map((screen) => {
                const fields = visible.filter((f) => f.screen_id === screen.id && f.type !== 'notice');
                const answered = fields.filter((f) => record.answers[f.id] || files.some((x) => x.field_key === f.id));
                if (!answered.length) return null;
                return (
                  <div key={screen.id}>
                    <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-blue-700">{loc(screen as unknown as Record<string, unknown>, 'title', locale)}</h3>
                    {answered.map((f) => {
                      const answer = record.answers[f.id];
                      const text = displayValue(f, answer, locale, files);
                      return (
                        <div key={f.id} className="flex gap-2 py-0.5 text-sm">
                          <span className="w-44 flex-none text-slate-500">{fieldLabel(f, locale)}</span>
                          <span className={`min-w-0 whitespace-pre-wrap font-medium ${answer?.dk ? 'text-amber-700' : ''}`}>
                            {text || '—'}
                            {answer?.src === 'followup' && <span className="ml-2 rounded bg-blue-50 px-1.5 text-xs font-semibold text-blue-700">follow-up</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </Section>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6">
        <Section title={`Brief${currentBrief ? ` · v${currentBrief.version} · ${currentBrief.source}${currentBrief.model ? ` · ${currentBrief.model}` : ''}` : ''}`} testId="onb-admin-brief">
          {!currentBrief ? (
            <p className="text-sm text-slate-500">No brief yet.</p>
          ) : (
            <>
              {briefs.length > 1 && (
                <p className="mb-3 text-xs text-slate-400">
                  versions: {briefs.map((b) => `v${b.version} ${b.source}`).join(' · ')}
                </p>
              )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {definition.briefSections.map((section) => {
                  const content = currentBrief.sections[section.id];
                  if (!content) return null;
                  return (
                    <div key={section.id} className={`rounded-lg border p-4 ${section.generated_by === 'system' ? 'border-amber-200 bg-amber-50' : 'border-slate-200'}`}>
                      <h3 className="mb-2 text-sm font-bold">{loc(section as unknown as Record<string, unknown>, 'title', locale)}</h3>
                      <div className="prose prose-sm max-w-none text-sm [&_ul]:list-disc [&_ul]:pl-5 [&_p]:my-1">
                        <ReactMarkdown>{content.content_markdown}</ReactMarkdown>
                      </div>
                      {content.still_needed.length > 0 && section.generated_by !== 'system' && (
                        <p className="mt-2 text-xs text-amber-700">Still needed: {content.still_needed.join(' · ')}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Section>

        <Section title={`AI log (${aiLog.length})`} testId="onb-admin-ailog">
          {aiLog.length === 0 ? (
            <p className="text-sm text-slate-500">No model calls yet.</p>
          ) : (
            <div className="space-y-2">
              {aiLog.map((row) => (
                <details key={row.id} className="rounded-lg border border-slate-200">
                  <summary className="cursor-pointer px-3 py-2 text-sm">
                    <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-bold ${row.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{row.ok ? 'ok' : 'failed'}</span>
                    <span className="font-semibold">{row.job}</span> · attempt {row.attempt} · {row.model} · {row.duration_ms ?? '?'} ms ·{' '}
                    <span className="text-slate-400">
                      <LocalTime iso={row.created_at} />
                    </span>
                  </summary>
                  <div className="grid grid-cols-1 gap-3 border-t border-slate-100 p-3 md:grid-cols-2">
                    <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs">{row.prompt?.prompt ?? JSON.stringify(row.prompt, null, 2)}</pre>
                    <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs">{JSON.stringify(row.response, null, 2)}</pre>
                  </div>
                </details>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
