```javascript
/* =========================================================
   app.js
   Эвакуатор Краснодар 24/7

   ВКЛЮЧЕНО:
   - VK_ADMIN_ID
   - VK_TOKEN
   - YANDEX_API_KEY
   - PWA install
   - Chrome / Edge / Яндекс на ПК
   - Android Chrome / Edge / Яндекс
   - Safari iPhone / iPad
   - beforeinstallprompt до и после DOMContentLoaded
   - appinstalled
   - display-mode standalone
   - геолокация
   - Яндекс Геокодер API v1
   - VK отправка
   - тема
   - форма
   - маска телефона
   - модальные окна
   - lazy images
   - анимации
   - preloader
   - Service Worker
   ========================================================= */


/* =========================================================
   КОНФИГ VK
   ========================================================= */

const VK_ADMIN_ID = 200004082404;

const VK_TOKEN =
  "vk1.a.9dwswawH0x7rHsySyBHSlgoSYRDWZYlQOFYxjzJdw1w0mnne3dCgLvVLxgmqUVUO1y3Oh38PKeBzWpryi6lugUqaGoFUlKk8R96DfmbB1mTSb1c9dITbynZRzM7ort5KTV54fzYsrFETPtw4QH4sCFdZEZZZo8YZT4bjnkm18RAWOKWfdq94HD_jFhy9bJc-M2Z0oxrUD6PoToUTngq2Nn7SdlwK0zzGW_1ecE7nYc";


/* =========================================================
   ЯНДЕКС ГЕОКОДЕР
   ========================================================= */

const YANDEX_API_KEY =
  "fc0f9182-0eee-4e83-bed3-8e561c88c4d5";


/* =========================================================
   СОСТОЯНИЕ
   ========================================================= */

let requestLocked = false;
let locationLocked = false;

let deferredPrompt = null;
let pwaInitialized = false;
let pwaInstallInProgress = false;

let toastTimer = null;
let geoStatusTimer = null;

let preloaderHidden = false;


/* =========================================================
   БЕЗОПАСНЫЙ ВЫЗОВ
   ========================================================= */

function safeCall(fn, fallback = null) {
  try {
    return fn();
  } catch (error) {
    console.error("app.js:", error);
    return fallback;
  }
}


/* =========================================================
   PRELOADER
   ========================================================= */

function hidePreloader() {
  if (preloaderHidden) {
    return;
  }

  const preloader =
    document.getElementById("preloader");

  if (!preloader) {
    preloaderHidden = true;
    return;
  }

  preloaderHidden = true;

  preloader.classList.add("hidden");

  window.setTimeout(() => {
    try {
      preloader.style.pointerEvents = "none";
      preloader.style.opacity = "0";
      preloader.setAttribute(
        "aria-hidden",
        "true"
      );
    } catch (error) {
      console.error(
        "Ошибка скрытия preloader:",
        error
      );
    }
  }, 700);
}


/* Аварийное скрытие заставки */
window.setTimeout(
  hidePreloader,
  5000
);


/* =========================================================
   УТИЛИТЫ
   ========================================================= */

function isIOS() {
  return (
    /iPhone|iPad|iPod/i.test(
      navigator.userAgent
    ) ||
    (
      navigator.platform === "MacIntel" &&
      navigator.maxTouchPoints > 1
    )
  );
}


function isSafari() {
  const ua =
    navigator.userAgent || "";

  return (
    /Safari/i.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Android/i.test(
      ua
    )
  );
}


function isAndroid() {
  return /Android/i.test(
    navigator.userAgent || ""
  );
}


function isStandalone() {
  try {
    return (
      window.matchMedia(
        "(display-mode: standalone)"
      ).matches ||
      window.matchMedia(
        "(display-mode: fullscreen)"
      ).matches ||
      window.matchMedia(
        "(display-mode: minimal-ui)"
      ).matches ||
      navigator.standalone === true
    );
  } catch (error) {
    return navigator.standalone === true;
  }
}


function isSecureSite() {
  return (
    window.isSecureContext ||
    location.protocol === "https:" ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1"
  );
}


function vibrate(ms = 30) {
  try {
    if (
      "vibrate" in navigator &&
      typeof navigator.vibrate === "function"
    ) {
      navigator.vibrate(ms);
    }
  } catch (error) {
    console.warn(
      "Vibration error:",
      error
    );
  }
}


function showToast(message) {
  const toast =
    document.getElementById("toast");

  if (!toast) {
    console.log(message);
    return;
  }

  toast.textContent = String(message);

  toast.classList.add("show");

  window.clearTimeout(toastTimer);

  toastTimer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}


/* =========================================================
   VK
   ========================================================= */

async function sendToVK(message) {
  const url =
    "https://api.vk.com/method/messages.send";

  const params =
    new URLSearchParams({
      peer_id: String(VK_ADMIN_ID),

      random_id: String(
        Math.floor(
          Math.random() * 2147483647
        )
      ),

      message: String(message),

      access_token: VK_TOKEN,

      v: "5.199"
    });

  const response =
    await fetch(
      `${url}?${params.toString()}`,
      {
        method: "GET",
        credentials: "omit"
      }
    );

  if (!response.ok) {
    throw new Error(
      `VK HTTP ${response.status}`
    );
  }

  const data =
    await response.json();

  if (data?.error) {
    console.error(
      "VK API Error:",
      data.error
    );

    throw new Error(
      data.error.error_msg ||
      "VK API error"
    );
  }

  return data;
}


/* =========================================================
   ЯНДЕКС ГЕОКОДЕР
   ========================================================= */

async function getFullAddress(lat, lon) {
  const url =
    "https://geocode-maps.yandex.ru/v1/";

  const params =
    new URLSearchParams({
      apikey: YANDEX_API_KEY,

      geocode: `${lon},${lat}`,

      format: "json",

      lang: "ru_RU",

      results: "1"
    });

  const response =
    await fetch(
      `${url}?${params.toString()}`,
      {
        method: "GET",
        credentials: "omit"
      }
    );

  if (!response.ok) {
    throw new Error(
      `Ошибка Яндекс Геокодера: HTTP ${response.status}`
    );
  }

  const data =
    await response.json();

  const members =
    data?.response
      ?.GeoObjectCollection
      ?.featureMember;

  if (
    !Array.isArray(members) ||
    !members.length
  ) {
    throw new Error(
      "Адрес не найден"
    );
  }

  const geoObject =
    members[0]?.GeoObject;

  const meta =
    geoObject
      ?.metaDataProperty
      ?.GeocoderMetaData;

  if (!meta) {
    throw new Error(
      "Данные адреса отсутствуют"
    );
  }

  let city = "";
  let district = "";
  let street = "";
  let house = "";

  const fullAddress =
    String(
      meta?.text ||
      meta?.Address?.formatted ||
      ""
    ).trim();


  /* -------------------------------------------------------
     AddressDetails
     ------------------------------------------------------- */

  try {
    const country =
      meta?.AddressDetails
        ?.Country;

    const administrativeArea =
      country?.AdministrativeArea;

    const locality =
      administrativeArea?.Locality;

    city =
      locality?.LocalityName ||
      "";

    district =
      locality
        ?.DependentLocality
        ?.DependentLocalityName ||
      "";

    const thoroughfare =
      locality?.Thoroughfare;

    street =
      thoroughfare
        ?.ThoroughfareName ||
      "";

    house =
      thoroughfare
        ?.Premise
        ?.PremiseNumber ||
      "";

  } catch (error) {
    console.warn(
      "Не удалось разобрать AddressDetails:",
      error
    );
  }


  /* -------------------------------------------------------
     Address.Components
     ------------------------------------------------------- */

  try {
    const components =
      meta?.Address?.Components;

    if (Array.isArray(components)) {
      components.forEach(component => {
        const kind =
          component?.kind;

        const name =
          String(
            component?.name || ""
          ).trim();

        if (
          kind === "locality" &&
          !city
        ) {
          city = name;
        }

        if (
          kind === "district" &&
          !district
        ) {
          district = name;
        }

        if (
          kind === "street" &&
          !street
        ) {
          street = name;
        }

        if (
          kind === "house" &&
          !house
        ) {
          house = name;
        }
      });
    }

  } catch (error) {
    console.warn(
      "Не удалось разобрать Address.Components:",
      error
    );
  }


  return {
    city: String(city || "").trim(),
    district: String(district || "").trim(),
    street: String(street || "").trim(),
    house: String(house || "").trim(),
    fullAddress
  };
}


/* =========================================================
   ОТПРАВКА ЗАЯВКИ
   ========================================================= */

async function sendRequest(data) {
  if (requestLocked) {
    return;
  }

  requestLocked = true;

  const button =
    document.getElementById(
      "btn-request"
    );

  if (button) {
    button.disabled = true;

    button.setAttribute(
      "aria-busy",
      "true"
    );
  }

  try {
    const message =
`Новая заявка с сайта:

