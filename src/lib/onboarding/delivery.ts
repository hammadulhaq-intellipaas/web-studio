import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getOnboardingDefinition } from './definition';
import { sendBriefEmails } from './emails';
import { exportRecord } from './export';
import { pdfFileName, renderBriefPdf } from './pdf/render';
import { loadBrief, loadFiles, loadForm } from './records';
import type { DeliveryState, OnboardingBrief, OnboardingDefinition, OnboardingFormRecord } from './types';
import { ONB_BUCKET } from './uploads';

/** Briefs rendered before 25 Sep 2026 sit in the funnel's bucket under `onboarding/`. */
const LEGACY_BUCKET = 'lead-uploads';

/** Next to the client's uploads, in the form's own folder. */
export function pdfStoragePath(formId: string, version: number): string {
  return `${formId}/brief-v${version}.pdf`;
}

async function writeDelivery(formId: string, delivery: DeliveryState): Promise<void> {
  const supabase = createSupabaseAdminClient();
  await supabase.from('onboarding_forms').update({ delivery }).eq('id', formId);
}

/** Renders and stores the PDF for the current brief version; returns the storage path. */
export async function ensurePdf(
  definition: OnboardingDefinition,
  record: OnboardingFormRecord,
  brief: OnboardingBrief,
): Promise<{ path: string; buffer: Buffer }> {
  const supabase = createSupabaseAdminClient();
  const path = pdfStoragePath(record.id, brief.version);
  const buffer = await renderBriefPdf(definition, record, brief);
  const { error } = await supabase.storage.from(ONB_BUCKET).upload(path, buffer, { contentType: 'application/pdf', upsert: true });
  if (error) throw new Error(`PDF upload failed: ${error.message}`);
  return { path, buffer };
}

export async function downloadPdf(path: string): Promise<Buffer | null> {
  const supabase = createSupabaseAdminClient();
  const bucket = path.startsWith('onboarding/') ? LEGACY_BUCKET : ONB_BUCKET;
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

function teamSummary(definition: OnboardingDefinition, record: OnboardingFormRecord, brief: OnboardingBrief): string {
  const lines: string[] = [];
  if (record.flags.length) {
    lines.push('Flags:');
    for (const f of record.flags) {
      const rule = definition.flagRules.find((r) => r.code === f.code && (r.detail ?? null) === (f.detail ?? null));
      const note = rule?.note_de ?? '';
      lines.push(`- ${f.code}${f.detail ? ` · ${f.detail}` : ''} (${f.severity}, ${f.source})${note ? ` — ${note}` : ''}${f.data ? ` ${JSON.stringify(f.data)}` : ''}`);
    }
  } else {
    lines.push('Flags: keine.');
  }
  const still = Object.values(brief.sections).flatMap((s) => s.still_needed);
  const unique = Array.from(new Set(still.map((s) => s.trim()).filter(Boolean)));
  lines.push('', unique.length ? 'Offene Punkte:' : 'Offene Punkte: keine.');
  for (const s of unique) lines.push(`- ${s}`);
  return lines.join('\n');
}

/**
 * Runs after the client confirmed (inside `after()`): PDF → storage, JSON export, one
 * email to the client (PDF) and one to the team (PDF + JSON + flags). Every step records
 * its outcome in `delivery` so the done screen and the admin can show what happened.
 */
export async function deliverConfirmedForm(formId: string): Promise<DeliveryState> {
  const delivery: DeliveryState = {
    pdf_path: null,
    pdf_error: null,
    client_email_sent_at: null,
    team_email_sent_at: null,
    email_error: null,
  };
  const record = await loadForm(formId);
  if (!record || record.status !== 'confirmed') return delivery;
  const definition = await getOnboardingDefinition();
  const brief = await loadBrief(formId, record.brief_version);
  if (!brief) {
    delivery.pdf_error = 'no brief';
    await writeDelivery(formId, delivery);
    return delivery;
  }

  let pdf: { path: string; buffer: Buffer } | null = null;
  try {
    pdf = await ensurePdf(definition, record, brief);
    delivery.pdf_path = pdf.path;
  } catch (err) {
    delivery.pdf_error = err instanceof Error ? err.message : String(err);
    console.error('[onboarding/delivery] pdf failed:', err);
  }
  await writeDelivery(formId, delivery);

  try {
    const files = await loadFiles(formId);
    const json = Buffer.from(JSON.stringify(exportRecord(definition, record, brief, files), null, 2), 'utf8');
    const sent = await sendBriefEmails({
      texts: definition.texts,
      locale: record.locale,
      formId,
      to: record.email,
      name: record.name,
      company: record.company,
      teamEmailSetting: definition.settings.teamEmail,
      pdf: pdf ? { filename: pdfFileName(record, brief.version), content: pdf.buffer } : null,
      json: { filename: `onboarding-${formId}.json`, content: json },
      teamSummary: teamSummary(definition, record, brief),
    });
    const now = new Date().toISOString();
    delivery.client_email_sent_at = sent.client ? now : null;
    delivery.team_email_sent_at = sent.team ? now : null;
    if (!sent.client || !sent.team) delivery.email_error = `client:${sent.client} team:${sent.team}`;
  } catch (err) {
    delivery.email_error = err instanceof Error ? err.message : String(err);
    console.error('[onboarding/delivery] emails failed:', err);
  }
  await writeDelivery(formId, delivery);
  return delivery;
}
