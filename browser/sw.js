const CACHE_NAME = "browseport-browser-v1";
const APP_SHELL = ["./index.html", "./manifest.json", "./icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Alleen de app-shell zelf cachen (cache-first). Alle echte navigatie/zoek-
// verzoeken van de browser-functionaliteit zelf gaan gewoon rechtstreeks
// over het netwerk, zoals bij een echte browser.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isShell = APP_SHELL.some((p) => url.pathname.endsWith(p.replace("./", "")));
  if (!isShell) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
