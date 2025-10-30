const CACHE_NAME = "firecrew-cache-v2";
const urlsToCache = [
  "/brandweerherentals/",
  "/brandweerherentals/index.html",
  "/brandweerherentals/manifest.json",
  "/brandweerherentals/icons/icon-192x192-round.png",
  "/brandweerherentals/icons/icon-512x512-round.png",
  "/brandweerherentals/bestellingen.html",
  "https://agenda-proxy.onrender.com/agenda.ics"
];

// Installatie: bestanden vooraf cachen
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const url of urlsToCache) {
        try {
          const response = await fetch(url, { cache: "no-store" });
          if (response.ok) await cache.put(url, response);
        } catch (err) {
          console.warn("⚠️ Niet gecachet:", url, err);
        }
      }
    })
  );
});

// Activatie: oude caches opruimen
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: eerst cache tonen, dan netwerk verversen
self.addEventListener("fetch", event => {
  const url = event.request.url;

  // Alleen onze relevante bestanden cachen
  if (
    urlsToCache.some(u => url.includes(u)) ||
    url.endsWith(".ics") ||
    url.includes("/brandweerherentals/")
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cachedResponse = await cache.match(event.request);
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        // Toon snel cached versie, ververs stilletjes
        return cachedResponse || fetchPromise;
      })
    );
  }
});

// SkipWaiting vanuit client
self.addEventListener("message", event => {
  if (event.data && event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});
