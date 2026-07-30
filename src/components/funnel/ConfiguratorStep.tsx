'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import type { Addon, Catalog } from '@/lib/types';
import { pickLocale } from '@/lib/types';
import { fmt, mon } from '@/lib/format';
import {
  addonCost,
  coveringBundleAddon,
  discMonthly,
  isAddonIncluded,
  isByow,
  isCfIncluded,
  stepQty,
} from '@/lib/pricing/engine';
import { recommend } from '@/lib/pricing/recommend';
import { qtyText } from '@/lib/pricing/summary';
import { buildCategoryTree, countSelected, type CategoryNode } from '@/lib/catalog-tree';
import { useFunnel, currentBundle } from '@/stores/funnel';
import { useAppLocale, useSelection, useSummaryLabels } from './hooks';
import { CategorySection } from './CategorySection';
import { PriceSidebar } from './PriceSidebar';
import {
  backButton,
  BLUE,
  BODY,
  BORDER,
  card,
  GOLD_BG,
  GreenCheckIcon,
  GREEN,
  INK,
  MUTED,
  MUTED2,
  sectionLabel,
  Toggle,
} from './ui';

function singularUnit(unit: string, locale: 'de' | 'en'): string {
  return locale === 'de' ? unit.replace(/n$/, '') : unit.replace(/s$/, '');
}

function RecBadge({ label, small }: { label: string; small?: boolean }) {
  return (
    <span
      style={{
        position: 'absolute',
        top: -9,
        right: 12,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 0.6,
        background: GOLD_BG,
        color: INK,
        borderRadius: 999,
        padding: small ? '2px 8px' : '3px 9px',
      }}
    >
      {label}
    </span>
  );
}

