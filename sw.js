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

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  const isHtml = req.headers.get("accept")?.includes("text/html");
  const isImage = req.destination === "image";

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

  if (isHtml) {
    event.respondWith(
      fetch(fetchRequest)
        .then(response => {
          const clone = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => cache.put(cacheKey, clone));

          return response;
        })
        .catch(() =>
          caches.match(cacheKey)
            .then(cached =>
              cached || caches.match(OFFLINE_URL)
            )
        )
    );

    return;
  }

  if (isImage) {
    event.respondWith(
      caches.match(cacheKey)
        .then(cached => {
          if (cached) return cached;

          return fetch(fetchRequest)
            .then(response => {
              if (!response || !response.ok) {
                return caches.match("/preload.png");
              }

              const clone = response.clone();

              caches.open(CACHE_NAME)
                .then(cache => cache.put(cacheKey, clone));

              return response;
            })
            .catch(() =>
              caches.match("/preload.png")
            );
        })
    );

    return;
  }

  event.respondWith(
    caches.match(cacheKey)
      .then(cached => {
        if (cached) return cached;

        return fetch(fetchRequest)
          .then(response => {
            if (
              response &&
              response.ok &&
              response.type === "basic"
            ) {
              const clone = response.clone();

              caches.open(CACHE_NAME)
                .then(cache => cache.put(cacheKey, clone));
            }

            return response;
          })
          .catch(() =>
            caches.match(OFFLINE_URL)
          );
      })
  );
});
