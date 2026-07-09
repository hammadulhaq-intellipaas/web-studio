'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { Locale, Selection } from '@/lib/types';
import type { SummaryLabels } from '@/lib/pricing/summary';
import { useFunnel, currentBundle } from '@/stores/funnel';

export function useAppLocale(): Locale {
  return useLocale() as Locale;
}

/** Assemble the pricing-engine Selection from the funnel store. */
export function useSelection(): Selection {
  const answers = useFunnel((s) => s.answers);
  const persona = useFunnel((s) => s.persona);
  const url = useFunnel((s) => s.url);
  const bundle = useFunnel((s) => s.bundle);
  const sel = useFunnel((s) => s.sel);
  const qty = useFunnel((s) => s.qty);
  const care = useFunnel((s) => s.care);
  const support = useFunnel((s) => s.support);
  const cf = useFunnel((s) => s.cf);
  const backupUp = useFunnel((s) => s.backupUp);
  const aiBundle = useFunnel((s) => s.aiBundle);
  const payYearly = useFunnel((s) => s.payYearly);
  const voucher = useFunnel((s) => s.voucher);

  return {
    answers,
    personaId: persona,
    sourceUrl: url,
    bundle: currentBundle({ bundle, answers, persona }),
    selectedAddons: sel,
    qty,
    care: care || 'plus',
    support,
    cf,
    backupUp,
    aiBundle,
    payYearly,
    voucher,
  };
}

export function useSummaryLabels(): SummaryLabels {
  const t = useTranslations('summaryLabels');
  return {
    paket: t('paket'),
    pflege: t('pflege'),
    support: t('support'),
    cloudflare: t('cloudflare'),
    setupSuffix: t('setupSuffix'),
    included: t('included'),
    cfDesc: t('cfDesc'),
    upgradeSuffix: t('upgradeSuffix'),
    aiSetupName: t('aiSetupName'),
    aiName: t('aiName'),
    aiDesc: t('aiDesc'),
    perMonth: t('perMonth'),
    perYear: t('perYear'),
    tierUnit: t('tierUnit'),
  };
}
