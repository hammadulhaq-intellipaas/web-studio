/*
 * Review bridge. The draft links add this script to every design page. On its own it does
 * nothing; when the page sits inside the client's review page (/review/...), it reports where
 * the client clicks in comment mode, together with the nearest heading and text, and draws
 * the numbered comment pins onto the design. It talks to the review page through postMessage
 * only: the design runs in a sandbox and never sees the review page or its data.
 */
(function () {
  if (window.parent === window) return;
  var TAG = '__wsr';
  var mode = false;
  var pins = [];
  var layer = null;

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
  /* The heading above the click and the text of the clicked element: how the model knows the place. */
  function near(target, y) {
    var heading = '';
    var hs = document.querySelectorAll('h1, h2, h3, h4');
    for (var i = 0; i < hs.length; i++) {
      var top = hs[i].getBoundingClientRect().top + window.scrollY;
      if (top <= y + 4) heading = clean(hs[i].textContent, 120);
    }
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

  function draw() {
    if (!layer) {
      // On the root element, so its 0,0 is the page's 0,0 whatever the design does to <body>.
      layer = document.createElement('div');
      layer.setAttribute('data-wsr-layer', '');
      layer.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none;';
      document.documentElement.appendChild(layer);
    }
    var w = docWidth();
    layer.innerHTML = '';
    pins.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = String(p.n);
      b.setAttribute('aria-label', 'Comment ' + p.n);
      var size = p.active ? 30 : 26;
      b.style.cssText = [
        'position:absolute', 'left:' + (p.x / 100) * w + 'px', 'top:' + p.y + 'px', 'width:' + size + 'px', 'height:' + size + 'px',
        'margin:-' + size / 2 + 'px 0 0 -' + size / 2 + 'px', 'border-radius:50% 50% 50% 0', 'border:2px solid #ffffff',
        'background:' + (p.pending ? '#f59e0b' : p.active ? '#18181b' : '#2563eb'), 'color:#ffffff',
        'font:700 12px/1 system-ui,-apple-system,Segoe UI,Arial,sans-serif', 'box-shadow:0 2px 6px rgba(0,0,0,.35)',
        'cursor:pointer', 'pointer-events:auto', 'padding:0', 'display:flex', 'align-items:center', 'justify-content:center',
      ].join(';');
      b.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (p.id !== 'pending') post({ type: 'open', id: p.id });
      });
      layer.appendChild(b);
    });
  }

  document.addEventListener(
    'click',
    function (e) {
      if (!mode) return;
      var path = e.composedPath ? e.composedPath() : [e.target];
      for (var i = 0; i < path.length; i++) if (path[i] === layer) return;
      e.preventDefault();
      e.stopPropagation();
      var target = path[0] && path[0].nodeType === 1 ? path[0] : e.target;
      post({
        type: 'pick',
        page: pageKey(),
        pageTitle: pageTitle(),
        width: window.innerWidth,
        x: Math.round((e.pageX / docWidth()) * 1000) / 10,
        y: Math.round(e.pageY),
        near: near(target, e.pageY),
      });
    },
    true,
  );

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
  function ready() { post({ type: 'ready', page: pageKey(), pageTitle: pageTitle(), width: window.innerWidth }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
  // Claude Design draws its pages with a script after load: report the real title once it has.
  setTimeout(ready, 1200);
})();
