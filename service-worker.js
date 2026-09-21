const CACHE_NAME = "evacuator-v3";

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
  "/машинка.ico",
  "/logo.svg",
  "/banner-top.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

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

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => caches.match("/offline.html"))
      );
    })
  );
});
