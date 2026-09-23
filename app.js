// ========================================
// ЭВАКУАТОР КРАСНОДАР 24/7
// Основной клиентский JS
// ========================================

(() => {
  "use strict";

  /* ======================================
     CONFIG
  ====================================== */

  const CONFIG = {
    phone: "+79888717018",
    whatsapp: "79888717018",

    // Серверный API.
    // Если endpoint существует — заявка отправляется туда.
    // Если его нет — используется WhatsApp.
    requestEndpoint: "/api/request",

    // Геокодирование должно выполняться на сервере,
    // чтобы Yandex API key никогда не попадал в браузер.
    geocodeEndpoint: "/api/geocode",

    serviceWorker: "/service-worker.js"
  };


  /* ======================================
     HELPERS
  ====================================== */

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];


  function showStatus(message, type = "info") {
    const status =
      $("#requestStatus") ||
      $("#formStatus") ||
      $(".request-status");

    if (!status) {
      return;
    }

    status.textContent = message;
    status.dataset.type = type;
    status.classList.add("visible");
  }


  function hideStatus() {
    const status =
      $("#requestStatus") ||
      $("#formStatus") ||
      $(".request-status");

    if (!status) {
      return;
    }

    status.textContent = "";
    status.dataset.type = "";
    status.classList.remove("visible");
  }


  function normalizePhone(value) {
    return String(value || "")
      .replace(/[^\d+]/g, "")
      .trim();
  }


  function isValidPhone(phone) {
    const digits = phone.replace(/\D/g, "");

    return digits.length >= 10 && digits.length <= 15;
  }


  function escapeText(value) {
    return String(value || "")
      .replace(/[<>]/g, "");
  }


  /* ======================================
     THEME
  ====================================== */

  function initTheme() {
    const themeButton = $("#themeToggle");

    if (!themeButton) {
      return;
    }

    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "light") {
      document.body.classList.add("light-theme");
    }

    if (savedTheme === "dark") {
      document.body.classList.remove("light-theme");
    }

    themeButton.addEventListener("click", () => {
      const isLight =
        document.body.classList.toggle("light-theme");

      localStorage.setItem(
        "theme",
        isLight ? "light" : "dark"
      );
    });
  }


  /* ======================================
     PWA INSTALL
  ====================================== */

  let deferredInstallPrompt = null;

  function initInstallPrompt() {
    const installButton = $("#installBtn");

    if (!installButton) {
      return;
    }

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();

      deferredInstallPrompt = event;

      installButton.style.display = "inline-flex";
    });

    installButton.addEventListener("click", async () => {
      if (!deferredInstallPrompt) {
        return;
      }

      deferredInstallPrompt.prompt();

      try {
        await deferredInstallPrompt.userChoice;
      } catch (error) {
        console.warn(
          "[PWA] Ошибка установки:",
          error
        );
      }

      deferredInstallPrompt = null;
      installButton.style.display = "none";
    });

    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      installButton.style.display = "none";
    });
  }


  /* ======================================
     IOS INSTALL
  ====================================== */

  function initIOSInstall() {
    const iosButton = $("#iosInstall");

    if (!iosButton) {
      return;
    }

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !window.MSStream;

    const isStandalone =
      window.navigator.standalone === true;

    if (isIOS && !isStandalone) {
      iosButton.style.display = "inline-flex";
    }

    iosButton.addEventListener("click", () => {
      showIOSInstructions();
    });
  }


  function showIOSInstructions() {
    const message =
      "Чтобы установить приложение на iPhone:\n\n" +
      "1. Нажмите «Поделиться» в Safari.\n" +
      "2. Выберите «На экран Домой».\n" +
      "3. Нажмите «Добавить».";

    alert(message);
  }


  /* ======================================
     WHATSAPP FALLBACK
  ====================================== */

  function openWhatsApp(message) {
    const encodedMessage =
      encodeURIComponent(message);

    const url =
      `https://wa.me/${CONFIG.whatsapp}?text=${encodedMessage}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }


  /* ======================================
     SERVER REQUEST
  ====================================== */

  async function sendToServer(payload) {
    const response = await fetch(
      CONFIG.requestEndpoint,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },

        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    return data;
  }


  /* ======================================
     REQUEST MESSAGE
  ====================================== */

  function buildRequestMessage({
    name,
    phone,
    address,
    comment
  }) {
    return [
      "🚨 Заявка на эвакуатор",
      "",
      `Имя: ${name}`,
      `Телефон: ${phone}`,
      `Адрес: ${address}`,
      comment
        ? `Комментарий: ${comment}`
        : "",
      "",
      "Источник: evakuator-krd.online"
    ]
      .filter(Boolean)
      .join("\n");
  }


  /* ======================================
     SEND REQUEST
  ====================================== */

  async function sendRequest(form) {
    const nameInput =
      $("#name", form) ||
      $('input[name="name"]', form);

    const phoneInput =
      $("#phone", form) ||
      $('input[name="phone"]', form);

    const addressInput =
      $("#address", form) ||
      $('input[name="address"]', form) ||
      $('textarea[name="address"]', form);

    const commentInput =
      $("#comment", form) ||
      $('textarea[name="comment"]', form);

    const name =
      escapeText(nameInput?.value.trim());

    const phone =
      normalizePhone(phoneInput?.value);

    const address =
      escapeText(addressInput?.value.trim());

    const comment =
      escapeText(commentInput?.value.trim());

    hideStatus();

    if (!name) {
      showStatus(
        "Введите ваше имя.",
        "error"
      );

      nameInput?.focus();

      return;
    }

    if (!isValidPhone(phone)) {
      showStatus(
        "Введите корректный номер телефона.",
        "error"
      );

      phoneInput?.focus();

      return;
    }

    if (!address) {
      showStatus(
        "Укажите адрес или место нахождения автомобиля.",
        "error"
      );

      addressInput?.focus();

      return;
    }

    const message =
      buildRequestMessage({
        name,
        phone,
        address,
        comment
      });

    const payload = {
      name,
      phone,
      address,
      comment,
      source: "evakuator-krd.online",
      createdAt: new Date().toISOString()
    };

    const submitButton =
      $('button[type="submit"]', form);

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.dataset.originalText =
        submitButton.textContent;

      submitButton.textContent =
        "Отправка...";
    }

    try {
      /*
       * Сначала пытаемся отправить через сервер.
       */
      await sendToServer(payload);

      showStatus(
        "Заявка успешно отправлена. Мы свяжемся с вами.",
        "success"
      );

      form.reset();

    } catch (error) {
      /*
       * Если backend пока не установлен,
       * не показываем ложное сообщение
       * «заявка отправлена».
       *
       * Открываем WhatsApp с уже подготовленной
       * заявкой.
       */
      console.warn(
        "[REQUEST] Серверная отправка недоступна:",
        error
      );

      showStatus(
        "Открываем WhatsApp для отправки заявки.",
        "info"
      );

      openWhatsApp(message);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;

        submitButton.textContent =
          submitButton.dataset.originalText ||
          "Оставить заявку";
      }
    }
  }


  /* ======================================
     FORM
  ====================================== */

  function initRequestForm() {
    const forms = $$("#requestForm");

    forms.forEach((form) => {
      form.addEventListener(
        "submit",
        async (event) => {
          event.preventDefault();

          await sendRequest(form);
        }
      );
    });
  }


  /* ======================================
     PHONE BUTTONS
  ====================================== */

  function initPhoneButtons() {
    $$(
      '[data-action="call"], .btn-call'
    ).forEach((button) => {
      button.addEventListener("click", () => {
        window.location.href =
          `tel:${CONFIG.phone}`;
      });
    });
  }


  /* ======================================
     GEOLOCATION
  ====================================== */

  function getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(
          new Error(
            "Геолокация не поддерживается браузером."
          )
        );

        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
    });
  }


  async function reverseGeocode(lat, lon) {
    /*
     * API key Yandex здесь специально отсутствует.
     *
     * Сервер должен получить:
     * latitude / longitude
     * и уже на сервере обратиться к Yandex.
     */

    const response = await fetch(
      CONFIG.geocodeEndpoint,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },

        body: JSON.stringify({
          latitude: lat,
          longitude: lon
        })
      }
    );

    if (!response.ok) {
      throw new Error(
        `Geocode HTTP ${response.status}`
      );
    }

    const data = await response.json();

    return data.address || "";
  }


  /* ======================================
     SEND LOCATION
  ====================================== */

  async function sendLocation() {
    const button =
      $("#btn-location") ||
      $("#geoSend") ||
      $('[data-action="location"]');

    if (button) {
      button.disabled = true;
    }

    showStatus(
      "Определяем ваше местоположение...",
      "info"
    );

    try {
      const position =
        await getCurrentPosition();

      const latitude =
        position.coords.latitude;

      const longitude =
        position.coords.longitude;

      let address = "";

      try {
        address =
          await reverseGeocode(
            latitude,
            longitude
          );
      } catch (error) {
        console.warn(
          "[GEO] Геокодирование недоступно:",
          error
        );
      }

      const message = [
        "📍 Нужен эвакуатор",
        "",
        address
          ? `Адрес: ${address}`
          : "Адрес: определить не удалось",
        `Координаты: ${latitude}, ${longitude}`,
        "",
        "Источник: evakuator-krd.online"
      ].join("\n");

      /*
       * Открываем WhatsApp с координатами.
       * Это не требует API-ключа в браузере.
       */
      openWhatsApp(message);

      showStatus(
        "Открываем WhatsApp с вашей геопозицией.",
        "success"
      );

    } catch (error) {
      console.error(
        "[GEO]",
        error
      );

      showStatus(
        "Не удалось определить местоположение. Проверьте разрешение геолокации.",
        "error"
      );
    } finally {
      if (button) {
        button.disabled = false;
      }
    }
  }


  function initGeolocation() {
    const buttons = $$(
      "#btn-location, #geoSend, [data-action='location']"
    );

    buttons.forEach((button) => {
      button.addEventListener(
        "click",
        sendLocation
      );
    });
  }


  /* ======================================
     SMOOTH INTERNAL LINKS
  ====================================== */

  function initPageLinks() {
    $$("a").forEach((link) => {
      const href =
        link.getAttribute("href");

      if (!href) {
        return;
      }

      /*
       * Не трогаем:
       * tel:
       * mailto:
       * javascript:
       * внешние ссылки
       * якоря
       * target="_blank"
       */
      if (
        href.startsWith("tel:") ||
        href.startsWith("mailto:") ||
        href.startsWith("javascript:") ||
        href.startsWith("#") ||
        link.target === "_blank"
      ) {
        return;
      }

      let url;

      try {
        url =
          new URL(
            href,
            window.location.href
          );
      } catch {
        return;
      }

      if (
        url.origin !==
        window.location.origin
      ) {
        return;
      }

      link.addEventListener(
        "click",
        (event) => {
          if (
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.altKey
          ) {
            return;
          }

          if (
            link.hasAttribute("download")
          ) {
            return;
          }

          event.preventDefault();

          document.body.classList.add(
            "page-leaving"
          );

          setTimeout(() => {
            window.location.href =
              url.href;
          }, 120);
        }
      );
    });
  }


  /* ======================================
     FADE-IN
  ====================================== */

  function initAnimations() {
    const elements =
      $$(".fade-in");

    if (!elements.length) {
      return;
    }

    if (
      !("IntersectionObserver" in window)
    ) {
      elements.forEach((element) => {
        element.classList.add(
          "fade-visible"
        );
      });

      return;
    }

    const observer =
      new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }

            entry.target.classList.add(
              "fade-visible"
            );

            obs.unobserve(
              entry.target
            );
          });
        },
        {
          threshold: 0.08
        }
      );

    elements.forEach((element) => {
      observer.observe(element);
    });
  }


  /* ======================================
     PRELOADER
  ====================================== */

  function hidePreloader() {
    const preloader =
      $("#preloader");

    if (!preloader) {
      return;
    }

    preloader.classList.add(
      "preloader-hidden"
    );

    setTimeout(() => {
      preloader.remove();
    }, 500);
  }


  /* ======================================
     SERVICE WORKER
  ====================================== */

  function registerServiceWorker() {
    if (
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    window.addEventListener(
      "load",
      async () => {
        try {
          const registration =
            await navigator.serviceWorker.register(
              CONFIG.serviceWorker,
              {
                scope: "/"
              }
            );

          console.log(
            "[SW] Зарегистрирован:",
            registration.scope
          );

        } catch (error) {
          console.error(
            "[SW] Ошибка регистрации:",
            error
          );
        }
      }
    );
  }


  /* ======================================
     DOM READY
  ====================================== */

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      initTheme();
      initInstallPrompt();
      initIOSInstall();

      initRequestForm();
      initPhoneButtons();
      initGeolocation();

      initPageLinks();
      initAnimations();

      registerServiceWorker();
    }
  );


  /* ======================================
     PAGE LOAD
  ====================================== */

  window.addEventListener(
    "load",
    () => {
      setTimeout(
        hidePreloader,
        150
      );
    }
  );

})();
