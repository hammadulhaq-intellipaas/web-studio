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
 * The username and password every client site sits behind until go-live, and the CMS starting
 * password. The values live in Web Studio's own environment (Vercel settings and .env.local),
 * never in the code: CLIENT_SITE_USERNAME, CLIENT_SITE_PASSWORD and CLIENT_CMS_PASSWORD. A value
 * that is not set shows as a reminder instead.
 */
export interface SiteAccess {
  username: string;
  password: string;
  cmsPassword: string;
}

export function siteAccess(env: Record<string, string | undefined> = process.env): SiteAccess {
  const value = (name: string) => env[name]?.trim() || `<${name} is not set in Web Studio>`;
  return { username: value('CLIENT_SITE_USERNAME'), password: value('CLIENT_SITE_PASSWORD'), cmsPassword: value('CLIENT_CMS_PASSWORD') };
}

/**
 * The commands a developer runs once per client, in a terminal (PowerShell or bash), before
 * starting Claude Code: a folder with the approved design, the private GitHub repository, the
 * Vercel project and the Supabase project (every site's database, CMS or not), then the password
 * protection and, with a CMS, its starting password as Vercel environment variables. One command
 * per line, so the block can be pasted whole. The CLIs ask for anything interactive themselves
 * (Supabase organisation and database password, each variable's value); the values to type are in
 * the comments, and nothing secret ever goes into the code or the build prompt.
 */
export function setupCommands(project: string, cms = false, access: SiteAccess = siteAccess()): string {
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
    '# 5. Password protection until go-live. Run these one at a time (each asks questions): tick Production and Preview, then type the value:',
    `#    SITE_USERNAME = ${access.username}`,
    'vercel env add SITE_USERNAME',
    `#    SITE_PASSWORD = ${access.password}`,
    'vercel env add SITE_PASSWORD',
    ...(cms
      ? [
          '# 6. The CMS starting password, changed to the client\'s own at go-live. Run on its own, tick all three environments:',
          `#    CMS_ADMIN_PASSWORD = ${access.cmsPassword}`,
          'vercel env add CMS_ADMIN_PASSWORD',
          'vercel env pull .env.local',
        ]
      : []),
    `# ${cms ? 7 : 6}. Start Claude Code here and paste the build prompt`,
    'claude',
  ];
  return lines.join('\n');
}
