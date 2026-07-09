import type { Lead, LeadConfig } from '../types';

export interface PhaseSpec {
  key: string;
  title: string;
  tool: 'claude_design' | 'claude_code';
  /** What the generated prompt for this phase must accomplish. */
  goal: string;
  /** Placeholder tokens this phase's prompt should embed, e.g. "{{phase_1.output}}". */
  expectedInputs: string[];
}

const FEATURE_ADDON_IDS = new Set([
  'page',
  'blogsetup',
  'blogstarter',
  'cms',
  'bookembed',
  'bookcustom',
  'bookpay',
  'newsletter',
  'form',
  'ecom',
  'maps',
  'widgets',
  'gws',
  'socialfeed',
  'chatwidget',
  'lang',
  'aichatbot',
]);

const COMPLIANCE_ADDON_IDS = new Set(['cookie', 'bfsg', 'dsgvocheck', 'dsgvoyear']);

/**
 * Fixed pipeline with conditional phases. The AI only writes the prompt content;
 * phase structure, order and tooling are deterministic.
 */
export function buildPipeline(config: LeadConfig): PhaseSpec[] {
  const isByowLive = config.bundle === 'byow';
  const addonIds = config.addons.map((a) => a.id);
  const hasFeatures = addonIds.some((id) => FEATURE_ADDON_IDS.has(id));
  const hasCompliance = addonIds.some((id) => COMPLIANCE_ADDON_IDS.has(id));

  if (isByowLive) {
    const phases: PhaseSpec[] = [
      {
        key: 'takeover_audit',
        title: 'Site takeover & go-live audit',
        tool: 'claude_code',
        goal: 'Audit the customer\'s self-built website (source or export), inventory pages/assets, and produce a takeover checklist covering domain, hosting (Vercel/Hetzner DE), SSL, email on their own domain, Cloudflare basic proxy, form spam protection, SEO basics (favicon, OG tags, sitemap), legal-notice template, and password protection until go-live.',
        expectedInputs: [],
      },
    ];
    if (hasFeatures) {
      phases.push({
        key: 'features',
        title: 'Purchased add-on implementation',
        tool: 'claude_code',
        goal: 'Implement exactly the purchased add-ons on the taken-over site, one section per add-on with acceptance criteria.',
        expectedInputs: ['{{phase_1.output}}'],
      });
    }
    phases.push({
      key: 'deploy',
      title: 'Deploy & go-live checklist',
      tool: 'claude_code',
      goal: 'Deploy the site to production, connect the domain, verify SSL/email/proxy/forms, run the acceptance test from the BYOW package, and produce a go-live checklist with rollback notes.',
      expectedInputs: [`{{phase_${phases.length}.output}}`],
    });
    return phases;
  }

  const phases: PhaseSpec[] = [
    {
      key: 'design_brief',
      title: 'Design brief & first mockup',
      tool: 'claude_design',
      goal: 'Produce a complete design brief and generate the first full website mockup in Claude Design: page list per the purchased bundle, brand direction from the customer\'s colors/logo/story, section-by-section content using their actual texts (services, USPs, testimonials), and their stated main goal as the primary conversion action.',
      expectedInputs: [],
    },
    {
      key: 'design_iteration',
      title: 'Design iteration & handoff export',
      tool: 'claude_design',
      goal: 'Iterate the mockup to final quality (responsive checks, all pages, real content filled in) and export the handoff bundle for implementation.',
      expectedInputs: ['{{phase_1.output}}'],
    },
    {
      key: 'scaffold',
      title: 'Scaffold Next.js app from the design export',
      tool: 'claude_code',
      goal: 'Implement the exported design pixel-identically as a Next.js app (App Router, TypeScript), matching the bundle\'s page count and language count, with clean componentization and the customer\'s real content.',
      expectedInputs: ['{{phase_2.output}}'],
    },
  ];
  if (hasFeatures) {
    phases.push({
      key: 'features',
      title: 'Feature & add-on implementation',
      tool: 'claude_code',
      goal: 'Implement exactly the purchased add-ons (booking, shop/Stripe, blog/CMS, newsletter, extra forms, maps, widgets, additional languages, AI chatbot, …), one section per add-on with concrete acceptance criteria.',
      expectedInputs: [`{{phase_${phases.length}.output}}`],
    });
  }
  phases.push({
    key: 'content_seo_compliance',
    title: hasCompliance ? 'Content, SEO & compliance pass' : 'Content & SEO pass',
    tool: 'claude_code',
    goal:
      'Fill and polish all content, implement SEO metadata (meta tags, sitemap, Search Console readiness) per the bundle, and' +
      (hasCompliance
        ? ' implement the purchased compliance add-ons (cookie consent/analytics, BFSG accessibility, GDPR check) to German legal standards.'
        : ' verify legal-notice and privacy pages are present and linked.'),
    expectedInputs: [`{{phase_${phases.length}.output}}`],
  });
  phases.push({
    key: 'deploy',
    title: 'Deploy & go-live checklist',
    tool: 'claude_code',
    goal: 'Deploy to production hosting (DE/EU), connect domain + SSL + email, configure Cloudflare per the chosen security plan, verify forms/booking end-to-end, and produce the go-live checklist.',
    expectedInputs: [`{{phase_${phases.length}.output}}`],
  });
  return phases;
}

