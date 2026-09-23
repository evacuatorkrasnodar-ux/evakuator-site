const CACHE_NAME = "evacuator-v8";
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
  "/banner-top.png",
  OFFLINE_URL
];

// Внешние скрипты НЕ кешируем (Метрика, GA4)
const BLOCK_CACHE = [
  "mc.yandex.ru",
  "googletagmanager.com",
  "google-analytics.com"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn("SW: failed to cache", asset, err);
        }
      }
      await self.skipWaiting();
    } catch (e) {
      console.error("SW install failed", e);
    }
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
      await self.clients.claim();
    } catch (e) {
      console.error("SW activate failed", e);
    }
  })());
});

function normalizeCacheKey(url) {
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch {
    return url;
  }
}

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // Блокируем кеширование внешних скриптов (Метрика, GA4)
  if (BLOCK_CACHE.some(domain => url.hostname.includes(domain))) {
    event.respondWith(fetch(req));
    return;
  }

  // Только наш домен
  if (url.origin !== self.location.origin) return;

  const isHtml = req.headers.get("accept")?.includes("text/html");
  const isImage = req.destination === "image";

  const cacheKey =
    req.method === "GET" ? normalizeCacheKey(req.url) : req.url;

  // HTML — network-first (важно для SEO)
  if (isHtml) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(req);

          if (response && response.ok) {
            const clone = response.clone();
            const cache = await caches.open(CACHE_NAME);
            await cache.put(cacheKey, clone);
          }

          return response;
        } catch (err) {
          const cached = await caches.match(cacheKey);
          return cached || caches.match(OFFLINE_URL);
        }
      })()
    );
    return;
  }

  // Изображения — cache-first
  if (isImage) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(cacheKey);
        if (cached) return cached;

        try {
          const response = await fetch(req);

          if (response && (response.ok || response.type === "opaque")) {
            try {
              await cache.put(cacheKey, response.clone());
            } catch (e) {}
            return response;
          } else {
            return caches.match("/preload.png");
          }
        } catch (e) {
          return caches.match("/preload.png");
        }
      })()
    );
    return;
  }

  // Остальные файлы — cache-first + fallback
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(cacheKey);
      if (cached) return cached;

      try {
        const response = await fetch(req);

        if (response && response.ok && response.type === "basic") {
          try {
            await cache.put(cacheKey, response.clone());
          } catch (e) {}
        }

        return response;
      } catch (e) {
        return caches.match(OFFLINE_URL);
      }
    })()
  );
});