function AddonCard({ addon, catalog }: { addon: Addon; catalog: Catalog }) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null);
  const t = useTranslations('configurator');
  const locale = useAppLocale();
  const labels = useSummaryLabels();
  const store = useFunnel();
  const bundleId = currentBundle(store, catalog);
  const bundle = catalog.bundles.find((b) => b.id === bundleId)!;

  // A selected "bundle addon" (e.g. SEO + GEO Setup Bundle) covers its members:
  // they show as included and are never charged again.
  const coveringAddon = coveringBundleAddon(addon.id, {
    addons: catalog.addons,
    selectedAddons: store.sel,
  });
  const included = isAddonIncluded(addon, bundleId, store.aiBundle, {
    addons: catalog.addons,
    selectedAddons: store.sel,
  });
  const selected = !included && !!store.sel[addon.id];
  const isRec = !included && !!store.recSel[addon.id];
  // Static CMS badge (e.g. "Best value"). Chanel rule: never show two pills by the
  // name — when this item also carries the dynamic "empfohlen", the static badge
  // moves down to the price row so the header holds at most one pill.
  const staticBadge = pickLocale(addon as unknown as Record<string, unknown>, 'badge', locale);
  const highlight = !included && addon.highlight;
  const hasQty = !!(addon.qty || addon.tiers);
  const recurring = addon.billing === 'monthly' || addon.billing === 'yearly';
  const disc = (p: number) => discMonthly(p, store.payYearly, catalog.yearlyDiscountPct);
  const name = pickLocale(addon as unknown as Record<string, unknown>, 'name', locale);
  const note = pickLocale(addon as unknown as Record<string, unknown>, 'note', locale);
  const tooltip = pickLocale(addon as unknown as Record<string, unknown>, 'tooltip', locale);

  const updateTooltipPos = useCallback(() => {
    const card = tooltipRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const tooltipWidth = 260;
    const tooltipHeight = 60;
    const gap = 12;
    const tooltipMargin = 8;

    // Position at top-right of card
    let left = rect.right - tooltipWidth;
    left = Math.max(tooltipMargin, Math.min(left, window.innerWidth - tooltipWidth - tooltipMargin));

    // Always show above the card
    const top = rect.top - tooltipHeight - gap;
    setTooltipPos({ top, left, placement: 'top' });
  }, []);

  useEffect(() => {
    if (!tooltipOpen) return;
    updateTooltipPos();
    const onReposition = () => updateTooltipPos();
    window.addEventListener('scroll', onReposition, { capture: true, passive: true });
    window.addEventListener('resize', onReposition);
    return () => {
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [tooltipOpen, updateTooltipPos]);

  let priceLabel: string;
  if (included) {
    if (coveringAddon && !addon.included_in.includes(bundleId)) {
      priceLabel = t('includedInBundle', {
        name: pickLocale(coveringAddon as unknown as Record<string, unknown>, 'name', locale),
      });
    } else {
      priceLabel =
        store.aiBundle && addon.ai_bundle_member
          ? t('includedInAi')
          : t('includedInBundle', { name: bundle.name });
    }
  } else if (addon.tiers && addon.tiers.length) {
    priceLabel = t('tierFrom', { price: mon(disc(addon.tiers[0].price), locale) });
  } else if (addon.qty && !selected) {
    priceLabel = t('perUnit', {
      price: fmt(addon.price_now, locale),
      unit: singularUnit(locale === 'de' ? addon.qty.unit_de : addon.qty.unit_en, locale),
    });
  } else if (addon.billing === 'monthly') {
    priceLabel = t('plusMonthly', { price: mon(disc(addonCost(addon, store.qty)), locale) });
  } else if (addon.billing === 'yearly') {
    priceLabel = t('plusYearly', { price: mon(addonCost(addon, store.qty), locale) });
  } else {
    priceLabel = t('plusOnce', { price: fmt(addonCost(addon, store.qty), locale) });
  }

  const laterLabel =
    !included && addon.price_later != null && !recurring
      ? t('laterLabel', { price: fmt(addon.price_later, locale) })
      : null;

  return (
    <div
      ref={tooltipRef}
      onClick={() => {
        if (!included) store.toggleAddon(addon.id);
      }}
      onMouseEnter={() => tooltip && setTooltipOpen(true)}
      onMouseLeave={() => setTooltipOpen(false)}
      role="button"
      tabIndex={0}
      data-testid={`addon-${addon.id}`}
      className={included ? undefined : 'hov-blue-border'}
      style={{
        cursor: included ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: included
          ? '#F7FAF8'
          : selected
            ? '#F4F8FF'
            : highlight
              ? '#FDFAF0'
              : '#ffffff',
        border: `1.5px solid ${
          included ? '#D3E8DA' : selected ? BLUE : highlight ? GOLD_BG : BORDER
        }`,
        borderRadius: 13,
        padding: '13px 14px',
        transition: 'all .15s',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          flex: 'none',
          alignSelf: 'stretch',
          width: 4,
          borderRadius: 3,
          background: recurring ? BLUE : '#5B6B85',
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 13.5,
              fontWeight: 700,
              color: included ? BODY : INK,
              lineHeight: 1.3,
            }}
          >
            {name}
          </span>
          {isRec ? (
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 0.4,
                background: '#FDF4DC',
                color: '#8A6D12',
                border: '1px solid #EAD9A0',
                borderRadius: 999,
                padding: '2px 8px',
              }}
            >
              {t('recommendedSmall')}
            </span>
          ) : (
            staticBadge && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 0.4,
                  background: '#FBF3D9',
                  color: '#8A6D12',
                  border: `1px solid ${GOLD_BG}`,
                  borderRadius: 999,
                  padding: '2px 8px',
                }}
              >
                {staticBadge}
              </span>
            )
          )}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            flexWrap: 'wrap',
            fontSize: 12.5,
            fontWeight: 700,
            color: included ? GREEN : recurring ? '#1E4FD6' : '#5B6B85',
            marginTop: 3,
          }}
        >
          {priceLabel}
          {isRec && staticBadge && (
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.3, color: '#8A6D12' }}>
              · {staticBadge}
            </span>
          )}
        </div>
        {laterLabel && (
          <div style={{ fontSize: 10.5, color: '#B4823D', marginTop: 2 }}>{laterLabel}</div>
        )}
        {note && (
          <div style={{ fontSize: 10.5, color: MUTED2, lineHeight: 1.45, marginTop: 4 }}>
            {note}
          </div>
        )}
        {hasQty && selected && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 10 }}>
            <button
              onClick={(ev) => {
                ev.stopPropagation();
                store.setQty(addon.id, stepQty(addon, store.qty, -1));
              }}
              className="hov-blue-stepper"
              style={qtyBtnStyle}
            >
              −
            </button>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 800,
                minWidth: 92,
                textAlign: 'center',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {qtyText(addon, store.qty, locale, labels)}
            </span>
            <button
              onClick={(ev) => {
                ev.stopPropagation();
                store.setQty(addon.id, stepQty(addon, store.qty, 1));
              }}
              className="hov-blue-stepper"
              style={qtyBtnStyle}
            >
              +
            </button>
          </div>
        )}
      </div>
      {included ? (
        <span style={{ flex: 'none', fontSize: 12, fontWeight: 700, color: GREEN }}>
          {t('enthalten')}
        </span>
      ) : (
        <Toggle on={selected} />
      )}
      {tooltipOpen && tooltip && tooltipPos && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="tooltip"
              onMouseEnter={() => setTooltipOpen(true)}
              onMouseLeave={() => setTooltipOpen(false)}
              style={{
                position: 'fixed',
                top: tooltipPos.top,
                left: tooltipPos.left,
                width: Math.min(260, typeof window !== 'undefined' ? window.innerWidth - 16 : 260),
                background: '#ffffff',
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                boxShadow: '0 8px 24px rgba(15,36,64,.16)',
                padding: '10px 12px',
                fontSize: 12,
                lineHeight: 1.5,
                color: BODY,
                zIndex: 9999,
              }}
            >
              {tooltip}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

const qtyBtnStyle: React.CSSProperties = {
  fontFamily: 'inherit',
  cursor: 'pointer',
  width: 27,
  height: 27,
  borderRadius: 8,
  border: '1.5px solid #CBD5E4',
  background: '#ffffff',
  color: INK,
  fontSize: 16,
  fontWeight: 800,
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
};

/** Care/Hosting/Security sits between Compliance (40) and Email (60) in the stack. */
const CARE_STACK_SORT = 50;

export function ConfiguratorStep({ catalog }: { catalog: Catalog }) {
  const t = useTranslations('configurator');
  const tr = useTranslations('reasons');
  const locale = useAppLocale();
  const store = useFunnel();
  const selection = useSelection();

  const rec = recommend(catalog, store.answers, store.url);
  const bundleId = selection.bundle;
  const bundle = catalog.bundles.find((b) => b.id === bundleId)!;
  const recBundle = catalog.bundles.find((b) => b.id === rec.bundle)!;
  const byowPath = isByow(store.answers);

  const recReason =
    rec.baseKey === 'byowChanges' || rec.baseKey === 'byowLive'
      ? tr(rec.baseKey)
      : tr(rec.baseKey) +
        (rec.whyKeys.length
          ? tr('chosenBecause', {
              reasons: rec.whyKeys.map((k) => tr(`why.${k}`)).join(', '),
            })
          : '');

  // Bundles come from the CMS in `sort` order; BYOW is only offered on the BYOW path.
  const bundleKeys = catalog.bundles
    .filter((b) => (b.id === 'byow' ? byowPath : true))
    .map((b) => b.id);

  const categoryTree = buildCategoryTree(catalog.addonCategories, catalog.addons, bundleId);

  // The extras stack: CMS categories interleaved with the (non-CMS) Care section by sort.
  const stackItems = [
    ...categoryTree.map((node) => ({ sort: node.category.sort, node: node as CategoryNode | null })),
    { sort: CARE_STACK_SORT, node: null as CategoryNode | null },
  ].sort((a, b) => a.sort - b.sort);

  // Lock the page to the viewport on this step only (desktop): each column scrolls
  // independently. Gated to ≥961px in globals.css; cleaned up on unmount so the
  // other funnel steps are never left locked.
  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute('data-funnel-locked', '');
    return () => el.removeAttribute('data-funnel-locked');
  }, []);

  return (
    <section
      data-screen="config"
      style={{
        animation: 'ipFade .4s ease both',
        padding: '28px 0 0',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        height: '100%',
      }}
    >
      <button
        onClick={() => store.go('questions')}
        className="hov-blue-text"
        style={{ ...backButton, marginBottom: 16, flex: 'none' }}
      >
        {t('backToQuestions')}
      </button>

      <div
        data-cfg-grid="1"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) 356px',
          gap: 28,
          alignItems: 'stretch',
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          data-cfg-col="1"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 26,
            minWidth: 0,
            minHeight: 0,
            paddingBottom: 24,
          }}
        >
          {/* Recommendation banner */}
          <div
            style={{
              background: 'linear-gradient(115deg,#0F2440,#1E4FD6 90%)',
              borderRadius: 20,
              padding: '26px 28px',
              color: '#ffffff',
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 1.6,
                textTransform: 'uppercase',
                color: '#8FD8EA',
                marginBottom: 8,
              }}
            >
              {t('recLabel')}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 12 }}>
              <span
                data-testid="rec-name"
                style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.6 }}
              >
                {recBundle.name}
              </span>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#8FD8EA' }}>
                {fmt(Number(recBundle.price), locale)}
              </span>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  background: GOLD_BG,
                  color: INK,
                  borderRadius: 999,
                  padding: '4px 11px',
                  letterSpacing: 0.4,
                }}
              >
                {t('recBadge')}
              </span>
            </div>
            <p
              style={{
                margin: '10px 0 0',
                fontSize: 14.5,
                lineHeight: 1.5,
                color: '#C7D6F2',
                maxWidth: 560,
              }}
            >
              {recReason}
            </p>
          </div>

          {/* Bundles */}
          <div>
            <div style={{ ...sectionLabel, marginBottom: 12 }}>
              {t('sec1Title')}{' '}
              <span
                style={{
                  fontWeight: 600,
                  color: MUTED2,
                  textTransform: 'none',
                  letterSpacing: 0,
                }}
              >
                {t('sec1Sub')}
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
                gap: 12,
              }}
            >
              {bundleKeys.map((k) => {
                const b = catalog.bundles.find((x) => x.id === k)!;
                const isSelected = bundleId === k;
                const isPlat = k === 'platinum';
                return (
                  <button
                    key={k}
                    data-testid={`bundle-${k}`}
                    onClick={() => store.pickBundle(catalog, k)}
                    className="hov-blue-border"
                    style={{
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      textAlign: 'left',
                      background: isSelected ? (isPlat ? INK : '#EDF3FF') : '#ffffff',
                      border: `2px solid ${isSelected ? BLUE : BORDER}`,
                      borderRadius: 16,
                      padding: 16,
                      position: 'relative',
                      transition: 'all .15s',
                    }}
                  >
                    {rec.bundle === k && <RecBadge label={t('recommendedBadge')} />}
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: isSelected && isPlat ? '#ffffff' : INK,
                      }}
                    >
                      {b.name}
                    </div>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: isSelected && isPlat ? '#8FD8EA' : '#1E4FD6',
                        marginTop: 3,
                      }}
                    >
                      {t('priceOnce', { price: fmt(Number(b.price), locale) })}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: isSelected && isPlat ? '#C7D6F2' : MUTED,
                        marginTop: 5,
                      }}
                    >
                      {pickLocale(b as unknown as Record<string, unknown>, 'tag', locale)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Included chips */}
          <div style={card}>
            <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>
              {t('includedTitle', { name: bundle.name })}
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13.5, color: MUTED }}>
              {t('includedSub', { price: fmt(Number(bundle.price), locale) })}
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))',
                gap: 9,
              }}
            >
              {bundle.chips.map((chip) => (
                <span
                  key={chip.de}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: INK,
                    lineHeight: 1.4,
                  }}
                >
                  <GreenCheckIcon />
                  {locale === 'de' ? chip.de : chip.en}
                </span>
              ))}
            </div>
            {bundleId === 'byow' && (
              <div
                style={{
                  marginTop: 14,
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  color: '#8A6D12',
                  background: '#FDF8EA',
                  border: '1px solid #EAD9A0',
                  borderRadius: 10,
                  padding: '10px 14px',
                }}
              >
                {t('byosNote', {
                  price: fmt(
                    Number(catalog.addons.find((a) => a.id === 'byositer')?.price_now ?? 190),
                    locale,
                  ),
                })}
              </div>
            )}
          </div>

          {/* Extras & Services — one collapsible category per bucket */}
          <div>
            <div style={{ ...sectionLabel, marginBottom: 6 }}>{t('extrasHeading')}</div>
            <p style={{ margin: '0 0 6px', fontSize: 13.5, color: MUTED }}>{t('extrasHeadingSub')}</p>
            <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 600, color: '#8A6D12' }}>
              {t('extrasLaunch')}
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span style={legendStyle}>
                <span style={{ ...legendDot, background: '#5B6B85' }} />
                {t('legendOnce')}
              </span>
              <span style={legendStyle}>
                <span style={{ ...legendDot, background: BLUE }} />
                {t('legendMonthly')}
              </span>
            </div>
          </div>

          {stackItems.map((item) =>
            item.node ? (
              <CategoryNodeSection key={item.node.category.id} node={item.node} catalog={catalog} />
            ) : (
              <CareSection key="__care" catalog={catalog} />
            ),
          )}
        </div>

        <PriceSidebar catalog={catalog} />
      </div>
    </section>
  );
}

const addonGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))',
  gap: 10,
};

/** One top-level category as a collapsible section: sub-sections, or a leaf's own add-ons. */
function CategoryNodeSection({ node, catalog }: { node: CategoryNode; catalog: Catalog }) {
  const t = useTranslations('configurator');
  const locale = useAppLocale();
  const store = useFunnel();

  const isAi = node.category.id === catalog.aiBundleCategory;
  const title = pickLocale(node.category as unknown as Record<string, unknown>, 'name', locale);
  const parentNote = isAi
    ? store.aiBundle
      ? t('catNoteKiInBundle')
      : t('catNoteKiTip')
    : pickLocale(node.category as unknown as Record<string, unknown>, 'note', locale) || null;
  const selectedCount = countSelected(node, store.sel);

  const grid = (items: Addon[]) => (
    <div style={addonGridStyle}>
      {items.map((addon) => (
        <AddonCard key={addon.id} addon={addon} catalog={catalog} />
      ))}
    </div>
  );

  return (
    <CategorySection title={title} note={parentNote} selectedCount={selectedCount}>
      {isAi && <AiBundleCta catalog={catalog} />}
      {node.subSections.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {node.subSections.map((sub) => {
            const subNote = pickLocale(
              sub.category as unknown as Record<string, unknown>,
              'note',
              locale,
            );
            return (
              <div key={sub.category.id}>
                <div style={{ ...sectionLabel, marginBottom: 4 }}>
                  {pickLocale(sub.category as unknown as Record<string, unknown>, 'name', locale)}
                </div>
                {subNote && (
                  <div style={{ fontSize: 11.5, color: MUTED2, marginBottom: 8 }}>{subNote}</div>
                )}
                <div style={{ marginTop: 6 }}>{grid(sub.addons)}</div>
              </div>
            );
          })}
        </div>
      ) : (
        grid(node.directAddons)
      )}
    </CategorySection>
  );
}

