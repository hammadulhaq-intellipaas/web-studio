/**
 * Designs made in the app from the design prompt (app-design.ts): the instructions for the model,
 * how its answer is read, and the screen-size check that runs in the browser. Plain helpers only,
 * so they are easy to test.
 */

/** One file the model wrote: "```file:styles.css" … "```". */
export interface WrittenFile {
  path: string;
  content: string;
}

const SAFE_PATH = /^[a-z0-9][a-z0-9._/-]{0,80}$/;

/** The files in a model's answer, in order. Paths outside the design (../, absolute) are dropped. */
export function filesFrom(answer: string): WrittenFile[] {
  const out: WrittenFile[] = [];
  for (const m of answer.replace(/\r\n/g, '\n').matchAll(/```file:([^\s`]+)[^\n]*\n([\s\S]*?)\n```/g)) {
    const path = m[1].trim().toLowerCase();
    if (!SAFE_PATH.test(path) || path.includes('..')) continue;
    out.push({ path, content: m[2] });
  }
  return out;
}

/** The page plan of the design system step: names and file names, the homepage first as index.html. */
export function pagePlan(files: WrittenFile[]): { name: string; file: string }[] {
  const plan = files.find((f) => f.path === 'pages.json');
  if (!plan) return [];
  try {
    const list = JSON.parse(plan.content) as { name?: unknown; file?: unknown }[];
    const seen = new Set<string>();
    const out: { name: string; file: string }[] = [];
    for (const item of Array.isArray(list) ? list : []) {
      const name = typeof item?.name === 'string' ? item.name.trim() : '';
      const file = typeof item?.file === 'string' ? item.file.trim().toLowerCase() : '';
      if (!name || !/^[a-z0-9-]+\.html$/.test(file) || seen.has(file)) continue;
      seen.add(file);
      out.push({ name, file });
    }
    // The homepage is always index.html, so the review link opens on it.
    if (out.length && !out.some((p) => p.file === 'index.html')) out[0] = { ...out[0], file: 'index.html' };
    return out.slice(0, 8);
  } catch {
    return [];
  }
}

/** Every file of the client's current website a design refers to ("assets/current-site/…"). */
export function referencedAssets(texts: string[]): string[] {
  const out = new Set<string>();
  for (const t of texts) for (const m of t.matchAll(/assets\/current-site\/((?:fonts\/)?[A-Za-z0-9._-]+)/g)) out.add(m[1]);
  return [...out];
}

export const APP_SYSTEM_STEP = `You are a senior web designer at IntelliPaaS Web Studio. You turn a design brief into a static, clickable design of a client's new website, written as plain files a browser opens directly. You work in steps; this is the first one: the design system and the parts every page shares.

Write these files, each in a block that starts with \`\`\`file:<name> and ends with \`\`\`:
1. styles.css: every style of the site. Mobile first, from 360 px up, with the breakpoints the brief's screen sizes need (at least 768, 1024 and 1440 px). Colours, fonts, the type scale and spacing as custom properties at the top. Fonts: the client's own font files with @font-face from the paths the brief gives; Google Fonts with an @import at the top; otherwise a system font stack. Buttons, links, cards, forms, the header and the footer, at every width. A visible focus outline. The maximum content width stays fixed above 1440 px.
2. header.html: the header every page uses, with the logo and the menu linking to the page files below. Below 1024 px the menu collapses behind a menu button that opens a full-width panel.
3. footer.html: the footer every page uses.
4. site.js: only the menu button's open and close, a few lines, nothing else.
5. pages.json: the pages of "Pages in this design", in that order, as a JSON list of {"name": "<page name as in the brief>", "file": "<file name>.html"}; the homepage first, as index.html; other file names in lowercase letters, numbers and hyphens.

Rules: follow the brief exactly (brand, layout direction, reference parts, rules). Images: only the files the brief names (assets/current-site/…), or a neutral placeholder block with a short label saying what photo goes there. No external images, no icon fonts, no frameworks, no gradients. No em dashes or en dashes in any text. Answer with the five files only.`;

export const APP_PAGE_STEP = `You are a senior web designer at IntelliPaaS Web Studio, building one page of a static, clickable design from a design brief. The design system and the shared parts are written already and attached: use them, do not change them.

Write the page as one file, in a block that starts with \`\`\`file:<file name> and ends with \`\`\`:
- A complete HTML document in the site's language, linking styles.css and site.js, with a fitting title.
- The header and the footer exactly as given; mark this page's menu item as the current one.
- The sections the brief plans for this page, in its order, with the content it gives: the client's text word for word, [[OFFEN: …]] placeholders kept visible, never an invented fact.
- Use the classes and custom properties of styles.css. Styles only this page needs go in one <style> block in the head; keep it short.
- Images: only the files the brief names (assets/current-site/…), with a meaningful alt text, or a neutral placeholder block with a short label saying what photo goes there.
- Booking, shop, map, video and forms are shown as they will look, not working.
- It must work from 360 to 1920 px: nothing scrolls sideways, body text at least 16 px on phones, buttons at least 44 px tall.
No em dashes or en dashes in any text. Answer with the one file only.`;

export const APP_FIX_STEP = `You are a senior web designer at IntelliPaaS Web Studio. A static design was checked in a browser at seven screen widths (360 to 1920 px) and problems were found. Fix exactly these problems and nothing else: keep the design, the content and the wording as they are.

You receive the problems per page and width, then the files. Answer with only the files you changed, each complete, in a block that starts with \`\`\`file:<name> and ends with \`\`\`. Usually the fix belongs in styles.css, so it holds on every page.`;

/** The widths every design is checked at. */
export const CHECK_WIDTHS = [360, 390, 430, 768, 1024, 1440, 1920];

export interface WidthCheck {
  width: number;
  /** Elements that stick out past the right edge, with how far. */
  overflow: string[];
  /** Text under 16 px on a phone. */
  smallText: string[];
  /** Buttons and menu links under 44 px tall on a phone. */
  smallTargets: string[];
  brokenImages: string[];
}

export interface PageCheck {
  file: string;
  name: string;
  widths: WidthCheck[];
  /** Screenshots of the top of the page, stored next to the design. */
  shots: { width: number; path: string }[];
}

export const problemCount = (w: WidthCheck) => w.overflow.length + w.smallText.length + w.smallTargets.length + w.brokenImages.length;

/** The problems of a check as lines for the fix model and the Design tab. */
export function problemLines(pages: PageCheck[]): string[] {
  const lines: string[] = [];
  for (const p of pages) {
    for (const w of p.widths) {
      if (!problemCount(w)) continue;
      const parts = [
        ...w.overflow.map((x) => `sticks out sideways: ${x}`),
        ...w.smallText.map((x) => `text under 16 px: ${x}`),
        ...w.smallTargets.map((x) => `tap target under 44 px: ${x}`),
        ...w.brokenImages.map((x) => `image does not load: ${x}`),
      ];
      lines.push(`${p.file} at ${w.width} px: ${parts.join('; ')}`);
    }
  }
  return lines;
}

/** Runs in the page: what is wrong at the current width. */
export const CHECK_PAGE = String.raw`(() => {
  const vw = window.innerWidth;
  const phone = vw < 600;
  const name = (el) => {
    const id = el.id ? '#' + el.id : '';
    const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return el.tagName.toLowerCase() + id + cls + (text ? ' "' + text + '"' : '');
  };
  const visible = (el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  };
  const out = { overflow: [], smallText: [], smallTargets: [], brokenImages: [] };
  const width = Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0);
  if (width > vw + 1) {
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > vw + 1 && visible(el) && !el.closest('[aria-hidden="true"]')) {
        const parent = el.parentElement;
        // Report the outermost element that sticks out, not each of its children.
        if (parent && parent !== document.body && parent.getBoundingClientRect().right > vw + 1) continue;
        out.overflow.push(name(el) + ' (to ' + Math.round(r.right) + ' px)');
        if (out.overflow.length >= 5) break;
      }
    }
    if (!out.overflow.length) out.overflow.push('the page is ' + width + ' px wide');
  }
  if (phone) {
    for (const el of document.querySelectorAll('p, li, dd, dt, td, th, label, blockquote, figcaption, span, a')) {
      if (!visible(el)) continue;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 25);
      if (!own) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 15.5) {
        out.smallText.push(name(el) + ' (' + size + ' px)');
        if (out.smallText.length >= 5) break;
      }
    }
    for (const el of document.querySelectorAll('button, [role="button"], header a, nav a, a.button, a.btn, a[class*="button"], a[class*="btn"], input[type="submit"]')) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.height < 43.5) {
        out.smallTargets.push(name(el) + ' (' + Math.round(r.height) + ' px)');
        if (out.smallTargets.length >= 5) break;
      }
    }
  }
  for (const img of document.images) {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) out.brokenImages.push(img.getAttribute('src'));
  }
  return out;
})()`;
