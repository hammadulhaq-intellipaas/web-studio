import { ShowcaseEditor } from '@/components/admin/showcase/ShowcaseEditor';
import { SHOWCASE_MIGRATIONS } from '@/lib/showcase/shared';
import { loadShowcase, showcaseSchemaState } from '@/lib/showcase/store';

export const dynamic = 'force-dynamic';

export default async function ShowcasePage() {
  const schema = await showcaseSchemaState();
  // The first migration creates the table and the image bucket; the second simplifies the fields.
  const pending = schema === 'missing' ? SHOWCASE_MIGRATIONS : schema === 'outdated' ? SHOWCASE_MIGRATIONS.slice(1) : [];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">Showcase</h1>
      <p className="mb-6 max-w-3xl text-sm text-slate-600">
        Websites we have built: paste the link and the screenshot is taken for you, then add the owner&apos;s name, photo, title and
        review. A card links to the live site. The homepage does not show the showcase yet.
      </p>
      {pending.length === 0 ? (
        <ShowcaseEditor items={await loadShowcase()} />
      ) : (
        <div data-testid="showcase-migration-notice" className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <div className="font-bold">Database migration pending</div>
          <p className="mt-1">
            Run{' '}
            {pending.map((file, i) => (
              <span key={file}>
                {i > 0 && ', then '}
                <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-xs">supabase/migrations/{file}</code>
              </span>
            ))}{' '}
            in the Supabase SQL editor (project Webstudio). No redeploy needed afterwards.
          </p>
        </div>
      )}
    </div>
  );
}
