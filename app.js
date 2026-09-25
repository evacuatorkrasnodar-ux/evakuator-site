/* =========================================================
   app.js
   Эвакуатор Краснодар 24/7

   VK_ADMIN_ID, VK_TOKEN и YANDEX_API_KEY НЕ ИЗМЕНЕНЫ.
   ========================================================= */

"use strict";

/* =========================================================
   КОНФИГ VK
   ========================================================= */

const VK_ADMIN_ID = 200004082404;

const VK_TOKEN = "vk1.a.9dwswawH0x7rHsySyBHSlgoSYRDWZYlQOFYxjzJdw1w0mnne3dCgLvVLxgmqUVUO1y3Oh38PKeBzWpryi6lugUqaGoFUlKk8R96DfmbB1mTSb1c9dITbynZRzM7ort5KTV54fzYsrFETPtw4QH4sCFdZEZZZo8YZT4bjnkm18RAWOKWfdq94HD_jFhy9bJc-M2Z0oxrUD6PoToUTngq2Nn7SdlwK0zzGW_1ecE7nYc";

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

function safeCall(fn, fallback) {
  try {
    return fn();
  } catch (error) {
    console.error("app.js error:", error);
    return fallback;
  }
}


/* =========================================================
   PRELOADER
   ========================================================= */

function hidePreloader() {
  const preloader = document.getElementById("preloader");

  if (!preloader) {
    preloaderHidden = true;
    return;
  }

  if (preloaderHidden) {
    return;
  }

  preloaderHidden = true;

  try {
    preloader.classList.add("hidden");

    /*
     * Принудительно убираем заставку.
     * Это не зависит от CSS-анимации.
     */
    preloader.style.opacity = "0";
    preloader.style.visibility = "hidden";
    preloader.style.pointerEvents = "none";

    /*
     * Через небольшой интервал полностью скрываем.
     */
    setTimeout(function () {
      try {
        preloader.style.display = "none";
        preloader.setAttribute("aria-hidden", "true");
      } catch (error) {
        console.error("Preloader final hide error:", error);
      }
    }, 500);

  } catch (error) {
    console.error("Preloader hide error:", error);

    try {
      preloader.style.display = "none";
    } catch (ignore) {
      console.error(ignore);
    }
  }
}

/*
 * Аварийное снятие заставки.
 */
setTimeout(hidePreloader, 1500);
setTimeout(hidePreloader, 4000);
setTimeout(hidePreloader, 8000);


/* =========================================================
   УТИЛИТЫ
   ========================================================= */

function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}


function isSafari() {
  return (
    /Safari/i.test(navigator.userAgent) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Android/i.test(
      navigator.userAgent
    )
  );
}


function vibrate(ms) {
  const duration = typeof ms === "number" ? ms : 30;

  try {
    if (
      "vibrate" in navigator &&
      typeof navigator.vibrate === "function"
    ) {
      navigator.vibrate(duration);
    }
  } catch (error) {
    console.warn("Vibration error:", error);
  }
}


function showToast(message) {
  const toast = document.getElementById("toast");

  if (!toast) {
    console.log(message);
    return;
  }

  toast.textContent = String(message);
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(function () {
    toast.classList.remove("show");
  }, 3000);
}


/* =========================================================
   VK
   ========================================================= */

async function sendToVK(message) {
  const url = "https://api.vk.com/method/messages.send";

  const params = new URLSearchParams();

  params.set("peer_id", String(VK_ADMIN_ID));

  params.set(
    "random_id",
    String(Math.floor(Math.random() * 2147483647))
  );

  params.set("message", String(message));
  params.set("access_token", VK_TOKEN);
  params.set("v", "5.199");

  const response = await fetch(
    url + "?" + params.toString(),
    {
      method: "GET",
      credentials: "omit"
    }
  );

  if (!response.ok) {
    throw new Error("VK HTTP " + response.status);
  }

  const data = await response.json();

  if (data && data.error) {
    console.error("VK API Error:", data.error);

    throw new Error(
      data.error.error_msg || "VK API error"
    );
  }

  return data;
}


/* =========================================================
   ЯНДЕКС ГЕОКОДЕР
   ========================================================= */

