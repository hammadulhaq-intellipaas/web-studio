import { ShowcaseEditor } from '@/components/admin/showcase/ShowcaseEditor';
import { SHOWCASE_MIGRATION } from '@/lib/showcase/shared';
import { loadShowcase, showcaseSchemaReady } from '@/lib/showcase/store';

export const dynamic = 'force-dynamic';

export default async function ShowcasePage() {
  const ready = await showcaseSchemaReady();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">Showcase</h1>
      <p className="mb-6 max-w-3xl text-sm text-slate-600">
        Websites we have built, each with the owner&apos;s photo, name, professional title, a line of review and a screenshot. A card links
        to the live site. The homepage does not show the showcase yet.
      </p>
      {ready ? (
        <ShowcaseEditor items={await loadShowcase()} />
      ) : (
        <div data-testid="showcase-migration-notice" className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <div className="font-bold">Database migration pending</div>
          <p className="mt-1">
            Run <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-xs">supabase/migrations/{SHOWCASE_MIGRATION}</code> in the
            Supabase SQL editor (project Webstudio). It creates the showcase table and the image bucket. No redeploy needed afterwards.
          </p>
        </div>
      )}
    </div>
  );
}
