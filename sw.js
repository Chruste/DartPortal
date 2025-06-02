const cacheName = 'cdp-cache-v1';
const assets = ['/', '/index.php', '/header.php', '/footer.php', '/.user.ini', '/portal.css', '/portal.js'
                  , '/shanghai21/index.php', '/shanghai21/styles.css', '/shanghai21/script.js'
                  , '/shanghai21/img/headline.png', '/shanghai21/img/background.png', '/shanghai21/img/icon.png', '/shanghai21/img/icon-192.png', '/shanghai21/img/icon-512.png'
                  , '/turnierplaner/turnierplaner.php', '/turnierplaner/historie.php', '/turnierplaner/neues_turnier.php', '/turnierplaner/create_tournament.php'
                  , '/einstellungen/einstellungen.php', '/einstellungen/script.js', '/einstellungen/manifest.json'
                  ,'check_db_connection.php', '/set_session_username.php'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(cacheName).then(c => c.addAll(assets)));
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});