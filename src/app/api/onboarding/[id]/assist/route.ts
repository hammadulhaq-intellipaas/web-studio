import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isValidSessionId } from '@/lib/session-id';
import { assistField } from '@/lib/onboarding/ai/assist';
import { modelConfigured, reserveAiCall } from '@/lib/onboarding/ai/client';
import { getOnboardingDefinition, getOnboardingSecrets } from '@/lib/onboarding/definition';
import { loadForm } from '@/lib/onboarding/records';
import { FIELD_KEY_RE } from '@/lib/onboarding/schemas';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const bodySchema = z.object({
  field_key: z.string().regex(FIELD_KEY_RE),
  text: z.string().min(1).max(5000),
});

/**
 * "Help me say this better" for one field. Returns a suggestion only — the client accepts
 * or rejects it in the browser, so nothing here writes to the record.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidSessionId(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  if (!modelConfigured()) return NextResponse.json({ error: 'model_unavailable' }, { status: 503 });

  const [record, definition] = await Promise.all([loadForm(id), getOnboardingDefinition()]);
  if (!record) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (record.status === 'confirmed') return NextResponse.json({ error: 'confirmed' }, { status: 409 });

  const field = definition.fields.find((f) => f.id === parsed.data.field_key && f.config.ai_assist);
  if (!field) return NextResponse.json({ error: 'unknown_field' }, { status: 400 });

  if (!(await reserveAiCall(id, record.ai_calls, definition.settings))) {
    return NextResponse.json({ error: 'ai_limit' }, { status: 429 });
  }

  const secrets = await getOnboardingSecrets();
  const result = await assistField({ definition, secrets, record, field, text: parsed.data.text });
  if (!result.ok || !result.text) {
    return NextResponse.json({ error: 'assist_failed', violations: result.violations }, { status: 422 });
  }
  return NextResponse.json({ text: result.text });
}
