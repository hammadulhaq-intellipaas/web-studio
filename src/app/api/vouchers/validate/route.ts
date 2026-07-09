import { NextResponse } from 'next/server';
import { z } from 'zod';
import { validateVoucherCode } from '@/lib/vouchers';

const bodySchema = z.object({ code: z.string().min(1).max(64) });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }
  const check = await validateVoucherCode(parsed.data.code);
  if (!check.valid) return NextResponse.json({ valid: false });
  return NextResponse.json({ valid: true, percent: check.percent, scope: check.scope });
}
