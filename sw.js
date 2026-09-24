// ===============================
// IDEAL SERVICE WORKER FOR PWA
// Evacuator-KRD — Premium SW
// ===============================

const CACHE_NAME = "evakuator-v1";
const OFFLINE_URL = "/offline.html";

// Кешируем только оффлайн-страницу и изображения
const PRECACHE = [
  OFFLINE_URL,
  "/preload.png",
  "/banner-top.webp",
  "/banner-top.png"
];

// Устанавливаем SW
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Активируем SW и удаляем старые кеши
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Главная логика
self.addEventListener("fetch", event => {
  const req = event.request;

  // HTML — всегда network-first (важно для SEO и обновлений)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Изображения — cache-first
  if (req.destination === "image") {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;

        return fetch(req)
          .then(response => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
            return response;
          })
          .catch(() => caches.match("/preload.png"));
      })
    );
    return;
  }

  // Остальное — просто fetch без кеширования
  event.respondWith(fetch(req));
});
