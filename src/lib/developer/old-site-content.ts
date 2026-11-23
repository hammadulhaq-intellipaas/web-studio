import 'server-only';
import { z } from 'zod';
import { callObject } from './model-call';
import { downloadAsset, loadSiteRead, saveSiteRead, type SiteRead, type StoredAsset } from './old-site-read';
import { hasEvidence } from './old-site';

/**
 * Steps 3 and 4 of reading a Form B client's website: the extraction model (dev_extract_model, Sol by default) sorts the pages'
 * content into facts, copied word for word, and code checks each fact against the page it came
 * from; a fact without evidence becomes an open point ([[OFFEN: …]]) instead of content. Then the
 * photos are described, so the design can place them. The spec that comes out of it is assembled
 * in code (old-site-spec.ts).
 */

export const TOPICS = [
  'about',
  'service',
  'offer',
  'price',
  'process',
  'team',
  'qualification',
  'testimonial',
  'faq',
  'opening_hours',
  'location',
  'contact',
  'social',
  'cta',
  'other',
] as const;

const factSchema = z.object({
  topic: z.enum(TOPICS),
  title: z.string(),
  text: z.string(),
  kind: z.enum(['text', 'price', 'quote']),
  page: z.string(),
  evidence: z.string(),
});
const contentSchema = z.object({
  summary: z.string(),
  facts: z.array(factSchema),
  missing: z.array(z.string()),
});
export type SiteFact = z.infer<typeof factSchema> & { verified: boolean };
export interface SiteContent {
  summary: string;
  facts: SiteFact[];
  missing: string[];
}

export const SORT_SYSTEM = `You sort the content of a small business's current website, so a designer can build the new site from it. You receive the text of its pages as JSON: each page with its url, title, kind ("legal" for the imprint and privacy pages) and text (headings start with "#", list items with "-").

Return every piece of content the new website needs, as facts:
- topic: one of about, service, offer, price, process, team, qualification, testimonial, faq, opening_hours, location, contact, social, cta, other.
- title: a short English label, for example "Service: Manual therapy" or "Price: Bloom programme".
- text: the content, copied word for word from the page, in the page's language. Never translate, shorten, correct or rephrase it. Split long passages into several facts, one per paragraph or list.
- kind: "price" for a price or another number that matters (a duration, a number of sessions); "quote" for a testimonial or anything in someone's own words; otherwise "text".
- page: the url of the page it comes from, exactly as given.
- evidence: one sentence or line copied exactly from that page that contains the fact.

Rules:
1. Copy, never write. If something is not on the pages, leave it out; never guess, complete or improve it.
2. Leave out menus, buttons repeated on every page, cookie notices, footers repeated on every page and the boilerplate of the legal pages. Do take the company details from the legal pages (legal name, address, register entry, VAT ID, responsible person, phone, email) as topic "contact".
3. Every fact once: when the same text appears on several pages, take it from the page where it belongs most.
4. summary: two or three English sentences on what the business does and for whom, from the pages only.
5. missing: content a site like this usually needs that the pages do not have (for example prices, opening hours, testimonials), as short English phrases.`;

export const PHOTO_SYSTEM = `You describe the pictures of a small business's current website for the designer of its new site. The pictures are attached in order. For each one return:
- n: its number, starting at 1.
- description: one English sentence on what it shows, the setting and the light. Name no one.
- subject: person, team, premises, work, product, illustration, logo, icon, stock or other.
- quality: "good" when it is sharp and large enough for a full-width photo, "ok" when it works at half width, "poor" when it is small, blurred or looks dated.
- people: true when a person is visible.
- use: where it fits best on the new site: hero, section, portrait, gallery, logo or none.`;

const photoSchema = z.object({
  photos: z.array(
    z.object({
      n: z.number(),
      description: z.string(),
      subject: z.enum(['person', 'team', 'premises', 'work', 'product', 'illustration', 'logo', 'icon', 'stock', 'other']),
      quality: z.enum(['good', 'ok', 'poor']),
      people: z.boolean(),
      use: z.enum(['hero', 'section', 'portrait', 'gallery', 'logo', 'none']),
    }),
  ),
});
export type PhotoNote = Omit<z.infer<typeof photoSchema>['photos'][number], 'n'> & { path: string };

