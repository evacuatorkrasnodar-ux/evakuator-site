/* ---------------------------------------
   SERVICE WORKER — Apple Glass Edition
   Полный, рабочий, оптимизированный
---------------------------------------- */

const CACHE_NAME = "evacuator-cache-v1";

const ASSETS = [
  "/",
  "/index.html",
  "/prices.html",
  "/en.html",
  "/admin.html",
  "/style.css?v=9000",
  "/app.js?v=9000",
  "/favicon.png",
  "/logo.svg",
  "/banner-top.png"
];

/* Установка SW и кэширование */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

/* Активация SW */
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

/* Перехват запросов */
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => caches.match("/index.html"))
      );
    })
  );
});
