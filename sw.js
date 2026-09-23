const CACHE = 'travaglio-suprema-ia-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.mjs',
  '/archive/index.html',
  '/archive.mjs',
  '/manifest.webmanifest',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/social.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (
    url.pathname === '/data/site.json' ||
    url.pathname.startsWith('/assets/episodes/')
  ) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')));
    return;
  }

  event.respondWith(
    caches.match(request).then(hit => hit || fetch(request))
  );
});