/** Assemble the full lead context the AI tailors prompts from. */
export function buildLeadContext(lead: Lead, fileNames: string[]): string {
  const c = lead.config;
  const s2 = lead.stage2?.fields ?? {};
  const lines: string[] = [];

  lines.push(`## Contact & company`);
  lines.push(`- Name: ${lead.vorname} ${lead.nachname}`.trim());
  lines.push(`- Company: ${lead.firma || s2.firmenname || '(not provided)'}`);
  if (s2.rechtsform) lines.push(`- Legal form: ${s2.rechtsform}`);
  if (s2.anschrift) lines.push(`- Address: ${s2.anschrift}`);
  if (s2.inhaber) lines.push(`- Owner/MD: ${s2.inhaber}`);
  if (s2.oeffnung) lines.push(`- Opening hours: ${s2.oeffnung}`);
  if (s2.gebiet) lines.push(`- Service area: ${s2.gebiet}`);
  if (s2.ustid) lines.push(`- VAT ID: ${s2.ustid}`);
  lines.push(`- Industry persona: ${lead.persona_id ?? '(none)'}`);
  lines.push(`- Site language(s) requested: ${c.answers.langs ?? '1'}`);
  if (lead.source_url) lines.push(`- Existing site / profile: ${lead.source_url}`);

  lines.push(`\n## Purchased configuration`);
  lines.push(`- Bundle: ${c.bundleName} (${c.bundle})`);
  lines.push(
    `- Add-ons: ${c.addons.length ? c.addons.map((a) => `${a.name}${a.qty ? ` ×${a.qty}` : ''}`).join('; ') : '(none)'}`,
  );
  lines.push(`- Care plan: ${c.care} · Support: ${c.support} · Cloudflare: ${c.cf}`);
  if (c.aiBundle) lines.push(`- AI Agentic Bundle: yes`);

  lines.push(`\n## Questionnaire answers`);
  for (const [k, v] of Object.entries(c.answers)) {
    if (v == null || (Array.isArray(v) && !v.length)) continue;
    lines.push(`- ${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
  }

  if (lead.ziel) lines.push(`\n## Stated goal (free text)\n${lead.ziel}`);
  if (lead.goal) lines.push(`- Primary website goal: ${lead.goal}`);

  const story: string[] = [];
  if (s2.einsatz) story.push(`- One-sentence pitch: ${s2.einsatz}`);
  if (s2.leistungen) story.push(`- Services/products (one per line):\n${s2.leistungen}`);
  if (s2.usps) story.push(`- USPs:\n${s2.usps}`);
  if (s2.zertifikate) story.push(`- Certificates/awards: ${s2.zertifikate}`);
  if (s2.farben) story.push(`- Brand colors: ${s2.farben}`);
  if (s2.gprofil) story.push(`- Google Business Profile: ${s2.gprofil}`);
  if (s2.socialp) story.push(`- Social profiles: ${s2.socialp}`);
  if (s2.bewertungen) story.push(`- Reviews/testimonials:\n${s2.bewertungen}`);
  if (s2.beispiele) story.push(`- Reference websites (likes/dislikes):\n${s2.beispiele}`);
  if (story.length) lines.push(`\n## Customer content (stage 2)\n${story.join('\n')}`);

  if (fileNames.length) lines.push(`\n## Uploaded files\n${fileNames.map((f) => `- ${f}`).join('\n')}`);
  if (lead.drive_link) lines.push(`- Material link: ${lead.drive_link}`);

  return lines.join('\n');
}
