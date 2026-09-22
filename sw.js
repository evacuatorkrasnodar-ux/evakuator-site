// === КОНФИГ ===
const CACHE_NAME = "evacuator-final-v3";
const OFFLINE_URL = "/offline.html";

// === РЕСУРСЫ ДЛЯ КЕША ===
const ASSETS = [
  "/",
  "/index.html",
  "/prices.html",
  "/en.html",
  "/admin.html",
  "/request.html",
  "/offline.html",
  "/about.html",
  "/contacts.html",
  "/reviews.html",

  "/style.css",
  "/app.js",

  "/favicon.png",
  "/preload.png",

  "/banner-top.webp",
  "/banner-top.png"
];

// === INSTALL ===
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// === ACTIVATE ===
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

// === FETCH ===
// Не трогаем внешние запросы (VK API, Яндекс, геолокация)
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Внешние запросы — пропускаем
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // Кешируем новые файлы
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => caches.match(OFFLINE_URL));
    })
  );
});
