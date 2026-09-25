/* =========================================================
   SERVICE WORKER
   Эвакуатор Краснодар 24/7

   PWA / Android / Chrome / Edge / Яндекс Браузер / iOS

   ВАЖНО:
   - VK/Yandex ключи находятся в app.js.
   - Здесь ключей и токенов НЕТ.
   - POST-запросы НЕ кэшируются.
   - VK / Yandex / аналитика НЕ кэшируются.
   - HTML: NETWORK FIRST.
   - CSS / JS / fonts: NETWORK FIRST с cache fallback.
   - Изображения: CACHE FIRST с network fallback.
   - Старая версия кэша автоматически удаляется.
   ========================================================= */


/* =========================================================
   CACHE VERSION
   ========================================================= */

/*
 * Было:
 *
 * evacuator-v9
 *
 * Теперь v10.
 *
 * Это важно, потому что браузер мог продолжать
 * отдавать старый app.js из старого кэша.
 */

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

  "/style.css",
  "/app.js",

  "/manifest.json",

  "/favicon.png",
  "/preload.png",

  "/banner-top.webp",
  "/banner-top.png",

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
  try {
    const pathname =
      new URL(request.url).pathname;

    return (
      request.destination === "image" ||
      /\.(png|jpe?g|webp|gif|svg|ico)$/i.test(
        pathname
      )
    );

  } catch (error) {
    return false;
  }
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
           * Кэшируем файлы по одному.
           *
           * Если какого-то необязательного файла
           * нет на сервере, установка SW не падает.
           */

          for (
            const asset of STATIC_ASSETS
          ) {

            try {

              const request =
                new Request(
                  asset,
                  {
                    cache: "reload"
                  }
                );

              const response =
                await fetch(
                  request
                );


              if (
                response &&
                response.ok
              ) {

                await cache.put(
                  request,
                  response.clone()
                );

              } else {

                console.warn(
                  "SW: ресурс не загружен:",
                  asset,
                  response?.status
                );

              }

            } catch (error) {

              console.warn(
                "SW: не удалось закэшировать:",
                asset,
                error
              );

            }

          }


          /*
           * Новый Service Worker
           * активируется сразу.
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
           *
           * Оставляем только v10.
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
           * Сообщаем открытым вкладкам,
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


          console.log(
            "SW activated:",
            CACHE_NAME
          );

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
     * Позволяет странице попросить
     * Service Worker активироваться.
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


    /* =====================================================
       ТОЛЬКО GET
       ===================================================== */

    /*
     * POST / PUT / PATCH / DELETE
     * вообще не перехватываем.
     *
     * Поэтому отправка формы и запросы API
     * не попадают в Cache Storage.
     */

    if (!isGET(request)) {
      return;
    }


    /* =====================================================
       URL
       ===================================================== */

    let url;

    try {

      url =
        new URL(
          request.url
        );

    } catch (error) {

      return;

    }


    /* =====================================================
       ВНЕШНИЕ API
       ===================================================== */

    /*
     * VK / Yandex / analytics и прочие
     * внешние запросы не трогаем.
     */

    if (
      isBlockedExternalRequest(url)
    ) {

      return;

    }


    /* =====================================================
       ЧУЖИЕ ДОМЕНЫ
       ===================================================== */

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

            /*
             * Всегда сначала пытаемся
             * получить актуальный HTML.
             */

            const response =
              await fetch(
                request,
                {
                  cache: "no-store"
                }
              );


            /*
             * Сохраняем только нормальный
             * ответ сервера.
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
                  request,
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


            /* ---------------------------------------------
               1. Точная страница из кэша
               --------------------------------------------- */

            const cachedPage =
              await caches.match(
                request
              );


            if (
              cachedPage
            ) {

              return cachedPage;

            }


            /* ---------------------------------------------
               2. index.html
               --------------------------------------------- */

            const cachedIndex =
              await caches.match(
                "/index.html"
              );


            if (
              cachedIndex
            ) {

              return cachedIndex;

            }


            /* ---------------------------------------------
               3. offline.html
               --------------------------------------------- */

            const offline =
              await caches.match(
                OFFLINE_URL
              );


            if (
              offline
            ) {

              return offline;

            }


            /* ---------------------------------------------
               4. Крайний fallback
               --------------------------------------------- */

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
           * Сначала ищем изображение
           * в локальном кэше.
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


          /*
           * Если нет — сеть.
           */

          try {

            const response =
              await fetch(
                request
              );


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
             * Запасная картинка.
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


            return response;

          } catch (error) {

            console.warn(
              "SW: image network error:",
              error
            );


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
       NETWORK FIRST
       ===================================================== */

    if (
      isStaticAssetRequest(
        request
      )
    ) {

      event.respondWith(
        (async () => {

          try {

            /*
             * ВАЖНО:
             *
             * Сначала сеть.
             *
             * Это исправляет ситуацию,
             * когда старый app.js остаётся
             * в CACHE FIRST.
             */

            const response =
              await fetch(
                request,
                {
                  cache: "no-store"
                }
              );


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

          } catch (networkError) {

            console.warn(
              "SW: static network error:",
              networkError
            );


            /*
             * Если сеть недоступна,
             * используем старый кэш.
             */

            const cached =
              await caches.match(
                request
              );


            if (
              cached
            ) {

              return cached;

            }


            /*
             * Если ничего нет —
             * отдаём 503.
             */

            return new Response(
              "",
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
           * Сохраняем только свои
           * нормальные ответы.
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

          console.warn(
            "SW: generic network error:",
            networkError
          );


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
