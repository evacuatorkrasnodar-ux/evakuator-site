const CACHE_NAME = "evacuator-apple-v1";

const ASSETS = [
  "/",
  "/index.html",
  "/prices.html",
  "/request.html",
  "/offline.html",
  "/reviews.html",
  "/style.css",
  "/app.js",
  "/logo.png",
  "/favicon.png",
  "/banner-top.png",
  "/manifest.json"
];

// Установка SW и кэширование файлов
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Активация SW и удаление старых кэшей
self.addEventListener("activate", event => {
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
});

// Перехват запросов
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Если файл есть в кэше — отдаём его
      if (response) return response;

      // Если файла нет — пробуем загрузить из сети
      return fetch(event.request).catch(() => {
        // Если сети нет — отдаём offline.html
        return caches.match("/offline.html");
      });
    })
  );
});
