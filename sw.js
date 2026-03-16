const cacheName = 'cdp-cache-v2';
const assets = [
  '/',
  '/index.php',
  '/login.php',
  '/login-api.php',
  '/portal.css',
  '/portal.js',
  '/script-login.js',
  '/manifest.json',
  '/img/icon-192.png',
  '/img/icon-512.png',
  '/shanghai21/index.php',
  '/shanghai21/styles.css',
  '/shanghai21/script.js',
  '/shanghai21/img/headline.png',
  '/shanghai21/img/background.png',
  '/shanghai21/img/icon.png',
  '/shanghai21/img/icon-192.png',
  '/shanghai21/img/icon-512.png',
  '/shanghai42/index.php',
  '/shanghai42/styles.css',
  '/shanghai42/script.js',
  '/shanghai42/img/headline.png',
  '/shanghai42/img/background.png',
  '/shanghai42/img/icon.png',
  '/shanghai42/img/icon-192.png',
  '/shanghai42/img/icon-512.png',
  '/dartball/index.php',
  '/dartball/styles.css',
  '/dartball/script.js',
  '/dartball/img/headline.png',
  '/dartball/img/background.png',
  '/dartball/img/icon-1024.png',
  '/dartball/img/icon-192.png',
  '/dartball/img/icon-512.png',
  '/turnierplaner/turnierplaner.php',
  '/turnierplaner/historie.php',
  '/turnierplaner/neues_turnier.php',
  '/turnierplaner/create_tournament.php'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cacheName)
      .then(cache => cache.addAll(assets))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== cacheName && key.startsWith('cdp-cache-'))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function isDocumentRequest(request) {
  const acceptHeader = request.headers.get('accept') || '';
  return request.mode === 'navigate'
    || request.destination === 'document'
    || acceptHeader.includes('text/html');
}

self.addEventListener('fetch', event => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  if (isDocumentRequest(request)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(cacheName).then(cache => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('/index.php')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        return cached;
      }

      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseClone = response.clone();
        caches.open(cacheName).then(cache => cache.put(request, responseClone));
        return response;
      });
    })
  );
});