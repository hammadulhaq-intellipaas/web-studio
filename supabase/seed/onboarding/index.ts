/**
 * Initial content of the onboarding-form CMS tables. Supabase is the runtime source of
 * truth (admin edits win); these files only produce the seed migration via
 * `node scripts/gen-onboarding-seed.mts` and feed `tests/onboarding-cms-lint.test.ts`.
 */
export { screens } from './screens.ts';
export { fields } from './fields.ts';
export { followups } from './followups.ts';
export { flagRules } from './flags.ts';
export { briefSections } from './sections.ts';
export { texts } from './texts.ts';
export { prompts } from './prompts.ts';
export { examples } from './examples.ts';
