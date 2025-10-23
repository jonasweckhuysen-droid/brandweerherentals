const CACHE_NAME = 'bwh-portal-v1';
const urlsToCache = [
  '/brandweerherentals/index.html',
  '/brandweerherentals/manifest.json',
  '/brandweerherentals/icons/icon-192x192.png',
  '/brandweerherentals/icons/icon-512x512.png',
  '/brandweerherentals/sw.js',
  // voeg hier eventueel extra assets toe, zoals CSS of extra JS
];

// Install event: cache alle benodigde bestanden
self.addEventListener('install', event => {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching files');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event: verwijder oude caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
});

// Fetch event: serveer van cache, anders fetch van netwerk
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedRes => {
        if (cachedRes) {
          return cachedRes;
        }
        return fetch(event.request)
          .then(networkRes => {
            // Optioneel: nieuwe bestanden in cache stoppen
            return caches.open(CACHE_NAME)
              .then(cache => {
                // Alleen GET requests en 200 responses cache'en
                if (event.request.method === 'GET' && networkRes.status === 200) {
                  cache.put(event.request, networkRes.clone());
                }
                return networkRes;
              });
          });
      })
  );
});

// Listen for skipWaiting messages (voor updates)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Optioneel: detecteer nieuwe versie en stuur bericht naar pagina
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache).then(() => {
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'NEW_VERSION_AVAILABLE' });
          });
        });
      });
    })
  );
});
