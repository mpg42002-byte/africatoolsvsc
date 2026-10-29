/* Africa Tools · accesibilidad compartida (se carga en el shell y en los 10 módulos).
   1) Pestañas: role=tablist/tab/tabpanel, aria-selected, tabindex "móvil" y flechas/Inicio/Fin del teclado.
   2) Ventanas modales: role=dialog + aria-modal, foco atrapado, Esc cierra (si hay botón cancelar), el resto de la página queda
      inerte y al cerrar el foco vuelve a donde estaba.
   3) Punto de referencia principal (<main>) si la página no lo declara.
   No cambia el aspecto ni la lógica de ningún módulo: solo agrega atributos y manejo de teclado. */
(function () {
  'use strict';

  /* ---------- 1. Pestañas ---------- */
  const TABLISTS = [
    { list: '.nav-tabs', tab: '.nav-tab', label: 'Secciones de Limpieza',
      panel: (t) => { const m = (t.getAttribute('onclick') || '').match(/showPage\('([^']+)'\)/); return m ? document.getElementById('page-' + m[1]) : null; } },
    { list: 'nav.nav', tab: 'button[data-view]', label: 'Secciones',
      panel: (t) => document.getElementById('view-' + t.dataset.view) },
    { list: '.tabs-sub', tab: '.tab-sub-btn', label: 'Secciones de la agenda',
      panel: (t) => document.getElementById('section-' + t.dataset.section) },
    { list: '.tabs', tab: '.tab-btn', label: 'Filtros de tareas', panel: () => null }
  ];
  let uid = 0;
  const isActive = (t) => t.classList.contains('active') || t.getAttribute('aria-current') === 'page';

  function setupTablist(cfg, list) {
    if (list.dataset.a11yTabs) return;
    const tabs = [...list.querySelectorAll(cfg.tab)];
    if (tabs.length < 2) return;
    list.dataset.a11yTabs = '1';
    list.setAttribute('role', 'tablist');
    if (!list.getAttribute('aria-label')) list.setAttribute('aria-label', cfg.label);
    tabs.forEach((t) => {
      t.setAttribute('role', 'tab');
      if (!t.id) t.id = 'af-tab-' + (++uid);
      const p = cfg.panel(t);
      if (p) {
        if (!p.id) p.id = 'af-panel-' + (++uid);
        t.setAttribute('aria-controls', p.id);
        p.setAttribute('role', 'tabpanel');
        p.setAttribute('aria-labelledby', t.id);
      }
    });
    const sync = () => tabs.forEach((t) => { const on = isActive(t); t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; });
    sync();
    new MutationObserver(sync).observe(list, { subtree: true, attributes: true, attributeFilter: ['class', 'aria-current'] });
    list.addEventListener('keydown', (e) => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      let n = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tabs.length - 1;
      if (n < 0) return;
      e.preventDefault();
      tabs[n].focus();
      tabs[n].click(); // activa de inmediato, como pide el patrón "pestañas con activación automática"
    });
  }
  function scanTabs() { TABLISTS.forEach((cfg) => document.querySelectorAll(cfg.list).forEach((l) => setupTablist(cfg, l))); }

  /* ---------- 2. Modales ---------- */
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const visible = (el) => { try { return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }); } catch (e) { return el.offsetParent !== null; } };
  // Un modal está "abierto" solo si de verdad se ve y recibe clics: hay módulos con ventanas siempre presentes pero
  // invisibles (opacity 0 / pointer-events none). Tomar una de esas por abierta dejaría toda la página inerte.
  function isOpen(b) {
    if (!visible(b)) return false;
    const cs = getComputedStyle(b);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none' || parseFloat(cs.opacity) < 0.05) return false;
    const r = b.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  const open = new Map(); // elemento modal -> { opener, release }

  function trap(modal, backdrop) {
    if (open.has(backdrop)) return;
    const opener = document.activeElement;
    const inerted = [];
    [...document.body.children].forEach((c) => { if (c !== backdrop && !c.contains(backdrop) && !c.hasAttribute('inert') && c.tagName !== 'SCRIPT') { c.setAttribute('inert', ''); inerted.push(c); } });
    const heading = modal.querySelector('h1,h2,h3,[id$="title"]');
    if (!modal.getAttribute('role')) modal.setAttribute('role', 'dialog');
    if (!modal.getAttribute('aria-modal')) modal.setAttribute('aria-modal', 'true');
    if (heading && !modal.getAttribute('aria-labelledby')) { if (!heading.id) heading.id = 'af-dlg-' + (++uid); modal.setAttribute('aria-labelledby', heading.id); }
    const focusables = () => [...modal.querySelectorAll(FOCUSABLE)].filter(visible);
    const onKey = (e) => {
      if (e.key === 'Tab') {
        const f = focusables(); if (!f.length) { e.preventDefault(); return; }
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
      } else if (e.key === 'Escape') {
        const cancel = modal.querySelector('[id$="cancel"],[data-dismiss]');   // sin botón cancelar (p. ej. cambio de clave obligatorio) Esc no cierra
        if (cancel) { e.preventDefault(); cancel.click(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    const f = focusables();
    (modal.querySelector('[autofocus]') || f[0] || modal).focus();
    open.set(backdrop, { release() {
      document.removeEventListener('keydown', onKey, true);
      inerted.forEach((c) => c.removeAttribute('inert'));
      if (opener && document.contains(opener) && typeof opener.focus === 'function') opener.focus();
    } });
  }
  function untrap(backdrop) { const o = open.get(backdrop); if (o) { open.delete(backdrop); o.release(); } }

  function watchBackdrop(b) {
    if (b.dataset.a11yModal) return;
    b.dataset.a11yModal = '1';
    const modal = b.getAttribute('role') === 'dialog' ? b : (b.firstElementChild || b);   // algunos módulos ponen role=dialog en el propio fondo
    const sync = () => { if (b.classList.contains('hidden') || !isOpen(b)) untrap(b); else trap(modal, b); };
    new MutationObserver(sync).observe(b, { attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-hidden'] });
    sync();
  }
  function scanModals() { document.querySelectorAll('.modal-backdrop,[id$="-backdrop"]').forEach(watchBackdrop); }

  // Modales creados por script (p. ej. la ventana de choque de edición): se atrapan al aparecer y se sueltan al quitarse.
  function watchBody() {
    new MutationObserver((muts) => muts.forEach((m) => {
      m.addedNodes.forEach((n) => { if (n.nodeType === 1 && n.getAttribute && n.getAttribute('role') === 'dialog' && !n.classList.contains('modal-card')) setTimeout(() => { if (document.contains(n)) trap(n.querySelector('[role=dialog],div') || n, n); }, 0); });
      m.removedNodes.forEach((n) => { if (n.nodeType === 1 && open.has(n)) untrap(n); });
    })).observe(document.body, { childList: true });
  }

  /* ---------- 3. Puntos de referencia (main / banner / regiones) ---------- */
  function ensureMain() {
    const skip = (c) => ['SCRIPT', 'STYLE', 'LINK', 'NOSCRIPT'].includes(c.tagName)
      || c.matches('[role=dialog],[aria-live],.sr-only,.modal-backdrop,[id$="-backdrop"],#toast,[id^="toast"],[inert]') || !c.textContent.trim();
    const kids = [...document.body.children].filter((c) => !skip(c));
    let main = [...document.querySelectorAll('main,[role="main"]')].find(visible);   // visible: el <main> de la app oculto no cuenta mientras se ve el login
    if (!main) {
      main = document.getElementById('login-screen') || kids.slice().sort((a, b) => b.textContent.length - a.textContent.length)[0];
      if (main) main.setAttribute('role', 'main');
    }
    if (!main) return;
    // el <h1> oculto de la página vive dentro del contenido principal
    if (main.parentElement === document.body) document.querySelectorAll('body > h1.sr-only').forEach((h1) => main.prepend(h1));
    // todo lo demás que quede fuera de un punto de referencia: la primera franja es el encabezado, el resto regiones con nombre
    let top = main; while (top && top.parentElement !== document.body) top = top.parentElement;
    let hasBanner = !!document.querySelector('[role=banner],body > header');
    let seenTop = false;
    document.body.querySelectorAll(':scope > *').forEach((c) => {
      if (c === top) { seenTop = true; return; }
      if (skip(c) || c.matches('header,nav,aside,footer,[role=banner],[role=navigation],[role=complementary],[role=contentinfo],[role=region],[role=main]')) return;
      if (!seenTop && !hasBanner) { c.setAttribute('role', 'banner'); hasBanner = true; }
      else { c.setAttribute('role', 'region'); if (!c.getAttribute('aria-label')) c.setAttribute('aria-label', 'Contenido adicional'); }
    });
    // títulos que quedaron fuera de todo punto de referencia dentro del contenedor (p. ej. Inventario): su contenedor es el encabezado
    document.querySelectorAll('h1').forEach((h1) => {
      if (h1.closest('main,[role=main],[role=banner],header,nav,aside,[role=region],[role=complementary]')) return;
      const p = h1.parentElement; if (!p || p === document.body) return;
      if (!hasBanner) { p.setAttribute('role', 'banner'); hasBanner = true; }
      else { p.setAttribute('role', 'region'); if (!p.getAttribute('aria-label')) p.setAttribute('aria-label', 'Encabezado'); }
    });
  }

  function init() { scanTabs(); scanModals(); watchBody(); ensureMain();
    // los módulos pintan sus pestañas y modales después de cargar: se revisa de nuevo un instante después
    setTimeout(() => { scanTabs(); scanModals(); ensureMain(); }, 600);
    let pend = false;
    new MutationObserver(() => { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; scanTabs(); }); }).observe(document.body, { childList: true, subtree: true });
  }
  window.AfricaA11y = { scanTabs, scanModals, trap, untrap };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
