const CACHE_NAME = "firecrew-cache-" + Date.now();
const urlsToCache = [
  "/brandweerherentals/",
  "/brandweerherentals/index.html",
  "/brandweerherentals/manifest.json",
  "/brandweerherentals/icons/icon-192x192-round.png",
  "/brandweerherentals/icons/icon-512x512-round.png",
  "/brandweerherentals/bestellingen.html"
];

// Installatie: cache de bestanden
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const url of urlsToCache) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
          } else {
            console.warn("⚠️ Niet gecachet (status " + response.status + "):", url);
          }
        } catch (err) {
          console.warn("⚠️ Fout bij cachen:", url, err);
        }
      }
    })
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
  if (event.data && event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});
