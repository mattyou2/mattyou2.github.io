// ============================================================
// BROWSEPORT — service worker
// v2: netwerk-eerst voor de app-shell (met cache als offline-fallback).
// Reden voor de wijziging t.o.v. v1 (cache-eerst): bij elke update van
// de site bleven browsers die de site al eerder hadden bezocht de OUDE
// gecachete index.html/app.js/style.css tonen totdat de cache met de
// hand geleegd werd — knoppen, styling en scripts leken dan "kapot"
// terwijl de broncode allang gefixt was. Netwerk-eerst voorkomt dat:
// je krijgt altijd de nieuwste versie zodra er verbinding is, en pas
// bij een verbroken verbinding valt hij terug op de laatst gecachete
// kopie.
// ============================================================

const CACHE_NAME = 'browseport-shell-v2';
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

  // Nooit Supabase-calls, go.html (resolver) of query-string requests
  // aanraken — die moeten altijd live data ophalen.
  if (
    event.request.method !== 'GET' ||
    url.origin.includes('supabase.co') ||
    url.pathname.endsWith('/go.html') ||
    url.search
  ) {
    return;
  }

  if (!SHELL_ASSETS.includes(url.pathname)) return;

  // Netwerk-eerst: probeer altijd de laatste versie te halen en werk de
  // cache bij; alleen als het netwerk faalt (offline) grijpen we terug
  // op wat er nog in de cache staat.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