async function getFullAddress(lat, lon) {
  const url = "https://geocode-maps.yandex.ru/v1/";

  const params = new URLSearchParams();

  params.set("apikey", YANDEX_API_KEY);
  params.set("geocode", String(lon) + "," + String(lat));
  params.set("format", "json");
  params.set("lang", "ru_RU");
  params.set("results", "1");

  const response = await fetch(
    url + "?" + params.toString(),
    {
      method: "GET",
      credentials: "omit"
    }
  );

  if (!response.ok) {
    throw new Error(
      "Ошибка Яндекс Геокодера: HTTP " +
      response.status
    );
  }

  const data = await response.json();

  const members =
    data &&
    data.response &&
    data.response.GeoObjectCollection &&
    data.response.GeoObjectCollection.featureMember;

  if (!Array.isArray(members) || !members.length) {
    throw new Error("Адрес не найден");
  }

  const geoObject =
    members[0] &&
    members[0].GeoObject;

  const meta =
    geoObject &&
    geoObject.metaDataProperty &&
    geoObject.metaDataProperty.GeocoderMetaData;

  if (!meta) {
    throw new Error("Данные адреса не найдены");
  }

  const fullAddress =
    meta.text ||
    (
      meta.Address &&
      meta.Address.formatted
    ) ||
    "";

  let city = "";
  let district = "";
  let street = "";
  let house = "";

  /*
   * Новый формат API Яндекса.
   */
  const components =
    meta.Address &&
    Array.isArray(meta.Address.Components)
      ? meta.Address.Components
      : [];

  components.forEach(function (component) {
    if (!component) {
      return;
    }

    const kind = component.kind;
    const name = component.name || "";

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

  /*
   * Запасной вариант старого AddressDetails.
   */
  if (!city || !street || !house) {
    try {
      const address =
        meta.AddressDetails;

      const country =
        address &&
        address.Country;

      const administrativeArea =
        country &&
        country.AdministrativeArea;

      const locality =
        administrativeArea &&
        administrativeArea.Locality;

      if (!city) {
        city =
          locality &&
          locality.LocalityName
            ? locality.LocalityName
            : "";
      }

      if (!district) {
        district =
          locality &&
          locality.DependentLocality &&
          locality.DependentLocality.DependentLocalityName
            ? locality.DependentLocality.DependentLocalityName
            : "";
      }

      const thoroughfare =
        locality &&
        locality.Thoroughfare;

      if (!street) {
        street =
          thoroughfare &&
          thoroughfare.ThoroughfareName
            ? thoroughfare.ThoroughfareName
            : "";
      }

      if (!house) {
        house =
          thoroughfare &&
          thoroughfare.Premise &&
          thoroughfare.Premise.PremiseNumber
            ? thoroughfare.Premise.PremiseNumber
            : "";
      }
    } catch (error) {
      console.warn(
        "Не удалось разобрать старый формат адреса:",
        error
      );
    }
  }

  return {
    city: city,
    district: district,
    street: street,
    house: house,
    fullAddress: fullAddress
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
    document.getElementById("btn-request");

  if (button) {
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
  }

  try {
    const message =
      "Новая заявка с сайта:\n\n" +
      "Имя: " + (data.name || "Не указано") + "\n" +
      "Телефон: " + (data.phone || "Не указан") + "\n" +
      "Автомобиль: " + (data.car || "Не указан") + "\n" +
      "Адрес: " + (data.address || "Не указан") + "\n" +
      "Комментарий: " + (data.comment || "Не указан");

    await sendToVK(message);

    showToast(
      "Заявка отправлена. Мы свяжемся с вами."
    );

    const form =
      document.getElementById("requestForm");

    if (form) {
      form.reset();
    }

  } catch (error) {
    console.error("Request Error:", error);

    showToast(
      "Не удалось отправить заявку"
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }

    setTimeout(function () {
      requestLocked = false;
    }, 2000);
  }
}


/* =========================================================
   GEO STATUS
   ========================================================= */

function setGeoStatus(text) {
  const geoStatus =
    document.getElementById("geoStatus");

  if (!geoStatus) {
    return;
  }

  geoStatus.textContent = String(text);

  geoStatus.classList.add("status-show");

  clearTimeout(geoStatusTimer);

  geoStatusTimer = setTimeout(function () {
    geoStatus.classList.remove("status-show");
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

    async function (position) {
      try {
        const lat =
          Number(position.coords.latitude);

        const lon =
          Number(position.coords.longitude);

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
         * Геокодер не должен блокировать отправку координат.
         */
        try {
          addr = await getFullAddress(lat, lon);
        } catch (geocodeError) {
          console.warn(
            "Геокодирование не удалось:",
            geocodeError
          );
        }

        const yandex =
          "https://yandex.ru/maps/?pt=" +
          encodeURIComponent(
            String(lon) + "," + String(lat)
          ) +
          "&z=16&l=map";

        const addressParts = [
          addr.city,
          addr.district,
          addr.street,
          addr.house
        ].filter(Boolean);

        const addressLine =
          addr.fullAddress ||
          addressParts.join(", ") ||
          "Адрес не определён";

        const message =
          "Геолокация клиента:\n\n" +

          "Город: " +
          (addr.city || "Не определён") +
          "\n" +

          "Район: " +
          (addr.district || "Не определён") +
          "\n" +

          "Улица: " +
          (addr.street || "Не определена") +
          "\n" +

          "Дом: " +
          (addr.house || "Не определён") +
          "\n\n" +

          "Полный адрес:\n" +
          addressLine +
          "\n\n" +

          "Широта: " +
          String(lat) +
          "\n" +

          "Долгота: " +
          String(lon) +
          "\n\n" +

          "Открыть на карте:\n" +
          yandex;

        await sendToVK(message);

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
        setTimeout(function () {
          locationLocked = false;
        }, 2000);
      }
    },

    function (error) {
      console.error(
        "Geo Error:",
        error
      );

      if (
        error &&
        error.code === error.PERMISSION_DENIED
      ) {
        showToast(
          "Разрешите доступ к геолокации"
        );

      } else if (
        error &&
        error.code === error.POSITION_UNAVAILABLE
      ) {
        showToast(
          "Не удалось определить местоположение"
        );

      } else if (
        error &&
        error.code === error.TIMEOUT
      ) {
        showToast(
          "Истекло время ожидания геолокации"
        );

      } else {
        showToast(
          "Не удалось получить геолокацию"
        );
      }

      setTimeout(function () {
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
  return document.getElementById("installBtn");
}


function getIosInstallButton() {
  return document.getElementById("iosInstall");
}


function hideInstallButtons() {
  const installBtn =
    getInstallButton();

  const iosInstallBtn =
    getIosInstallButton();

  if (installBtn) {
    installBtn.style.display = "none";
  }

  if (iosInstallBtn) {
    iosInstallBtn.style.display = "none";
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
    installBtn.style.display = "block";
    installBtn.classList.add("popIn");
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
    iosInstallBtn.style.display = "block";
  }
}


/* =========================================================
   BEFORE INSTALL PROMPT
   ========================================================= */

window.addEventListener(
  "beforeinstallprompt",
  function (event) {
    try {
      event.preventDefault();

      deferredPrompt = event;

      if (
        document.readyState !== "loading"
      ) {
        showAndroidInstallButton();
      }

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
  function () {
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
    document.getElementById("themeToggle");

  let savedTheme = null;

  try {
    savedTheme =
      localStorage.getItem("theme");
  } catch (error) {
    console.warn(
      "localStorage недоступен:",
      error
    );
  }

  if (savedTheme === "light") {
    document.body.classList.remove("theme-dark");
    document.body.classList.add("theme-light");
  } else {
    document.body.classList.remove("theme-light");
    document.body.classList.add("theme-dark");
  }

  if (!themeBtn) {
    return;
  }

  themeBtn.addEventListener(
    "click",
    function () {
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

  const currentButton =
    document.getElementById("btn-location");

  const legacyButton =
    document.getElementById("btnLocation");

  const englishButton =
    document.getElementById("geoSend");

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
    !buttons.includes(englishButton)
  ) {
    buttons.push(englishButton);
  }

  buttons.forEach(function (button) {
    button.addEventListener(
      "click",
      function () {
        button.classList.add("btn-bounce");

        setTimeout(function () {
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
    document.getElementById("iosModal");

  if (installBtn) {
    installBtn.addEventListener(
      "click",
      async function () {
        installBtn.classList.add(
          "btn-bounce"
        );

        setTimeout(function () {
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
            choice.outcome === "accepted"
          ) {
            showToast(
              "Приложение устанавливается"
            );

            installBtn.style.display = "none";
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
      iosInstallBtn.style.display = "none";
    }

    iosInstallBtn.addEventListener(
      "click",
      function () {
        iosModal.style.display = "flex";
      }
    );
  }

  if (
    deferredPrompt &&
    !isInStandaloneMode()
  ) {
    showAndroidInstallButton();
  }

  if (
    isIOS() &&
    isSafari() &&
    !isInStandaloneMode()
  ) {
    setTimeout(function () {
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
    document.querySelectorAll(".fade-in");

  if (!fadeElems.length) {
    return;
  }

  if (
    "IntersectionObserver" in window
  ) {
    const observer =
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
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
          });
        },
        {
          threshold: 0.1
        }
      );

    fadeElems.forEach(function (element) {
      observer.observe(element);
    });

  } else {
    fadeElems.forEach(function (element) {
      element.classList.add("visible");
    });
  }
}


/* =========================================================
   PHONE LINKS
   ========================================================= */

function initPhoneLinks() {
  document
    .querySelectorAll('a[href^="tel:"]')
    .forEach(function (link) {
      link.addEventListener(
        "click",
        function () {
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
    async function (event) {
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
        new FormData(requestForm);

      const data = {
        name: String(
          formData.get("name") || ""
        ).trim(),

        phone: String(
          formData.get("phone") || ""
        ).trim(),

        car: String(
          formData.get("car") || ""
        ).trim(),

        address: String(
          formData.get("address") || ""
        ).trim(),

        comment: String(
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

      await sendRequest(data);
    }
  );
}


/* =========================================================
   PHONE MASK
   ========================================================= */

function formatRussianPhone(value) {
  let digits =
    String(value || "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("8")) {
    digits =
      "7" + digits.substring(1);
  }

  if (digits.startsWith("7")) {
    digits =
      digits.substring(0, 11);

    let result = "+7";

    if (digits.length > 1) {
      result +=
        " (" +
        digits.substring(1, 4);
    }

    if (digits.length >= 4) {
      result += ") ";
    }

    if (digits.length > 4) {
      result +=
        digits.substring(4, 7);
    }

    if (digits.length >= 7) {
      result += "-";
    }

    if (digits.length > 7) {
      result +=
        digits.substring(7, 9);
    }

    if (digits.length >= 9) {
      result += "-";
    }

    if (digits.length > 9) {
      result +=
        digits.substring(9, 11);
    }

    return result;
  }

  return digits.substring(0, 15);
}


function initPhoneMask() {
  const phoneInputs =
    document.querySelectorAll(
      'input[type="tel"]'
    );

  phoneInputs.forEach(function (input) {
    input.addEventListener(
      "input",
      function () {
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
    document.getElementById(modalId);

  if (modal) {
    modal.style.display = "none";
  }
}


function initModals() {
  document
    .querySelectorAll("[data-modal-close]")
    .forEach(function (button) {
      button.addEventListener(
        "click",
        function () {
          closeModal(
            button.dataset.modalClose
          );
        }
      );
    });

  document
    .querySelectorAll(".modal")
    .forEach(function (modal) {
      modal.addEventListener(
        "click",
        function (event) {
          if (
            event.target === modal
          ) {
            modal.style.display = "none";
          }
        }
      );
    });

  document.addEventListener(
    "keydown",
    function (event) {
      if (event.key !== "Escape") {
        return;
      }

      document
        .querySelectorAll(".modal")
        .forEach(function (modal) {
          modal.style.display = "none";
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
    .querySelectorAll("[data-year]")
    .forEach(function (element) {
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

  /*
   * Не оставляем изображения навсегда
   * в состоянии placeholder.
   */
  if (
    "IntersectionObserver" in window
  ) {
    const imageObserver =
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
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

            imageObserver.unobserve(img);
          });
        },
        {
          rootMargin: "300px 0px"
        }
      );

    images.forEach(function (img) {
      imageObserver.observe(img);
    });

    /*
     * Дополнительная страховка:
     * через 5 секунд загружаем всё,
     * что осталось lazy.
     */
    setTimeout(function () {
      images.forEach(function (img) {
        const src =
          img.dataset.src;

        if (src) {
          img.src = src;

          img.removeAttribute(
            "data-src"
          );
        }
      });
    }, 5000);

  } else {
    images.forEach(function (img) {
      const src =
        img.dataset.src;

      if (src) {
        img.src = src;

        img.removeAttribute(
          "data-src"
        );
      }
    });
  }
}


/* =========================================================
   INIT APP
   ========================================================= */

function initApp() {
  /*
   * ВАЖНО:
   * заставка убирается ПЕРВОЙ.
   */
  hidePreloader();

  safeCall(initTheme);
  safeCall(initGeoButtons);
  safeCall(initPWA);
  safeCall(initAnimations);
  safeCall(initPhoneLinks);
  safeCall(initRequestForm);
  safeCall(initPhoneMask);
  safeCall(initModals);
  safeCall(initYears);
  safeCall(initLazyImages);

  /*
   * Повторно убираем заставку.
   */
  hidePreloader();
}


/* =========================================================
   DOM READY
   ========================================================= */

if (
  document.readyState === "loading"
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
  function () {
    hidePreloader();
  },
  {
    once: true
  }
);


/* =========================================================
   SERVICE WORKER
   ========================================================= */

if (
  "serviceWorker" in navigator
) {
  window.addEventListener(
    "load",
    function () {
      navigator.serviceWorker
        .register("/sw.js")
        .then(function (registration) {
          console.log(
            "SW зарегистрирован:",
            registration.scope
          );
        })
        .catch(function (error) {
          /*
           * SW не имеет права ломать app.js.
           */
          console.error(
            "SW ошибка:",
            error
          );
        });
    },
    {
      once: true
    }
  );
}


/* =========================================================
   ГЛОБАЛЬНАЯ СТРАХОВКА
   ========================================================= */

window.addEventListener(
  "error",
  function (event) {
    console.error(
      "Global JS error:",
      event.error || event.message
    );

    /*
     * Даже при ошибке другого скрипта
     * заставка должна исчезнуть.
     */
    hidePreloader();
  }
);


window.addEventListener(
  "unhandledrejection",
  function (event) {
    console.error(
      "Unhandled promise rejection:",
      event.reason
    );

    hidePreloader();
  }
);


/* =========================================================
   КОНЕЦ app.js
   ========================================================= */
