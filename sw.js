/* =========================================================
   SERVICE WORKER
   Эвакуатор Краснодар 24/7

   PWA / Android / Chrome / Edge / Яндекс Браузер

   ВАЖНО:
   - VK/Yandex ключи находятся в app.js и здесь НЕ нужны.
   - Внешние API-запросы не кэшируем.
   - HTML всегда стараемся получить из сети.
   - Статические файлы можно отдавать из cache.
   ========================================================= */


/* =========================================================
   CACHE VERSION
   ========================================================= */

const CACHE_NAME = "evacuator-v10";

const OFFLINE_URL = "/offline.html";


/* =========================================================
   STATIC ASSETS
   ========================================================= */

const STATIC_ASSETS = [
  "/",
  "/index.html",

  "/prices.html",
  "/en.html",
  "/request.html",
  "/about.html",
  "/contacts.html",
  "/reviews.html",
  "/call.html",

  "/style.css",
  "/app.js",

  "/manifest.json",

  /* Основные изображения */
  "/favicon.png",
  "/favicon-32.png",
  "/apple-touch-icon-180.png",
  "/preload.png",

  /* PWA-иконки эвакуатора */
  "/evakuator-icon-192.png",
  "/evakuator-icon-512.png",

  /* Баннеры */
  "/banner-top.webp",
  "/banner-top.png",

  /* Offline */
  OFFLINE_URL
];


/* =========================================================
   ВНЕШНИЕ ДОМЕНЫ
   НЕ КЭШИРУЕМ
   ========================================================= */

const BLOCK_CACHE_DOMAINS = [
  "mc.yandex.ru",
  "yandex.ru",
  "yandex.com",
  "yandex.net",

  "geocode-maps.yandex.ru",

  "api.vk.com",

  "googletagmanager.com",
  "google-analytics.com",
  "analytics.google.com",

  "connect.facebook.net"
];


/* =========================================================
   УТИЛИТЫ
   ========================================================= */

function isBlockedExternalRequest(url) {
  return BLOCK_CACHE_DOMAINS.some(domain => {
    return (
      url.hostname === domain ||
      url.hostname.endsWith("." + domain)
    );
  });
}


function isSameOrigin(url) {
  return url.origin === self.location.origin;
}


function isGET(request) {
  return request.method === "GET";
}


function isNavigationRequest(request) {
  return (
    request.mode === "navigate" ||
    request.destination === "document"
  );
}


function isHTMLRequest(request) {
  const accept =
    request.headers.get("accept") || "";

  return (
    accept.includes("text/html") ||
    isNavigationRequest(request)
  );
}


function isImageRequest(request) {
  return (
    request.destination === "image" ||
    /\.(png|jpe?g|webp|gif|svg|ico)$/i.test(
      new URL(request.url).pathname
    )
  );
}


function isStaticAssetRequest(request) {
  const destination =
    request.destination || "";

  return [
    "style",
    "script",
    "font"
  ].includes(destination);
}


function cacheKey(request) {
  return request;
}


/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener(
  "install",
  event => {

    event.waitUntil(
      (async () => {

        try {

          const cache =
            await caches.open(
              CACHE_NAME
            );


          /*
           * Каждый файл кэшируем отдельно.
           * Если какой-то файл временно недоступен,
           * установка Service Worker не ломается.
           */

          for (
            const asset of STATIC_ASSETS
          ) {

            try {

              await cache.add(
                new Request(
                  asset,
                  {
                    cache: "reload"
                  }
                )
              );

            } catch (error) {

              console.warn(
                "SW: не удалось закэшировать:",
                asset,
                error
              );

            }

          }


          /*
           * Активируем новый Service Worker сразу.
           */

          await self.skipWaiting();

        } catch (error) {

          console.error(
            "SW install error:",
            error
          );

        }

      })()
    );

  }
);


/* =========================================================
   ACTIVATE
   ========================================================= */

self.addEventListener(
  "activate",
  event => {

    event.waitUntil(
      (async () => {

        try {

          const cacheNames =
            await caches.keys();


          /*
           * Удаляем старые версии кэша.
           */

          await Promise.all(
            cacheNames
              .filter(
                name =>
                  name !== CACHE_NAME
              )
              .map(
                name =>
                  caches.delete(name)
              )
          );


          /*
           * Новый SW сразу начинает
           * контролировать страницы.
           */

          await self.clients.claim();


          /*
           * Сообщаем открытым страницам,
           * что Service Worker обновился.
           */

          const clients =
            await self.clients.matchAll({
              type: "window"
            });


          for (
            const client of clients
          ) {

            client.postMessage({
              type: "SW_UPDATED",
              cache: CACHE_NAME
            });

          }

        } catch (error) {

          console.error(
            "SW activate error:",
            error
          );

        }

      })()
    );

  }
);


/* =========================================================
   MESSAGE
   ========================================================= */

self.addEventListener(
  "message",
  event => {

    if (
      !event.data ||
      !event.data.type
    ) {
      return;
    }


    /*
     * Позволяет app.js принудительно
     * активировать новый Service Worker.
     */

    if (
      event.data.type ===
      "SKIP_WAITING"
    ) {

      self.skipWaiting();

    }

  }
);


