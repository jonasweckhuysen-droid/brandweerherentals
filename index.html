const CACHE_NAME = "firecrew-cache-" + Date.now();
const urlsToCache = [
  "/brandweerherentals/",
  "/brandweerherentals/index.html",
  "/brandweerherentals/manifest.json",
  "/brandweerherentals/icons/icon-192x192.png",
  "/brandweerherentals/icons/icon-512x512.png",
  "/brandweerherentals/bestellingen.html",
  "/brandweerherentals/leden.html",
  "/brandweerherentals/info.html"
];

// Installatie: cache de bestanden
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Activatie: verwijder oude caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: eerst netwerk, dan cache
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Luister naar skipWaiting-commando
self.addEventListener("message", event => {
  if (event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});
