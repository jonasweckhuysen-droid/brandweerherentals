// sw.js — automatische update van Brandweer Herentals PWA
const CACHE_NAME = 'bwh-portal-cache';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  // Voeg hier andere bestanden toe zoals css, js, icons
  // '/style.css', '/app.js', '/favicon.ico'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting(); // nieuwe SW direct actief
});

// Activate event: oude caches verwijderen
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.map(key => {
        if(key !== CACHE_NAME) return caches.delete(key);
      }))
    )
  );
  self.clients.claim();
});

// Fetch event: stale-while-revalidate strategie
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if(networkResponse && networkResponse.status === 200){
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => {
        // fallback voor offline
        return cachedResponse || new Response('Offline of fout bij laden.');
      });

      // Als er cached versie is, geef die meteen terug en update op achtergrond
      return cachedResponse || fetchPromise;
    })
  );
});

// Optioneel: push event / notifications kunnen hier later
