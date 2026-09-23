const CACHE_NAME = "evacuator-krasnodar-v8";
const OFFLINE_URL = "/offline.html";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/about.html",
  "/contacts.html",
  "/prices.html",
  "/reviews.html",
  "/request.html",
  "/en.html",
  "/offline.html",

  "/style.css",
  "/app.js",
  "/manifest.json",

  "/favicon.png",
  "/preload.png",
  "/banner-top.webp",
  "/banner-top.png"
];

/* =========================
   INSTALL
========================= */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const results = await Promise.allSettled(
        STATIC_ASSETS.map((asset) => cache.add(asset))
      );

      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.warn(
            "[SW] Не удалось добавить в кэш:",
            STATIC_ASSETS[index],
            result.reason
          );
        }
      });
    })
  );

  self.skipWaiting();
});


/* =========================
   ACTIVATE
========================= */

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


/* =========================
   FETCH
========================= */

self.addEventListener("fetch", (event) => {
  const request = event.request;

  /*
   * Service Worker работает только с GET.
   * POST-запросы формы, API и другие методы
   * браузер обрабатывает напрямую.
   */
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  /*
   * Не трогаем внешние домены:
   * Telegram, VK, WhatsApp, карты и т.д.
   */
  if (url.origin !== self.location.origin) {
    return;
  }

  /*
   * HTML:
   * сначала сеть, затем кэш.
   * Если интернета нет — показываем сохранённую
   * страницу или offline.html.
   */
  if (
    request.mode === "navigate" ||
    request.headers.get("accept")?.includes("text/html")
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  /*
   * Изображения:
   * сначала кэш, затем сеть.
   */
  if (request.destination === "image") {
    event.respondWith(cacheFirstImage(request));
    return;
  }

  /*
   * CSS / JS / manifest и остальные локальные GET.
   */
  event.respondWith(cacheFirst(request));
});


/* =========================
   NETWORK FIRST
========================= */

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    /*
     * Сохраняем только нормальные ответы.
     */
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    const offlineResponse = await cache.match(OFFLINE_URL);

    if (offlineResponse) {
      return offlineResponse;
    }

    return new Response(
      `
        <!DOCTYPE html>
        <html lang="ru">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <title>Нет подключения</title>
          </head>
          <body>
            <h1>Нет подключения к интернету</h1>
            <p>Позвоните: <a href="tel:+79888717018">+7 (988) 871-70-18</a></p>
          </body>
        </html>
      `,
      {
        status: 503,
        headers: {
          "Content-Type": "text/html; charset=utf-8"
        }
      }
    );
  }
}


/* =========================
   CACHE FIRST
========================= */

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);

    if (response && response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    return new Response("", {
      status: 503,
      statusText: "Service Unavailable"
    });
  }
}


/* =========================
   CACHE FIRST — IMAGES
========================= */

async function cacheFirstImage(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);

    if (response && response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    /*
     * Если изображение недоступно,
     * используем preload.png.
     */
    const fallback = await cache.match("/preload.png");

    if (fallback) {
      return fallback;
    }

    return new Response("", {
      status: 404,
      statusText: "Image Not Found"
    });
  }
}
