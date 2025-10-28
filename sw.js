// sw.js — Brandweer Herentals Portal

const CACHE_NAME = "bwh-portal-v" + Date.now(); // nieuwe cache bij elke update
const URLS_TO_CACHE = [
  "/brandweerherentals/index.html",
  "/brandweerherentals/manifest.json",
  "/brandweerherentals/icons/icon-192x192.png",
  "/brandweerherentals/icons/icon-512x512.png"
];

// 🧱 Install: cache bestanden
self.addEventListener("install", event => {
  console.log("[SW] Install");
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting(); // meteen activeren, niet wachten
});

// 🔄 Activate: oude caches verwijderen
self.addEventListener("activate", event => {
  console.log("[SW] Activate & cleanup");
  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim(); // direct controle nemen over pagina's
});

// 🌐 Fetch: probeer netwerk, val terug op cache
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // enkel GET requests cachen
        if (event.request.method === "GET" && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