Имя: ${data.name || "Не указано"}
Телефон: ${data.phone || "Не указан"}
Автомобиль: ${data.car || "Не указан"}
Адрес: ${data.address || "Не указан"}
Комментарий: ${data.comment || "Не указан"}`;

    await sendToVK(message);

    showToast(
      "Заявка отправлена. Мы свяжемся с вами."
    );

    const form =
      document.getElementById(
        "requestForm"
      );

    if (form) {
      form.reset();
    }

  } catch (error) {
    console.error(
      "Request Error:",
      error
    );

    showToast(
      "Не удалось отправить заявку"
    );

  } finally {
    if (button) {
      button.disabled = false;

      button.removeAttribute(
        "aria-busy"
      );
    }

    window.setTimeout(() => {
      requestLocked = false;
    }, 2000);
  }
}


/* =========================================================
   GEO STATUS
   ========================================================= */

function setGeoStatus(text) {
  const geoStatus =
    document.getElementById(
      "geoStatus"
    );

  if (!geoStatus) {
    return;
  }

  geoStatus.textContent =
    String(text);

  geoStatus.classList.add(
    "status-show"
  );

  window.clearTimeout(
    geoStatusTimer
  );

  geoStatusTimer =
    window.setTimeout(() => {
      geoStatus.classList.remove(
        "status-show"
      );
    }, 3000);
}


/* =========================================================
   ГЕОЛОКАЦИЯ
   ========================================================= */

function sendLocation() {
  if (locationLocked) {
    return;
  }

  if (!navigator.geolocation) {
    showToast(
      "Геолокация не поддерживается"
    );

    return;
  }

  if (!isSecureSite()) {
    showToast(
      "Для геолокации нужен HTTPS"
    );

    return;
  }

  locationLocked = true;

  showToast(
    "Определяем ваше местоположение..."
  );

  navigator.geolocation.getCurrentPosition(
    async position => {
      try {
        const lat =
          Number(
            position.coords.latitude
          );

        const lon =
          Number(
            position.coords.longitude
          );

        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lon)
        ) {
          throw new Error(
            "Некорректные координаты"
          );
        }

        let addr = {
          city: "",
          district: "",
          street: "",
          house: "",
          fullAddress: ""
        };


        /* Геокодирование */

        try {
          addr =
            await getFullAddress(
              lat,
              lon
            );
        } catch (geocodeError) {
          console.warn(
            "Геокодирование не удалось:",
            geocodeError
          );
        }


        /* Карта */

        const yandex =
          "https://yandex.ru/maps/?" +
          `pt=${encodeURIComponent(
            `${lon},${lat}`
          )}` +
          "&z=16&l=map";


        /* Адрес */

        const fallbackAddress =
          [
            addr.city,
            addr.district,
            addr.street,
            addr.house
          ]
            .filter(Boolean)
            .join(", ");

        const addressLine =
          addr.fullAddress ||
          fallbackAddress ||
          "Адрес не определён";


        /* Сообщение */

        const message =
`Геолокация клиента:

