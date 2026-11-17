import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { modelLabel } from './app-design-models';
import { problemCount, type PageCheck } from './app-design-shared';
import { DESIGN_BUCKET } from './drafts';

/** A design made in the app, as the Design tab shows it next to its version. */
export interface AppBuildView {
  madeBy: string;
  running: boolean;
  /** The newest line of its log ("Kurse ready"). */
  lastLog: string | null;
  checked: boolean;
  /** Problems the last check found, one line per page and width. */
  problems: string[];
  fixed: boolean;
  /** Screenshots of the top of each page at phone, tablet and laptop width. */
  shots: { page: string; width: number; url: string }[];
}

/** Every design of a client made in the app, by version id. Empty before migration 20261118000034. */
export async function appBuilds(leadId: string): Promise<Record<string, AppBuildView>> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db.from('developer_design_versions').select('id, status, made_by, progress, checks').eq('lead_id', leadId).not('made_by', 'is', null);
  if (error || !data) return {};
  const out: Record<string, AppBuildView> = {};
  for (const row of data as { id: string; status: string; made_by: string; progress: { log?: string[] } | null; checks: { pages: PageCheck[]; problems: string[]; fixed: boolean } | null }[]) {
    const shots: AppBuildView['shots'] = [];
    for (const page of row.checks?.pages ?? []) {
      for (const shot of page.shots ?? []) {
        const { data: signed } = await db.storage.from(DESIGN_BUCKET).createSignedUrl(shot.path, 3600);
        if (signed?.signedUrl) shots.push({ page: page.name, width: shot.width, url: signed.signedUrl });
      }
    }
    const remaining = (row.checks?.pages ?? []).flatMap((p) => p.widths.filter((w) => problemCount(w) > 0).map(() => 1)).length;
    out[row.id] = {
      madeBy: modelLabel(row.made_by),
      running: row.status === 'uploading',
      lastLog: row.progress?.log?.at(-1)?.replace(/^\d\d:\d\d:\d\d /, '') ?? null,
      checked: !!row.checks,
      problems: remaining ? (row.checks?.problems ?? []) : [],
      fixed: !!row.checks?.fixed,
      shots,
    };
  }
  return out;
}
