export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'json' | 'textarea';
  full?: boolean;
}

export interface EntityDef {
  table: string;
  label: string;
  description: string;
  fields: FieldDef[];
  /** Whether new rows can be created from the admin UI. */
  canCreate: boolean;
  /** Whether rows can be deleted from the admin UI. */
  canDelete: boolean;
  /** Column the list is ordered by. Defaults to `sort`. */
  orderBy?: string;
}

const de = (key: string, label: string): FieldDef => ({ key, label, type: 'text' });
const num = (key: string, label: string): FieldDef => ({ key, label, type: 'number' });
const bool = (key: string, label: string): FieldDef => ({ key, label, type: 'boolean' });
const json = (key: string, label: string): FieldDef => ({ key, label, type: 'json', full: true });

export const ENTITIES: Record<string, EntityDef> = {
  bundles: {
    table: 'bundles',
    label: 'Bundles',
    description: 'The four base packages incl. prices, chips and backup upgrades.',
    canCreate: true,
    canDelete: true,
    fields: [
      de('name', 'Name'),
      num('price', 'Price €'),
      de('tag_de', 'Tag (DE)'),
      de('tag_en', 'Tag (EN)'),
      num('backup_upgrade_price', 'Backup upgrade €/mo.'),
      de('backup_upgrade_label_de', 'Backup upgrade label (DE)'),
      de('backup_upgrade_label_en', 'Backup upgrade label (EN)'),
      de('backup_base_label_de', 'Current backup label (DE)'),
      de('backup_base_label_en', 'Current backup label (EN)'),
      num('sort', 'Sort'),
      bool('active', 'Active'),
      json('chips', 'Included chips (JSON [{de,en}])'),
    ],
  },
  addons: {
    table: 'addons',
    label: 'Add-ons',
    description: 'All extras with buy-now/buy-later prices, billing type and visibility rules.',
    canCreate: true,
    canDelete: true,
    fields: [
      de('category_id', 'Category id'),
      de('name_de', 'Name (DE)'),
      de('name_en', 'Name (EN)'),
      num('price_now', 'Buy now €'),
      num('price_later', 'Buy later €'),
      de('billing', 'Billing (once|monthly|yearly)'),
      de('note_de', 'Note (DE)'),
      de('note_en', 'Note (EN)'),
      bool('byow_only', 'BYOW only'),
      bool('not_byow', 'Hidden for BYOW'),
      bool('ai_bundle_member', 'In AI bundle'),
      num('sort', 'Sort'),
      bool('active', 'Active'),
      json('included_in', 'Included in bundles (JSON ["gold"])'),
      json('bundle_members', 'Covers these add-ons (JSON ["seosetup","geosetup"]) — selecting this one includes them at no extra cost'),
      json('qty', 'Quantity (JSON {min,max,unit_de,unit_en})'),
      json('tiers', 'Tiers (JSON [{n,price}])'),
    ],
  },
  addon_categories: {
    table: 'addon_categories',
    label: 'Add-on categories',
    description: 'Grouping and notes for the extras section.',
    canCreate: true,
    canDelete: true,
    fields: [
      de('name_de', 'Name (DE)'),
      de('name_en', 'Name (EN)'),
      de('note_de', 'Note (DE)'),
      de('note_en', 'Note (EN)'),
      num('sort', 'Sort'),
    ],
  },
  care_plans: {
    table: 'care_plans',
    label: 'Care plans',
    description: 'Monthly care & hosting plans.',
    canCreate: true,
    canDelete: true,
    fields: [
      de('name', 'Name'),
      num('price_monthly', '€/mo.'),
      { key: 'desc_de', label: 'Description (DE)', type: 'textarea', full: true },
      { key: 'desc_en', label: 'Description (EN)', type: 'textarea', full: true },
      de('short_de', 'Short (DE)'),
      de('short_en', 'Short (EN)'),
      bool('recommended', 'Recommended'),
      num('sort', 'Sort'),
    ],
  },
  cloudflare_plans: {
    table: 'cloudflare_plans',
    label: 'Cloudflare plans',
    description: 'Security tiers with setup + monthly pricing.',
    canCreate: true,
    canDelete: true,
    fields: [
      de('name_de', 'Name (DE)'),
      de('name_en', 'Name (EN)'),
      num('setup_price', 'Setup €'),
      num('monthly_price', '€/mo.'),
      { key: 'desc_de', label: 'Description (DE)', type: 'textarea', full: true },
      { key: 'desc_en', label: 'Description (EN)', type: 'textarea', full: true },
      bool('recommended', 'Recommended'),
      json('included_when', 'Included when (JSON {care,bundle})'),
      num('sort', 'Sort'),
    ],
  },
  support_plans: {
    table: 'support_plans',
    label: 'Support plans',
    description: 'Separately bookable support tiers.',
    canCreate: true,
    canDelete: true,
    fields: [
      de('name_de', 'Name (DE)'),
      de('name_en', 'Name (EN)'),
      num('price_monthly', '€/mo.'),
      { key: 'desc_de', label: 'Description (DE)', type: 'textarea', full: true },
      { key: 'desc_en', label: 'Description (EN)', type: 'textarea', full: true },
      num('sort', 'Sort'),
    ],
  },
  personas: {
    table: 'personas',
    label: 'Personas',
    description: 'Industry cards with default answers and pre-recommended add-ons.',
    canCreate: true,
    canDelete: true,
    fields: [
      de('label_de', 'Label (DE)'),
      de('label_en', 'Label (EN)'),
      { key: 'icon_path', label: 'SVG icon path', type: 'textarea', full: true },
      json('default_answers', 'Default answers (JSON)'),
      json('preselect_addons', 'Pre-recommended add-ons (JSON ["foto"])'),
      num('sort', 'Sort'),
    ],
  },
  bundle_rules: {
    table: 'bundle_rules',
    label: 'Bundle rules',
    description:
      'Which bundle is recommended. The highest-priority matching "base" rule sets the starting bundle; every matching "upgrade" rule then escalates it to a higher tier.',
    canCreate: true,
    canDelete: true,
    orderBy: 'priority',
    fields: [
      de('rule_kind', 'Kind (base|upgrade)'),
      de('result_bundle', 'Resulting bundle id'),
      de('reason_key', 'i18n reason key (base: reasons.*, upgrade: reasons.why.*)'),
      num('priority', 'Priority (higher wins)'),
      bool('active', 'Active'),
      json(
        'conditions',
        'Conditions — all must match (JSON [{"key":"pages","values":["14"]}]). Keys: any answer, plus "byow" (true|false) and "url" (__set). Add "negate":true to invert.',
      ),
    ],
  },
  addon_rules: {
    table: 'addon_rules',
    label: 'Add-on rules',
    description:
      'Which add-ons are pre-selected as "recommended". Additive rules run first (together with the persona pre-selections), then every matching rule\'s removals are applied — that is how a suppression rule can override a persona pre-selection.',
    canCreate: true,
    canDelete: true,
    fields: [
      de('note', 'Note (internal)'),
      num('sort', 'Sort'),
      bool('active', 'Active'),
      json(
        'conditions',
        'Conditions — all must match (JSON [{"key":"assets","values":["ja"]}]). Empty [] always fires.',
      ),
      json('add_addon_ids', 'Add-ons to recommend (JSON ["cookie"])'),
      json('remove_addon_ids', 'Add-ons to suppress (JSON ["logo","foto"]) — applied last'),
    ],
  },
  legal_pages: {
    table: 'legal_pages',
    label: 'Legal pages',
    description:
      'Privacy policy and the consent line shown next to the form submit button. Markdown; one row per locale (id e.g. "privacy_de").',
    canCreate: true,
    canDelete: true,
    orderBy: 'id',
    fields: [
      de('page_key', 'Page key (privacy|consent)'),
      de('locale', 'Locale (de|en)'),
      de('title', 'Title'),
      { key: 'content_markdown', label: 'Content (Markdown)', type: 'textarea', full: true },
    ],
  },
};