Город: ${addr.city || "Не определён"}
Район: ${addr.district || "Не определён"}
Улица: ${addr.street || "Не определена"}
Дом: ${addr.house || "Не определён"}

Полный адрес:
${addressLine}

Широта: ${lat}
Долгота: ${lon}

Открыть на карте:
${yandex}`;


        await sendToVK(
          message
        );

        vibrate(40);

        setGeoStatus(
          "Геолокация отправлена!"
        );

        showToast(
          "Геолокация отправлена!"
        );

      } catch (error) {
        console.error(
          "Location processing Error:",
          error
        );

        showToast(
          "Не удалось отправить геолокацию"
        );

      } finally {
        window.setTimeout(() => {
          locationLocked = false;
        }, 2000);
      }
    },

    error => {
      console.error(
        "Geo Error:",
        error
      );

      switch (error.code) {
        case 1:
          showToast(
            "Разрешите доступ к геолокации"
          );
          break;

        case 2:
          showToast(
            "Не удалось определить местоположение"
          );
          break;

        case 3:
          showToast(
            "Истекло время ожидания геолокации"
          );
          break;

        default:
          showToast(
            "Не удалось получить геолокацию"
          );
      }

      window.setTimeout(() => {
        locationLocked = false;
      }, 1000);
    },

    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000
    }
  );
}


/* =========================================================
   PWA
   ========================================================= */

function getInstallButton() {
  return document.getElementById(
    "installBtn"
  );
}


function getIosInstallButton() {
  return document.getElementById(
    "iosInstall"
  );
}


function hideInstallButton(button) {
  if (!button) {
    return;
  }

  button.style.display = "none";

  button.setAttribute(
    "aria-hidden",
    "true"
  );
}


function showInstallButton(button) {
  if (
    !button ||
    isStandalone()
  ) {
    return;
  }

  button.style.display = "flex";

  button.removeAttribute(
    "aria-hidden"
  );

  button.classList.add(
    "popIn"
  );
}


function hideInstallButtons() {
  hideInstallButton(
    getInstallButton()
  );

  hideInstallButton(
    getIosInstallButton()
  );
}


function showAndroidInstallButton() {
  const button =
    getInstallButton();

  if (
    button &&
    !isStandalone()
  ) {
    showInstallButton(
      button
    );
  }
}


function showIosInstallButton() {
  const button =
    getIosInstallButton();

  if (
    button &&
    isIOS() &&
    !isStandalone()
  ) {
    showInstallButton(
      button
    );
  }
}


/* =========================================================
   BROWSER INSTALL HELP
   ========================================================= */

function showBrowserInstallHelp() {
  if (isIOS()) {
    showToast(
      "Safari: нажмите «Поделиться» → «На экран Домой»"
    );

    return;
  }

  if (isAndroid()) {
    showToast(
      "Откройте меню браузера ⋮ и выберите «Установить приложение» или «Добавить на главный экран»."
    );

    return;
  }

  showToast(
    "Откройте меню браузера и выберите «Установить приложение»."
  );
}


/* =========================================================
   BEFORE INSTALL PROMPT
   ========================================================= */

window.addEventListener(
  "beforeinstallprompt",
  event => {
    console.log(
      "PWA: beforeinstallprompt получен"
    );

    try {
      event.preventDefault();
    } catch (error) {
      console.warn(
        "PWA: preventDefault error:",
        error
      );
    }

    /*
     * Сохраняем только актуальный prompt.
     */
    deferredPrompt = event;

    pwaInstallInProgress = false;

    /*
     * Если DOM уже готов,
     * сразу показываем кнопку.
     */
    if (
      document.readyState !== "loading" &&
      !isStandalone()
    ) {
      showAndroidInstallButton();
    }
  }
);


/* =========================================================
   APP INSTALLED
   ========================================================= */

window.addEventListener(
  "appinstalled",
  () => {
    console.log(
      "PWA: приложение установлено"
    );

    deferredPrompt = null;

    pwaInstallInProgress = false;

    hideInstallButtons();

    showToast(
      "Приложение установлено"
    );
  }
);


/* =========================================================
   PWA INSTALL BUTTON
   ========================================================= */

function refreshPWAInstallButton() {
  if (isStandalone()) {
    hideInstallButtons();
    return;
  }

  /*
   * iOS.
   */
  if (isIOS()) {
    showIosInstallButton();

    /*
     * На iOS beforeinstallprompt
     * не используется.
     */
    hideInstallButton(
      getInstallButton()
    );

    return;
  }

  /*
   * Chromium.
   *
   * Если prompt есть — кнопка доступна.
   */
  if (deferredPrompt) {
    showAndroidInstallButton();
    return;
  }

  /*
   * Пока prompt отсутствует,
   * оставляем кнопку видимой.
   *
   * При клике показываем инструкцию.
   */
  showAndroidInstallButton();
}


/* =========================================================
   PWA INSTALL
   ========================================================= */

async function installPWA() {
  if (pwaInstallInProgress) {
    return;
  }

  if (isStandalone()) {
    hideInstallButtons();
    return;
  }

  /*
   * iOS.
   */
  if (isIOS()) {
    showBrowserInstallHelp();
    return;
  }

  /*
   * Prompt отсутствует.
   */
  if (!deferredPrompt) {
    showBrowserInstallHelp();
    return;
  }

  pwaInstallInProgress = true;

  /*
   * ВАЖНО:
   *
   * Сохраняем текущий prompt.
   * После prompt() этот экземпляр
   * повторно использовать нельзя.
   */
  const promptEvent =
    deferredPrompt;

  /*
   * Сразу очищаем ссылку,
   * чтобы двойной клик не вызвал
   * prompt повторно.
   */
  deferredPrompt = null;

  try {
    const choice =
      await promptEvent.prompt();

    const outcome =
      choice?.outcome ||
      "dismissed";

    if (
      outcome === "accepted"
    ) {
      showToast(
        "Приложение устанавливается"
      );

      hideInstallButton(
        getInstallButton()
      );

    } else {
      showToast(
        "Установка отменена"
      );

      /*
       * Кнопку не блокируем навсегда.
       * Если браузер выдаст новое
       * beforeinstallprompt — она снова
       * будет работать.
       */
      refreshPWAInstallButton();
    }

  } catch (error) {
    console.error(
      "PWA install error:",
      error
    );

    /*
     * В некоторых браузерах
     * prompt может быть недоступен.
     */
    showBrowserInstallHelp();

    refreshPWAInstallButton();

  } finally {
    pwaInstallInProgress = false;
  }
}


/* =========================================================
   DISPLAY MODE
   ========================================================= */

function initDisplayModeListener() {
  try {
    const queries = [
      "(display-mode: standalone)",
      "(display-mode: fullscreen)",
      "(display-mode: minimal-ui)"
    ];

    const update = () => {
      if (isStandalone()) {
        hideInstallButtons();
      } else {
        refreshPWAInstallButton();
      }
    };

    queries.forEach(query => {
      const mediaQuery =
        window.matchMedia(query);

      if (
        typeof mediaQuery.addEventListener ===
        "function"
      ) {
        mediaQuery.addEventListener(
          "change",
          update
        );
      } else if (
        typeof mediaQuery.addListener ===
        "function"
      ) {
        mediaQuery.addListener(update);
      }
    });

    update();

  } catch (error) {
    console.warn(
      "Display mode listener error:",
      error
    );
  }
}


/* =========================================================
   PWA UI
   ========================================================= */

function initPWA() {
  if (pwaInitialized) {
    refreshPWAInstallButton();
    return;
  }

  pwaInitialized = true;

  const installBtn =
    getInstallButton();

  const iosInstallBtn =
    getIosInstallButton();

  const iosModal =
    document.getElementById(
      "iosModal"
    );


  /*
   * Уже установлено.
   */
  if (isStandalone()) {
    hideInstallButtons();
    return;
  }


  /* -------------------------------------------------------
     ОСНОВНАЯ КНОПКА
     ------------------------------------------------------- */

  if (installBtn) {
    if (
      installBtn.dataset.pwaBound !==
      "true"
    ) {
      installBtn.dataset.pwaBound =
        "true";

      installBtn.addEventListener(
        "click",
        async event => {
          event.preventDefault();
          event.stopPropagation();

          installBtn.classList.add(
            "btn-bounce"
          );

          window.setTimeout(() => {
            installBtn.classList.remove(
              "btn-bounce"
            );
          }, 250);

          vibrate(20);

          await installPWA();
        }
      );
    }
  }


  /* -------------------------------------------------------
     IOS BUTTON
     ------------------------------------------------------- */

  if (iosInstallBtn) {
    if (
      iosInstallBtn.dataset.pwaBound !==
      "true"
    ) {
      iosInstallBtn.dataset.pwaBound =
        "true";

      iosInstallBtn.addEventListener(
        "click",
        event => {
          event.preventDefault();
          event.stopPropagation();

          vibrate(20);

          if (!iosModal) {
            showBrowserInstallHelp();
            return;
          }

          iosModal.style.display =
            "flex";

          iosModal.setAttribute(
            "aria-hidden",
            "false"
          );
        }
      );
    }
  }


  /*
   * Первичная проверка.
   */
  refreshPWAInstallButton();


  /*
   * iOS Safari.
   */
  if (
    isIOS() &&
    isSafari() &&
    !isStandalone()
  ) {
    showIosInstallButton();

    try {
      if (
        !sessionStorage.getItem(
          "iosInstallHintShown"
        )
      ) {
        window.setTimeout(() => {
          if (!isStandalone()) {
            showToast(
              "Safari: Поделиться → На экран Домой"
            );

            try {
              sessionStorage.setItem(
                "iosInstallHintShown",
                "1"
              );
            } catch (error) {
              console.warn(
                "sessionStorage недоступен:",
                error
              );
            }
          }
        }, 2500);
      }
    } catch (error) {
      console.warn(
        "sessionStorage недоступен:",
        error
      );
    }
  }
}


/* =========================================================
   THEME
   ========================================================= */

function initTheme() {
  const themeBtn =
    document.getElementById(
      "themeToggle"
    );

  let savedTheme = null;

  try {
    savedTheme =
      localStorage.getItem(
        "theme"
      );
  } catch (error) {
    console.warn(
      "localStorage недоступен:",
      error
    );
  }


  if (savedTheme === "light") {
    document.body.classList.remove(
      "theme-dark"
    );

    document.body.classList.add(
      "theme-light"
    );
  } else {
    document.body.classList.remove(
      "theme-light"
    );

    document.body.classList.add(
      "theme-dark"
    );
  }


  if (!themeBtn) {
    return;
  }


  if (
    themeBtn.dataset.themeBound ===
    "true"
  ) {
    return;
  }

  themeBtn.dataset.themeBound =
    "true";


  themeBtn.addEventListener(
    "click",
    () => {
      const isLight =
        document.body.classList.contains(
          "theme-light"
        );

      if (isLight) {
        document.body.classList.remove(
          "theme-light"
        );

        document.body.classList.add(
          "theme-dark"
        );

        try {
          localStorage.setItem(
            "theme",
            "dark"
          );
        } catch (error) {
          console.warn(
            "Не удалось сохранить тему:",
            error
          );
        }

      } else {
        document.body.classList.remove(
          "theme-dark"
        );

        document.body.classList.add(
          "theme-light"
        );

        try {
          localStorage.setItem(
            "theme",
            "light"
          );
        } catch (error) {
          console.warn(
            "Не удалось сохранить тему:",
            error
          );
        }
      }

      vibrate(20);
    }
  );
}


/* =========================================================
   GEO BUTTON
   ========================================================= */

function initGeoButtons() {
  const buttons = [];

  const ids = [
    "btn-location",
    "btnLocation",
    "geoSend"
  ];

  ids.forEach(id => {
    const button =
      document.getElementById(id);

    if (
      button &&
      !buttons.includes(button)
    ) {
      buttons.push(button);
    }
  });


  buttons.forEach(button => {
    if (
      button.dataset.geoBound ===
      "true"
    ) {
      return;
    }

    button.dataset.geoBound =
      "true";

    button.addEventListener(
      "click",
      () => {
        button.classList.add(
          "btn-bounce"
        );

        window.setTimeout(() => {
          button.classList.remove(
            "btn-bounce"
          );
        }, 250);

        sendLocation();
      }
    );
  });
}


/* =========================================================
   ANIMATIONS
   ========================================================= */

function initAnimations() {
  const fadeElems =
    document.querySelectorAll(
      ".fade-in"
    );

  if (!fadeElems.length) {
    return;
  }

  if (
    "IntersectionObserver" in
    window
  ) {
    const observer =
      new IntersectionObserver(
        entries => {
          entries.forEach(
            entry => {
              if (
                !entry.isIntersecting
              ) {
                return;
              }

              entry.target.classList.add(
                "visible"
              );

              observer.unobserve(
                entry.target
              );
            }
          );
        },
        {
          threshold: 0.1
        }
      );

    fadeElems.forEach(
      element => {
        observer.observe(
          element
        );
      }
    );

  } else {
    fadeElems.forEach(
      element => {
        element.classList.add(
          "visible"
        );
      }
    );
  }
}


/* =========================================================
   PHONE LINKS
   ========================================================= */

function initPhoneLinks() {
  document
    .querySelectorAll(
      'a[href^="tel:"]'
    )
    .forEach(link => {
      if (
        link.dataset.phoneBound ===
        "true"
      ) {
        return;
      }

      link.dataset.phoneBound =
        "true";

      link.addEventListener(
        "click",
        () => {
          vibrate(30);
        }
      );
    });
}


/* =========================================================
   REQUEST FORM
   ========================================================= */

function initRequestForm() {
  const requestForm =
    document.getElementById(
      "requestForm"
    );

  if (!requestForm) {
    return;
  }

  if (
    requestForm.dataset.formBound ===
    "true"
  ) {
    return;
  }

  requestForm.dataset.formBound =
    "true";

  requestForm.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      if (
        typeof requestForm.reportValidity ===
        "function" &&
        !requestForm.reportValidity()
      ) {
        return;
      }

      const formData =
        new FormData(
          requestForm
        );

      const data = {
        name:
          String(
            formData.get("name") || ""
          ).trim(),

        phone:
          String(
            formData.get("phone") || ""
          ).trim(),

        car:
          String(
            formData.get("car") || ""
          ).trim(),

        address:
          String(
            formData.get("address") || ""
          ).trim(),

        comment:
          String(
            formData.get("comment") || ""
          ).trim()
      };


      if (!data.phone) {
        showToast(
          "Введите номер телефона"
        );

        return;
      }


      if (!data.address) {
        showToast(
          "Введите адрес эвакуации"
        );

        return;
      }


      await sendRequest(
        data
      );
    }
  );
}


/* =========================================================
   PHONE MASK
   ========================================================= */

function formatRussianPhone(value) {
  let digits =
    String(value || "")
      .replace(/\D/g, "");

  if (!digits) {
    return "";
  }


  /*
   * 8XXXXXXXXXX -> 7XXXXXXXXXX
   */

  if (
    digits.startsWith("8")
  ) {
    digits =
      "7" +
      digits.substring(1);
  }


  /*
   * Российский номер.
   */

  if (
    digits.startsWith("7")
  ) {
    digits =
      digits.substring(
        0,
        11
      );

    let result = "+7";

    if (digits.length > 1) {
      result +=
        " (" +
        digits.substring(
          1,
          4
        );
    }

    if (digits.length >= 4) {
      result += ") ";
    }

    if (digits.length > 4) {
      result +=
        digits.substring(
          4,
          7
        );
    }

    if (digits.length >= 7) {
      result += "-";
    }

    if (digits.length > 7) {
      result +=
        digits.substring(
          7,
          9
        );
    }

    if (digits.length >= 9) {
      result += "-";
    }

    if (digits.length > 9) {
      result +=
        digits.substring(
          9,
          11
        );
    }

    return result;
  }


  return digits.substring(
    0,
    15
  );
}


function initPhoneMask() {
  document
    .querySelectorAll(
      'input[type="tel"]'
    )
    .forEach(input => {
      if (
        input.dataset.phoneMaskBound ===
        "true"
      ) {
        return;
      }

      input.dataset.phoneMaskBound =
        "true";

      input.addEventListener(
        "input",
        () => {
          input.value =
            formatRussianPhone(
              input.value
            );
        }
      );
    });
}


/* =========================================================
   MODALS
   ========================================================= */

function closeModal(modalId) {
  if (!modalId) {
    return;
  }

  const modal =
    document.getElementById(
      modalId
    );

  if (!modal) {
    return;
  }

  modal.style.display =
    "none";

  modal.setAttribute(
    "aria-hidden",
    "true"
  );
}


function initModals() {
  document
    .querySelectorAll(
      "[data-modal-close]"
    )
    .forEach(button => {
      if (
        button.dataset.modalBound ===
        "true"
      ) {
        return;
      }

      button.dataset.modalBound =
        "true";

      button.addEventListener(
        "click",
        () => {
          closeModal(
            button.dataset.modalClose
          );
        }
      );
    });


  document
    .querySelectorAll(
      ".modal"
    )
    .forEach(modal => {
      if (
        modal.dataset.modalBound ===
        "true"
      ) {
        return;
      }

      modal.dataset.modalBound =
        "true";

      modal.addEventListener(
        "click",
        event => {
          if (
            event.target === modal
          ) {
            modal.style.display =
              "none";

            modal.setAttribute(
              "aria-hidden",
              "true"
            );
          }
        }
      );
    });


  if (
    document.body.dataset.modalKeyboardBound !==
    "true"
  ) {
    document.body.dataset.modalKeyboardBound =
      "true";

    document.addEventListener(
      "keydown",
      event => {
        if (
          event.key !== "Escape"
        ) {
          return;
        }

        document
          .querySelectorAll(
            ".modal"
          )
          .forEach(modal => {
            modal.style.display =
              "none";

            modal.setAttribute(
              "aria-hidden",
              "true"
            );
          });
      }
    );
  }
}


/* =========================================================
   YEAR
   ========================================================= */

function initYears() {
  const year =
    new Date().getFullYear();

  document
    .querySelectorAll(
      "[data-year]"
    )
    .forEach(element => {
      element.textContent =
        String(year);
    });
}


/* =========================================================
   LAZY IMAGES
   ========================================================= */

function initLazyImages() {
  const images =
    document.querySelectorAll(
      "img[data-src]"
    );

  if (!images.length) {
    return;
  }

  if (
    "IntersectionObserver" in
    window
  ) {
    const imageObserver =
      new IntersectionObserver(
        entries => {
          entries.forEach(
            entry => {
              if (
                !entry.isIntersecting
              ) {
                return;
              }

              const img =
                entry.target;

              const src =
                img.dataset.src;

              if (src) {
                img.src = src;

                img.removeAttribute(
                  "data-src"
                );
              }

              imageObserver.unobserve(
                img
              );
            }
          );
        },
        {
          rootMargin:
            "200px 0px"
        }
      );

    images.forEach(
      img => {
        imageObserver.observe(
          img
        );
      }
    );

  } else {
    images.forEach(
      img => {
        const src =
          img.dataset.src;

        if (src) {
          img.src = src;

          img.removeAttribute(
            "data-src"
          );
        }
      }
    );
  }
}


/* =========================================================
   SERVICE WORKER
   ========================================================= */

function registerServiceWorker() {
  if (
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  if (!isSecureSite()) {
    return;
  }

  navigator.serviceWorker
    .register(
      "/sw.js",
      {
        scope: "/"
      }
    )
    .then(registration => {
      console.log(
        "SW зарегистрирован:",
        registration.scope
      );
    })
    .catch(error => {
      /*
       * SW не должен ломать сайт.
       */
      console.error(
        "SW ошибка:",
        error
      );
    });
}


/* =========================================================
   DOM READY
   ========================================================= */

function initApp() {
  hidePreloader();

  safeCall(initTheme);

  safeCall(initGeoButtons);

  safeCall(initPWA);

  safeCall(
    initDisplayModeListener
  );

  safeCall(initAnimations);

  safeCall(initPhoneLinks);

  safeCall(initRequestForm);

  safeCall(initPhoneMask);

  safeCall(initModals);

  safeCall(initYears);

  safeCall(initLazyImages);

  safeCall(
    refreshPWAInstallButton
  );

  hidePreloader();
}


/* =========================================================
   DOMCONTENTLOADED
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initApp,
    {
      once: true
    }
  );
} else {
  initApp();
}


/* =========================================================
   LOAD
   ========================================================= */

window.addEventListener(
  "load",
  () => {
    hidePreloader();

    refreshPWAInstallButton();

    registerServiceWorker();
  },
  {
    once: true
  }
);


/* =========================================================
   ДОПОЛНИТЕЛЬНЫЙ FALLBACK
   ========================================================= */

window.setTimeout(
  hidePreloader,
  8000
);
```
