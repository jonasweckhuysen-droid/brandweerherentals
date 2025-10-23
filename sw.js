// sw.js — Service Worker voor Brandweer Herentals Portal

const CACHE_NAME = 'bwh-portal-v1'; // verhoog dit nummer bij iedere update
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  // voeg hier andere bestanden toe zoals iconen, css of js
  // bv: '/style.css', '/app.js'
];

// Install event: cache alle bestanden
self.addEventListener('install', event => {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching all files');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting(); // forceer directe activatie van nieuwe SW
});

// Activate event: verwijder oude caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if(name !== CACHE_NAME){
            console.log('[SW] Verwijder oude cache:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: probeer eerst cache, dan netwerk
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if(response){
          // console.log('[SW] Cache hit:', event.request.url);
          return response;
        }
        // console.log('[SW] Fetching from network:', event.request.url);
        return fetch(event.request).then(networkResponse => {
          // Optioneel: nieuwe bestanden ook cachen
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }).catch(() => {
          // fallback voor offline, kan een offline.html of icoon teruggeven
          return new Response('Offline of fout bij laden.');
        });
      })
  );
});
