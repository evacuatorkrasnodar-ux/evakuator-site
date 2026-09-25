/* =========================================================
   app.js
   Эвакуатор Краснодар 24/7

   ВАЖНО:
   - VK_ADMIN_ID, VK_TOKEN и YANDEX_API_KEY НЕ изменены.
   - Логика прелоадера защищена от зависания.
   - Ошибка одного модуля не ломает остальные.
   ========================================================= */


/* =========================================================
   КОНФИГ VK
   ========================================================= */

const VK_ADMIN_ID = 200004082404;

const VK_TOKEN = "vk1.a.9dwswawH0x7rHsySyBHSlgoSYRDWZYlQOFYxjzJdw1w0mnne3dCgLvVLxgmqUVUO1y3Oh38PKeBzWpryi6lugUqaGoFUlKk8R96DfmbB1mTSb1c9dITbynZRzM7ort5KTV54fzYsrFETPtw4QH4sCFdZEZZZo8YZT4bjnkm18RAWOKWfdq94HD_jFhy9bJc-M2Z0oxrUD6PoToUTngq2Nn7SdlwK0zzGW_1ecE7nYc";


/* =========================================================
   ЯНДЕКС ГЕОКОДЕР
   ========================================================= */

const YANDEX_API_KEY = "fc0f9182-0eee-4e83-bed3-8e561c88c4d5";


/* =========================================================
   СОСТОЯНИЕ
   ========================================================= */

let requestLocked = false;
let locationLocked = false;

let deferredPrompt = null;

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
   ГЛАВНОЕ ИСПРАВЛЕНИЕ
   ========================================================= */

function hidePreloader() {
  if (preloaderHidden) {
    return;
  }

  preloaderHidden = true;

  const preloader =
    document.getElementById("preloader");

  if (!preloader) {
    return;
  }

  preloader.classList.add("hidden");

  /*
   * Резервное отключение самого элемента.
   * Если CSS/анимация не сработали,
   * сайт всё равно не останется под заставкой.
   */
  setTimeout(() => {
    try {
      preloader.style.pointerEvents = "none";
      preloader.style.opacity = "0";
      preloader.setAttribute("aria-hidden", "true");
    } catch (error) {
      console.error("Ошибка скрытия preloader:", error);
    }
  }, 700);
}


/*
 * Ставим аварийный таймер СРАЗУ,
 * а не в конце большого DOMContentLoaded-блока.
 */
setTimeout(hidePreloader, 5000);


/* =========================================================
   УТИЛИТЫ
   ========================================================= */

function isIOS() {
  return /iPhone|iPad|iPod/i.test(
    navigator.userAgent
  );
}


