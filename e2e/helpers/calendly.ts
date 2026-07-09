// Drives the REAL Calendly webhook endpoint with a genuine HMAC-signed payload —
// byte-for-byte what Calendly POSTs. We do NOT automate the cross-origin Calendly
// iframe (it books real meetings and is too flaky); this exercises the same
// server path: signature verify → lead link via utm_content → appointment upsert.
import crypto from 'node:crypto';
import { expect, type APIRequestContext } from '@playwright/test';
import { CALENDLY_SIGNING_KEY } from './env';

/** Reproduces verifySignature() in src/app/api/webhooks/calendly/route.ts. */
function signature(rawBody: string): string {
  const t = Math.floor(Date.now() / 1000).toString();
  const v1 = crypto.createHmac('sha256', CALENDLY_SIGNING_KEY).update(`${t}.${rawBody}`).digest('hex');
  return `t=${t},v1=${v1}`;
}

interface WebhookOpts {
  leadId: string;
  email: string;
  eventUri: string; // must start with "e2e://" so teardown can clean it up
  startTime: string; // ISO
  name?: string;
  reason?: string;
}

function body(event: 'invitee.created' | 'invitee.canceled', o: WebhookOpts) {
  return {
    event,
    payload: {
      uri: `${o.eventUri}/invitee`,
      name: o.name ?? 'E2E Booker',
      email: o.email,
      scheduled_event: {
        uri: o.eventUri,
        name: 'Web Studio Onboarding',
        start_time: o.startTime,
        end_time: new Date(new Date(o.startTime).getTime() + 30 * 60_000).toISOString(),
      },
      tracking: { utm_content: o.leadId },
      ...(event === 'invitee.canceled' ? { cancellation: { reason: o.reason ?? 'e2e cancel' } } : {}),
    },
  };
}

export async function sendSignedWebhook(
  request: APIRequestContext,
  event: 'invitee.created' | 'invitee.canceled',
  opts: WebhookOpts,
) {
  const rawBody = JSON.stringify(body(event, opts));
  const res = await request.post('/api/webhooks/calendly', {
    headers: {
      'content-type': 'application/json',
      'calendly-webhook-signature': signature(rawBody),
    },
    data: rawBody, // send the exact bytes we signed
  });
  expect(res.ok(), `webhook ${event} failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  return res;
}
