import { notFound } from 'next/navigation';
import { ReviewApp } from '@/components/review/ReviewApp';
import { resolveReview } from '@/lib/developer/designs';
import { loadReviewState } from '@/lib/developer/review';
import { reviewSchemaReady } from '@/lib/developer/store';

export const dynamic = 'force-dynamic';

/**
 * The link the client gets for their design proposals. The secret code in it is the only key:
 * a wrong code, a client whose draft links are offline, or a database without the review
 * migration all answer "not found".
 */
export default async function ReviewPage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  if (!(await reviewSchemaReady())) notFound();
  const hit = await resolveReview(slug, token);
  if (!hit) notFound();
  const state = await loadReviewState(hit.leadId, slug);
  return <ReviewApp initial={state} api={`/api/review/${slug}/${token}`} />;
}
