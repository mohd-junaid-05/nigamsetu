// Service Worker for NigamSetu PWA (/report & /map offline support)
const CACHE_NAME = 'nigamsetu-pwa-v2';
const MAP_TILE_CACHE = 'nigamsetu-map-tiles-v1';

const STATIC_ASSETS = [
  '/',
  '/report',
  '/map',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== MAP_TILE_CACHE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Dedicated Cache Strategy for OpenStreetMap Tiles (PWA Optimization)
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.open(MAP_TILE_CACHE).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Return empty response on network failure if tile not cached
            return new Response('', { status: 408 });
          });
        });
      })
    );
    return;
  }

  // 2. Skip API routes, auth endpoints, and browser extensions
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/sign-in') ||
    url.pathname.startsWith('/sign-up') ||
    !url.protocol.startsWith('http')
  ) {
    return;
  }

  // 3. Cache-first strategy for static assets & shell pages with offline fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // If offline and request is for an HTML page, serve cached shell
        if (event.request.headers.get('accept')?.includes('text/html')) {
          if (url.pathname.startsWith('/map')) {
            return caches.match('/map') || caches.match('/');
          }
          return caches.match('/report') || caches.match('/');
        }
      });
    })
  );
});
