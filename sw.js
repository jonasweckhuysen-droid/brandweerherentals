// sw.js — automatische update + notificatie voor Brandweer Herentals PWA

const CACHE_NAME = 'bwh-portal-cache-v1';
const urlsToCache = [
  '/',
  '/brandweerherentals/index.html',
  '/brandweerherentals/manifest.json',
  // Voeg hier andere bestanden toe zoals CSS/JS/icons
  // '/style.css', '/app.js', '/favicon.ico'
];

// Install event: cache alle bestanden
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting(); // forceer directe activatie
});

// Activate event: verwijder oude caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if(key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch event: stale-while-revalidate + update check
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        // Update cache met nieuw netwerkbestand
        if(networkResponse && networkResponse.status === 200){
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse || new Response('Offline of fout bij laden.'));

      // Return cache direct, update op achtergrond
      return cachedResponse || fetchPromise;
    })
  );
});

// Listen for new service worker and notify clients
self.addEventListener('message', event => {
  if(event.data && event.data.type === 'SKIP_WAITING'){
    self.skipWaiting();
  }
});

// Communicatie: push update banner naar clients
self.addEventListener('activate', event => {
  event.waitUntil(
    self.clients.matchAll({type:'window'}).then(clients => {
      clients.forEach(client => {
        client.postMessage({type:'NEW_VERSION_AVAILABLE'});
      });
    })
  );
});
