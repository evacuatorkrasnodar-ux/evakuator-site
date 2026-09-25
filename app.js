// ============================================================
// ЭВАКУАТОР КРАСНОДАР 24/7 — APP.JS
// ============================================================


// ============================================================
// КОНФИГ VK
// ============================================================

const VK_ADMIN_ID = 200004082404;

const VK_TOKEN =
  "vk1.a.9dwswawH0x7rHsySyBHSlgoSYRDWZYlQOFYxjZDw1w0mnne3dCgLvVLxgmqUVUO1y3Oh38PKeBzWpryi6lugUqaGoFUlKk8R96DfmbB1mTSb1c9dITbynZRzM7ort5KTV54fzYsrFETPtw4QH4sCFdZEZZZo8YZT4bjnkm18RAWOKWfdq94HD_jFhy9bJc-M2Z0oxrUD6PoToUTngq2Nn7SdlwK0zzGW_1ecE7nYc";


// ============================================================
// ЯНДЕКС ГЕОКОДЕР
// ============================================================

const YANDEX_API_KEY =
  "fc0f9182-0eee-4e83-bed3-8e561c88c4d5";


// ============================================================
// УТИЛИТЫ
// ============================================================

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
  if ("vibrate" in navigator) {
    try {
      navigator.vibrate(ms);
    } catch (err) {
      console.warn(
        "Vibration error:",
        err
      );
    }
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


function setButtonLoading(
  button,
  loading,
  loadingText = "Отправляем..."
) {
  if (!button) {
    return;
  }

  if (loading) {
    if (
      !button.dataset.originalText
    ) {
      button.dataset.originalText =
        button.textContent;
    }

    button.disabled = true;
    button.setAttribute(
      "aria-busy",
      "true"
    );

    button.textContent =
      loadingText;

  } else {
    button.disabled = false;

    button.removeAttribute(
      "aria-busy"
    );

    if (
      button.dataset.originalText
    ) {
      button.textContent =
        button.dataset.originalText;

      delete button.dataset
        .originalText;
    }
  }
}


function isInStandaloneMode() {
  return (
    window.matchMedia(
      "(display-mode: standalone)"
    ).matches ||
    window.navigator.standalone === true
  );
}


// ============================================================
// ОТПРАВКА В VK
// ============================================================

async function sendToVK(message) {
  const url =
    "https://api.vk.com/method/messages.send";

  const params =
    new URLSearchParams({
      peer_id: String(VK_ADMIN_ID),

      random_id: String(
        Math.floor(
          Math.random() *
            2147483647
        )
      ),

      message,

      access_token:
        VK_TOKEN,

      v: "5.199"
    });

  try {
    const response =
      await fetch(
        `${url}?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        `VK HTTP ${response.status}`
      );
    }

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


// ============================================================
// ЯНДЕКС ГЕОКОДЕР
// ============================================================

async function getFullAddress(
  lat,
  lon
) {
  const url =
    "https://geocode-maps.yandex.ru/1.x/";

  const params =
    new URLSearchParams({
      apikey:
        YANDEX_API_KEY,

      geocode:
        `${lon},${lat}`,

      format:
        "json",

      lang:
        "ru_RU",

      results:
        "1"
    });

  const response =
    await fetch(
      `${url}?${params.toString()}`,
      {
        method: "GET",
        cache: "no-store"
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
    !Array.isArray(members) ||
    members.length === 0
  ) {
    throw new Error(
      "Адрес не найден"
    );
  }

  const geoObject =
    members[0]?.GeoObject;

  if (!geoObject) {
    throw new Error(
      "Некорректный ответ геокодера"
    );
  }

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
    fullAddress:
      text
  };
}


// ============================================================
// ОТПРАВКА ЗАЯВКИ
// ============================================================

let requestLocked = false;


async function sendRequest(data) {
  if (requestLocked) {
    showToast(
      "Заявка уже отправляется"
    );

    return false;
  }

  requestLocked = true;

  const requestForm =
    document.getElementById(
      "requestForm"
    );

  const submitButton =
    requestForm?.querySelector(
      'button[type="submit"]'
    ) ||
    document.getElementById(
      "btn-request"
    );

  const status =
    document.getElementById(
      "requestStatus"
    );

  setButtonLoading(
    submitButton,
    true,
    "Отправляем..."
  );

  if (status) {
    status.textContent =
      "Отправляем заявку...";

    status.classList.add(
      "status-show"
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

    await sendToVK(
      message
    );

    if (requestForm) {
      requestForm.reset();
    }

    if (status) {
      status.textContent =
        "Заявка отправлена. Мы свяжемся с вами.";

      status.classList.add(
        "status-show"
      );
    }

    showToast(
      "Заявка отправлена. Мы свяжемся с вами."
    );

    vibrate(40);

    return true;

  } catch (err) {
    console.error(
      "Request Error:",
      err
    );

    if (status) {
      status.textContent =
        "Не удалось отправить заявку. Попробуйте позвонить нам.";

      status.classList.add(
        "status-show"
      );
    }

    showToast(
      "Не удалось отправить заявку"
    );

    return false;

  } finally {
    setButtonLoading(
      submitButton,
      false
    );

    setTimeout(() => {
      requestLocked = false;
    }, 2000);
  }
}


// ============================================================
// ГЕОЛОКАЦИЯ
// ============================================================

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

  clearTimeout(
    window.__geoStatusTimer
  );

  window.__geoStatusTimer =
    setTimeout(() => {
      geoStatus.classList.remove(
        "status-show"
      );
    }, 4000);
}


function getGeoErrorMessage(error) {
  if (!error) {
    return "Не удалось получить местоположение";
  }

  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Разрешите доступ к геолокации";

    case error.POSITION_UNAVAILABLE:
      return "Не удалось определить местоположение";

    case error.TIMEOUT:
      return "Истекло время ожидания геолокации";

    default:
      return "Не удалось получить геолокацию";
  }
}


async function sendLocation() {
  if (locationLocked) {
    return;
  }

  if (
    !navigator.geolocation
  ) {
    showToast(
      "Геолокация не поддерживается"
    );

    return;
  }

  locationLocked = true;

  const btnLocation =
    document.getElementById(
      "btn-location"
    );

  const geoSendBtn =
    document.getElementById(
      "geoSend"
    );

  setButtonLoading(
    btnLocation,
    true,
    "Определяем..."
  );

  setButtonLoading(
    geoSendBtn,
    true,
    "Определяем..."
  );

  setGeoStatus(
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

        setGeoStatus(
          "Определяем адрес..."
        );

        const addr =
          await getFullAddress(
            lat,
            lon
          );

        const yandex =
          `https://yandex.ru/maps/?pt=${encodeURIComponent(
            `${lon},${lat}`
          )}&z=16&l=map`;

        const streetLine =
          [
            addr.street,
            addr.house
          ]
            .filter(Boolean)
            .join(" ");

        const message =
`Геолокация клиента:

Город: ${addr.city || "Не определён"}
Район: ${addr.district || "Не определён"}
Улица: ${streetLine || "Не определена"}
Полный адрес: ${addr.fullAddress || "Не определён"}

Широта: ${lat}
Долгота: ${lon}

Открыть в Яндекс.Картах:
${yandex}`;

        setGeoStatus(
          "Отправляем геолокацию..."
        );

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

      } catch (err) {
        console.error(
          "Location processing Error:",
          err
        );

        setGeoStatus(
          "Не удалось обработать геолокацию"
        );

        showToast(
          "Не удалось обработать геолокацию"
        );

      } finally {
        setButtonLoading(
          btnLocation,
          false
        );

        setButtonLoading(
          geoSendBtn,
          false
        );

        setTimeout(() => {
          locationLocked =
            false;
        }, 2000);
      }
    },

    error => {
      console.error(
        "Geo Error:",
        error
      );

      const message =
        getGeoErrorMessage(
          error
        );

      setGeoStatus(
        message
      );

      showToast(
        message
      );

      setButtonLoading(
        btnLocation,
        false
      );

      setButtonLoading(
        geoSendBtn,
        false
      );

      setTimeout(() => {
        locationLocked =
          false;
      }, 1000);
    },

    {
      enableHighAccuracy:
        true,

      timeout:
        15000,

      maximumAge:
        30000
    }
  );
}


// ============================================================
// PWA — УСТАНОВКА
// ============================================================

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
  event => {
    event.preventDefault();

    deferredPrompt =
      event;

    showAndroidInstallButton();

    console.log(
      "beforeinstallprompt пойман"
    );
  }
);


window.addEventListener(
  "appinstalled",
  () => {
    deferredPrompt =
      null;

    hideInstallButtons();

    showToast(
      "Приложение установлено"
    );

    console.log(
      "PWA установлено"
    );
  }
);


// ============================================================
// DOM READY
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    // ========================================================
    // ТЕМА
    // ========================================================

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


    // ========================================================
    // ГЕОЛОКАЦИЯ — RU
    // ========================================================

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

        vibrate(20);

        sendLocation();
      }
    );


    // ========================================================
    // ГЕОЛОКАЦИЯ — EN
    // ========================================================

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

        vibrate(20);

        sendLocation();
      }
    );


    // ========================================================
    // PWA — ANDROID
    // ========================================================

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

        vibrate(20);

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

          console.log(
            "User choice:",
            choice
          );

          if (
            choice?.outcome ===
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

        } catch (err) {
          console.error(
            "PWA install error:",
            err
          );

          showToast(
            "Не удалось запустить установку"
          );

        } finally {
          deferredPrompt =
            null;
        }
      }
    );


    // ========================================================
    // PWA — IOS
    // ========================================================

    const iosInstallBtn =
      document.getElementById(
        "iosInstall"
      );

    const iosModal =
      document.getElementById(
        "iosModal"
      );

    if (iosInstallBtn) {
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
          vibrate(20);

          if (iosModal) {
            iosModal.style.display =
              "flex";

            iosModal.setAttribute(
              "aria-hidden",
              "false"
            );
          } else {
            showToast(
              "Чтобы установить приложение: Поделиться → На экран Домой"
            );
          }
        }
      );
    }


    // ========================================================
    // ЕСЛИ BEFOREINSTALLPROMPT
    // ПОЛУЧЕН ДО DOMContentLoaded
    // ========================================================

    if (
      deferredPrompt &&
      !isInStandaloneMode()
    ) {
      showAndroidInstallButton();
    }


    // ========================================================
    // IOS ПОДСКАЗКА
    // ========================================================

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


    // ========================================================
    // АНИМАЦИИ ПРИ СКРОЛЛЕ
    // ========================================================

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


    // ========================================================
    // КНОПКИ ЗВОНКА
    // ========================================================

    document
      .querySelectorAll(
        'a[href^="tel:"]'
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            vibrate(30);
          }
        );
      });


    // ========================================================
    // ФОРМА ЗАЯВКИ
    // ========================================================

    const requestForm =
      document.getElementById(
        "requestForm"
      );

    if (requestForm) {
      requestForm.addEventListener(
        "submit",
        async event => {
          event.preventDefault();

          if (requestLocked) {
            return;
          }

          const formData =
            new FormData(
              requestForm
            );

          const name =
            String(
              formData.get(
                "name"
              ) || ""
            ).trim();

          const phone =
            String(
              formData.get(
                "phone"
              ) || ""
            ).trim();

          const car =
            String(
              formData.get(
                "car"
              ) || ""
            ).trim();

          const address =
            String(
              formData.get(
                "address"
              ) || ""
            ).trim();

          const comment =
            String(
              formData.get(
                "comment"
              ) || ""
            ).trim();


          // --------------------------------------------------
          // ПРОВЕРКА ТЕЛЕФОНА
          // --------------------------------------------------

          const phoneDigits =
            phone.replace(
              /\D/g,
              ""
            );

          if (
            phoneDigits.length <
            10
          ) {
            showToast(
              "Введите корректный номер телефона"
            );

            const phoneInput =
              document.getElementById(
                "phone"
              );

            phoneInput?.focus();

            return;
          }


          // --------------------------------------------------
          // ПРОВЕРКА АДРЕСА
          // --------------------------------------------------

          if (
            !address
          ) {
            showToast(
              "Укажите адрес или место эвакуации"
            );

            const addressInput =
              document.getElementById(
                "address"
              );

            addressInput?.focus();

            return;
          }


          await sendRequest({
            name,
            phone,
            car,
            address,
            comment
          });
        }
      );


    // ========================================================
    // МАСКА ТЕЛЕФОНА
    // ========================================================

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

              value =
                value.substring(
                  0,
                  11
                );

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
                result +=
                  ") ";
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
                result +=
                  "-";
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
                result +=
                  "-";
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
                value.substring(
                  0,
                  15
                );
            }
          }
        );


        // ----------------------------------------------------
        // ВСТАВКА ТЕЛЕФОНА
        // ----------------------------------------------------

        input.addEventListener(
          "paste",
          event => {
            event.preventDefault();

            const pasted =
              event.clipboardData
                ?.getData("text") ||
              "";

            let value =
              pasted.replace(
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

            input.value =
              value
                ? value.startsWith("7")
                  ? formatRussianPhone(
                      value
                    )
                  : value.substring(
                      0,
                      15
                    )
                : "";
          }
        );
      }
    );


    // ========================================================
    // МОДАЛЬНЫЕ ОКНА — КНОПКИ ЗАКРЫТИЯ
    // ========================================================

    document
      .querySelectorAll(
        "[data-modal-close]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const modalId =
              button.dataset
                .modalClose;

            const modal =
              document.getElementById(
                modalId
              );

            if (modal) {
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


    // ========================================================
    // МОДАЛЬНЫЕ ОКНА — КЛИК ПО ФОНУ
    // ========================================================

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

              modal.setAttribute(
                "aria-hidden",
                "true"
              );
            }
          }
        );
      });


    // ========================================================
    // ESC — ЗАКРЫТИЕ МОДАЛОК
    // ========================================================

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

            modal.setAttribute(
              "aria-hidden",
              "true"
            );
          });
      }
    );


    // ========================================================
    // ГОД
    // ========================================================

    document
      .querySelectorAll(
        "[data-year]"
      )
      .forEach(element => {
        element.textContent =
          new Date()
            .getFullYear();
      });


    // ========================================================
    // LAZY LOAD ИЗОБРАЖЕНИЙ
    // ========================================================

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
                  img.src =
                    src;

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
              "100px"
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
            img.src =
              src;

            img.removeAttribute(
              "data-src"
            );
          }
        }
      );
    }


    // ========================================================
    // КНОПКИ / TOUCH
    // ========================================================

    document
      .querySelectorAll(
        ".apple-glass-btn"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {
            vibrate(15);
          },
          {
            passive: true
          }
        );
      });


    // ========================================================
    // ОСНОВНЫЕ КНОПКИ — HOVER/TOUCH
    // ========================================================

    document
      .querySelectorAll(
        ".btn-row .apple-glass-btn"
      )
      .forEach(button => {

        button.addEventListener(
          "touchstart",
          () => {
            button.classList.add(
              "btn-pressed"
            );
          },
          {
            passive: true
          }
        );

        button.addEventListener(
          "touchend",
          () => {
            button.classList.remove(
              "btn-pressed"
            );
          },
          {
            passive: true
          }
        );

        button.addEventListener(
          "touchcancel",
          () => {
            button.classList.remove(
              "btn-pressed"
            );
          },
          {
            passive: true
          }
        );
      });

  }
);


// ============================================================
// ФОРМАТИРОВАНИЕ РОССИЙСКОГО ТЕЛЕФОНА
// ============================================================

function formatRussianPhone(
  value
) {
  let digits =
    String(value || "")
      .replace(
        /\D/g,
        ""
      );

  if (
    digits.startsWith("8")
  ) {
    digits =
      "7" +
      digits.substring(1);
  }

  if (
    !digits.startsWith("7")
  ) {
    return digits.substring(
      0,
      15
    );
  }

  digits =
    digits.substring(
      0,
      11
    );

  let result =
    "+7";

  if (
    digits.length > 1
  ) {
    result +=
      " (" +
      digits.substring(
        1,
        4
      );
  }

  if (
    digits.length >= 4
  ) {
    result +=
      ") ";
  }

  if (
    digits.length > 4
  ) {
    result +=
      digits.substring(
        4,
        7
      );
  }

  if (
    digits.length >= 7
  ) {
    result +=
      "-";
  }

  if (
    digits.length > 7
  ) {
    result +=
      digits.substring(
        7,
        9
      );
  }

  if (
    digits.length >= 9
  ) {
    result +=
      "-";
  }

  if (
    digits.length > 9
  ) {
    result +=
      digits.substring(
        9,
        11
      );
  }

  return result;
}


// ============================================================
// ПРЕЛОАДЕР
// ============================================================

function hidePreloader() {
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

  setTimeout(() => {
    preloader.style.pointerEvents =
      "none";
  }, 700);
}


window.addEventListener(
  "load",
  () => {
    hidePreloader();
  }
);


// ============================================================
// ЗАЩИТА ОТ ЗАВИСШЕГО PRELOADER
// ============================================================

setTimeout(() => {
  hidePreloader();
}, 8000);


// ============================================================
// SERVICE WORKER
// ============================================================

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
        .then(registration => {

          console.log(
            "SW зарегистрирован:",
            registration.scope
          );

        })
        .catch(error => {

          console.error(
            "SW ошибка:",
            error
          );

        });
    }
  );
}
