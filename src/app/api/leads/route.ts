import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCatalog } from '@/lib/catalog';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { validateVoucherCode } from '@/lib/vouchers';
import { sendLeadEmails, serverSummaryLabels } from '@/lib/emails';
import { addonCost, calcTotals, isAddonIncluded, isAddonVisible, qtyOf } from '@/lib/pricing/engine';
import { buildReceipt } from '@/lib/pricing/summary';
import { pickLocale, type Locale, type Selection } from '@/lib/types';

const answersSchema = z.object({
  hasSite: z.string().nullable(),
  selfbuilt: z.string().nullable(),
  aiHas: z.array(z.string()),
  aiMissing: z.array(z.string()),
  byowScope: z.string().nullable().optional(),
  pages: z.string().nullable(),
  langs: z.string().nullable(),
  contact: z.string().nullable(),
  fees: z.string().nullable(),
  shop: z.string().nullable(),
  blog: z.string().nullable(),
  assets: z.string().nullable(),
});

const selectionSchema = z.object({
  answers: answersSchema,
  personaId: z.string().nullable(),
  sourceUrl: z.string().max(2000),
  bundle: z.string(),
  selectedAddons: z.record(z.string(), z.boolean()),
  qty: z.record(z.string(), z.number().int().min(0).max(100)),
  care: z.string(),
  support: z.string(),
  cf: z.string(),
  backupUp: z.boolean(),
  aiBundle: z.boolean(),
  payYearly: z.boolean(),
  voucher: z
    .object({ code: z.string(), percent: z.number(), scope: z.string() })
    .nullable(),
});

const bodySchema = z.object({
  locale: z.enum(['de', 'en']),
  lead: z.object({
    vorname: z.string().max(200),
    nachname: z.string().max(200),
    firma: z.string().max(300),
    email: z.string().email().max(320),
    tel: z.string().min(1).max(50),
    ziel: z.string().max(2000),
    consent: z.literal(true),
  }),
  selection: selectionSchema,
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', details: parsed.error.flatten() }, { status: 400 });
  }
  const { locale, lead, selection: rawSelection } = parsed.data;

  const catalog = await getCatalog();
  if (!catalog.bundles.some((b) => b.id === rawSelection.bundle)) {
    return NextResponse.json({ error: 'unknown_bundle' }, { status: 400 });
  }

  // Never trust the client's voucher — revalidate and use the DB values.
  let voucher: Selection['voucher'] = null;
  let voucherId: string | null = null;
  if (rawSelection.voucher?.code) {
    const check = await validateVoucherCode(rawSelection.voucher.code);
    if (check.valid) {
      voucher = {
        code: rawSelection.voucher.code.trim().toUpperCase(),
        percent: check.percent!,
        scope: check.scope!,
      };
      voucherId = check.id!;
    }
  }

  const selection: Selection = {
    ...rawSelection,
    answers: { ...rawSelection.answers, byowScope: rawSelection.answers.byowScope ?? null },
    voucher,
  };

  const totals = calcTotals(catalog, selection);
  const labels = serverSummaryLabels(locale as Locale);
  const receipt = buildReceipt(catalog, selection, locale as Locale, labels);

  const bundleRow = catalog.bundles.find((b) => b.id === selection.bundle)!;
  const persona = catalog.personas.find((p) => p.id === selection.personaId);

  const chosenAddons = catalog.addons
    .filter(
      (a) =>
        isAddonVisible(a, selection.bundle) &&
        !isAddonIncluded(a, selection.bundle, selection.aiBundle) &&
        selection.selectedAddons[a.id],
    )
    .map((a) => ({
      id: a.id,
      name: a.name_de,
      qty: a.qty || a.tiers ? qtyOf(a, selection.qty) : null,
      billing: a.billing,
      price: addonCost(a, selection.qty),
    }));

  const config = {
    answers: selection.answers,
    bundle: selection.bundle,
    bundleName: bundleRow.name,
    addons: chosenAddons,
    care: selection.care,
    support: selection.support,
    cf: selection.cf,
    backupUp: selection.backupUp,
    aiBundle: selection.aiBundle,
    payYearly: selection.payYearly,
    voucher,
    lines: {
      oneOff: receipt.oneOff.map((l) => ({ name: l.name, price: l.rawPrice })),
      monthly: receipt.monthly.map((l) => ({ name: l.name, price: l.rawPrice })),
      yearly: receipt.yearly.map((l) => ({ name: l.name, price: l.rawPrice })),
    },
  };

  const supabase = createSupabaseAdminClient();
  const { data: inserted, error } = await supabase
    .from('leads')
    .insert({
      locale,
      vorname: lead.vorname,
      nachname: lead.nachname,
      firma: lead.firma,
      email: lead.email,
      telefon: lead.tel,
      ziel: lead.ziel || null,
      consent_at: new Date().toISOString(),
      persona_id: selection.personaId,
      source_url: selection.sourceUrl || null,
      config,
      total_one_time: totals.oneTimeEffective,
      total_monthly: totals.monthlyEffective,
      total_yearly: totals.yearlyEffective,
      voucher_id: voucherId,
    })
    .select('id')
    .single();

  if (error || !inserted) {
    console.error('[leads] insert failed:', error);
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  if (voucherId) {
    const { data: v } = await supabase
      .from('vouchers')
      .select('redemption_count')
      .eq('id', voucherId)
      .single();
    if (v) {
      await supabase
        .from('vouchers')
        .update({ redemption_count: v.redemption_count + 1 })
        .eq('id', voucherId);
    }
  }

  // Emails must never block lead creation.
  const { data: teamSetting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'team_email')
    .maybeSingle();
  const teamEmail = typeof teamSetting?.value === 'string' ? teamSetting.value : '';
  try {
    await sendLeadEmails(
      {
        locale: locale as Locale,
        lead: {
          id: inserted.id,
          vorname: lead.vorname,
          nachname: lead.nachname,
          firma: lead.firma,
          email: lead.email,
          telefon: lead.tel,
          ziel: lead.ziel || null,
        },
        bundleName: bundleRow.name,
        personaLabel: persona
          ? pickLocale(persona as unknown as Record<string, unknown>, 'label', 'en')
          : null,
        receipt,
        totals,
        voucher,
      },
      teamEmail,
    );
  } catch (e) {
    console.error('[leads] email dispatch failed:', e);
  }

  return NextResponse.json({ id: inserted.id });
}
