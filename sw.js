const CACHE = 'travaglio-suprema-ia-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.mjs',
  '/manifest.webmanifest',
  '/data/episodes.json',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/social.jpg'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('travaglio-suprema-ia-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')));
    return;
  }
  event.respondWith(caches.match(request).then(hit => hit || fetch(request)));
});
