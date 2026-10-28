import type { LeadConfig } from '@/lib/types';

/** Packages that include the CMS, and the add-ons that book it on its own. */
const CMS_BUNDLES = ['gold', 'platinum'];
const CMS_ADDONS = ['cms', 'cmsmon'];

/** Whether the client's quote includes a CMS: the build prompt adds the /admin editing area only then. */
export function cmsBooked(config: Pick<LeadConfig, 'bundle' | 'addons'> | null | undefined): boolean {
  if (!config) return false;
  return CMS_BUNDLES.includes(config.bundle) || (config.addons ?? []).some((a) => CMS_ADDONS.includes(a.id));
}

/** The Supabase sign-up address for a client: one alias per client, created by hand. */
export const supabaseAlias = (project: string) => `fizrafarid+${project}@intellipaas.io`;

/**
 * The commands a developer runs once per client, in a terminal (PowerShell or bash), before
 * starting Claude Code: a folder with the approved design, the private GitHub repository, the
 * Vercel project and the Supabase project (every site's database, CMS or not). One command per
 * line, so the block can be pasted whole. The CLIs ask for anything interactive themselves
 * (Supabase organisation and database password), so no secret ever appears here.
 */
export function setupCommands(project: string): string {
  const lines = [
    '# 1. A folder for the client. Put the downloaded design.zip into it, then:',
    `mkdir ${project}`,
    `cd ${project}`,
    'mkdir design',
    'tar -xf design.zip -C design',
    'git init -b main',
    '# 2. Private GitHub repository',
    `gh repo create ${project} --private --source . --remote origin`,
    '# 3. Vercel project, linked to this folder',
    `vercel project add ${project}`,
    `vercel link --yes --project ${project}`,
    `# 4. Supabase, the database. Sign in as ${supabaseAlias(project)} (create that account first)`,
    'supabase login',
    `supabase projects create ${project} --region eu-central-1`,
    'supabase init',
    'supabase link',
    '# 5. Start Claude Code here and paste the build prompt',
    'claude',
  ];
  return lines.join('\n');
}
