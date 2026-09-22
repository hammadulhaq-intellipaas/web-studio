import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/** `customer` for anonymous visitors, `team:<email>` for a signed-in admin. */
export type Actor = 'customer' | `team:${string}`;

export const isTeam = (actor: string | null | undefined): boolean => !!actor && actor.startsWith('team:');
export const actorEmail = (actor: string | null | undefined): string | null =>
  isTeam(actor) ? actor!.slice('team:'.length) : null;

/**
 * Who is calling a public route: the Supabase admin session cookie is sent on every path
 * of the site, so a team member is recognised on `/` too. Best-effort — an expired token
 * that the proxy did not refresh reads as `customer`; routes that *require* the team use
 * `requireTeam()` and refuse instead of degrading.
 */
export async function currentActor(): Promise<Actor> {
  if (process.env.TEAM_MODE === 'off') return 'customer';
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.email ? `team:${user.email}` : 'customer';
  } catch {
    return 'customer';
  }
}

export class NotTeamError extends Error {
  constructor() {
    super('team_required');
  }
}

export async function requireTeam(): Promise<`team:${string}`> {
  const actor = await currentActor();
  if (!isTeam(actor)) throw new NotTeamError();
  return actor as `team:${string}`;
}
