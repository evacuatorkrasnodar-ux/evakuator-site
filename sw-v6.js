// === CONFIG ===
const CACHE_NAME = "evacuator-v6";
const OFFLINE_URL = "/offline.html";

// === STATIC ASSETS ===
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/prices.html",
  "/en.html",
  "/request.html",
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
  self.skipWaiting();
});

// === ACTIVATE ===
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// === FETCH ===
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Внешние запросы — пропускаем
  if (url.origin !== self.location.origin) return;

  // Нормализация URL: убираем мусорные параметры
  let cacheKey = req;
  if (url.search && req.method === "GET") {
    const cleanUrl = url.origin + url.pathname;
    cacheKey = new Request(cleanUrl, { method: "GET" });
  }

  // === HTML: network-first + кеширование ===
  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (!res || res.status >= 400) throw new Error("Bad HTML response");

          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(cacheKey, resClone));

          return res;
        })
        .catch(() =>
          caches.match(cacheKey).then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // === IMAGES: cache-first ===
  if (req.destination === "image") {
    event.respondWith(
      caches.match(cacheKey).then((cached) => {
        if (cached) return cached;

        return fetch(req)
          .then((res) => {
            if (!res || res.status >= 400) return caches.match("/preload.png");

            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(cacheKey, resClone));

            return res;
          })
          .catch(() => caches.match("/preload.png"));
      })
    );
    return;
  }

  // === STATIC FILES: cache-first ===
  event.respondWith(
    caches.match(cacheKey).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((res) => {
          if (!res || res.status >= 400) throw new Error("Bad static response");

          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(cacheKey, resClone));

          return res;
        })
        .catch(() => caches.match(OFFLINE_URL));
    })
  );
});
