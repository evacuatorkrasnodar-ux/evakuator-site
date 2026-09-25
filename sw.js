/* =========================================================
   sw.js
   Эвакуатор Краснодар 24/7

   PWA / Android / Chrome / Edge / Яндекс Браузер / iOS

   ЛОГИКА:
   - POST / PUT / PATCH / DELETE не перехватываются
   - VK / Yandex / аналитика не кэшируются
   - HTML: NETWORK FIRST → CACHE → OFFLINE
   - CSS / JS / fonts: NETWORK FIRST → CACHE
   - Изображения: CACHE FIRST → NETWORK
   - Остальные GET: NETWORK FIRST → CACHE
   - Старые версии кэша удаляются
   - Новый SW активируется сразу
   ========================================================= */


/* =========================================================
   VERSION
   ========================================================= */

const CACHE_NAME = "evacuator-v11";

const CACHE_PREFIX = "evacuator-";

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

  "/offline.html",

  "/style.css",
  "/app.js",

  "/manifest.json",

  "/favicon.png",
  "/preload.png",

  "/banner-top.webp",
  "/banner-top.png"
];


/* =========================================================
   ВНЕШНИЕ ДОМЕНЫ
   НИКОГДА НЕ КЭШИРУЕМ
   ========================================================= */

const BLOCK_CACHE_DOMAINS = [
  "api.vk.com",

  "geocode-maps.yandex.ru",

  "yandex.ru",
  "yandex.com",
  "yandex.net",

  "mc.yandex.ru",

  "googletagmanager.com",
  "google-analytics.com",
  "analytics.google.com",

  "connect.facebook.net"
];


/* =========================================================
   УТИЛИТЫ
   ========================================================= */

function isGET(request) {
  return request.method === "GET";
}


function isSameOrigin(url) {
  return (
    url.origin === self.location.origin
  );
}


function isBlockedExternalRequest(url) {
  return BLOCK_CACHE_DOMAINS.some(
    domain => (
      url.hostname === domain ||
      url.hostname.endsWith("." + domain)
    )
  );
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
    isNavigationRequest(request) ||
    accept.includes("text/html")
  );
}


function isImageRequest(request) {
  try {
    const url =
      new URL(request.url);

    return (
      request.destination === "image" ||
      /\.(png|jpe?g|webp|gif|svg|ico)$/i.test(
        url.pathname
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
   CACHE PUT
   ========================================================= */

async function putInCache(
  request,
  response
) {
  if (
    !response ||
    !response.ok
  ) {
    return;
  }

  try {
    const cache =
      await caches.open(
        CACHE_NAME
      );

    await cache.put(
      request,
      response.clone()
    );

  } catch (error) {
    console.warn(
      "SW: cache.put error:",
      error
    );
  }
}


/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener(
  "install",
  event => {

    event.waitUntil(

      (async () => {

        const cache =
          await caches.open(
            CACHE_NAME
          );

        /*
         * Кэшируем ресурсы по одному.
         *
         * Один отсутствующий файл
         * не должен ломать установку SW.
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
                "SW: не удалось загрузить:",
                asset,
                response?.status
              );

            }

          } catch (error) {

            console.warn(
              "SW: ошибка кэширования:",
              asset,
              error
            );

          }

        }


        /*
         * Новый SW активируется сразу.
         */

        await self.skipWaiting();

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
           * Удаляем только старые
           * кэши нашего приложения.
           */

          await Promise.all(

            cacheNames
              .filter(
                name =>
                  name.startsWith(
                    CACHE_PREFIX
                  ) &&
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
           * Сообщаем открытым вкладкам
           * об обновлении SW.
           */

          const clients =
            await self.clients.matchAll({
              type: "window",
              includeUncontrolled: true
            });


          for (
            const client of clients
          ) {

            try {

              client.postMessage({
                type: "SW_UPDATED",
                cache: CACHE_NAME
              });

            } catch (error) {

              console.warn(
                "SW: postMessage error:",
                error
              );

            }

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
     * Позволяет app.js
     * активировать ожидающий SW.
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
       НЕ GET
       ===================================================== */

    /*
     * POST / PUT / PATCH / DELETE
     * вообще не трогаем.
     *
     * Это особенно важно для:
     * - VK
     * - форм
     * - API
     * - будущих серверных запросов
     */

    if (
      !isGET(request)
    ) {
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
     * Браузер сам выполняет запрос.
     *
     * SW:
     * - не кэширует
     * - не изменяет
     * - не подменяет
     */

    if (
      isBlockedExternalRequest(url)
    ) {
      return;
    }


    /* =====================================================
       ЧУЖИЕ ДОМЕНЫ
       ===================================================== */

    /*
     * Не вмешиваемся во внешние ресурсы.
     */

    if (
      !isSameOrigin(url)
    ) {
      return;
    }


    /* =====================================================
       HTML
       NETWORK FIRST
       ===================================================== */

    if (
      isHTMLRequest(request)
    ) {

      event.respondWith(

        (async () => {

          try {

            /*
             * Сначала всегда пытаемся
             * получить свежий HTML.
             */

            const response =
              await fetch(
                request,
                {
                  cache: "no-store"
                }
              );


            /*
             * Кэшируем только
             * успешный ответ.
             */

            if (
              response &&
              response.ok
            ) {

              await putInCache(
                request,
                response
              );

            }


            return response;

          } catch (networkError) {

            console.warn(
              "SW: HTML network error:",
              networkError
            );


            /*
             * 1. Точная страница.
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
             * 2. index.html.
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
             * 3. offline.html.
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
             * 4. Крайний fallback.
             */

            return new Response(

              `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>
<title>Нет подключения</title>
<style>
body{
  margin:0;
  padding:40px 20px;
  font-family:Arial,sans-serif;
  text-align:center;
}
h1{
  margin-bottom:15px;
}
p{
  opacity:.7;
}
</style>
</head>
<body>
<h1>Нет подключения к интернету</h1>
<p>
Проверьте соединение и попробуйте снова.
</p>
</body>
</html>`,

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
                response.type === "opaque"
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
              await cache.match(
                "/preload.png"
              );

            return (
              fallback ||
              response
            );

          } catch (error) {

            console.warn(
              "SW: image network error:",
              error
            );


            const fallback =
              await cache.match(
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
       NETWORK FIRST → CACHE
       ===================================================== */

    if (
      isStaticAssetRequest(request)
    ) {

      event.respondWith(

        (async () => {

          try {

            /*
             * Сначала свежая версия
             * с сервера.
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

              await putInCache(
                request,
                response
              );

            }


            return response;

          } catch (networkError) {

            console.warn(
              "SW: static network error:",
              networkError
            );


            /*
             * Нет сети —
             * используем последнюю версию.
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
           * Кэшируем только
           * обычные ответы нашего сайта.
           */

          if (
            response &&
            response.ok &&
            response.type === "basic"
          ) {

            await putInCache(
              request,
              response
            );

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
   DEBUG
   ========================================================= */

console.log(
  "Evacuator Service Worker loaded:",
  CACHE_NAME
);
