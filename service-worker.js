const CACHE_NAME = "evacuator-final-v2";

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
  "/banner-top.png"
];

// === INSTALL ===
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// === ACTIVATE ===
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// === FETCH ===
// Не трогаем внешние запросы (VK API, геолокация)
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Если запрос внешний — пропускаем
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => caches.match("/offline.html"))
      );
    })
  );
});
