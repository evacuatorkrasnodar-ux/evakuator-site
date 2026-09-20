const CACHE_NAME = 'evakuator-krd-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/banner-top.png',
  '/banner-top-mobile.png',
  '/favicon.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
  console.log('Service worker активирован');
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Не трогаем запросы к метрике и другим внешним скриптам
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, copy);
        });
        return response;
      }).catch(() => {
        // Можно вернуть offline-страницу, если сделаешь её
        return caches.match('/index.html');
      });
    })
  );
});
