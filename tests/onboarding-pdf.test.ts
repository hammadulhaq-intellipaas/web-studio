import { describe, expect, it } from 'vitest';
import { pdfFileName, renderBriefPdf } from '@/lib/onboarding/pdf/render';
import type { OnboardingBrief } from '@/lib/onboarding/types';
import { makeDefinition, makeRecord } from './fixtures/onboarding';

const def = makeDefinition();

const brief: OnboardingBrief = {
  id: 'b1',
  form_id: 'testtesttesttesttest1',
  version: 2,
  source: 'llm',
  model: 'gpt-4o',
  created_at: '2026-09-21T11:00:00Z',
  sections: Object.fromEntries(
    def.briefSections.map((s) => [
      s.id,
      {
        content_markdown:
          s.generated_by === 'system'
            ? '- Öffnungszeiten, Tag für Tag\n- Logo als Vektordatei'
            : `Für **Physio Nordend** halten wir fest: Größe, Über, Straße – 60318 Frankfurt am Main. Preis? Nein.\n\n- Krankengymnastik\n- Manuelle Therapie\n  - Untereintrag „Test“ ✓ 🚀`,
        still_needed: s.id === 'look' ? ['Fotos der Praxisräume'] : [],
        sources: [],
      },
    ]),
  ),
};

describe('brief PDF', () => {
  it('renders an A4 PDF with German typography and the confirmation block', async () => {
    const record = makeRecord({
      status: 'confirmed',
      confirmed: { name: 'Lena Hartmann', at: '2026-09-21T11:00:00Z', terms_version: 'v2' },
    });
    const buffer = await renderBriefPdf(def, record, brief);
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(4000);
    // Helvetica is a built-in WinAnsi font: nothing has to be embedded for ä/ö/ü/ß/€.
    expect(buffer.toString('latin1')).toMatch(/Helvetica/);
  }, 30_000);

  it('renders the team copy with flags and the English variant', async () => {
    const record = makeRecord({
      locale: 'en',
      status: 'confirmed',
      confirmed: { name: 'Lena Hartmann', at: '2026-09-21T11:00:00Z', terms_version: 'v2' },
      flags: [{ code: 'scope_flag', detail: 'over', severity: 'sales', source: 'system', data: { quoted: '58', listed: 11 } }],
    });
    const buffer = await renderBriefPdf(def, record, brief, { team: true });
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  }, 30_000);

  it('names the file after the company and version', () => {
    expect(pdfFileName(makeRecord(), 3)).toBe('Briefing-Physio-Nordend-v3.pdf');
    expect(pdfFileName(makeRecord({ locale: 'en', company: 'Ärzte & Co. GmbH' }), 1)).toBe('Brief-rzte-Co-GmbH-v1.pdf');
    expect(pdfFileName(makeRecord({ company: null }), 1)).toBe('Briefing-briefing-v1.pdf');
  });
});
