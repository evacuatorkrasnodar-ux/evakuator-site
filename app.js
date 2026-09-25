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
  return (
    /Safari/i.test(navigator.userAgent) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Android/i.test(
      navigator.userAgent
    )
  );
}

function vibrate(ms = 30) {
  if ("vibrate" in navigator) {
    navigator.vibrate(ms);
  }
}

function showToast(message) {
  const toast =
    document.getElementById("toast");

  if (!toast) {
    console.log(message);
    return;
  }

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(
    window.__toastTimer
  );

  window.__toastTimer =
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
}


// === ОТПРАВКА В VK ===

async function sendToVK(message) {
  try {
    const url =
      "https://api.vk.com/method/messages.send";

    const params =
      new URLSearchParams({
        peer_id: VK_ADMIN_ID,
        random_id:
          Math.floor(
            Math.random() * 2147483647
          ),
        message,
        access_token: VK_TOKEN,
        v: "5.199"
      });

    const response =
      await fetch(
        `${url}?${params.toString()}`
      );

    const data =
      await response.json();

    if (data.error) {
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

  } catch (err) {

    console.error(
      "sendToVK Error:",
      err
    );

    throw err;
  }
}


// === ЯНДЕКС ГЕОКОДЕР ===

async function getFullAddress(
  lat,
  lon
) {
  const url =
    "https://geocode-maps.yandex.ru/1.x/";

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
      `${url}?${params.toString()}`
    );

  if (!response.ok) {
    throw new Error(
      "Ошибка Яндекс Геокодера"
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
    members[0].GeoObject;

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

    city =
      administrativeArea
        ?.Locality
        ?.LocalityName || "";

    district =
      administrativeArea
        ?.Locality
        ?.DependentLocality
        ?.DependentLocalityName || "";

    street =
      administrativeArea
        ?.Locality
        ?.Thoroughfare
        ?.ThoroughfareName || "";

    house =
      administrativeArea
        ?.Locality
        ?.Thoroughfare
        ?.Premise
        ?.PremiseNumber || "";
  } catch (err) {
    console.warn(
      "Не удалось разобрать AddressDetails:",
      err
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


// === ОТПРАВКА ЗАЯВКИ ===

let requestLocked = false;

async function sendRequest(
  data
) {
  if (requestLocked) {
    return;
  }

  requestLocked = true;

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

  } catch (err) {

    console.error(
      "Request Error:",
      err
    );

    showToast(
      "Не удалось отправить заявку"
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
    document.getElementById(
      "geoStatus"
    );

  if (!geoStatus) {
    return;
  }

  geoStatus.textContent =
    text;

  geoStatus.classList.add(
    "status-show"
  );

  setTimeout(() => {
    geoStatus.classList.remove(
      "status-show"
    );
  }, 3000);
}


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

  locationLocked = true;

  navigator.geolocation.getCurrentPosition(

    async pos => {

      try {

        const lat =
          Number(
            pos.coords.latitude
          );

        const lon =
          Number(
            pos.coords.longitude
          );

        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lon)
        ) {
          throw new Error(
            "Некорректные координаты"
          );
        }

        const addr =
          await getFullAddress(
            lat,
            lon
          );

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

        await sendToVK(
          message
        );

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

      console.error(
        "Geo Error:",
        err
      );

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


window.addEventListener(
  "beforeinstallprompt",
  e => {

    e.preventDefault();

    deferredPrompt = e;

    showAndroidInstallButton();

    console.log(
      "beforeinstallprompt пойман"
    );
  }
);


window.addEventListener(
  "appinstalled",
  () => {

    deferredPrompt = null;

    hideInstallButtons();

    showToast(
      "Приложение установлено"
    );

    console.log(
      "PWA установлено"
    );
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

    // === ТЕМА ===

    const themeBtn =
      document.getElementById(
        "themeToggle"
      );

    const savedTheme =
      localStorage.getItem(
        "theme"
      );

    if (
      savedTheme === "light"
    ) {

      document.body.classList.remove(
        "theme-dark"
      );

      document.body.classList.add(
        "theme-light"
      );

    } else if (
      savedTheme === "dark"
    ) {

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

          localStorage.setItem(
            "theme",
            "dark"
          );

        } else {

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
        }

        vibrate(20);
      }
    );


    // === ГЕОЛОКАЦИЯ ===

    const btnLocation =
      document.getElementById(
        "btnLocation"
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


    // === ГЕОЛОКАЦИЯ — EN ===

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


    // === УСТАНОВКА PWA — ANDROID ===

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
            "Откройте меню браузера и выберите «Установить приложение»."
          );

          return;
        }


        let choice = null;

        try {

          deferredPrompt.prompt();

          choice =
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

          if (
            choice &&
            choice.outcome ===
            "accepted"
          ) {

            installBtn.style.display =
              "none";
          }
        }
      }
    );


    // === iOS КНОПКА УСТАНОВКИ ===

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


    // Если beforeinstallprompt
    // уже был получен до DOMContentLoaded

    if (
      deferredPrompt &&
      !isInStandaloneMode()
    ) {

      showAndroidInstallButton();
    }


    // === iOS ПОДСКАЗКА ===

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


    // === АНИМАЦИИ ПРИ СКРОЛЛЕ ===

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
        el => {
          observer.observe(el);
        }
      );

    } else {

      fadeElems.forEach(
        el => {
          el.classList.add(
            "visible"
          );
        }
      );
    }


    // === КНОПКА ЗВОНКА ===

    document
      .querySelectorAll(
        'a[href^="tel:"]'
      )
      .forEach(btn => {

        btn.addEventListener(
          "click",
          () => {
            vibrate(30);
          }
        );
      });


    // === КНОПКИ ФОРМ ===

    const requestForm =
      document.getElementById(
        "requestForm"
      );

    if (requestForm) {

      requestForm.addEventListener(
        "submit",
        async event => {

          event.preventDefault();

          const formData =
            new FormData(
              requestForm
            );

          const data = {
            name:
              formData.get("name") ||
              "",
            phone:
              formData.get("phone") ||
              "",
            car:
              formData.get("car") ||
              "",
            address:
              formData.get("address") ||
              "",
            comment:
              formData.get("comment") ||
              ""
          };

          await sendRequest(
            data
          );
        }
      );
    }


    // === МАСКА ТЕЛЕФОНА ===

    const phoneInputs =
      document.querySelectorAll(
        'input[type="tel"]'
      );

    phoneInputs.forEach(
      input => {

        input.addEventListener(
          "input",
          () => {

            let value =
              input.value.replace(
                /\D/g,
                ""
              );

            if (
              value.startsWith("8")
            ) {
              value =
                "7" +
                value.substring(1);
            }

            if (
              value.startsWith("7")
            ) {

              let result =
                "+7";

              if (
                value.length > 1
              ) {
                result +=
                  " (" +
                  value.substring(
                    1,
                    4
                  );
              }

              if (
                value.length >= 4
              ) {
                result += ") ";
              }

              if (
                value.length > 4
              ) {
                result +=
                  value.substring(
                    4,
                    7
                  );
              }

              if (
                value.length >= 7
              ) {
                result += "-";
              }

              if (
                value.length > 7
              ) {
                result +=
                  value.substring(
                    7,
                    9
                  );
              }

              if (
                value.length >= 9
              ) {
                result += "-";
              }

              if (
                value.length > 9
              ) {
                result +=
                  value.substring(
                    9,
                    11
                  );
              }

              input.value =
                result;

            } else {

              input.value =
                value;
            }
          }
        );
      }
    );


    // === ЗАКРЫТИЕ МОДАЛЬНЫХ ОКОН ===

    document
      .querySelectorAll(
        "[data-modal-close]"
      )
      .forEach(btn => {

        btn.addEventListener(
          "click",
          () => {

            const modalId =
              btn.dataset.modalClose;

            const modal =
              document.getElementById(
                modalId
              );

            if (modal) {
              modal.style.display =
                "none";
            }
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


    // === ESC ДЛЯ МОДАЛЬНЫХ ОКОН ===

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


    // === АВТОФОКУС ===

    const firstInput =
      document.querySelector(
        "input, textarea, select"
      );

    if (
      firstInput &&
      window.innerWidth > 700
    ) {

      // Намеренно не ставим
      // автоматический focus,
      // чтобы не открывать клавиатуру.
    }


    // === ГОД ===

    document
      .querySelectorAll(
        "[data-year]"
      )
      .forEach(el => {

        el.textContent =
          new Date().getFullYear();
      });


    // === ПРЕДЗАГРУЗКА ИЗОБРАЖЕНИЙ ===

    const images =
      document.querySelectorAll(
        "img[data-src]"
      );

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
          }
        }
      );
    }

  }
);


// === ПРЕЛОАДЕР ===

window.addEventListener(
  "load",
  () => {

    const preloader =
      document.getElementById(
        "preloader"
      );

    if (!preloader) {
      return;
    }

    preloader.classList.add(
      "hidden"
    );
  }
);


// === SERVICE WORKER ===

if (
  "serviceWorker" in
  navigator
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
