/* AFRICA TOOLS · SERVICE WORKER */

const CACHE_NAME = 'africa-tools-v13';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/design-tokens.css',
  './assets/shell.css',
  './assets/shell.js',
  './assets/app.js',
  './assets/permissions.js',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './modules/limpieza/africaLimpieza.html',
  './modules/inventario/africaInventario.html',
  './modules/lider/LiderAfrica.html',
  './modules/folders/marcacion-folders.html',
  './modules/wow-tablero/tablero-wow-points.html',
  './modules/wow-calificacion/calificacion-wow-points.html',
  './modules/habladores/habladores-winner.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
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
