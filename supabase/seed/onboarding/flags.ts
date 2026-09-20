import type { OnbFlagRule } from '../../../src/lib/onboarding/types.ts';

/**
 * Sales / compliance flags raised from answers (spec §03). `scope_flag`, `date_conflict`
 * and `credentials_redacted` are computed in code, not here — they need arithmetic.
 * Flags are shown to the team only; the client never sees a price.
 */
const rows: Omit<OnbFlagRule, 'sort' | 'active'>[] = [
  {
    id: 'flag_member_area',
    code: 'needs_quote',
    detail: 'member_area',
    severity: 'sales',
    conditions: [{ key: 'private_content', values: ['yes'] }],
    note_de: 'Mitglieder-/Login-Bereich gewünscht – nicht im Katalog, Angebot durch Thorsten.',
    note_en: 'Member / login area requested — not in the catalogue, quote via Thorsten.',
  },
  {
    id: 'flag_social_embed',
    code: 'needs_quote',
    detail: 'social_embed',
    severity: 'sales',
    conditions: [{ key: 'social_display', values: ['embedded'] }],
    note_de: 'Social-Feed eingebettet – kostenpflichtiges Extra.',
    note_en: 'Embedded social feed — paid extra.',
  },
  {
    id: 'flag_logo_redraw',
    code: 'needs_quote',
    detail: 'logo_redraw',
    severity: 'sales',
    conditions: [{ key: 'logo_vector', values: ['no'] }],
    note_de: 'Logo liegt nicht als Vektor vor – Nachzeichnen anbieten.',
    note_en: 'Logo not available as vector — offer a redraw.',
  },
  {
    id: 'flag_legal_pages',
    code: 'needs_quote',
    detail: 'legal_pages',
    severity: 'sales',
    conditions: [{ key: 'legal_pages', values: ['none'] }],
    note_de: 'Keine Rechtsseiten vorhanden – Erstellung anbieten.',
    note_en: 'No legal pages — offer to create them.',
  },
  {
    id: 'flag_bfsg',
    code: 'bfsg',
    detail: null,
    severity: 'warn',
    conditions: [{ key: 'sells_to_consumers', values: ['yes'] }],
    note_de: 'Verkauf an Verbraucher – BFSG-Barrierefreiheit prüfen.',
    note_en: 'Sells to consumers — check BFSG accessibility obligations.',
  },
  {
    id: 'flag_chatbot_interest',
    code: 'interest',
    detail: 'chatbot',
    severity: 'sales',
    conditions: [{ key: 'integrations', values: ['chat'] }],
    note_de: 'Chat/Chatbot angekreuzt – Interesse am AI Agentic Bundle.',
    note_en: 'Chat / chatbot ticked — interest in the AI Agentic Bundle.',
  },
  {
    id: 'flag_package_unknown',
    code: 'info',
    detail: 'package_unknown',
    severity: 'info',
    conditions: [{ key: 'booked_package', values: ['__dont_know'] }],
    note_de: 'Kunde kennt sein gebuchtes Paket nicht – im Angebot nachsehen.',
    note_en: 'Client does not know the booked package — check the quote.',
  },
];

export const flagRules: OnbFlagRule[] = rows.map((r, i) => ({ ...r, sort: (i + 1) * 10, active: true }));