export interface SettingDef {
  key: string;
  label: string;
  type: 'number' | 'text' | 'json';
  description: string;
}

export const SETTINGS: SettingDef[] = [
  { key: 'yearly_discount_pct', label: 'Yearly payment discount %', type: 'number', description: 'Discount on recurring prices when paying annually (prototype: 18).' },
  { key: 'team_email', label: 'Team notification email', type: 'text', description: 'Fallback recipient for new-lead and booking notifications when RESEND_TO_EMAIL is unset.' },
  { key: 'default_bundle', label: 'Default bundle', type: 'text', description: 'Used when no base bundle rule matches (e.g. "gold").' },
  { key: 'default_care_plan', label: 'Default care plan', type: 'text', description: 'Pre-selected care plan id (e.g. "plus").' },
  { key: 'default_cloudflare_plan', label: 'Default Cloudflare plan', type: 'text', description: 'Pre-selected Cloudflare plan id (e.g. "shield").' },
  { key: 'ai_bundle_category', label: 'AI bundle category id', type: 'text', description: 'Add-on category that hosts the AI Agentic Bundle CTA (e.g. "ki").' },
  { key: 'calendly_event_url', label: 'Calendly event URL', type: 'text', description: 'e.g. https://calendly.com/yourteam/erstgespraech — empty disables the embed.' },
  { key: 'ai_bundle', label: 'AI bundle pricing', type: 'json', description: '{"setup_now":1509,"setup_later":2320,"monthly":499}' },
  { key: 'ai_bundle_bullets', label: 'AI bundle bullets', type: 'json', description: 'Array of {de,en}.' },
  { key: 'trust_items', label: 'Intro trust chips', type: 'json', description: 'Array of {de,en}.' },
  { key: 'next_steps', label: 'Confirmation next steps', type: 'json', description: 'Array of {de,en}.' },
];
