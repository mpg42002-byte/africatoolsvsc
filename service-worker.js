/* AFRICA TOOLS · SERVICE WORKER */

const CACHE_NAME = 'africa-tools-f856b03f4e90';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/design-tokens.css',
  './assets/shell.css',
  './assets/shell.js',
  './assets/app.js',
  './assets/permissions.js',
  './assets/supabase-config.js',
  './assets/offline-storage.js',
  './assets/ui-helpers.js',
  './assets/a11y.js',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/shared/logo-951292dae0.jpg',
  './assets/icons/shared/logo-24b168388c.png',
  './assets/icons/shared/logo-5de33a18b7.jpg',
  './assets/fonts/raspberry-sherbet.ttf',
  './assets/vendor/exceljs-4.4.0.min.js',
  './assets/vendor/heic-to-1.5.2.csp.js',
  './assets/vendor/html2canvas-1.4.1.min.js',
  './assets/vendor/jspdf-2.5.1.umd.min.js',
  './assets/vendor/pdf-3.11.174.min.js',
  './assets/vendor/pdf.worker-3.11.174.min.js',
  './assets/vendor/supabase-2.117.3.js',
  './assets/vendor/fonts/fonts.css',
  './assets/vendor/fonts/fredoka-latin-500-normal.woff2',
  './assets/vendor/fonts/fredoka-latin-600-normal.woff2',
  './assets/vendor/fonts/fredoka-latin-700-normal.woff2',
  './assets/vendor/fonts/nunito-latin-400-normal.woff2',
  './assets/vendor/fonts/nunito-latin-600-normal.woff2',
  './assets/vendor/fonts/nunito-latin-700-normal.woff2',
  './assets/vendor/fonts/nunito-latin-800-normal.woff2',
  './modules/limpieza/africaLimpieza.html',
  './modules/inventario/africaInventario.html',
  './modules/lider/LiderAfrica.html',
  './modules/folders/marcacion-folders.html',
  './modules/wow-tablero/tablero-wow-points.html',
  './modules/wow-calificacion/calificacion-wow-points.html',
  './modules/habladores/habladores-winner.html',
  './modules/diaadia/africaDiaADia.html',
  './modules/agenda/AgendaFiestas.html',
  './modules/bitacora/Bitacora.html',
];

self.addEventListener('install', (event) => {
  // Si un archivo del precaché falla, la instalación FALLA (y sigue la versión anterior del Service Worker, si la hay)
  // en vez de instalarse "sin caché" sin que nadie se entere: el arranque sin conexión depende de que todo esté guardado.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch((err) => {
      console.error('[SW] No se pudo precachear la app:', err);
      throw err;
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Las peticiones a otros dominios (la API de Supabase, fuentes de Google,
  // etc.) NUNCA deben pasar por el caché del Service Worker — necesitan
  // estar siempre frescas (lista de usuarios, log de actividad, sesión).
  // Se dejan pasar de largo, sin interceptarlas para nada.
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  const url = event.request.url;

  // Librerías y fuentes autoalojadas: el nombre del archivo lleva la versión, así que nunca cambian -> caché primero.
  if (requestUrl.pathname.includes('/assets/vendor/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
        if (response && response.status === 200) { const clone = response.clone(); caches.open(CACHE_NAME).then((c) => c.put(event.request, clone)).catch(() => {}); }
        return response;
      }))
    );
    return;
  }

  const isCoreCode = event.request.mode === 'navigate' ||
    url.endsWith('.html') || url.endsWith('.js') || url.endsWith('.css') || url.endsWith('.json');

  if (isCoreCode) {
    // Red primero: cualquier cambio que subamos llega de inmediato, sin
    // depender de acordarnos de subir la versión del caché cada vez. Si no
    // hay conexión, cae al caché para que la app siga funcionando offline.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type !== 'opaque') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((m) => m || (event.request.mode === 'navigate' ? caches.match('./index.html') : undefined)))
    );
    return;
  }

  // Todo lo demás (íconos, imágenes): caché primero — es contenido que casi
  // nunca cambia, así carga más rápido y sigue funcionando offline.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type !== 'opaque') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
