export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'json' | 'textarea' | 'select';
  full?: boolean;
  /** For `select`: build the option list from the sibling rows' ids (e.g. a parent picker). */
  optionsFromRows?: boolean;
  /** For `select`: build the option list from another table's rows (`id` + a label column). */
  optionsFromTable?: string;
}

/** Heading the entity's tab is grouped under in the catalog tab bar. */
export type EntityGroup = 'Catalog' | 'Onboarding form';

export interface EntityDef {
  table: string;
  label: string;
  description: string;
  fields: FieldDef[];
  /** Whether new rows can be created from the admin UI. */
  canCreate: boolean;
  /** Whether rows can be deleted from the admin UI. */
  canDelete: boolean;
  /** Column(s) the list is ordered by. Defaults to `sort`. */
  orderBy?: string | string[];
  /** Defaults to 'Catalog'. */
  group?: EntityGroup;
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
      { key: 'tooltip_de', label: 'Tooltip (DE) — longer explainer shown on hover/tap', type: 'textarea' },
      { key: 'tooltip_en', label: 'Tooltip (EN) — longer explainer shown on hover/tap', type: 'textarea' },
      de('badge_de', 'Badge (DE) — e.g. Bestes Preis-Leistung'),
      de('badge_en', 'Badge (EN) — e.g. Best value'),
      bool('highlight', 'Highlight (emphasise card)'),
      bool('byow_only', 'BYOW only'),
      bool('not_byow', 'Hidden for BYOW'),
      bool('ai_bundle_member', 'In AI bundle'),
      num('sort', 'Sort'),
      bool('active', 'Active'),
      json('included_in', 'Included in bundles (JSON ["gold"])'),
      json('bundle_members', 'Covers these add-ons (JSON ["seosetup","geosetup"]) — selecting this one includes them at no extra cost'),
      json('qty', 'Quantity (JSON {min,max,unit_de,unit_en})'),
      json('tiers', 'Tiers (JSON [{n,price}])'),
      json(
        'sub_addons',
        'Sub-options (JSON [{id,name_de,name_en}]) — renders tickboxes on the card; the price is "Buy now €" × the number ticked, minimum one. Leave blank for a plain on/off add-on. Overrides Quantity/Tiers. Never change an existing id — it is what saved selections point at.',
      ),
    ],
  },
  addon_categories: {
    table: 'addon_categories',
    label: 'Add-on categories',
    description:
      'Grouping and notes for the extras section. Leave "Parent" blank for a top-level category; set it to nest a sub-section (max 2 levels).',
    canCreate: true,
    canDelete: true,
    orderBy: 'parent_id',
    fields: [
      { key: 'parent_id', label: 'Parent category (blank = top level)', type: 'select', optionsFromRows: true },
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

  /* ------------------------------------------------------------ onboarding form */

  onb_screens: {
    table: 'onb_screens',
    label: 'Screens',
    group: 'Onboarding form',
    description:
      'The steps of the client onboarding form, in stepper order. "kind" is questions for a normal screen; the single review screen closes the form (gap check → brief → confirm).',
    canCreate: true,
    canDelete: true,
    fields: [
      de('kind', 'Kind (questions|review)'),
      de('title_de', 'Title (DE)'),
      de('title_en', 'Title (EN)'),
      de('short_de', 'Stepper label (DE)'),
      de('short_en', 'Stepper label (EN)'),
      { key: 'intro_de', label: 'Intro text (DE)', type: 'textarea', full: true },
      { key: 'intro_en', label: 'Intro text (EN)', type: 'textarea', full: true },
      num('sort', 'Sort'),
      bool('active', 'Active'),
    ],
  },
  onb_fields: {
    table: 'onb_fields',
    label: 'Fields',
    group: 'Onboarding form',
    description:
      'Every question of the onboarding form. The row id is the field key that answers, follow-ups, flag rules and brief sections refer to — never rename an id that is in use. Types: text, textarea, url, email, tel, number, date, radio, checkboxes, select, slider, ranking, repeater, upload, notice.',
    canCreate: true,
    canDelete: true,
    orderBy: ['screen_id', 'sort'],
    fields: [
      { key: 'screen_id', label: 'Screen', type: 'select', optionsFromTable: 'onb_screens' },
      de('type', 'Type'),
      num('sort', 'Sort (within the screen)'),
      de('label_de', 'Question (DE)'),
      de('label_en', 'Question (EN)'),
      { key: 'help_de', label: 'Helper text (DE)', type: 'textarea' },
      { key: 'help_en', label: 'Helper text (EN)', type: 'textarea' },
      de('placeholder_de', 'Placeholder (DE)'),
      de('placeholder_en', 'Placeholder (EN)'),
      bool('required', 'Required'),
      bool('allow_dont_know', 'Offer "I don\'t know"'),
      bool('ai_check', 'AI checks this answer for specificity'),
      bool('active', 'Active'),
      json('options', 'Options (JSON [{value,label_de,label_en,hint_de?,hint_en?,min?,max?}]) — radio, checkboxes, select, ranking items'),
      json(
        'config',
        'Config (JSON) — per type: text {min_chars,max_chars,min_lines,rows} · number {min,max} · date {min_date} · slider {min,max,step,captions:[{de,en}],examples:[{de,en}]} · ranking {buckets:[{value,label_de,label_en,min?,max?,default?}]} · repeater {fields:[{key,type,label_de,label_en,required?,min_chars?,options?}],min_rows,max_rows,initial_rows,add_label_de,add_label_en} · checkboxes {min_checked,max_checked,exclusive:[...]} · upload {accept,max_files,max_mb,max_total_mb} · notice {text_key,tone} · any {required_unless,link_setting,link_label_de,link_label_en}',
      ),
      json(
        'show_when',
        'Show when — all clauses must match (JSON [{"key":"project_type","values":["changes"]}]); "negate":true inverts a clause. A hidden field\'s answer is cleared. Use "__dont_know" as a value to match "I don\'t know".',
      ),
    ],
  },
  onb_followups: {
    table: 'onb_followups',
    label: 'Follow-ups',
    group: 'Onboarding form',
    description:
      'Deterministic follow-up questions asked at review time. Trigger JSON: {"field":"legal_pages","when":"equals","value":"unsure"} — when ∈ empty | dont_know | equals | lt_chars | lt_lines | no_files | flag. {label} in the question is replaced with the field\'s label.',
    canCreate: true,
    canDelete: true,
    fields: [
      json('trigger', 'Trigger (JSON {field?,when,value?,sub?,flag?})'),
      { key: 'question_de', label: 'Question (DE)', type: 'textarea', full: true },
      { key: 'question_en', label: 'Question (EN)', type: 'textarea', full: true },
      json('quick_replies', 'Quick replies (JSON [{value,label_de,label_en}])'),
      de('writes_to', 'Writes the answer to field key (blank = history only)'),
      de('mode', 'Mode (set|append|acknowledge)'),
      json('raises', 'Raises flag by reply (JSON {"yes":{"code":"interest","detail":"legal_pages"}})'),
      num('sort', 'Sort'),
      bool('active', 'Active'),
    ],
  },
  onb_flag_rules: {
    table: 'onb_flag_rules',
    label: 'Flag rules',
    group: 'Onboarding form',
    description:
      'Sales and compliance flags raised from answers, shown to the team only. Same condition shape as the bundle rules. scope_flag, date_conflict and credentials_redacted are computed in code.',
    canCreate: true,
    canDelete: true,
    fields: [
      de('code', 'Code (needs_quote|interest|bfsg|info)'),
      de('detail', 'Detail (e.g. member_area)'),
      de('severity', 'Severity (info|sales|warn)'),
      json('conditions', 'Conditions — all must match (JSON [{"key":"private_content","values":["yes"]}])'),
      de('note_de', 'Note for the team (DE)'),
      de('note_en', 'Note for the team (EN)'),
      num('sort', 'Sort'),
      bool('active', 'Active'),
    ],
  },
  onb_brief_sections: {
    table: 'onb_brief_sections',
    label: 'Brief sections',
    group: 'Onboarding form',
    description:
      'The fixed structure of the brief. The model writes the prose of each "llm" section from its source fields; "system" sections are composed by code (what we still need).',
    canCreate: true,
    canDelete: true,
    fields: [
      de('title_de', 'Title (DE)'),
      de('title_en', 'Title (EN)'),
      de('generated_by', 'Generated by (llm|system)'),
      { key: 'instructions', label: 'Instructions for the writer (English, internal)', type: 'textarea', full: true },
      json('source_fields', 'Source field keys (JSON ["legal_name","catalogue"])'),
      num('sort', 'Sort'),
      bool('active', 'Active'),
    ],
  },
  onb_texts: {
    table: 'onb_texts',
    label: 'Texts',
    group: 'Onboarding form',
    description:
      'Long-form copy of the onboarding form: landing, terms, confirmation checks, notices, email bodies, PDF footer. Markdown; one row per locale (id e.g. "terms_de"). Placeholders: {name} {company} {email} {link} {minutes} {admin_link}.',
    canCreate: true,
    canDelete: true,
    orderBy: 'id',
    fields: [
      de('key', 'Text key'),
      de('locale', 'Locale (de|en)'),
      de('title', 'Title / email subject'),
      { key: 'content_markdown', label: 'Content (Markdown)', type: 'textarea', full: true },
    ],
  },
  onb_prompts: {
    table: 'onb_prompts',
    label: 'AI prompts',
    group: 'Onboarding form',
    description:
      'The four texts that steer the assistant: system (tone + hard rules), completeness, brief, rewrite. The code enforces the hard rules a second time, so an edit here can change tone but not let a price or an invented fact through.',
    canCreate: false,
    canDelete: false,
    orderBy: 'id',
    fields: [
      { key: 'note', label: 'Note (internal)', type: 'textarea', full: true },
      { key: 'content', label: 'Prompt', type: 'textarea', full: true },
    ],
  },
  onb_examples: {
    table: 'onb_examples',
    label: 'AI examples',
    group: 'Onboarding form',
    description:
      'Worked examples for the brief writer: a filled form (answers JSON) in, the finished brief (sections JSON) out. Every active example rides along in the prompt — keep them short.',
    canCreate: true,
    canDelete: true,
    fields: [
      de('title', 'Title'),
      json('answers', 'Answers (JSON {field key: value})'),
      json('brief', 'Brief (JSON {section id: {content_markdown, still_needed, sources}})'),
      num('sort', 'Sort'),
      bool('active', 'Active'),
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
  { key: 'quote_idle_minutes', label: 'Quote history: idle minutes', type: 'number', description: 'A customer\'s edits on their quote link are saved as one version once they pause for this long (default 10).' },
  // Onboarding form
  { key: 'onb_model', label: 'Onboarding: AI model', type: 'text', description: 'Model id for the completeness pass, the brief writer and "help me say this better" (e.g. "gpt-6-luna", or "openai/gpt-6-luna" on OpenRouter).' },
  { key: 'onb_max_followups', label: 'Onboarding: max follow-up questions', type: 'number', description: 'Total follow-up questions per form across all rounds (spec: 12).' },
  { key: 'onb_max_rounds', label: 'Onboarding: max follow-up rounds', type: 'number', description: 'Gap-check rounds at review time (spec: 2).' },
  { key: 'onb_max_ai_calls', label: 'Onboarding: max model calls per form', type: 'number', description: 'Hard cost cap per form; further calls fall back to the plain rendering.' },
  { key: 'onb_build_weeks_min', label: 'Onboarding: build time min (weeks)', type: 'number', description: 'Used only to detect a content date too close to the launch date. Never shown to the client.' },
  { key: 'onb_build_weeks_max', label: 'Onboarding: build time max (weeks)', type: 'number', description: 'Informational counterpart of the minimum.' },
  { key: 'onb_estimated_minutes', label: 'Onboarding: estimated minutes', type: 'number', description: 'Shown on the landing page ("about N minutes").' },
  { key: 'onb_terms_version', label: 'Onboarding: terms version', type: 'text', description: 'Recorded with every confirmation; bump when the terms text changes.' },
  { key: 'onb_examples_url', label: 'Onboarding: reference examples URL', type: 'text', description: 'Short link to our own examples page, shown above the reference-sites question. Empty hides the link.' },
  { key: 'onb_folder_help_url', label: 'Onboarding: folder sharing help URL', type: 'text', description: 'Help article linked next to the assets folder question.' },
  { key: 'onb_team_email', label: 'Onboarding: team recipient', type: 'text', description: 'Where confirmed briefs are sent. Empty falls back to the team notification email.' },
];
