// ====== ЛЁГКИЙ, БЕЗОПАСНЫЙ SERVICE WORKER ======

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  clients.claim();
  console.log("Service Worker активирован");
});

// ====== БЕЗ КЭШИРОВАНИЯ (СТАБИЛЬНЫЙ РЕЖИМ) ======

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match('offline.html');
    })
  );
});
