// ====== SERVICE WORKER — ПОЛНЫЙ ФАЙЛ ======

const CACHE_NAME = "evacuator-cache-v1";

// Файлы, которые должны работать офлайн
const ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/manifest.json",
  "/offline.html",

  "/icon-192.png",
  "/icon-512.png",

  "/banner-top.png",

  "/en.html",
  "/prices.html"
];

// УСТАНОВКА SW — КЭШИРУЕМ ФАЙЛЫ
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// АКТИВАЦИЯ SW — ЧИСТИМ СТАРЫЕ КЭШИ
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// FETCH — ОФФЛАЙН РЕЖИМ
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Если есть в кэше — отдаём
      if (cached) return cached;

      // Если нет — пробуем загрузить из сети
      return fetch(event.request).catch(() => {
        // Если сети нет — отдаём offline.html
        return caches.match("/offline.html");
      });
    })
  );
});
