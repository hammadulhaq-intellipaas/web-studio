/*
 * Review bridge. The draft links add this script to every design page. On its own it does
 * nothing; when the page sits inside the client's review page (/review/...), it lets the client
 * mark a spot in comment mode: drag a box around it with the mouse, or tap it on a touch screen.
 * It reports the box together with the nearest heading and the text inside, and draws the
 * numbered comment marks onto the design. It talks to the review page through postMessage
 * only: the design runs in a sandbox and never sees the review page or its data.
 */
(function () {
  if (window.parent === window) return;
  var TAG = '__wsr';
  var DRAW = '#E5484D';
  var SAVED = '#1E5EFF';
  var ACTIVE = '#0F2440';
  var mode = false;
  var pins = [];
  var layer = null;
  var drag = null;
  var skipClick = false;
  // Comment notes beside their marks, and how much the review page shrinks the design (laptop
  // view), so a note reads at the same size on screen whatever the scale.
  var notes = true;
  var scale = 1;
  var frozen = null;

  function post(msg) {
    msg[TAG] = 1;
    window.parent.postMessage(msg, '*');
  }
  function pageKey() {
    return decodeURIComponent(location.pathname) + (location.hash || '');
  }
  function pageTitle() {
    var h1 = document.querySelector('h1');
    var t = (h1 && h1.textContent) || document.title || '';
    return t.replace(/\s+/g, ' ').trim().slice(0, 160);
  }
  function docWidth() {
    return Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0, 1);
  }
  function clean(s, n) {
    return (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
  }
  function onLayer(e) {
    var path = e.composedPath ? e.composedPath() : [e.target];
    for (var i = 0; i < path.length; i++) if (path[i] === layer) return true;
    return false;
  }
  function headingAbove(y) {
    var heading = '';
    var hs = document.querySelectorAll('h1, h2, h3, h4');
    for (var i = 0; i < hs.length; i++) {
      var top = hs[i].getBoundingClientRect().top + window.scrollY;
      if (top <= y + 4) heading = clean(hs[i].textContent, 120);
    }
    return heading;
  }
  /* A tapped spot: the heading above it and the text of the element. How the model knows the place. */
  function nearSpot(target, y) {
    var heading = headingAbove(y);
    var el = target;
    var own = '';
    while (el && el !== document.body && !own) {
      own = clean(el.innerText || el.getAttribute && (el.getAttribute('alt') || el.getAttribute('aria-label')) || '', 140);
      el = el.parentElement;
    }
    var parts = [];
    if (heading) parts.push('Heading: "' + heading + '"');
    if (own && own !== heading) parts.push('Element: "' + own + '"');
    if (!parts.length && target && target.tagName === 'IMG') parts.push('An image');
    return parts.join(' · ');
  }
  /* A drawn box: the heading above it, the text inside it and the images it covers. */
  function nearArea(left, top, right, bottom) {
    var hits = function (r) {
      var l = r.left + window.scrollX;
      var t = r.top + window.scrollY;
      return r.width > 0 && r.height > 0 && l < right && l + r.width > left && t < bottom && t + r.height > top;
    };
    var texts = [];
    var length = 0;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var range = document.createRange();
    var node;
    var seen = 0;
    while ((node = walker.nextNode()) && length < 220 && seen < 6000) {
      seen++;
      var s = clean(node.textContent, 160);
      var parent = node.parentElement;
      if (!s || !parent || (layer && layer.contains(parent))) continue;
      range.selectNodeContents(node);
      if (!hits(range.getBoundingClientRect())) continue;
      texts.push(s);
      length += s.length;
    }
    var images = 0;
    var imgs = document.querySelectorAll('img, svg, video, picture');
    for (var i = 0; i < imgs.length; i++) if (hits(imgs[i].getBoundingClientRect())) images++;
    var heading = headingAbove(top);
    var parts = [];
    if (heading) parts.push('Heading: "' + heading + '"');
    if (texts.length) parts.push('Marked area with the text: "' + clean(texts.join(' / '), 220) + '"');
    if (images) parts.push(images === 1 ? 'Marked area covers an image' : 'Marked area covers ' + images + ' images');
    if (!texts.length && !images) parts.push('Marked area');
    return parts.join(' · ');
  }
  /* Where the box sits in the visible window, so the review page opens its comment box elsewhere. */
  function place(pageY) {
    return pageY - window.scrollY > window.innerHeight * 0.55 ? 'top' : 'bottom';
  }

  function ensureLayer() {
    if (layer && layer.isConnected) return layer;
    // On the root element, so its 0,0 is the page's 0,0 whatever the design does to <body>.
    layer = document.createElement('div');
    layer.setAttribute('data-wsr-layer', '');
    layer.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none;';
    document.documentElement.appendChild(layer);
    return layer;
  }
  function badge(p, color, size) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = String(p.n);
    b.setAttribute('aria-label', 'Comment ' + p.n);
    b.style.cssText = [
      'position:absolute', 'width:' + size + 'px', 'height:' + size + 'px', 'border:2px solid #ffffff', 'background:' + color,
      'color:#ffffff', 'font:700 12px/1 system-ui,-apple-system,Segoe UI,Arial,sans-serif', 'box-shadow:0 2px 6px rgba(0,0,0,.35)',
      'cursor:pointer', 'pointer-events:auto', 'padding:0', 'display:flex', 'align-items:center', 'justify-content:center',
    ].join(';');
    b.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (p.id !== 'pending') post({ type: 'open', id: p.id });
    });
    return b;
  }
  /*
   * The comment itself, as a small note beside its mark: to the right of it, or to the left when
   * the page ends there, or below it. Sized for the screen, not for the shrunken design.
   */
  function note(p, color, left, top, width, height) {
    if (!notes || p.pending || !p.text) return;
    var px = function (n) { return Math.round(n / scale) + 'px'; };
    var w = docWidth();
    var cardW = Math.min(260 / scale, w - 16);
    var gap = 10 / scale;
    var x = left + width + gap;
    var y = top;
    if (x + cardW > w - 8) {
      x = left - gap - cardW;
      if (x < 8) {
        x = Math.min(Math.max(8, left), w - cardW - 8);
        y = top + height + gap;
      }
    }
    var card = document.createElement('div');
    card.setAttribute('data-wsr-note', p.id);
    card.style.cssText = [
      'all:initial', 'position:absolute', 'box-sizing:border-box', 'left:' + x + 'px', 'top:' + y + 'px', 'width:' + cardW + 'px',
      'background:#ffffff', 'border:' + px(p.active ? 2 : 1) + ' solid ' + (p.active ? ACTIVE : '#C9D6F2'), 'border-left:' + px(4) + ' solid ' + color,
      'border-radius:' + px(8), 'padding:' + px(8) + ' ' + px(10), 'box-shadow:0 ' + px(4) + ' ' + px(14) + ' rgba(15,36,64,.18)',
      'font:400 ' + px(13) + '/1.4 system-ui,-apple-system,Segoe UI,Arial,sans-serif', 'color:#0F2440', 'cursor:pointer', 'pointer-events:auto',
      'text-align:left', 'z-index:1',
    ].join(';');
    var head = document.createElement('div');
    head.style.cssText = 'all:initial;display:block;font:700 ' + px(12) + '/1.3 system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:' + color + ';margin-bottom:' + px(2) + ';';
    head.textContent = p.n + (p.author ? ' · ' + p.author : '');
    var body = document.createElement('div');
    body.style.cssText = [
      'all:initial', 'display:-webkit-box', '-webkit-box-orient:vertical', '-webkit-line-clamp:' + (p.active ? 12 : 4), 'overflow:hidden',
      'font:400 ' + px(13) + '/1.4 system-ui,-apple-system,Segoe UI,Arial,sans-serif', 'color:#0F2440', 'white-space:pre-wrap', 'word-break:break-word',
    ].join(';');
    body.textContent = p.text;
    card.appendChild(head);
    card.appendChild(body);
    card.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      post({ type: 'open', id: p.id });
    });
    layer.appendChild(card);
  }
  /* While the client writes a comment, the page holds still, so the box stays beside the comment field. */
  function freeze(on) {
    var root = document.documentElement;
    if (on && frozen === null) {
      frozen = root.style.overflow;
      root.style.overflow = 'hidden';
    } else if (!on && frozen !== null) {
      root.style.overflow = frozen;
      frozen = null;
    }
  }
  function draw() {
    ensureLayer();
    var w = docWidth();
    layer.innerHTML = '';
    pins.forEach(function (p) {
      var color = p.pending ? DRAW : p.active ? ACTIVE : SAVED;
      var left = (p.x / 100) * w;
      if (p.w && p.h) {
        var box = document.createElement('div');
        box.style.cssText = [
          'position:absolute', 'left:' + left + 'px', 'top:' + p.y + 'px', 'width:' + (p.w / 100) * w + 'px', 'height:' + p.h + 'px',
          'border:3px solid ' + color, 'border-radius:6px', 'box-sizing:border-box', 'pointer-events:none',
          'background:' + (p.pending ? 'rgba(229,72,77,.08)' : 'rgba(30,94,255,.06)'),
          'box-shadow:0 0 0 1px rgba(255,255,255,.7)',
        ].join(';');
        var b = badge(p, color, 26);
        b.style.left = '-13px';
        b.style.top = '-13px';
        b.style.borderRadius = '50%';
        box.appendChild(b);
        layer.appendChild(box);
        note(p, color, left, p.y, (p.w / 100) * w, p.h);
      } else {
        var size = p.active ? 30 : 26;
        var pin = badge(p, color, size);
        pin.style.left = left + 'px';
        pin.style.top = p.y + 'px';
        pin.style.margin = '-' + size / 2 + 'px 0 0 -' + size / 2 + 'px';
        pin.style.borderRadius = '50% 50% 50% 0';
        layer.appendChild(pin);
        note(p, color, left + size / 2, p.y - size / 2, 0, size);
      }
    });
  }

  /* Where a marked box sits in the visible window, for the review page to open the comment field beside it. */
  function view(left, top, width, height) {
    return { vx: Math.round(left - window.scrollX), vy: Math.round(top - window.scrollY), vw: Math.round(width), vh: Math.round(height) };
  }
  function assign(target, source) {
    for (var k in source) target[k] = source[k];
    return target;
  }

  function pickSpot(target, pageX, pageY) {
    post(
      assign(
        {
          type: 'pick',
          page: pageKey(),
          pageTitle: pageTitle(),
          width: window.innerWidth,
          x: Math.round((pageX / docWidth()) * 1000) / 10,
          y: Math.round(pageY),
          w: 0,
          h: 0,
          near: nearSpot(target, pageY),
          place: place(pageY),
        },
        view(pageX - 13, pageY - 13, 26, 26),
      ),
    );
  }

  // Mouse and pen: press, drag a box, let go. A press without dragging marks a spot.
  document.addEventListener(
    'pointerdown',
    function (e) {
      if (!mode || e.button !== 0 || e.pointerType === 'touch' || onLayer(e)) return;
      e.preventDefault();
      e.stopPropagation();
      var rect = document.createElement('div');
      rect.style.cssText = 'position:absolute;border:3px solid ' + DRAW + ';border-radius:6px;background:rgba(229,72,77,.08);box-sizing:border-box;pointer-events:none;';
      ensureLayer().appendChild(rect);
      drag = { x0: e.pageX, y0: e.pageY, target: e.target, rect: rect };
      try { document.documentElement.setPointerCapture(e.pointerId); } catch { /* older browsers draw without capture */ }
    },
    true,
  );
  document.addEventListener(
    'pointermove',
    function (e) {
      if (!drag) return;
      e.preventDefault();
      var r = drag.rect.style;
      r.left = Math.min(drag.x0, e.pageX) + 'px';
      r.top = Math.min(drag.y0, e.pageY) + 'px';
      r.width = Math.abs(e.pageX - drag.x0) + 'px';
      r.height = Math.abs(e.pageY - drag.y0) + 'px';
    },
    true,
  );
  document.addEventListener(
    'pointerup',
    function (e) {
      if (!drag) return;
      var d = drag;
      drag = null;
      skipClick = true;
      setTimeout(function () { skipClick = false; }, 400);
      if (d.rect.parentNode) d.rect.parentNode.removeChild(d.rect);
      var left = Math.min(d.x0, e.pageX);
      var top = Math.min(d.y0, e.pageY);
      var width = Math.abs(e.pageX - d.x0);
      var height = Math.abs(e.pageY - d.y0);
      if (width < 12 || height < 12) return pickSpot(d.target, d.x0, d.y0);
      var dw = docWidth();
      post(
        assign(
          {
            type: 'pick',
            page: pageKey(),
            pageTitle: pageTitle(),
            width: window.innerWidth,
            x: Math.round((left / dw) * 1000) / 10,
            y: Math.round(top),
            w: Math.round((width / dw) * 1000) / 10,
            h: Math.round(height),
            near: nearArea(left, top, left + width, top + height),
            place: place(top + height / 2),
          },
          view(left, top, width, height),
        ),
      );
    },
    true,
  );
  // In comment mode no click reaches the design (no links, no buttons). A tap marks a spot.
  document.addEventListener(
    'click',
    function (e) {
      if (!mode || onLayer(e)) return;
      e.preventDefault();
      e.stopPropagation();
      if (skipClick) return;
      var path = e.composedPath ? e.composedPath() : [e.target];
      var target = path[0] && path[0].nodeType === 1 ? path[0] : e.target;
      pickSpot(target, e.pageX, e.pageY);
    },
    true,
  );
  // No text selection or image dragging while the client draws.
  document.addEventListener('selectstart', function (e) { if (mode) e.preventDefault(); }, true);
  document.addEventListener('dragstart', function (e) { if (mode) e.preventDefault(); }, true);

  window.addEventListener('message', function (e) {
    if (e.source !== window.parent) return;
    var d = e.data || {};
    if (!d[TAG]) return;
    if (d.type === 'mode') {
      mode = !!d.on;
      document.documentElement.style.cursor = mode ? 'crosshair' : '';
    }
    if (d.type === 'pins') {
      pins = Array.isArray(d.pins) ? d.pins : [];
      notes = d.notes !== false;
      scale = typeof d.scale === 'number' && d.scale > 0.2 ? d.scale : 1;
      freeze(pins.some(function (p) { return p.pending; }));
      draw();
    }
    if (d.type === 'scrollTo') {
      var p = pins.filter(function (x) { return x.id === d.id; })[0];
      if (p) window.scrollTo({ top: Math.max(0, p.y - window.innerHeight / 3), behavior: 'smooth' });
    }
  });

  var redraw = function () { if (pins.length) draw(); };
  window.addEventListener('resize', redraw);
  window.addEventListener('load', redraw);
  window.addEventListener('hashchange', function () { post({ type: 'ready', page: pageKey(), pageTitle: pageTitle(), width: window.innerWidth }); });
  function ready(settled) { post({ type: 'ready', page: pageKey(), pageTitle: pageTitle(), width: window.innerWidth, settled: settled === true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
  // Claude Design draws its pages with a script after load: report the real title once it has,
  // and that the page is drawn (the review page then takes away its loading note).
  setTimeout(function () { ready(true); }, 1200);
})();
