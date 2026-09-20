const CACHE_NAME = 'evakuator-cache-v1';
const URLS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/prices.html',
  '/en.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((resp) => resp || fetch(event.request))
  );
});