/**
 * Care, hosting & security. Its four tier groups (care plan, Cloudflare, support,
 * backup) come from their own CMS tables, not from addon_categories — so it renders
 * as a peer collapsible section but keeps its bespoke plan cards.
 */
function CareSection({ catalog }: { catalog: Catalog }) {
  const t = useTranslations('configurator');
  const locale = useAppLocale();
  const labels = useSummaryLabels();
  const store = useFunnel();
  const selection = useSelection();

  const bundleId = selection.bundle;
  const bundle = catalog.bundles.find((b) => b.id === bundleId)!;
  const careId = selection.care;
  const disc = (p: number) => discMonthly(p, store.payYearly, catalog.yearlyDiscountPct);
  const bakSel = store.backupUp && bundle.backup_upgrade_price != null;

  const note = t('careIntro', {
    hint: store.payYearly
      ? t('billingHintYearly', { pct: catalog.yearlyDiscountPct })
      : t('billingHintMonthly', { pct: catalog.yearlyDiscountPct }),
  });

  return (
    <CategorySection title={t('careCategory')} note={note} selectedCount={0}>
      <div style={{ ...sectionLabel, marginBottom: 10 }}>{t('careTitle')}</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
          gap: 12,
          marginBottom: 22,
        }}
      >
        {catalog.carePlans.map((cp) => {
          const isSelected = careId === cp.id;
          return (
            <button
              key={cp.id}
              data-testid={`care-${cp.id}`}
              onClick={() => store.setCare(cp.id)}
              className="hov-blue-border"
              style={{
                ...planCardStyle,
                background: isSelected ? '#EDF3FF' : '#ffffff',
                borderColor: isSelected ? BLUE : BORDER,
              }}
            >
              {cp.recommended && <RecBadge label={t('recBadge')} />}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 800 }}>{cp.name}</span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: INK }}>
                  {mon(disc(Number(cp.price_monthly)), locale)}
                  {labels.perMonth}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: BODY, lineHeight: 1.5, marginTop: 6 }}>
                {pickLocale(cp as unknown as Record<string, unknown>, 'desc', locale)}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ ...sectionLabel, marginBottom: 10 }}>{t('cfTitle')}</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
          gap: 12,
          marginBottom: 22,
        }}
      >
        {catalog.cloudflarePlans.map((cf) => {
          const isSelected = store.cf === cf.id;
          const included = isCfIncluded(catalog, cf.id, careId, bundleId);
          let price: string;
          if (included) {
            price =
              cf.included_when?.bundle === bundleId
                ? t('cfIncludedBundle', { name: bundle.name })
                : t('cfIncludedCare', {
                    name: catalog.carePlans.find((c) => c.id === careId)?.name ?? '',
                  });
          } else if (cf.setup_price != null && cf.monthly_price != null) {
            price = t('cfSetupPlus', {
              setup: fmt(Number(cf.setup_price), locale),
              mon: mon(disc(Number(cf.monthly_price)), locale),
            });
          } else if (cf.setup_price != null) {
            price = t('cfSetupOnly', { setup: fmt(Number(cf.setup_price), locale) });
          } else {
            price = t('cfFree');
          }
          return (
            <button
              key={cf.id}
              data-testid={`cf-${cf.id}`}
              onClick={() => store.setCf(cf.id)}
              className="hov-blue-border"
              style={{
                ...planCardStyle,
                background: isSelected ? '#EDF3FF' : '#ffffff',
                borderColor: isSelected ? BLUE : BORDER,
              }}
            >
              {cf.recommended && <RecBadge label={t('recBadge')} />}
              <div style={{ fontSize: 14.5, fontWeight: 800 }}>
                {pickLocale(cf as unknown as Record<string, unknown>, 'name', locale)}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: INK, marginTop: 3 }}>{price}</div>
              <div style={{ fontSize: 12, color: BODY, lineHeight: 1.5, marginTop: 6 }}>
                {pickLocale(cf as unknown as Record<string, unknown>, 'desc', locale)}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ ...sectionLabel, marginBottom: 10 }}>{t('supTitle')}</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
          gap: 12,
          marginBottom: 22,
        }}
      >
        {catalog.supportPlans.map((sp) => {
          const isSelected = store.support === sp.id;
          return (
            <button
              key={sp.id}
              data-testid={`support-${sp.id}`}
              onClick={() => store.setSupport(sp.id)}
              className="hov-blue-border"
              style={{
                ...planCardStyle,
                background: isSelected ? '#EDF3FF' : '#ffffff',
                borderColor: isSelected ? BLUE : BORDER,
              }}
            >
              <div style={{ fontSize: 14.5, fontWeight: 800 }}>
                {pickLocale(sp as unknown as Record<string, unknown>, 'name', locale)}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: INK, marginTop: 3 }}>
                {sp.price_monthly != null
                  ? `${mon(disc(Number(sp.price_monthly)), locale)}${labels.perMonth}`
                  : `${mon(0, locale)}${labels.perMonth}`}
              </div>
              <div style={{ fontSize: 12, color: BODY, lineHeight: 1.5, marginTop: 6 }}>
                {pickLocale(sp as unknown as Record<string, unknown>, 'desc', locale)}
              </div>
            </button>
          );
        })}
      </div>
      {bundleId === 'platinum' && (
        <div
          style={{
            fontSize: 12,
            color: '#8A6D12',
            background: '#FDF8EA',
            border: '1px solid #EAD9A0',
            borderRadius: 10,
            padding: '9px 13px',
            marginBottom: 22,
          }}
        >
          {t('vipNote')}
        </div>
      )}

      <div style={{ ...sectionLabel, marginBottom: 10 }}>{t('bakTitle')}</div>
      <div
        onClick={() => {
          if (bundle.backup_upgrade_price != null) store.toggleBackup();
        }}
        role="button"
        tabIndex={0}
        className="hov-blue-border"
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: bakSel ? '#F4F8FF' : '#ffffff',
          border: `1.5px solid ${bakSel ? BLUE : BORDER}`,
          borderRadius: 13,
          padding: '13px 14px',
          userSelect: 'none',
          maxWidth: 440,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>
            {bundle.backup_upgrade_price != null
              ? t('bakName', {
                  label: pickLocale(
                    bundle as unknown as Record<string, unknown>,
                    'backup_upgrade_label',
                    locale,
                  ),
                  base: pickLocale(
                    bundle as unknown as Record<string, unknown>,
                    'backup_base_label',
                    locale,
                  ),
                })
              : t('bakFallback')}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: MUTED, marginTop: 3 }}>
            {bundle.backup_upgrade_price != null
              ? t('bakPrice', { price: mon(disc(Number(bundle.backup_upgrade_price)), locale) })
              : t('bakNotAvailable')}
          </div>
        </div>
        <Toggle on={bakSel} />
      </div>
    </CategorySection>
  );
}

