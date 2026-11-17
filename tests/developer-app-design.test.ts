import { describe, expect, it } from 'vitest';
import { APP_FIX_STEP, APP_PAGE_STEP, APP_SYSTEM_STEP, filesFrom, pagePlan, problemLines, referencedAssets } from '@/lib/developer/app-design-shared';

describe('reading the model answer', () => {
  it('takes every file block, and drops paths outside the design', () => {
    const answer = [
      'Here you go:',
      '```file:styles.css',
      'body { margin: 0 }',
      '```',
      '```file:../secret.txt',
      'no',
      '```',
      '```file:Kurse.html extra',
      '<!doctype html>',
      '```',
    ].join('\n');
    expect(filesFrom(answer)).toEqual([
      { path: 'styles.css', content: 'body { margin: 0 }' },
      { path: 'kurse.html', content: '<!doctype html>' },
    ]);
  });

  it('reads the page plan, the homepage always index.html, file names checked', () => {
    const plan = [{ path: 'pages.json', content: JSON.stringify([{ name: 'Start', file: 'home.html' }, { name: 'Kurse', file: 'kurse.html' }, { name: 'Bad', file: '../x.html' }, { name: 'Twice', file: 'kurse.html' }]) }];
    expect(pagePlan(plan)).toEqual([
      { name: 'Start', file: 'index.html' },
      { name: 'Kurse', file: 'kurse.html' },
    ]);
    expect(pagePlan([{ path: 'pages.json', content: 'not json' }])).toEqual([]);
  });

  it('finds the files of the current website a design uses', () => {
    expect(
      referencedAssets([
        '<img src="assets/current-site/ab12-nina.jpg"><img src="assets/current-site/ab12-nina.jpg">',
        "@font-face{src:url('assets/current-site/fonts/cc-Times.woff2')}",
      ]),
    ).toEqual(['ab12-nina.jpg', 'fonts/cc-Times.woff2']);
  });
});

describe('the checks', () => {
  it('turns what the browser found into one line per page and width', () => {
    const lines = problemLines([
      {
        file: 'index.html',
        name: 'Start',
        shots: [],
        widths: [
          { width: 360, overflow: ['div.hero (to 410 px)'], smallText: ['p "Hallo" (14 px)'], smallTargets: [], brokenImages: [] },
          { width: 1440, overflow: [], smallText: [], smallTargets: [], brokenImages: [] },
        ],
      },
    ]);
    expect(lines).toEqual(['index.html at 360 px: sticks out sideways: div.hero (to 410 px); text under 16 px: p "Hallo" (14 px)']);
  });
});

describe('the instructions', () => {
  it('ask for plain files, the content word for word, and no dashes', () => {
    for (const text of [APP_SYSTEM_STEP, APP_PAGE_STEP, APP_FIX_STEP]) {
      expect(text).toContain('```file:');
      expect(text).not.toMatch(/[–—]/);
    }
    expect(APP_SYSTEM_STEP).toMatch(/pages\.json/);
    expect(APP_PAGE_STEP).toMatch(/word for word/);
    expect(APP_PAGE_STEP).toMatch(/360 to 1920 px/);
  });
});
