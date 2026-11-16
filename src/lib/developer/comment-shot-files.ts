import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { DesignComment } from './comments';
import { DESIGN_BUCKET } from './drafts';

/**
 * The stored pictures of marked review comments. Kept apart from the code that takes them
 * (comment-shot.ts), so pages and routes that only show or zip them never load the browser.
 */

/** Where a comment's picture is stored in the designs bucket. */
export const shotPath = (leadId: string, commentId: string) => `comments/${leadId}/${commentId}.jpg`;

/** The stored pictures of some comments, for the model or the zip; missing ones are left out. */
export async function loadCommentShots(comments: Pick<DesignComment, 'id' | 'shot_path'>[]): Promise<Map<string, Buffer>> {
  const storage = createSupabaseAdminClient().storage.from(DESIGN_BUCKET);
  const out = new Map<string, Buffer>();
  await Promise.all(
    comments
      .filter((c) => c.shot_path)
      .map(async (c) => {
        const { data } = await storage.download(c.shot_path!);
        if (data) out.set(c.id, Buffer.from(await data.arrayBuffer()));
      }),
  );
  return out;
}

/** Short-lived links to comment pictures, for the team's Design tab. */
export async function signedShotUrls(comments: Pick<DesignComment, 'id' | 'shot_path'>[]): Promise<Record<string, string>> {
  const withShot = comments.filter((c) => c.shot_path);
  if (!withShot.length) return {};
  const { data } = await createSupabaseAdminClient()
    .storage.from(DESIGN_BUCKET)
    .createSignedUrls(withShot.map((c) => c.shot_path!), 3600);
  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    const c = withShot.find((x) => x.shot_path === row.path);
    if (c && row.signedUrl) out[c.id] = row.signedUrl;
  }
  return out;
}
