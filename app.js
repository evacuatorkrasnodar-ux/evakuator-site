// === КОНФИГ VK ===
const VK_ADMIN_ID = 200004082404;
const VK_TOKEN = "vk1.a.9dwswawH0x7rHsySyBHSlgoSYRDWZYlQOFYxjzJdw1w0mnne3dZCgLvVLxgmqUVUO1y3Oh38PKeBzWpryi6lugUqaGoFUlKk8R96DfmbB1mTSb1c9dITbynZRzM7ort5KTV54fzYsrFETPtw4QH4sCFdZEZZZo8YZT4bjnkm18RAWOKWfdq94HD_jFhy9bJc-M2Z0oxrUD6PoToUTngq2Nn7SdlwK0zzGW_1ecE7nYc";

// === Яндекс Геокодер ===
const YANDEX_API_KEY = "fc0f9182-0eee-4e83-bed3-8e561c88c4d5";

// === УТИЛИТЫ ===

function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isSafari() {
  const ua = navigator.userAgent;
  const safari = /^((?!chrome|android).)*safari/i.test(ua);

  return safari && isIOS();
}

function vibrate(ms = 30) {
  if (navigator.vibrate) {
    navigator.vibrate(ms);
  }
}

function sanitize(text) {
  return String(text ?? "").replace(/[<>]/g, "");
}

function showToast(text) {
  const toast = document.getElementById("toast");

  if (!toast) return;

  toast.textContent = text;
  toast.classList.add("toast-show");

  setTimeout(() => {
    toast.classList.remove("toast-show");
  }, 3000);
}

function openModal(title, text) {
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalText = document.getElementById("modalText");

  if (!modal || !modalTitle || !modalText) return;

  modalTitle.textContent = title;
  modalText.textContent = text;
  modal.style.display = "flex";
}

function closeModal() {
  const modal = document.getElementById("modal");

  if (modal) {
    modal.style.display = "none";
  }
}

window.closeModal = closeModal;

// === ОТПРАВКА В VK ===
//
// VK API вызывается непосредственно из браузера.
// Из-за CORS браузер не позволяет читать ответ VK.
// Поэтому используется no-cors:
// запрос отправляется, но его ответ недоступен JavaScript.
//
// Для полноценной проверки ответа VK в будущем нужен
// серверный endpoint. Текущий токен при этом не изменяется.

async function sendToVK(message) {
  const safeMessage = sanitize(message);

  const params = new URLSearchParams({
    user_id: String(VK_ADMIN_ID),
    message: safeMessage,
    random_id: String(Date.now()),
    access_token: VK_TOKEN,
    v: "5.199"
  });

  const url =
    `https://api.vk.com/method/messages.send?${params.toString()}`;

  try {
    await fetch(url, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      credentials: "omit"
    });

    console.log("Запрос на отправку в VK передан браузеру.");

    showToast("Сообщение отправлено в VK");

    return true;

  } catch (err) {
    console.error("VK Fetch Error:", err);

    showToast("Ошибка соединения с VK");

    return false;
  }
}

// === ЯНДЕКС ГЕОКОДЕР ===

