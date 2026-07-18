// ============================================================
// BROWSEPORT — service worker
// Cachet alleen de statische app-shell (niet de opgezochte
// bestemmingen — die moeten altijd live/vers zijn).
// ============================================================

const CACHE_NAME = 'browseport-shell-v1';
const BASE = new URL(self.registration.scope).pathname; // bijv. "/browser/"
const SHELL_FILES = [
  'index.html',
  'dashboard.html',
  'go.html',
  'manifest.json',
  'style.css',
  'app.js',
  'icon.svg',
];
const SHELL_ASSETS = SHELL_FILES.map((f) => BASE + f);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {})
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
  const url = new URL(event.request.url);

  // Nooit Supabase-calls, go.html (resolver) of query-string requests cachen —
  // die moeten altijd live data ophalen.
  if (
    event.request.method !== 'GET' ||
    url.origin.includes('supabase.co') ||
    url.pathname.endsWith('/go.html') ||
    url.search
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok && SHELL_ASSETS.includes(url.pathname)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
