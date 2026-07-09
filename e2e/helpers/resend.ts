// Best-effort real-email verification.
//
// LIMITATION: Resend's API has no "list emails by recipient" endpoint, and lead
// confirmation/team emails are dispatched fire-and-forget server-side (see
// src/app/api/leads/route.ts — failures never block lead creation). So from a
// browser test we cannot deterministically assert inbox delivery without a
// dedicated mailbox service.
//
// What we CAN assert: a successful lead submit means `POST /api/leads` returned
// 200, which is the point at which sendLeadEmails() runs. The lead specs assert
// that. This module documents the boundary and exposes a soft check that callers
// may log but should not hard-fail on.
import { RESEND_API_KEY } from './env';

export const EMAIL_VERIFICATION_NOTE =
  'Email delivery is dispatched server-side after a 200 from POST /api/leads and is not ' +
  'asserted end-to-end (no recipient-filtered Resend list API). Verify manually in the ' +
  'Resend dashboard, or add a test mailbox service to close this gap.';

/** True if Resend is configured at all (domain verification still required to actually send). */
export function resendConfigured(): boolean {
  return RESEND_API_KEY.length > 0;
}