/**
 * The AI Agentic Bundle CTA. Rendered inside its addon category ("AI building blocks")
 * so the bundle sits with the individual blocks it replaces.
 */
function AiBundleCta({ catalog }: { catalog: Catalog }) {
  const t = useTranslations('configurator');
  const locale = useAppLocale();
  const store = useFunnel();
  const disc = (p: number) => discMonthly(p, store.payYearly, catalog.yearlyDiscountPct);

  const aiSingleSum = catalog.addons
    .filter((a) => a.ai_bundle_member && a.billing === 'monthly')
    .reduce((sum, a) => sum + Number(a.price_now), 0);

  return (
    <div style={{ marginBottom: 14 }}>
          <div
            style={{
              background: 'linear-gradient(120deg,#101A3C,#1E4FD6 55%,#22B8D8 130%)',
              borderRadius: 20,
              padding: '26px 28px',
              color: '#ffffff',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: -60,
                right: -40,
                width: 220,
                height: 220,
                borderRadius: '50%',
                background: 'radial-gradient(circle,rgba(34,184,216,.35),transparent 70%)',
              }}
            />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 10 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: 1.8,
                    textTransform: 'uppercase',
                    background: 'rgba(255,255,255,.14)',
                    border: '1px solid rgba(255,255,255,.25)',
                    borderRadius: 999,
                    padding: '4px 12px',
                  }}
                >
                  {t('aiTitle')}
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#8FD8EA' }}>
                  {t('aiPriceLabel', {
                    setup: fmt(catalog.aiBundle.setup_now, locale),
                    mon: mon(disc(catalog.aiBundle.monthly), locale),
                  })}
                </span>
              </div>
              <div
                style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4, margin: '12px 0 4px' }}
              >
                {t('aiHeadline')}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: '#C7D6F2',
                  lineHeight: 1.55,
                  maxWidth: 560,
                }}
              >
                {t('aiSub', {
                  single: t('aiSingle', { price: mon(disc(aiSingleSum), locale) }),
                })}
              </p>
              <ul
                style={{
                  margin: '16px 0 0',
                  padding: 0,
                  listStyle: 'none',
                  display: 'grid',
                  gap: 9,
                }}
              >
                {catalog.aiBundleBullets.map((b) => (
                  <li
                    key={b.de}
                    style={{
                      display: 'flex',
                      gap: 10,
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: '#E6F0FF',
                    }}
                  >
                    <span style={{ color: '#8FD8EA', fontWeight: 800 }}>✦</span>
                    {locale === 'de' ? b.de : b.en}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => store.toggleAiBundle()}
                data-testid="ai-bundle-toggle"
                className="hov-white-bg"
                style={{
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  marginTop: 18,
                  background: store.aiBundle ? 'rgba(255,255,255,.92)' : 'rgba(255,255,255,.12)',
                  border: '1px solid rgba(255,255,255,.4)',
                  color: store.aiBundle ? INK : '#ffffff',
                  borderRadius: 11,
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 800,
                  transition: 'background .15s',
                }}
              >
                {store.aiBundle ? t('aiRemove') : t('aiAdd')}
              </button>
            </div>
          </div>
    </div>
  );
}

const legendStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 11.5,
  fontWeight: 600,
  color: BODY,
};

const legendDot: React.CSSProperties = {
  width: 9,
  height: 9,
  borderRadius: 3,
};

const planCardStyle: React.CSSProperties = {
  fontFamily: 'inherit',
  cursor: 'pointer',
  textAlign: 'left',
  border: `2px solid ${BORDER}`,
  borderRadius: 15,
  padding: 16,
  position: 'relative',
  transition: 'all .15s',
};
