/* === CONFIG === */
const CACHE_NAME = "evacuator-v7";
const OFFLINE_URL = "/offline.html";

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

/* === INSTALL === */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

/* === ACTIVATE === */
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

/* === FETCH === */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  /* Внешние запросы не трогаем */
  if (url.origin !== self.location.origin) return;

  const isHtml = req.headers.get("accept")?.includes("text/html");
  const isImage = req.destination === "image";

  /* Нормализация URL */
  let cleanUrl = url.origin + url.pathname;
  let cacheKey = cleanUrl;
  let fetchRequest = req;

  if (url.search && req.method === "GET") {
    fetchRequest = new Request(cleanUrl, {
      method: "GET",
      headers: req.headers
    });
  } else {
    cacheKey = req;
  }

  /* === HTML: network-first === */
  if (isHtml) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(fetchRequest);
          if (!res || !res.ok) throw new Error("Bad HTML");

          const resClone = res.clone();
          const cache = await caches.open(CACHE_NAME);
          await cache.put(cacheKey, resClone);

          return res;
        } catch (e) {
          const cached = await caches.match(cacheKey);
          if (cached) return cached;
          return caches.match(OFFLINE_URL);
        }
      })()
    );
    return;
  }

  /* === IMAGES: cache-first === */
  if (isImage) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(cacheKey);
        if (cached) return cached;

        try {
          const res = await fetch(fetchRequest);
          if (!res || !res.ok || res.type !== "basic") {
            const fallback = await caches.match("/preload.png");
            return fallback || res;
          }

          const resClone = res.clone();
          const cache = await caches.open(CACHE_NAME);
          await cache.put(cacheKey, resClone);

          return res;
        } catch (e) {
          const fallback = await caches.match("/preload.png");
          return fallback;
        }
      })()
    );
    return;
  }

  /* === STATIC: cache-first === */
  event.respondWith(
    (async () => {
      const cached = await caches.match(cacheKey);
      if (cached) return cached;

      try {
        const res = await fetch(fetchRequest);
        if (!res || !res.ok || res.type !== "basic") {
          throw new Error("Bad static");
        }

        const resClone = res.clone();
        const cache = await caches.open(CACHE_NAME);
        await cache.put(cacheKey, resClone);

        return res;
      } catch (e) {
        const fallback = await caches.match(OFFLINE_URL);
        return fallback;
      }
    })()
  );
});
