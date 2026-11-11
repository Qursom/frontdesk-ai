/*!
 * FrontDesk AI - embeddable chat loader
 * Usage on ANY website (WordPress, Wix, HTML...):
 *   <script src="https://YOUR-WEB-APP/loader.js" data-tenant="bright-smile" defer></script>
 * Optional: data-color="#0F766E"  data-position="left"  data-teaser="Questions? Ask our AI assistant"
 *           data-phone="020 7946 0321"  (shown in the widget if the API cannot be reached)
 *           data-api="https://api.example.com"  (one silent GET /health on load, to wake a sleeping server)
 *           data-fd-offset="72"  (lift the launcher on screens <= 640px; default 72)
 * The launcher is also lifted 72px whenever an element with [data-fd-bottom-bar] is visible (e.g. a Call/Book bar).
 * Page API: window.FrontDesk.open({ message })  opens the chat with the message pre-filled; window.FrontDesk.close()
 */
(function () {
  if (window.__frontdeskLoaded) return;
  window.__frontdeskLoaded = true;

  var script =
    document.currentScript || document.querySelector('script[src*="loader.js"][data-tenant]');
  if (!script) return;

  var tenant = script.getAttribute('data-tenant');
  if (!tenant) return console.warn('[FrontDesk] data-tenant is missing');

  var origin = new URL(script.src, window.location.href).origin;
  var color = script.getAttribute('data-color') || '#0F766E';
  var side = script.getAttribute('data-position') === 'left' ? 'left' : 'right';
  var phone = script.getAttribute('data-phone') || '';
  var teaserText =
    script.getAttribute('data-teaser') || "Hi! I'm the clinic's AI assistant. Questions about prices or appointments?";
  var fdOffset = script.hasAttribute('data-fd-offset') ? parseInt(script.getAttribute('data-fd-offset'), 10) || 72 : 0;
  var apiUrl = script.getAttribute('data-api') || '';

  var MOBILE = 640; // full-screen panel at or below this width
  var GAP = 24; // distance from the screen edge
  var LAUNCHER = 60;
  var TEASER_DELAY = 8000;
  var BAR_LIFT = 72;
  var PANEL_ID = 'frontdesk-chat-panel';

  var isOpen = false;
  var iframe = null;
  var widgetReady = false; // set when the widget inside the iframe says "frontdesk:ready"
  var pendingPrefill = null;
  var openLabel = 'Open chat with our AI assistant';

  function isMobile() {
    return window.innerWidth <= MOBILE;
  }
  function extraBottom() {
    // A visible bottom bar wins; getClientRects() is empty when it is display:none (e.g. hidden on desktop).
    var bar = document.querySelector('[data-fd-bottom-bar]');
    if (bar && bar.getClientRects().length) return BAR_LIFT;
    return fdOffset && isMobile() ? fdOffset : 0;
  }
  function css(el, styles) {
    for (var k in styles) el.style[k] = styles[k];
  }

  // ---------- Launcher (no bounce or pulse) ----------
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', openLabel);
  btn.setAttribute('aria-expanded', 'false');
  css(btn, {
    position: 'fixed', width: LAUNCHER + 'px', height: LAUNCHER + 'px', borderRadius: '50%',
    border: 'none', cursor: 'pointer', background: color, color: '#fff', zIndex: '2147483646',
    boxShadow: '0 6px 20px rgba(15,23,42,.25)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: '0',
  });
  btn.style[side] = GAP + 'px';
  // Lucide "message-circle" and "x" (ISC licence)
  var ICON_CHAT =
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>';
  var ICON_CLOSE =
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  btn.innerHTML = ICON_CHAT;

  // ---------- Teaser: after 8s, once per session, not on mobile at first load ----------
  var teaser = document.createElement('div');
  css(teaser, {
    position: 'fixed', maxWidth: '260px', background: '#fff', color: '#0F172A',
    padding: '12px 40px 12px 14px', borderRadius: '14px', boxShadow: '0 6px 20px rgba(15,23,42,.15)',
    font: '14px/1.45 system-ui, -apple-system, Segoe UI, Roboto, sans-serif', zIndex: '2147483646', display: 'none',
  });
  teaser.style[side] = GAP + 'px';

  var teaserBtn = document.createElement('button');
  teaserBtn.type = 'button';
  teaserBtn.textContent = teaserText;
  css(teaserBtn, {
    background: 'none', border: '0', padding: '0', margin: '0', textAlign: 'left',
    font: 'inherit', color: 'inherit', cursor: 'pointer',
  });
  teaserBtn.onclick = function () { open(); };

  var teaserClose = document.createElement('button');
  teaserClose.type = 'button';
  teaserClose.setAttribute('aria-label', 'Dismiss message');
  teaserClose.innerHTML = '&times;';
  css(teaserClose, {
    position: 'absolute', top: '4px', right: '4px', width: '32px', height: '32px', borderRadius: '50%',
    border: '0', background: 'transparent', color: '#475569', fontSize: '20px', lineHeight: '1', cursor: 'pointer',
  });
  teaserClose.onclick = function () {
    teaser.style.display = 'none';
    markTeaser();
  };
  teaser.appendChild(teaserBtn);
  teaser.appendChild(teaserClose);

  function seenTeaser() {
    try { return sessionStorage.getItem('fd-teaser') === '1'; } catch (e) { return false; }
  }
  function markTeaser() {
    try { sessionStorage.setItem('fd-teaser', '1'); } catch (e) { /* ignore */ }
  }

  // ---------- Chat iframe (lazy: created on first open) ----------
  function layout() {
    if (!iframe) return;
    if (isMobile()) {
      css(iframe, { top: '0', bottom: '0', left: '0', right: '0', width: '100%', height: '100%', borderRadius: '0' });
    } else {
      css(iframe, {
        top: 'auto', bottom: GAP + LAUNCHER + 12 + 'px', width: '380px',
        height: Math.min(600, window.innerHeight - 120) + 'px', borderRadius: '20px',
        left: side === 'left' ? GAP + 'px' : 'auto', right: side === 'right' ? GAP + 'px' : 'auto',
      });
    }
  }

  function place() {
    btn.style.bottom = GAP + extraBottom() + 'px';
    teaser.style.bottom = GAP + LAUNCHER + 12 + extraBottom() + 'px';
    if (isOpen && isMobile()) btn.style.display = 'none';
    else btn.style.display = 'flex';
    layout();
  }

  function createIframe() {
    iframe = document.createElement('iframe');
    iframe.id = PANEL_ID;
    iframe.src =
      origin + '/embed?tenant=' + encodeURIComponent(tenant) + (phone ? '&phone=' + encodeURIComponent(phone) : '');
    iframe.title = 'Chat with our AI assistant';
    iframe.setAttribute('allow', 'clipboard-write');
    css(iframe, {
      position: 'fixed', border: 'none', background: '#fff', zIndex: '2147483647',
      boxShadow: '0 18px 48px rgba(15,23,42,.16)', display: 'none', colorScheme: 'light',
    });
    document.body.appendChild(iframe);
    btn.setAttribute('aria-controls', PANEL_ID);
    layout();
  }

  // Prefill is sent only when the widget has said it is listening; earlier messages would be lost.
  function sendPrefill() {
    if (!iframe || !widgetReady || pendingPrefill === null || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage({ type: 'frontdesk:prefill', text: pendingPrefill }, origin);
    pendingPrefill = null;
  }

  function open() {
    if (!iframe) createIframe();
    isOpen = true;
    iframe.style.display = 'block';
    teaser.style.display = 'none';
    markTeaser();
    btn.innerHTML = ICON_CLOSE;
    btn.setAttribute('aria-label', 'Close chat');
    btn.setAttribute('aria-expanded', 'true');
    place();
    iframe.focus();
    if (widgetReady && iframe.contentWindow) iframe.contentWindow.postMessage({ type: 'frontdesk:open' }, origin);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    if (iframe) iframe.style.display = 'none';
    btn.innerHTML = ICON_CHAT;
    btn.setAttribute('aria-label', openLabel);
    btn.setAttribute('aria-expanded', 'false');
    place();
    btn.focus(); // WCAG: focus returns to the control that opened the dialog
  }

  // Keyboard focus ring drawn here, because many host sites remove outlines globally (WCAG 2.4.7).
  // :focus-visible keeps it away from mouse clicks; very old browsers fall back to always showing it.
  function focusRing(el, restingShadow) {
    el.addEventListener('focus', function () {
      var keyboard = true;
      try { keyboard = el.matches(':focus-visible'); } catch (e) { /* no :focus-visible support */ }
      if (!keyboard) return;
      el.style.outline = '3px solid #1D4ED8';
      el.style.outlineOffset = '2px';
      el.style.boxShadow = '0 0 0 2px #fff' + (restingShadow ? ', ' + restingShadow : '');
    });
    el.addEventListener('blur', function () {
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.style.boxShadow = restingShadow || '';
    });
  }
  focusRing(btn, '0 6px 20px rgba(15,23,42,.25)');
  focusRing(teaserBtn);
  focusRing(teaserClose);

  btn.onclick = function () { isOpen ? close() : open(); };
  window.addEventListener('resize', place);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) close();
  });

  // Messages from the widget (only trust our own origin).
  window.addEventListener('message', function (e) {
    if (e.origin !== origin || !e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'frontdesk:close') close();
    if (e.data.type === 'frontdesk:ready') {
      widgetReady = true;
      sendPrefill();
      if (isOpen && iframe && iframe.contentWindow) iframe.contentWindow.postMessage({ type: 'frontdesk:open' }, origin);
    }
    if (e.data.type === 'frontdesk:theme') {
      if (e.data.color) btn.style.background = e.data.color;
      if (e.data.contrast) btn.style.color = e.data.contrast;
      if (e.data.name) {
        openLabel = 'Open chat with ' + e.data.name + ' assistant';
        if (!isOpen) btn.setAttribute('aria-label', openLabel);
        if (iframe) iframe.title = 'Chat with ' + e.data.name;
      }
    }
  });

  window.FrontDesk = {
    open: function (opts) {
      if (opts && typeof opts.message === 'string' && opts.message.trim()) pendingPrefill = opts.message.slice(0, 1000);
      open();
      sendPrefill();
    },
    close: close,
  };

  // Wake a sleeping free server early, so the first answer is fast. Silent: no data sent, errors ignored.
  if (apiUrl && /^https?:\/\//.test(apiUrl) && window.fetch) {
    fetch(apiUrl.replace(/\/+$/, '') + '/health', { mode: 'no-cors', cache: 'no-store', credentials: 'omit' }).catch(function () {});
  }

  function mount() {
    document.body.appendChild(teaser);
    document.body.appendChild(btn);
    place();
    if (!seenTeaser() && !isMobile()) {
      setTimeout(function () {
        if (!isOpen && !seenTeaser()) teaser.style.display = 'block';
      }, TEASER_DELAY);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
