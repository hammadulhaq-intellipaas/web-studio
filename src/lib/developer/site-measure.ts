/**
 * The script the site reader runs inside each page of a client's reference website: everything
 * a layout spec needs, measured from the rendered page (sections in order, header, footer, type,
 * colours, buttons, content width, motion). Ported from the crawler that made the 11 library
 * specs in docs/reference-specs.
 *
 * Kept as plain JavaScript in a string, so no build step can rewrite it before it reaches the
 * browser. It returns plain data only.
 */
export const MEASURE_PAGE = String.raw`(() => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const hex = (c) => {
    const m = c && c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(',').map((s) => s.trim());
    const a = p[3] === undefined ? 1 : Number(p[3]);
    if (a === 0) return null;
    const h = '#' + p.slice(0, 3).map((v) => Number(v).toString(16).padStart(2, '0')).join('');
    return a < 1 ? h + ' at ' + Math.round(a * 100) + '%' : h;
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
  };
  const absTop = (el) => el.getBoundingClientRect().top + window.scrollY;
  const text = (el, n) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, n || 90);
  const family = (cs) => cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
  const typo = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      family: family(cs),
      size_px: Math.round(parseFloat(cs.fontSize)),
      weight: cs.fontWeight,
      line_height: cs.lineHeight,
      letter_spacing: cs.letterSpacing,
      case: cs.textTransform,
      style: cs.fontStyle,
      colour: hex(cs.color),
    };
  };
  const firstVisible = (sel) => Array.from(document.querySelectorAll(sel)).find((e) => visible(e) && text(e).length > 1) || null;

  const significant = (el) => Array.from(el.children).filter((c) => visible(c) && c.getBoundingClientRect().height > 30 && !['SCRIPT', 'STYLE', 'NOSCRIPT', 'LINK'].includes(c.tagName));
  const expand = (el, depth) => {
    let node = el;
    for (let i = 0; i < 8; i++) {
      const kids = significant(node);
      if (kids.length === 1 && kids[0].getBoundingClientRect().height >= node.getBoundingClientRect().height * 0.8) node = kids[0];
      else break;
    }
    const out = [];
    for (const k of significant(node)) {
      const h = k.getBoundingClientRect().height;
      if (depth < 3 && h > vh * 1.6 && significant(k).length >= 3 && !['HEADER', 'FOOTER', 'NAV'].includes(k.tagName)) out.push(...expand(k, depth + 1));
      else out.push(k);
    }
    return out;
  };
  const bandEls = expand(document.body, 0).filter((b) => b.getBoundingClientRect().height > 40).slice(0, 24);

  const rowLayout = (band) => {
    let best = null;
    const walk = (el, depth) => {
      if (depth > 6) return;
      for (const c of el.children) {
        if (!visible(c)) continue;
        const cs = getComputedStyle(c);
        if (cs.display.includes('flex') || cs.display.includes('grid')) {
          const kids = Array.from(c.children).filter((k) => visible(k) && k.getBoundingClientRect().width > 40 && k.getBoundingClientRect().height > 20);
          if (kids.length >= 2) {
            const top = kids[0].getBoundingClientRect().top;
            const row = kids.filter((k) => Math.abs(k.getBoundingClientRect().top - top) < 12);
            if (row.length >= 2) {
              const area = c.getBoundingClientRect().width * c.getBoundingClientRect().height;
              if (!best || area > best.area) {
                const total = row.reduce((s, k) => s + k.getBoundingClientRect().width, 0);
                best = { area: area, columns: row.length, items: kids.length, rows: Math.ceil(kids.length / row.length), split_pct: row.map((k) => Math.round((k.getBoundingClientRect().width / total) * 100)) };
              }
            }
          }
        }
        walk(c, depth + 1);
      }
    };
    walk(band, 0);
    if (best) delete best.area;
    return best;
  };

  const sections = bandEls.map((b) => {
    const r = b.getBoundingClientRect();
    const cs = getComputedStyle(b);
    let bg = hex(cs.backgroundColor);
    if (!bg) {
      const inner = Array.from(b.querySelectorAll('*')).slice(0, 40).find((e) => hex(getComputedStyle(e).backgroundColor) && e.getBoundingClientRect().width > r.width * 0.8);
      if (inner) bg = hex(getComputedStyle(inner).backgroundColor);
    }
    const imgs = Array.from(b.querySelectorAll('img, picture, svg image')).filter(visible);
    const biggest = imgs.reduce((m, im) => Math.max(m, im.getBoundingClientRect().width / Math.max(1, r.width)), 0);
    const paras = Array.from(b.querySelectorAll('p')).filter(visible);
    return {
      tag: b.tagName.toLowerCase(),
      top_px: Math.round(absTop(b)),
      height_px: Math.round(r.height),
      width_pct: Math.round((r.width / vw) * 100),
      background: bg,
      background_image: cs.backgroundImage !== 'none',
      text_colour: hex(cs.color),
      headings: Array.from(b.querySelectorAll('h1, h2, h3, h4')).filter(visible).slice(0, 3).map((h) => ({ level: h.tagName.toLowerCase(), text: text(h, 70), size_px: Math.round(parseFloat(getComputedStyle(h).fontSize)), family: family(getComputedStyle(h)) })),
      paragraphs: paras.length,
      text_chars: paras.reduce((s, p) => s + text(p, 2000).length, 0),
      buttons_and_links: Array.from(b.querySelectorAll('a, button')).filter((a) => visible(a) && text(a, 40).length > 1 && text(a, 40).length < 40).slice(0, 5).map((a) => text(a, 40)),
      images: imgs.length,
      largest_image_pct_of_width: Math.round(biggest * 100),
      videos: b.querySelectorAll('video').length,
      form_fields: b.querySelectorAll('input:not([type=hidden]), textarea, select').length,
      row_layout: rowLayout(b),
      sticky: ['sticky', 'fixed'].includes(cs.position),
    };
  });

  const header = document.querySelector('header') || document.querySelector('nav');
  let headerInfo = null;
  if (header) {
    const cs = getComputedStyle(header);
    const menuBtn = Array.from(header.querySelectorAll('button, [aria-label], [class*=burger], [class*=menu-toggle]')).find((b) => visible(b) && /menu|burger|navigation|nav/i.test((b.getAttribute('aria-label') || '') + ' ' + (typeof b.className === 'string' ? b.className : '') + ' ' + text(b, 20)));
    headerInfo = {
      position: cs.position,
      height_px: Math.round(header.getBoundingClientRect().height),
      background: hex(cs.backgroundColor),
      visible_links: Array.from(header.querySelectorAll('a')).filter(visible).map((a) => text(a, 40)).filter((t) => t.length > 0).slice(0, 16),
      menu_button: !!menuBtn,
      logo_is_image: !!header.querySelector('img, svg'),
    };
  }

  const footer = document.querySelector('footer');
  let footerInfo = null;
  if (footer) {
    footerInfo = {
      background: hex(getComputedStyle(footer).backgroundColor),
      height_px: Math.round(footer.getBoundingClientRect().height),
      link_groups: Array.from(footer.querySelectorAll('ul, nav')).filter(visible).slice(0, 8).map((g) => Array.from(g.querySelectorAll('a')).filter(visible).length),
      links: Array.from(footer.querySelectorAll('a')).filter(visible).length,
      newsletter: !!footer.querySelector('input[type=email], input[name*=mail]'),
      social_links: Array.from(footer.querySelectorAll('a')).filter((a) => /instagram|facebook|linkedin|tiktok|youtube|twitter|x\.com|pinterest/i.test(a.href)).length,
    };
  }

  const textColours = {};
  const backgrounds = {};
  for (const el of Array.from(document.querySelectorAll('body *')).slice(0, 4000)) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    const c = hex(cs.color);
    const b = hex(cs.backgroundColor);
    if (c && Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) textColours[c] = (textColours[c] || 0) + 1;
    if (b) backgrounds[b] = (backgrounds[b] || 0) + Math.round((el.getBoundingClientRect().width * el.getBoundingClientRect().height) / 1000);
  }
  const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map((e) => e[0]);

  const buttonEls = Array.from(document.querySelectorAll('a, button')).filter((b) => {
    if (!visible(b)) return false;
    const cs = getComputedStyle(b);
    return (hex(cs.backgroundColor) || cs.borderStyle !== 'none') && parseFloat(cs.paddingLeft) >= 8 && text(b, 30).length > 1;
  });
  const buttons = buttonEls.slice(0, 5).map((b) => {
    const cs = getComputedStyle(b);
    return {
      background: hex(cs.backgroundColor),
      text_colour: hex(cs.color),
      border: cs.borderStyle === 'none' ? 'none' : cs.borderWidth + ' ' + cs.borderStyle + ' ' + hex(cs.borderColor),
      radius: cs.borderRadius,
      padding: cs.paddingTop + ' ' + cs.paddingRight,
      font: cs.fontSize + ' ' + cs.fontWeight + ' ' + cs.textTransform,
    };
  });

  const widths = {};
  for (const el of document.querySelectorAll('h1, h2, p')) {
    if (!visible(el)) continue;
    let c = el.parentElement;
    for (let i = 0; i < 5 && c; i++, c = c.parentElement) {
      const r = c.getBoundingClientRect();
      if (r.width < vw - 40 && r.width > 200) {
        const key = Math.round(r.width / 10) * 10;
        widths[key] = (widths[key] || 0) + 1;
        break;
      }
    }
  }

  const scripts = Array.from(document.scripts).map((s) => s.src).join(' ');
  const all = Array.from(document.querySelectorAll('body *')).slice(0, 5000);
  const motion = {
    css_animations: all.filter((el) => getComputedStyle(el).animationName !== 'none').length,
    hover_transitions: Array.from(document.querySelectorAll('a, button, img, [class*=card]')).filter((el) => { const t = getComputedStyle(el).transitionDuration; return t && t !== '0s'; }).length,
    gsap: !!window.gsap || /gsap/i.test(scripts),
    smooth_scroll: !!window.Lenis || document.documentElement.classList.contains('lenis') || /lenis|locomotive/i.test(scripts),
    carousels: document.querySelectorAll('.swiper, .slick-slider, .splide, [class*=carousel], [class*=slider]').length,
    autoplay_videos: Array.from(document.querySelectorAll('video')).filter((v) => v.autoplay).length,
    sticky_elements: all.filter((el) => getComputedStyle(el).position === 'sticky').length,
  };

  return {
    url: location.href,
    title: document.title,
    width_px: vw,
    height_px: document.documentElement.scrollHeight,
    scrolls_sideways_px: Math.max(0, document.documentElement.scrollWidth - vw),
    header: headerInfo,
    footer: footerInfo,
    sections: sections,
    typography: {
      h1: typo(firstVisible('h1')),
      h2: typo(firstVisible('h2')),
      h3: typo(firstVisible('h3')),
      body: typo(firstVisible('p')),
      navigation_link: typo(header ? Array.from(header.querySelectorAll('a')).find((a) => visible(a) && text(a).length > 1) : null),
      button: typo(buttonEls[0] || null),
    },
    fonts_loaded: Array.from(new Set(Array.from(document.fonts).filter((f) => f.status === 'loaded').map((f) => f.family.replace(/["']/g, '') + ' ' + f.weight + ' ' + f.style))).slice(0, 12),
    text_colours: top(textColours, 8),
    background_colours: top(backgrounds, 8),
    buttons: buttons,
    content_widths_px: top(widths, 4).map(Number),
    motion: motion,
  };
})()`;

/** The links in the header and footer, for choosing which pages to read after the homepage. */
export const PAGE_LINKS = String.raw`(() => {
  const pick = (root) => (root ? Array.from(root.querySelectorAll('a[href]')).map((a) => ({ href: a.href, text: (a.innerText || a.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40) })) : []);
  return { nav: pick(document.querySelector('header') || document.querySelector('nav')), footer: pick(document.querySelector('footer')) };
})()`;

/** Scrolls to the bottom and back, so lazy images and scroll reveals have run before measuring. */
export const SCROLL_THROUGH = String.raw`(async () => {
  const step = Math.max(300, window.innerHeight * 0.8);
  for (let y = 0; y < document.documentElement.scrollHeight && y < 20000; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 300));
})()`;