async function getFullAddress(lat, lon) {
  const url =
    `https://geocode-maps.yandex.ru/1.x/?format=json` +
    `&apikey=${encodeURIComponent(YANDEX_API_KEY)}` +
    `&geocode=${encodeURIComponent(`${lon},${lat}`)}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store"
    });

    if (!res.ok) {
      throw new Error(`Yandex HTTP ${res.status}`);
    }

    const data = await res.json();

    const member =
      data?.response?.GeoObjectCollection?.featureMember?.[0];

    const geo = member?.GeoObject;

    if (!geo) {
      throw new Error("Адрес не найден в ответе геокодера");
    }

    const meta =
      geo?.metaDataProperty?.GeocoderMetaData;

    const fullAddress =
      meta?.text || "Адрес не найден";

    const components =
      Array.isArray(meta?.Address?.Components)
        ? meta.Address.Components
        : [];

    let city = "";
    let district = "";
    let street = "";
    let house = "";

    components.forEach(component => {
      if (component.kind === "locality") {
        city = component.name;
      }

      if (component.kind === "district") {
        district = component.name;
      }

      if (component.kind === "street") {
        street = component.name;
      }

      if (component.kind === "house") {
        house = component.name;
      }
    });

    return {
      city,
      district,
      street,
      house,
      fullAddress
    };

  } catch (err) {
    console.error("Geo API Error:", err);

    return {
      city: "",
      district: "",
      street: "",
      house: "",
      fullAddress: "Адрес не найден"
    };
  }
}

// === ОТПРАВКА ЗАЯВКИ ===

let requestLocked = false;

async function sendRequest() {
  if (requestLocked) {
    return;
  }

  const name =
    sanitize(document.getElementById("name")?.value || "");

  const phone =
    sanitize(document.getElementById("phone")?.value || "");

  const address =
    sanitize(document.getElementById("address")?.value || "");

  const comment =
    sanitize(document.getElementById("comment")?.value || "");

  if (!phone.trim()) {
    showToast("Введите телефон");
    return;
  }

  requestLocked = true;

  const message =
`Новая заявка:
Имя: ${name}
Телефон: ${phone}
Адрес: ${address}
Комментарий: ${comment}`;

  try {
    await sendToVK(message);

    vibrate(40);

    const status =
      document.getElementById("requestStatus");

    if (status) {
      status.textContent = "Заявка отправлена!";
      status.classList.add("status-show");

      setTimeout(() => {
        status.classList.remove("status-show");
      }, 3000);
    }

    showToast(
      "Заявка отправлена! Мы свяжемся с вами."
    );

  } finally {
    setTimeout(() => {
      requestLocked = false;
    }, 2000);
  }
}

// === ОТПРАВКА ГЕОЛОКАЦИИ ===

let locationLocked = false;

function setGeoStatus(text) {
  const geoStatus =
    document.getElementById("geoStatus");

  if (!geoStatus) return;

  geoStatus.textContent = text;
  geoStatus.classList.add("status-show");

  setTimeout(() => {
    geoStatus.classList.remove("status-show");
  }, 3000);
}

async function sendLocation() {
  if (locationLocked) {
    return;
  }

  if (!navigator.geolocation) {
    showToast("Геолокация не поддерживается");
    return;
  }

  locationLocked = true;

  navigator.geolocation.getCurrentPosition(
    async pos => {
      try {
        const lat = Number(pos.coords.latitude);
        const lon = Number(pos.coords.longitude);

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          throw new Error("Некорректные координаты");
        }

        const addr =
          await getFullAddress(lat, lon);

        const yandex =
          `https://yandex.ru/maps/?pt=${encodeURIComponent(`${lon},${lat}`)}&z=16&l=map`;

        const message =
`Геолокация клиента:
Город: ${addr.city}
Район: ${addr.district}
Улица: ${addr.street} ${addr.house}
Полный адрес: ${addr.fullAddress}

Широта: ${lat}
Долгота: ${lon}

Открыть в Яндекс.Навигаторе:
${yandex}`;

        await sendToVK(message);

        vibrate(40);

        setGeoStatus(
          "Геолокация отправлена!"
        );

        showToast(
          "Геолокация отправлена! Открой сообщение в VK."
        );

      } catch (err) {
        console.error(
          "Location processing Error:",
          err
        );

        showToast(
          "Не удалось обработать геолокацию"
        );

      } finally {
        setTimeout(() => {
          locationLocked = false;
        }, 2000);
      }
    },

    err => {
      console.error("Geo Error:", err);

      switch (err.code) {
        case err.PERMISSION_DENIED:
          showToast(
            "Разрешите доступ к геолокации"
          );
          break;

        case err.POSITION_UNAVAILABLE:
          showToast(
            "Не удалось определить местоположение"
          );
          break;

        case err.TIMEOUT:
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

// === PWA УСТАНОВКА ===

let deferredPrompt = null;

window.addEventListener(
  "beforeinstallprompt",
  e => {
    e.preventDefault();

    deferredPrompt = e;

    const installBtn =
      document.getElementById("installBtn");

    const iosInstallBtn =
      document.getElementById("iosInstall");

    if (installBtn) {
      installBtn.style.display = "block";
      installBtn.classList.add("popIn");
    }

    if (
      iosInstallBtn &&
      isIOS() &&
      !isInStandaloneMode()
    ) {
      iosInstallBtn.style.display = "block";
    }

    console.log(
      "beforeinstallprompt пойман"
    );
  }
);

window.addEventListener(
  "appinstalled",
  () => {
    deferredPrompt = null;

    const installBtn =
      document.getElementById("installBtn");

    if (installBtn) {
      installBtn.style.display = "none";
    }

    showToast("Приложение установлено");

    console.log("PWA установлено");
  }
);

function isInStandaloneMode() {
  return (
    window.matchMedia(
      "(display-mode: standalone)"
    ).matches ||
    window.navigator.standalone === true
  );
}

// === DOM READY ===

document.addEventListener(
  "DOMContentLoaded",
  () => {

    // ТЕМА

    const themeBtn =
      document.getElementById("themeToggle");

    const savedTheme =
      localStorage.getItem("theme");

    if (savedTheme === "light") {
      document.body.classList.remove(
        "theme-dark"
      );

      document.body.classList.add(
        "theme-light"
      );

    } else if (savedTheme === "dark") {
      document.body.classList.remove(
        "theme-light"
      );

      document.body.classList.add(
        "theme-dark"
      );
    }

    themeBtn?.addEventListener(
      "click",
      () => {

        themeBtn.classList.add(
          "btn-bounce"
        );

        setTimeout(() => {
          themeBtn.classList.remove(
            "btn-bounce"
          );
        }, 250);

        const dark =
          document.body.classList.contains(
            "theme-dark"
          );

        if (dark) {

          document.body.classList.remove(
            "theme-dark"
          );

          document.body.classList.add(
            "theme-light"
          );

          localStorage.setItem(
            "theme",
            "light"
          );

        } else {

          document.body.classList.remove(
            "theme-light"
          );

          document.body.classList.add(
            "theme-dark"
          );

          localStorage.setItem(
            "theme",
            "dark"
          );
        }
      }
    );

    // ЗАЯВКА

    const btnRequest =
      document.getElementById(
        "btn-request"
      );

    btnRequest?.addEventListener(
      "click",
      () => {

        btnRequest.classList.add(
          "btn-bounce"
        );

        setTimeout(() => {
          btnRequest.classList.remove(
            "btn-bounce"
          );
        }, 250);

        sendRequest();
      }
    );

    const form =
      document.getElementById(
        "requestForm"
      );

    form?.addEventListener(
      "submit",
      e => {
        e.preventDefault();
        sendRequest();
      }
    );

    // ГЕОЛОКАЦИЯ — RU

    const btnLocation =
      document.getElementById(
        "btn-location"
      );

    btnLocation?.addEventListener(
      "click",
      () => {

        btnLocation.classList.add(
          "btn-bounce"
        );

        setTimeout(() => {
          btnLocation.classList.remove(
            "btn-bounce"
          );
        }, 250);

        sendLocation();
      }
    );

    // ГЕОЛОКАЦИЯ — EN

    const geoSendBtn =
      document.getElementById(
        "geoSend"
      );

    geoSendBtn?.addEventListener(
      "click",
      () => {

        geoSendBtn.classList.add(
          "btn-bounce"
        );

        setTimeout(() => {
          geoSendBtn.classList.remove(
            "btn-bounce"
          );
        }, 250);

        sendLocation();
      }
    );

    // УСТАНОВКА PWA — ANDROID

    const installBtn =
      document.getElementById(
        "installBtn"
      );

    installBtn?.addEventListener(
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
            "Установка недоступна. Попробуйте позже."
          );

          return;
        }

        try {

          deferredPrompt.prompt();

          const choice =
            await deferredPrompt.userChoice;

          console.log(
            "User choice:",
            choice
          );

          if (
            choice.outcome ===
            "accepted"
          ) {
            showToast(
              "Приложение устанавливается"
            );

          } else {
            showToast(
              "Установка отменена"
            );
          }

        } catch (err) {

          console.error(
            "PWA install error:",
            err
          );

          showToast(
            "Не удалось запустить установку"
          );

        } finally {

          deferredPrompt = null;

          installBtn.style.display =
            "none";
        }
      }
    );

    // iOS КНОПКА УСТАНОВКИ

    const iosInstallBtn =
      document.getElementById(
        "iosInstall"
      );

    const iosModal =
      document.getElementById(
        "iosModal"
      );

    if (
      iosInstallBtn &&
      iosModal
    ) {

      if (
        isIOS() &&
        !isInStandaloneMode()
      ) {
        iosInstallBtn.style.display =
          "block";
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

    // iOS ПОДСКАЗКА

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

    // АНИМАЦИИ ПРИ СКРОЛЛЕ

    const fadeElems =
      document.querySelectorAll(
        ".fade-in"
      );

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
                    "fade-visible"
                  );

                  observer.unobserve(
                    entry.target
                  );
                }
              }
            );
          },
          {
            threshold: 0.15
          }
        );

      fadeElems.forEach(
        el => observer.observe(el)
      );

    } else {

      fadeElems.forEach(
        el =>
          el.classList.add(
            "fade-visible"
          )
      );
    }

    // ПЛАВНЫЕ ПЕРЕХОДЫ

    const links =
      document.querySelectorAll(
        "a[href]"
      );

    links.forEach(
      link => {

        const href =
          link.getAttribute(
            "href"
          );

        if (
          !href ||
          href.startsWith("#") ||
          href.startsWith("tel:") ||
          href.startsWith("mailto:") ||
          href.startsWith("https://") ||
          href.startsWith("http://") ||
          href.startsWith("javascript:")
        ) {
          return;
        }

        link.addEventListener(
          "click",
          e => {

            if (
              e.defaultPrevented ||
              e.button !== 0 ||
              e.metaKey ||
              e.ctrlKey ||
              e.shiftKey ||
              e.altKey ||
              link.target === "_blank" ||
              link.hasAttribute(
                "download"
              )
            ) {
              return;
            }

            e.preventDefault();

            document.body.classList.add(
              "page-fade-out"
            );

            setTimeout(() => {
              window.location.href =
                href;
            }, 200);
          }
        );
      }
    );

  }
);

// === СКРЫТИЕ ПРЕЛОАДЕРА ===

window.addEventListener(
  "load",
  () => {

    const preloader =
      document.getElementById(
        "preloader"
      );

    if (!preloader) return;

    preloader.classList.add(
      "hidden"
    );
  }
);

// === SERVICE WORKER ===

if (
  "serviceWorker" in navigator
) {

  window.addEventListener(
    "load",
    () => {

      navigator.serviceWorker
        .register("/sw.js")
        .then(reg => {

          console.log(
            "SW зарегистрирован:",
            reg.scope
          );

        })
        .catch(err => {

          console.error(
            "SW ошибка:",
            err
          );

        });
    }
  );
}
