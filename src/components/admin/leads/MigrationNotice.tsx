import { QUOTES_MIGRATION } from '@/lib/quotes/schema';

/**
 * Shown while the quotes-pipeline migration has not been applied to the database yet.
 * The code is live but keeps the legacy behaviour until the SQL has been run.
 */
export function MigrationNotice() {
  return (
    <div
      data-testid="quotes-migration-notice"
      className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900"
    >
      <div className="font-bold">Database migration pending</div>
      <p className="mt-1">
        Run <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-xs">supabase/migrations/{QUOTES_MIGRATION}</code> in the
        Supabase SQL editor (project Webstudio). Until then leads work as before, and the new features (permanent customer links,
        quote versions, Remove, team quotes, notes) stay switched off. No redeploy needed afterwards.
      </p>
    </div>
  );
}
