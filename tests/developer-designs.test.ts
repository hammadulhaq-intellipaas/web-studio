import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import type { PromptContext } from '@/lib/developer/context';
import { contentTypeFor, draftPath, encodePath, isLabel, nextLabel, siteKey, slugify } from '@/lib/developer/drafts';
import { buildPromptInput, handoverPromptInput, revisionPromptInput } from '@/lib/developer/messages';
import { DEV_BUILD_PROMPT, DEV_HANDOVER_PROMPT, DEV_REVISION_PROMPT } from '@/lib/developer/prompt-defaults';
import { cmsBooked, setupCommands } from '@/lib/developer/setup';
import { entryPage, unzip } from '@/lib/developer/unzip';

/** A minimal zip writer for the tests: stored or deflated entries, no CRC (the reader ignores it). */
function makeZip(files: { name: string; text: string; deflate?: boolean }[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8');
    const raw = Buffer.from(f.text, 'utf8');
    const body = f.deflate ? deflateRawSync(raw) : raw;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(f.deflate ? 8 : 0, 8);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, body);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(f.deflate ? 8 : 0, 10);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += 30 + name.length + body.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

describe('unzip', () => {
  it('reads stored and deflated files and drops the shared top folder', () => {
    const zip = makeZip([
      { name: 'design-export/Agentur Artz.dc.html', text: '<!DOCTYPE html><x-dc></x-dc>', deflate: true },
      { name: 'design-export/support.js', text: 'console.log(1)' },
      { name: 'design-export/img/hero.jpg', text: 'jpeg bytes', deflate: true },
    ]);
    const files = unzip(zip);
    expect(files.map((f) => f.path).sort()).toEqual(['Agentur Artz.dc.html', 'img/hero.jpg', 'support.js']);
    expect(files.find((f) => f.path === 'support.js')!.data.toString()).toBe('console.log(1)');
    expect(files.find((f) => f.path === 'Agentur Artz.dc.html')!.data.toString()).toContain('<x-dc>');
  });

  it('skips macOS and Windows junk and folder entries', () => {
    const zip = makeZip([
      { name: 'index.html', text: '<html></html>' },
      { name: '__MACOSX/._index.html', text: 'junk' },
      { name: '.DS_Store', text: 'junk' },
      { name: 'img/', text: '' },
      { name: 'img/Thumbs.db', text: 'junk' },
    ]);
    expect(unzip(zip).map((f) => f.path)).toEqual(['index.html']);
  });

  it('refuses paths that leave the archive', () => {
    expect(() => unzip(makeZip([{ name: '../evil.html', text: 'x' }]))).toThrow(/Unsafe path/);
    expect(() => unzip(makeZip([{ name: 'a/../../evil.html', text: 'x' }]))).toThrow(/Unsafe path/);
    expect(() => unzip(makeZip([{ name: '/etc/passwd', text: 'x' }]))).toThrow(/Unsafe path/);
    expect(() => unzip(makeZip([{ name: 'C:/evil.html', text: 'x' }]))).toThrow(/Unsafe path/);
  });

  it('enforces the entry and size limits, and rejects non-zips', () => {
    const zip = makeZip([
      { name: 'a.html', text: 'aaaa' },
      { name: 'b.html', text: 'bbbb' },
    ]);
    expect(() => unzip(zip, { maxEntries: 1, maxTotalBytes: 1000 })).toThrow(/more than 1 files/);
    expect(() => unzip(zip, { maxEntries: 10, maxTotalBytes: 6 })).toThrow(/size limit/);
    expect(() => unzip(Buffer.from('not a zip at all, just some text that is long enough'))).toThrow(/Not a zip/);
  });
});

describe('entryPage', () => {
  it('prefers a top-level Claude Design page, then index.html, then the shallowest page', () => {
    expect(entryPage(['index.html', 'Site.dc.html', 'support.js'])).toBe('Site.dc.html');
    expect(entryPage(['about.html', 'index.html'])).toBe('index.html');
    expect(entryPage(['pages/b/x.html', 'pages/a.html'])).toBe('pages/a.html');
    expect(entryPage(['support.js', 'img/a.png'])).toBeNull();
  });
});

describe('draft links', () => {
  it('slugifies company names, umlauts included', () => {
    expect(slugify('Müller Sanitär GmbH')).toBe('mueller-sanitaer-gmbh');
    expect(slugify('Straße & Söhne')).toBe('strasse-soehne');
    expect(slugify('Café Noël')).toBe('cafe-noel');
    expect(slugify('***')).toBe('client');
    const long = slugify('Praxis für Physiotherapie und Osteopathie am Marktplatz Berlin');
    expect(long.length).toBeLessThanOrEqual(40);
    expect(long).not.toMatch(/-$/);
  });

  it('numbers versions per proposal', () => {
    expect(nextLabel('A', [])).toEqual({ version: 1, label: 'v1-a' });
    const existing = [
      { proposal: 'A' as const, version: 1 },
      { proposal: 'A' as const, version: 2 },
      { proposal: 'B' as const, version: 1 },
    ];
    expect(nextLabel('A', existing)).toEqual({ version: 3, label: 'v3-a' });
    expect(nextLabel('B', existing)).toEqual({ version: 2, label: 'v2-b' });
  });

  it('accepts only real version labels', () => {
    expect(isLabel('v1-a')).toBe(true);
    expect(isLabel('v12-b')).toBe(true);
    for (const bad of ['v1-c', 'V1-a', 'v-a', '1-a', 'v1-a/../x', 'v1a']) expect(isLabel(bad), bad).toBe(false);
  });

  it('builds storage keys that are always valid, whatever the file is called', () => {
    const key = siteKey('lead', 'ver', 'Bilder/Über uns.jpg');
    expect(key).toMatch(/^lead\/ver\/site\/[0-9a-f]+$/);
    expect(Buffer.from(key.split('/').pop()!, 'hex').toString('utf8')).toBe('Bilder/Über uns.jpg');
  });

  it('encodes each segment of a link and keeps the slashes', () => {
    expect(encodePath('Agentur Artz.dc.html')).toBe('Agentur%20Artz.dc.html');
    expect(encodePath('img/Über uns.jpg')).toBe('img/%C3%9Cber%20uns.jpg');
    expect(draftPath('mueller', 'v1-a')).toBe('/drafts/mueller/v1-a');
  });

  it('serves pages, scripts and fonts with the right type', () => {
    expect(contentTypeFor('a.dc.html')).toMatch(/^text\/html/);
    expect(contentTypeFor('support.js')).toMatch(/^text\/javascript/);
    expect(contentTypeFor('font.WOFF2')).toBe('font/woff2');
    expect(contentTypeFor('notes')).toBe('application/octet-stream');
  });
});

describe('project setup', () => {
  it('knows when a CMS is booked: Gold, Platinum, or the CMS add-on', () => {
    expect(cmsBooked({ bundle: 'gold', addons: [] })).toBe(true);
    expect(cmsBooked({ bundle: 'platinum', addons: [] })).toBe(true);
    expect(cmsBooked({ bundle: 'silver', addons: [{ id: 'cms', name: 'CMS setup', qty: null, billing: 'once', price: 490 }] })).toBe(true);
    expect(cmsBooked({ bundle: 'silver', addons: [{ id: 'bookembed', name: 'Booking', qty: null, billing: 'once', price: 490 }] })).toBe(false);
    expect(cmsBooked(null)).toBe(false);
  });

  it('writes the setup commands, with Supabase only for a CMS', () => {
    const plain = setupCommands('mueller', false);
    expect(plain).toContain('gh repo create mueller --private --source . --remote origin');
    expect(plain).toContain('vercel link --yes --project mueller');
    expect(plain).not.toContain('supabase');
    expect(plain.trim().split('\n').pop()).toBe('claude');

    const cms = setupCommands('mueller', true);
    expect(cms).toContain('supabase projects create mueller --region eu-central-1');
    expect(cms).toContain('fizrafarid+mueller@intellipaas.io');
    expect(cms).not.toMatch(/password|token|key=/i);
  });
});

const context: PromptContext = {
  client: { company: 'Müller Sanitär GmbH', contact: 'Anna Meier', email: 'anna@example.com', formLanguage: 'de' },
  quote: { package: 'Gold', addons: ['Online booking system (Calendly/Cal.com)'] },
  sections: [
    {
      screen: 'design',
      title: 'How your site should look and sound',
      answers: [{ key: 'business_one_liner', question: 'In one sentence, what do you do?', answer: 'Wir bauen Bäder.' }],
    },
  ],
  referenceSites: [],
  files: [{ question: 'Logo', name: 'logo.svg', type: 'image/svg+xml' }],
  status: 'confirmed',
  confirmedAt: '2026-10-28T10:00:00Z',
};
const design = { proposal: 'A' as const, version: 'v2-a', reference: 'Graza' };

describe('revision, build and handover inputs', () => {
  it('passes the feedback as written, with the brief and earlier revisions', () => {
    const input = JSON.parse(
      revisionPromptInput({
        company: 'Müller Sanitär GmbH',
        formLanguage: 'de',
        design,
        designBrief: '# Website design brief',
        earlierRevisions: ['# Design revision: v1-a'],
        feedback: '  Das Grün ist zu dunkel.  ',
        internalNotes: '',
      }),
    );
    expect(input.version).toBe('v2-a');
    expect(input.feedback).toBe('Das Grün ist zu dunkel.');
    expect(input.earlier_revisions).toEqual(['# Design revision: v1-a']);
    expect(input.internal_notes).toBeNull();
  });

  it('gives the build prompt the project, the CMS flag and the developer instructions', () => {
    const input = JSON.parse(
      buildPromptInput(context, { project: 'mueller', cms: true, design, designBrief: null, devInstructions: ' Use Sanity. ', internalNotes: 'Calm.' }),
    );
    expect(input.cms_booked).toBe(true);
    expect(input.project).toEqual({ name: 'mueller', github_repository: 'mueller', vercel_project: 'mueller', supabase_project: 'mueller' });
    expect(input.approved_design).toEqual({ ...design, folder: './design' });
    expect(input.developer_instructions).toBe('Use Sanity.');
    expect(input.answers[0].items[0].answer).toBe('Wir bauen Bäder.');
  });

  it('leaves the CMS link out of the handover without a CMS', () => {
    const input = JSON.parse(handoverPromptInput(context, { cms: false, liveUrl: 'https://mueller.de', cmsUrl: 'https://x/admin', design: null, internalNotes: '' }));
    expect(input.live_url).toBe('https://mueller.de');
    expect(input.cms_url).toBeNull();
    expect(input.approved_design).toBeNull();
  });
});

describe('the revision, build and handover instructions', () => {
  it('have no em or en dashes', () => {
    for (const text of [DEV_REVISION_PROMPT, DEV_BUILD_PROMPT, DEV_HANDOVER_PROMPT]) expect(text).not.toMatch(/[–—]/);
  });
  it('carry their key rules and output shapes', () => {
    expect(DEV_REVISION_PROMPT).toMatch(/Change only what the feedback asks for/);
    expect(DEV_REVISION_PROMPT).toMatch(/# Design revision/);
    expect(DEV_BUILD_PROMPT).toMatch(/1:1/);
    expect(DEV_BUILD_PROMPT).toMatch(/only if cms_booked is true/);
    expect(DEV_BUILD_PROMPT).toMatch(/never write a key, token or password/i);
    expect(DEV_BUILD_PROMPT).toMatch(/QA-REPORT\.md/);
    expect(DEV_HANDOVER_PROMPT).toMatch(/Never write a password/);
    expect(DEV_HANDOVER_PROMPT).toMatch(/## 8\. Go-live requirements/);
    expect(DEV_HANDOVER_PROMPT).toMatch(/## 9\. Using your CMS/);
  });
});