/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener(
  "fetch",
  event => {

    const request =
      event.request;


    /*
     * Работаем только с GET.
     */

    if (!isGET(request)) {
      return;
    }


    let url;

    try {

      url =
        new URL(
          request.url
        );

    } catch (error) {

      return;

    }


    /*
     * Внешние запросы не перехватываем.
     */

    if (
      isBlockedExternalRequest(url)
    ) {

      return;

    }


    /*
     * Чужие домены не трогаем.
     */

    if (
      !isSameOrigin(url)
    ) {

      return;

    }


    /* =====================================================
       HTML / NAVIGATION
       NETWORK FIRST
       ===================================================== */

    if (
      isHTMLRequest(request)
    ) {

      event.respondWith(
        (async () => {

          try {

            const response =
              await fetch(
                request,
                {
                  cache: "no-store"
                }
              );


            /*
             * Только успешные ответы
             * сохраняем в cache.
             */

            if (
              response &&
              response.ok
            ) {

              try {

                const cache =
                  await caches.open(
                    CACHE_NAME
                  );

                await cache.put(
                  cacheKey(request),
                  response.clone()
                );

              } catch (cacheError) {

                console.warn(
                  "SW: HTML cache error:",
                  cacheError
                );

              }

            }


            return response;

          } catch (networkError) {

            console.warn(
              "SW: HTML network error:",
              networkError
            );


            /*
             * Сначала ищем именно эту страницу.
             */

            const cachedPage =
              await caches.match(
                request
              );


            if (
              cachedPage
            ) {

              return cachedPage;

            }


            /*
             * Затем index.html.
             */

            const cachedIndex =
              await caches.match(
                "/index.html"
              );


            if (
              cachedIndex
            ) {

              return cachedIndex;

            }


            /*
             * Затем offline.html.
             */

            const offline =
              await caches.match(
                OFFLINE_URL
              );


            if (
              offline
            ) {

              return offline;

            }


            /*
             * Крайний случай.
             */

            return new Response(
              `
                <!doctype html>
                <html lang="ru">
                <head>
                  <meta charset="utf-8">
                  <meta
                    name="viewport"
                    content="width=device-width,initial-scale=1"
                  >
                  <title>Нет подключения</title>
                </head>
                <body>
                  <h1>Нет подключения к интернету</h1>
                  <p>
                    Проверьте соединение и попробуйте снова.
                  </p>
                </body>
                </html>
              `,
              {
                status: 503,
                headers: {
                  "Content-Type":
                    "text/html; charset=utf-8"
                }
              }
            );

          }

        })()
      );

      return;
    }


    /* =====================================================
       IMAGES
       CACHE FIRST
       ===================================================== */

    if (
      isImageRequest(request)
    ) {

      event.respondWith(
        (async () => {

          const cache =
            await caches.open(
              CACHE_NAME
            );


          /*
           * Сначала проверяем кэш.
           */

          const cached =
            await cache.match(
              request
            );


          if (
            cached
          ) {

            return cached;

          }


          try {

            const response =
              await fetch(
                request
              );


            /*
             * Сохраняем нормальные
             * same-origin изображения.
             */

            if (
              response &&
              (
                response.ok ||
                response.type ===
                  "opaque"
              )
            ) {

              try {

                await cache.put(
                  request,
                  response.clone()
                );

              } catch (cacheError) {

                console.warn(
                  "SW: image cache error:",
                  cacheError
                );

              }

              return response;

            }


            /*
             * Fallback на основную
             * картинку эвакуатора.
             */

            const fallback =
              await caches.match(
                "/preload.png"
              );


            return (
              fallback ||
              response
            );

          } catch (error) {

            /*
             * Если сеть недоступна,
             * возвращаем preload.png.
             */

            const fallback =
              await caches.match(
                "/preload.png"
              );


            if (
              fallback
            ) {

              return fallback;

            }


            return new Response(
              "",
              {
                status: 404
              }
            );

          }

        })()
      );

      return;
    }


    /* =====================================================
       CSS / JS / FONTS
       CACHE FIRST
       ===================================================== */

    if (
      isStaticAssetRequest(
        request
      )
    ) {

      event.respondWith(
        (async () => {

          const cache =
            await caches.open(
              CACHE_NAME
            );


          const cached =
            await cache.match(
              request
            );


          if (
            cached
          ) {

            return cached;

          }


          try {

            const response =
              await fetch(
                request
              );


            if (
              response &&
              response.ok
            ) {

              try {

                await cache.put(
                  request,
                  response.clone()
                );

              } catch (cacheError) {

                console.warn(
                  "SW: static cache error:",
                  cacheError
                );

              }

            }


            return response;

          } catch (error) {

            console.error(
              "SW: static asset error:",
              error
            );


            return new Response(
              "",
              {
                status: 503
              }
            );

          }

        })()
      );

      return;
    }


    /* =====================================================
       ОСТАЛЬНЫЕ GET
       NETWORK FIRST → CACHE
       ===================================================== */

    event.respondWith(
      (async () => {

        try {

          const response =
            await fetch(
              request
            );


          /*
           * Кэшируем только
           * собственные нормальные ответы.
           */

          if (
            response &&
            response.ok &&
            response.type ===
              "basic"
          ) {

            try {

              const cache =
                await caches.open(
                  CACHE_NAME
                );

              await cache.put(
                request,
                response.clone()
              );

            } catch (cacheError) {

              console.warn(
                "SW: generic cache error:",
                cacheError
              );

            }

          }


          return response;

        } catch (networkError) {

          const cached =
            await caches.match(
              request
            );


          if (
            cached
          ) {

            return cached;

          }


          return new Response(
            "Нет подключения к интернету",
            {
              status: 503,
              headers: {
                "Content-Type":
                  "text/plain; charset=utf-8"
              }
            }
          );

        }

      })()
    );

  }
);


/* =========================================================
   ОТЛАДКА
   ========================================================= */

console.log(
  "Evacuator Service Worker loaded:",
  CACHE_NAME
);
