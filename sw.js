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
  "/banner-top.png",
  OFFLINE_URL
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      // addAll может бросить, поэтому добавляем по одному с обработкой
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          // если какой-то файл недоступен — логируем, но не прерываем установку
          console.warn("SW: failed to cache", asset, err);
        }
      }
      // Гарантируем, что воркер сразу активируется
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
  // Убираем поисковую строку для кеширования статических GET-запросов
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

  // Только наш origin
  if (url.origin !== self.location.origin) return;

  const isHtml = req.headers.get("accept")?.includes("text/html");
  const isImage = req.destination === "image";

  // Ключ кеша — строка для консистентности
  const cacheKey = (req.method === "GET") ? normalizeCacheKey(req.url) : req.url;

  if (isHtml) {
    event.respondWith((async () => {
      try {
        const response = await fetch(req);
        // Клонируем и сохраняем в кеш (если ответ валиден)
        if (response && response.ok) {
          const clone = response.clone();
          const cache = await caches.open(CACHE_NAME);
          await cache.put(cacheKey, clone);
        }
        return response;
      } catch (err) {
        // При ошибке возвращаем кеш или offline.html
        const cached = await caches.match(cacheKey);
        return cached || caches.match(OFFLINE_URL);
      }
    })());
    return;
  }

  if (isImage) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(cacheKey);
      if (cached) return cached;

      try {
        const response = await fetch(req);
        // Если ответ валиден — кешируем; если opaque — всё равно можно кешировать
        if (response && (response.ok || response.type === "opaque")) {
          try { await cache.put(cacheKey, response.clone()); } catch (e) { /* ignore */ }
          return response;
        } else {
          return caches.match("/preload.png");
        }
      } catch (e) {
        return caches.match("/preload.png");
      }
    })());
    return;
  }

  // Для остальных ресурсов: кеш-первоочередно, затем сеть, затем offline
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(req);
      if (response && response.ok && response.type === "basic") {
        try { await cache.put(cacheKey, response.clone()); } catch (e) { /* ignore */ }
      }
      return response;
    } catch (e) {
      return caches.match(OFFLINE_URL);
    }
  })());
});
