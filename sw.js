// === CONFIG ===
const CACHE_NAME = "evacuator-v4";
const OFFLINE_URL = "/offline.html";

// === STATIC ASSETS ===
const STATIC_ASSETS = [
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
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting(); // мгновенная активация новой версии
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
  self.clients.claim(); // сразу управляем страницами
});

// === FETCH ===
// Умная стратегия:
// HTML → network-first (чтобы сайт всегда был свежий)
// Статика → cache-first (молниеносная загрузка)
// Изображения → cache-first + догрузка
// Offline fallback → offline.html
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Внешние запросы (VK, Яндекс, API) — пропускаем
  if (url.origin !== self.location.origin) return;

  // === HTML: network-first ===
  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // === IMAGES: cache-first ===
  if (req.destination === "image") {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;

        return fetch(req)
          .then((res) => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
            return res;
          })
          .catch(() => caches.match("/preload.png"));
      })
    );
    return;
  }

  // === STATIC FILES: cache-first ===
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(OFFLINE_URL));
    })
  );
});