function isSafari() {
  return (
    /Safari/i.test(navigator.userAgent) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Android/i.test(
      navigator.userAgent
    )
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
    console.warn("Vibration error:", error);
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

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
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

  if (data && data.error) {
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
    "https://geocode-maps.yandex.ru/1.x/";

  const params =
    new URLSearchParams({
      apikey: YANDEX_API_KEY,

      geocode:
        `${lon},${lat}`,

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
    data
      ?.response
      ?.GeoObjectCollection
      ?.featureMember;

  if (
    !members ||
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

  const address =
    meta?.AddressDetails;

  const text =
    meta?.text || "";

  let city = "";
  let district = "";
  let street = "";
  let house = "";

  try {
    const country =
      address?.Country;

    const administrativeArea =
      country?.AdministrativeArea;

    const locality =
      administrativeArea?.Locality;

    city =
      locality?.LocalityName || "";

    district =
      locality
        ?.DependentLocality
        ?.DependentLocalityName || "";

    const thoroughfare =
      locality?.Thoroughfare;

    street =
      thoroughfare
        ?.ThoroughfareName || "";

    house =
      thoroughfare
        ?.Premise
        ?.PremiseNumber || "";

  } catch (error) {
    console.warn(
      "Не удалось разобрать AddressDetails:",
      error
    );
  }

  return {
    city,
    district,
    street,
    house,
    fullAddress: text
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

    setTimeout(() => {
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

  clearTimeout(
    geoStatusTimer
  );

  geoStatusTimer =
    setTimeout(() => {
      geoStatus.classList.remove(
        "status-show"
      );
    }, 3000);
}


/* =========================================================
   ГЕОЛОКАЦИЯ
   ========================================================= */

async function sendLocation() {
  if (locationLocked) {
    return;
  }

  if (!navigator.geolocation) {
    showToast(
      "Геолокация не поддерживается"
    );
    return;
  }

  if (
    !window.isSecureContext &&
    location.hostname !== "localhost" &&
    location.hostname !== "127.0.0.1"
  ) {
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

        /*
         * Если Яндекс временно недоступен,
         * координаты всё равно отправляем.
         */
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

        const yandex =
          `https://yandex.ru/maps/?pt=${encodeURIComponent(`${lon},${lat}`)}&z=16&l=map`;

        const addressLine =
          addr.fullAddress ||
          [
            addr.city,
            addr.district,
            addr.street,
            addr.house
          ]
            .filter(Boolean)
            .join(", ") ||
          "Адрес не определён";

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
        setTimeout(() => {
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

        case error.PERMISSION_DENIED:
          showToast(
            "Разрешите доступ к геолокации"
          );
          break;

        case error.POSITION_UNAVAILABLE:
          showToast(
            "Не удалось определить местоположение"
          );
          break;

        case error.TIMEOUT:
          showToast(
            "Истекло время ожидания геолокации"
          );
          break;

        default:
          showToast(
            "Не удалось получить геолокацию"
          );
      }

      setTimeout(() => {
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


function hideInstallButtons() {
  const installBtn =
    getInstallButton();

  const iosInstallBtn =
    getIosInstallButton();

  if (installBtn) {
    installBtn.style.display =
      "none";
  }

  if (iosInstallBtn) {
    iosInstallBtn.style.display =
      "none";
  }
}


function isInStandaloneMode() {
  try {
    return (
      window.matchMedia(
        "(display-mode: standalone)"
      ).matches ||
      window.navigator.standalone === true
    );
  } catch (error) {
    return false;
  }
}


function showAndroidInstallButton() {
  const installBtn =
    getInstallButton();

  if (
    installBtn &&
    !isInStandaloneMode()
  ) {
    installBtn.style.display =
      "block";

    installBtn.classList.add(
      "popIn"
    );
  }
}


function showIosInstallButton() {
  const iosInstallBtn =
    getIosInstallButton();

  if (
    iosInstallBtn &&
    isIOS() &&
    !isInStandaloneMode()
  ) {
    iosInstallBtn.style.display =
      "block";
  }
}


/* =========================================================
   BEFORE INSTALL PROMPT
   ========================================================= */

window.addEventListener(
  "beforeinstallprompt",
  event => {
    try {
      event.preventDefault();

      deferredPrompt = event;

      /*
       * DOM может быть ещё не готов.
       */
      if (
        document.readyState ===
        "loading"
      ) {
        return;
      }

      showAndroidInstallButton();

    } catch (error) {
      console.error(
        "beforeinstallprompt error:",
        error
      );
    }
  }
);


/* =========================================================
   APP INSTALLED
   ========================================================= */

window.addEventListener(
  "appinstalled",
  () => {
    deferredPrompt = null;

    hideInstallButtons();

    showToast(
      "Приложение установлено"
    );
  }
);


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
   Поддерживаются ОБА ID:
   #btn-location и старый #btnLocation
   ========================================================= */

function initGeoButtons() {
  const buttons = [];

  const currentButton =
    document.getElementById(
      "btn-location"
    );

  const legacyButton =
    document.getElementById(
      "btnLocation"
    );

  const englishButton =
    document.getElementById(
      "geoSend"
    );

  if (currentButton) {
    buttons.push(currentButton);
  }

  if (
    legacyButton &&
    legacyButton !== currentButton
  ) {
    buttons.push(legacyButton);
  }

  if (
    englishButton &&
    !buttons.includes(
      englishButton
    )
  ) {
    buttons.push(
      englishButton
    );
  }

  buttons.forEach(button => {
    button.addEventListener(
      "click",
      () => {
        button.classList.add(
          "btn-bounce"
        );

        setTimeout(() => {
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
   PWA UI
   ========================================================= */

function initPWA() {
  const installBtn =
    getInstallButton();

  const iosInstallBtn =
    getIosInstallButton();

  const iosModal =
    document.getElementById(
      "iosModal"
    );

  /*
   * Android / Chromium
   */
  if (installBtn) {
    installBtn.addEventListener(
      "click",
      async () => {
        installBtn.classList.add(
          "btn-bounce"
        );

        setTimeout(() => {
          installBtn.classList.remove(
            "btn-bounce"
          );
        }, 250);

        if (!deferredPrompt) {
          showToast(
            "Откройте меню браузера и выберите «Установить приложение»."
          );

          return;
        }

        try {
          deferredPrompt.prompt();

          const choice =
            await deferredPrompt.userChoice;

          if (
            choice &&
            choice.outcome ===
            "accepted"
          ) {
            showToast(
              "Приложение устанавливается"
            );

            installBtn.style.display =
              "none";
          } else {
            showToast(
              "Установка отменена"
            );
          }

        } catch (error) {
          console.error(
            "PWA install error:",
            error
          );

          showToast(
            "Не удалось запустить установку"
          );

        } finally {
          deferredPrompt = null;
        }
      }
    );
  }

  /*
   * iOS
   */
  if (
    iosInstallBtn &&
    iosModal
  ) {
    if (
      isIOS() &&
      !isInStandaloneMode()
    ) {
      showIosInstallButton();
    } else {
      iosInstallBtn.style.display =
        "none";
    }

    iosInstallBtn.addEventListener(
      "click",
      () => {
        iosModal.style.display =
          "flex";
      }
    );
  }

  /*
   * Если prompt появился раньше DOMContentLoaded.
   */
  if (
    deferredPrompt &&
    !isInStandaloneMode()
  ) {
    showAndroidInstallButton();
  }

  /*
   * iOS Safari.
   */
  if (
    isIOS() &&
    isSafari() &&
    !isInStandaloneMode()
  ) {
    setTimeout(() => {
      showToast(
        "Чтобы установить: Поделиться → На экран Домой"
      );
    }, 2500);
  }
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
                entry.isIntersecting
              ) {
                entry.target.classList.add(
                  "visible"
                );

                observer.unobserve(
                  entry.target
                );
              }
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

  requestForm.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      if (
        typeof requestForm.reportValidity ===
        "function"
      ) {
        if (
          !requestForm.reportValidity()
        ) {
          return;
        }
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
   * Если пользователь ввёл 7...
   */
  if (
    digits.startsWith("7")
  ) {
    digits =
      digits.substring(0, 11);

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
  const phoneInputs =
    document.querySelectorAll(
      'input[type="tel"]'
    );

  phoneInputs.forEach(
    input => {
      input.addEventListener(
        "input",
        () => {
          input.value =
            formatRussianPhone(
              input.value
            );
        }
      );
    }
  );
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

  if (modal) {
    modal.style.display =
      "none";
  }
}


function initModals() {
  document
    .querySelectorAll(
      "[data-modal-close]"
    )
    .forEach(button => {
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
      modal.addEventListener(
        "click",
        event => {
          if (
            event.target ===
            modal
          ) {
            modal.style.display =
              "none";
          }
        }
      );
    });


  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key !==
        "Escape"
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
        });
    }
  );
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
   DOM READY
   ========================================================= */

function initApp() {
  /*
   * Убираем заставку в самом начале.
   * Ниже могут быть любые ошибки —
   * они уже не должны блокировать сайт.
   */
  hidePreloader();


  /*
   * Каждый модуль запускается отдельно.
   * Ошибка одного модуля не останавливает остальные.
   */

  safeCall(
    initTheme
  );

  safeCall(
    initGeoButtons
  );

  safeCall(
    initPWA
  );

  safeCall(
    initAnimations
  );

  safeCall(
    initPhoneLinks
  );

  safeCall(
    initRequestForm
  );

  safeCall(
    initPhoneMask
  );

  safeCall(
    initModals
  );

  safeCall(
    initYears
  );

  safeCall(
    initLazyImages
  );


  /*
   * Ещё одна попытка убрать заставку
   * после инициализации интерфейса.
   */
  hidePreloader();
}


/* =========================================================
   DOMContentLoaded
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
  },
  {
    once: true
  }
);


/* =========================================================
   ДОПОЛНИТЕЛЬНЫЙ АВАРИЙНЫЙ FALLBACK
   ========================================================= */

setTimeout(() => {
  hidePreloader();
}, 8000);


/* =========================================================
   SERVICE WORKER
   ========================================================= */

if (
  "serviceWorker" in
  navigator
) {
  window.addEventListener(
    "load",
    () => {
      navigator.serviceWorker
        .register(
          "/sw.js"
        )
        .then(
          registration => {
            console.log(
              "SW зарегистрирован:",
              registration.scope
            );
          }
        )
        .catch(
          error => {
            /*
             * Ошибка Service Worker
             * НЕ должна ломать сайт.
             */
            console.error(
              "SW ошибка:",
              error
            );
          }
        );
    },
    {
      once: true
    }
  );
}
