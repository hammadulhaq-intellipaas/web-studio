import { beforeEach, describe, expect, it, vi } from 'vitest';
import { a, completeAnswers, dk, makeDefinition, makeRecord } from './fixtures/onboarding';
import type { BriefSectionContent, OnboardingSecrets } from '@/lib/onboarding/types';
import { prompts } from '../supabase/seed/onboarding/index.ts';

// The AI client logs to Supabase and reserves calls there; neither matters here.
const inserted: unknown[] = [];
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({
      insert: (row: unknown) => {
        inserted.push(row);
        return Promise.resolve({ error: null });
      },
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
  }),
}));

const { briefSchema, buildBriefPrompt, checkSections, fallbackSections, generateBrief, stillNeededSection, briefCorpus } =
  await import('@/lib/onboarding/ai/brief');

const def = makeDefinition();
const secrets: OnboardingSecrets = { prompts, examples: [] };
const llmSections = def.briefSections.filter((s) => s.generated_by === 'llm');

describe('brief schema', () => {
  it('has one fixed key per model section and no optional properties', () => {
    const schema = briefSchema(llmSections, ['a', 'b']);
    const good = { sections: Object.fromEntries(llmSections.map((s) => [s.id, { content_markdown: 'x', still_needed: [], sources: ['a'] }])) };
    expect(schema.safeParse(good).success).toBe(true);
    const missing = { sections: { who: { content_markdown: 'x', still_needed: [], sources: [] } } };
    expect(schema.safeParse(missing).success).toBe(false);
    const badSource = { ...good, sections: { ...good.sections, who: { content_markdown: 'x', still_needed: [], sources: ['ghost'] } } };
    expect(schema.safeParse(badSource).success).toBe(false);
  });
});

describe('fallback and still-needed', () => {
  it('renders answers as label: value lines in the client language and names the gaps', () => {
    const record = makeRecord({ answers: { ...completeAnswers(), booked_package: dk(), tagline: a('') } });
    const sections = fallbackSections(def, record, [], llmSections);
    expect(sections.who.content_markdown).toContain('**Wie lautet Ihr vollständiger Firmenname?');
    expect(sections.who.content_markdown).toContain('Physio Nordend Lena Hartmann e.K.');
    expect(sections.pages.still_needed).toContain('Welches Paket haben Sie gebucht?');
    expect(sections.look.content_markdown).toContain('Freundlich, aber professionell');
    expect(sections.dates.sources).toContain('launch_date');
  });

  it('composes section 9 from don\'t-know answers, thin fields, skipped follow-ups and the model\'s own lists', () => {
    const record = makeRecord({
      answers: { ...completeAnswers(), booked_package: dk(), page_list: a('Start\nKontakt') },
      review: {
        round: 1,
        budget_left: 5,
        answers_hash: 'x',
        queue: [],
        cursor: 1,
        history: [
          {
            question_id: 'fu:fu_dont_know:opening_hours',
            followup_id: 'fu_dont_know',
            target: { field: 'opening_hours' },
            question: { de: 'Öffnungszeiten?', en: 'Opening hours?' },
            answer: null,
            skipped: true,
            at: '2026-09-21T10:00:00Z',
          },
        ],
        gaps: [],
        llm_questions: [],
      },
    });
    const llm: Record<string, BriefSectionContent> = {
      who: { content_markdown: 'x', still_needed: ['Slogan'], sources: [] },
    };
    const section = stillNeededSection(def, record, [], llm);
    expect(section.still_needed).toEqual(
      expect.arrayContaining(['Welches Paket haben Sie gebucht?', expect.stringContaining('mehr Details'), 'Wie sind Ihre Öffnungszeiten?', 'Slogan']),
    );
    expect(section.content_markdown.split('\n').every((l) => l.startsWith('- '))).toBe(true);
  });

  it('says so when nothing is missing', () => {
    const section = stillNeededSection(def, makeRecord(), [], {});
    expect(section.still_needed).toEqual([]);
    expect(section.content_markdown).toMatch(/Nichts/);
  });
});

describe('guardrails on model output', () => {
  it('flags prices, timelines and invented facts but accepts the client\'s own words and captions', () => {
    const record = makeRecord();
    const corpus = briefCorpus(def, record, []);
    const ok: Record<string, BriefSectionContent> = {
      who: { content_markdown: 'Physio Nordend Lena Hartmann e.K. in 60318 Frankfurt am Main. Tonalität: Freundlich, aber professionell.', still_needed: [], sources: [] },
      dates: { content_markdown: 'Start am 2026-12-01, Inhalte bis 2026-10-15.', still_needed: [], sources: [] },
    };
    expect(checkSections(ok, corpus)).toEqual([]);
    const bad: Record<string, BriefSectionContent> = {
      who: { content_markdown: 'Gegründet 1998, Telefon 069 555 0000, ca. 2.990 € einmalig.', still_needed: [], sources: [] },
      dates: { content_markdown: 'Wir liefern in 3 Wochen.', still_needed: [], sources: [] },
    };
    const violations = checkSections(bad, corpus);
    expect(violations.some((v) => v.includes('1998'))).toBe(true);
    expect(violations.some((v) => v.includes('2.990 €'))).toBe(true);
    expect(violations.some((v) => v.includes('3 Wochen'))).toBe(true);
  });
});

describe('generateBrief', () => {
  beforeEach(() => {
    inserted.length = 0;
    process.env.ONBOARDING_AI_FIXTURE = '1';
  });

  it('in fixture mode returns every section in CMS order, appends section 9 and logs the call', async () => {
    const record = makeRecord({ answers: { ...completeAnswers(), booked_package: dk() } });
    const draft = await generateBrief({ definition: def, secrets, record, files: [] });
    expect(draft.source).toBe('llm');
    expect(Object.keys(draft.sections)).toEqual(def.briefSections.map((s) => s.id));
    expect(draft.sections.who.content_markdown).toContain('Für Physio Nordend halten wir fest');
    expect(draft.sections.still_needed.still_needed).toContain('Welches Paket haben Sie gebucht?');
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ job: 'brief', ok: true, model: 'fixture' });
  });

  it('builds a prompt that carries the sections, the answers and any violations', () => {
    const record = makeRecord();
    const prompt = buildBriefPrompt({ definition: def, secrets, record, files: [], sections: llmSections, gaps: [], violations: ['who: forbidden "3 Wochen"'] });
    expect(prompt).toContain('### who');
    expect(prompt).toContain('legal_name · Wie lautet Ihr vollständiger Firmenname?');
    expect(prompt).toContain('PREVIOUS ATTEMPT WAS REJECTED');
    expect(prompt).toContain('Write in German (de)');
  });

  it('falls back to the plain rendering when the model is not configured', async () => {
    delete process.env.ONBOARDING_AI_FIXTURE;
    const key = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const draft = await generateBrief({ definition: def, secrets, record: makeRecord(), files: [] });
      expect(draft.source).toBe('fallback');
      expect(draft.sections.who.content_markdown).toContain('**');
      expect(inserted).toHaveLength(0);
    } finally {
      if (key) process.env.OPENAI_API_KEY = key;
    }
  });
});
