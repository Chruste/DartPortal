const cacheName = 'cdp-cache-v10';
const assets = [
  '/',
  '/index.php',
  '/login.php',
  '/portal.css',
  '/portal.js',
  '/script-login.js',
  '/profil/profil.php',
  '/profil/profil.css',
  '/profil/profil.js',
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
  '/dartball/img/headline.png',
  '/dartball/img/background.png',
  '/dartball/img/icon-1024.png',
  '/dartball/img/icon-192.png',
  '/dartball/img/icon-512.png',
  '/turnierplaner/turnierplaner.php'
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

function isAuthDynamicRoute(requestUrl) {
  return requestUrl.pathname === '/google-callback.php'
    || requestUrl.pathname === '/google-login.php'
    || requestUrl.pathname === '/logout.php'
    || requestUrl.pathname === '/auth-status.php'
    || requestUrl.pathname === '/scolia-config.php'
    || requestUrl.pathname === '/save-scolia-config.php'
    || requestUrl.pathname === '/profile-data.php'
    || requestUrl.pathname === '/save-profile.php'
    || requestUrl.pathname === '/friend-search.php'
    || requestUrl.pathname === '/friend-action.php';
}

self.addEventListener('fetch', event => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (isAuthDynamicRoute(requestUrl)) {
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