/** Checks every fact against the page it names; a fact on an unknown page is not verified. */
export function verifyFacts(facts: z.infer<typeof factSchema>[], pages: SiteRead['pages']): SiteFact[] {
  const byUrl = new Map(pages.map((p) => [p.url.replace(/\/$/, ''), p.text]));
  return facts.map((f) => {
    const text = byUrl.get(f.page.trim().replace(/\/$/, ''));
    if (!text) return { ...f, verified: false };
    // The content itself must be on the page too (copied, not written), except a price, which
    // only has to match the numbers of its evidence.
    const own = f.kind === 'price' ? true : hasEvidence({ kind: 'text', text: f.text, evidence: f.text.slice(0, 400) }, text);
    return { ...f, verified: own && hasEvidence(f, text) };
  });
}

/** Step 3: the content, sorted and checked. */
export async function sortSiteContent(leadId: string, formId: string, modelId: string): Promise<void> {
  const row = await loadSiteRead(leadId);
  if (!row) throw new Error('No site read started.');
  const input = JSON.stringify({ pages: row.pages.map((p) => ({ url: p.url, title: p.title, kind: p.kind, text: p.text })) });
  const result = await callObject({
    formId,
    job: 'dev_site_content',
    modelId,
    system: SORT_SYSTEM,
    prompt: input,
    schema: contentSchema,
    timeoutMs: 240_000,
    maxOutputTokens: 40_000,
    fixture: {
      summary: 'Fixture summary of the website.',
      facts: row.pages.slice(0, 1).map((p) => ({ topic: 'about' as const, title: 'About', text: p.text.split('\n')[0] ?? '', kind: 'text' as const, page: p.url, evidence: p.text.split('\n')[0] ?? '' })),
      missing: [],
    },
  });
  const content: SiteContent = { summary: result.summary, facts: verifyFacts(result.facts, row.pages), missing: result.missing };
  await saveSiteRead(leadId, { content, step: 'photos' });
}

const READABLE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const PHOTO_MAX = 60;
const BATCH = 8;

/** Step 4: what each photo shows and where it fits, in batches the model can look at. */
export async function describeSitePhotos(leadId: string, formId: string, modelId: string): Promise<void> {
  const row = await loadSiteRead(leadId);
  if (!row) throw new Error('No site read started.');
  const started = Date.now();
  const photos = row.assets.filter((a) => a.kind === 'image' && READABLE.includes(a.type) && a.bytes <= 5 * 1024 * 1024).slice(0, PHOTO_MAX);
  const notes: PhotoNote[] = [];
  const batches: StoredAsset[][] = [];
  for (let i = 0; i < photos.length; i += BATCH) batches.push(photos.slice(i, i + BATCH));
  const failed: string[] = [];
  // Three batches at a time, within the request's time.
  for (let i = 0; i < batches.length; i += 3) {
    if (Date.now() - started > 200_000) {
      failed.push(`${batches.slice(i).flat().length} photos not described in time`);
      break;
    }
    await Promise.all(
      batches.slice(i, i + 3).map(async (batch) => {
        const loaded = (await Promise.all(batch.map(async (a) => ({ a, image: await downloadAsset(a.path) })))).filter((x) => x.image);
        if (!loaded.length) return;
        try {
          const result = await callObject({
            formId,
            job: 'dev_site_photos',
            modelId,
            system: PHOTO_SYSTEM,
            prompt: `Describe these ${loaded.length} pictures, in order. Their alt texts on the site: ${JSON.stringify(loaded.map((x, k) => `${k + 1}: ${x.a.label || '(none)'}`))}`,
            pictures: loaded.map((x) => ({ image: x.image!, mediaType: x.a.type })),
            schema: photoSchema,
            timeoutMs: 120_000,
            fixture: { photos: loaded.map((_, k) => ({ n: k + 1, description: 'A photo.', subject: 'other' as const, quality: 'ok' as const, people: false, use: 'section' as const })) },
          });
          for (const p of result.photos) {
            const asset = loaded[p.n - 1]?.a;
            if (asset) notes.push({ path: asset.path, description: p.description, subject: p.subject, quality: p.quality, people: p.people, use: p.use });
          }
        } catch (err) {
          failed.push(`photos ${batch.map((b) => b.path.split('/').pop()).join(', ')}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }),
    );
  }
  const order = new Map(photos.map((p, i) => [p.path, i]));
  notes.sort((a, b) => (order.get(a.path) ?? 0) - (order.get(b.path) ?? 0));
  await saveSiteRead(leadId, { photos: notes, notes: [...(row.notes ?? []), ...failed], step: 'design' });
}
