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
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  return isSafari && isIOS();
}

function vibrate(ms = 30) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

function showToast(text) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = text;
  toast.classList.add("toast-show");
  setTimeout(() => toast.classList.remove("toast-show"), 3000);
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
  if (modal) modal.style.display = "none";
}
window.closeModal = closeModal; // чтобы работала кнопка в HTML

// === ОТПРАВКА В VK ===
async function sendToVK(message) {
  const url =
    `https://api.vk.com/method/messages.send?user_id=${VK_ADMIN_ID}` +
    `&message=${encodeURIComponent(message)}` +
    `&random_id=${Date.now()}` +
    `&access_token=${VK_TOKEN}` +
    `&v=5.199`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("VK Error:", data.error);
      showToast("Ошибка отправки в VK");
    } else {
      console.log("Отправлено в VK:", data);
      showToast("Сообщение отправлено в VK");
    }
  } catch (err) {
    console.error("Fetch Error:", err);
    showToast("Ошибка соединения с VK");
  }
}

// === Яндекс Геокодер — авто-адрес ===
async function getFullAddress(lat, lon) {
  const url = `https://geocode-maps.yandex.ru/1.x/?format=json&apikey=${YANDEX_API_KEY}&geocode=${lon},${lat}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    const geo = data.response.GeoObjectCollection.featureMember[0].GeoObject;
    const fullAddress = geo.metaDataProperty.GeocoderMetaData.text || "Адрес не найден";

    const components = geo.metaDataProperty.GeocoderMetaData.Address.Components;

    let city = "", district = "", street = "", house = "";

    components.forEach(c => {
      if (c.kind === "locality") city = c.name;
      if (c.kind === "district") district = c.name;
      if (c.kind === "street") street = c.name;
      if (c.kind === "house") house = c.name;
    });

    return { city, district, street, house, fullAddress };

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
function sendRequest() {
  const name = document.getElementById("name")?.value || "";
  const phone = document.getElementById("phone")?.value || "";
  const address = document.getElementById("address")?.value || "";
  const comment = document.getElementById("comment")?.value || "";

  if (!phone.trim()) {
    showToast("Введите телефон");
    return;
  }

  const message =
`Новая заявка:
Имя: ${name}
Телефон: ${phone}
Адрес: ${address}
Комментарий: ${comment}`;

  sendToVK(message);
  vibrate(40);

  const status = document.getElementById("requestStatus");
  if (status) {
    status.textContent = "Заявка отправлена!";
    status.classList.add("status-show");
    setTimeout(() => status.classList.remove("status-show"), 3000);
  }

  showToast("Заявка отправлена! Мы свяжемся с вами.");
}

// === ОТПРАВКА ГЕОЛОКАЦИИ ===
async function sendLocation() {
  if (!navigator.geolocation) {
    showToast("Геолокация не поддерживается");
    return;
  }

  navigator.geolocation.getCurrentPosition(async pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    const addr = await getFullAddress(lat, lon);
    const yandex = `https://yandex.ru/maps/?pt=${lon},${lat}&z=16&l=map`;

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

    sendToVK(message);
    vibrate(40);

    const geoStatus = document.getElementById("geoStatus");
    if (geoStatus) {
      geoStatus.textContent = "Геолокация отправлена!";
      geoStatus.classList.add("status-show");
      setTimeout(() => geoStatus.classList.remove("status-show"), 3000);
    }

    showToast("Геолокация отправлена! Открой сообщение в VK.");
  }, err => {
    console.error("Geo Error:", err);
    showToast("Не удалось получить геолокацию");
  });
}

// === PWA УСТАНОВКА ===
let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  // Чтоб контролировать показ баннера
  e.preventDefault();
  deferredPrompt = e;

  const installBtn = document.getElementById("installBtn");
  if (installBtn) {
    installBtn.style.display = "block";
    installBtn.classList.add("popIn");
  }

  console.log("beforeinstallprompt пойман");
});

// === DOM READY ===
document.addEventListener("DOMContentLoaded", () => {
  // ТЕМА
  const themeBtn = document.getElementById("themeToggle");
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "light") {
    document.body.classList.remove("theme-dark");
    document.body.classList.add("theme-light");
  }

  themeBtn?.addEventListener("click", () => {
    themeBtn.classList.add("btn-bounce");
    setTimeout(() => themeBtn.classList.remove("btn-bounce"), 250);

    const dark = document.body.classList.contains("theme-dark");

    document.body.classList.toggle("theme-dark", !dark);
    document.body.classList.toggle("theme-light", dark);

    localStorage.setItem("theme", dark ? "light" : "dark");
  });

  // ЗАЯВКА
  const btnRequest = document.getElementById("btn-request");
  btnRequest?.addEventListener("click", () => {
    btnRequest.classList.add("btn-bounce");
    setTimeout(() => btnRequest.classList.remove("btn-bounce"), 250);
    sendRequest();
  });

  // ГЕОЛОКАЦИЯ (русская версия)
  const btnLocation = document.getElementById("btn-location");
  btnLocation?.addEventListener("click", () => {
    btnLocation.classList.add("btn-bounce");
    setTimeout(() => btnLocation.classList.remove("btn-bounce"), 250);
    sendLocation();
  });

  // ГЕОЛОКАЦИЯ (английская версия — кнопка geoSend)
  const geoSendBtn = document.getElementById("geoSend");
  geoSendBtn?.addEventListener("click", () => {
    geoSendBtn.classList.add("btn-bounce");
    setTimeout(() => geoSendBtn.classList.remove("btn-bounce"), 250);
    sendLocation();
  });

  // УСТАНОВКА PWA (Android / десктоп)
  const installBtn = document.getElementById("installBtn");
  installBtn?.addEventListener("click", async () => {
    installBtn.classList.add("btn-bounce");
    setTimeout(() => installBtn.classList.remove("btn-bounce"), 250);

    if (!deferredPrompt) {
      showToast("Установка недоступна. Попробуйте позже.");
      return;
    }

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    console.log("User choice:", choice);

    if (choice.outcome === "accepted") {
      showToast("Приложение установлено");
    } else {
      showToast("Установка отменена");
    }

    deferredPrompt = null;
    installBtn.style.display = "none";
  });

  // ФОРМА — Enter
  const form = document.getElementById("requestForm");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    sendRequest();
  });

  // iOS КНОПКА УСТАНОВКИ
  const iosInstallBtn = document.getElementById("iosInstall");
  const iosModal = document.getElementById("iosModal");

  if (iosInstallBtn && iosModal) {
    if (isIOS()) {
      iosInstallBtn.style.display = "block";
    } else {
      iosInstallBtn.style.display = "none";
    }

    iosInstallBtn.addEventListener("click", () => {
      iosModal.style.display = "flex";
    });
  }

  // iOS bubble-подсказка (если нужно — можно привязать к любой кнопке)
  if (isIOS() && isSafari()) {
    setTimeout(() => {
      showToast("Чтобы установить: Поделиться → На экран Домой");
    }, 2500);
  }

  // АНИМАЦИИ ПРИ СКРОЛЛЕ
  const fadeElems = document.querySelectorAll(".fade-in");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("fade-visible");
        }
      });
    }, { threshold: 0.15 });

    fadeElems.forEach(el => observer.observe(el));
  } else {
    fadeElems.forEach(el => el.classList.add("fade-visible"));
  }

  // ПЛАВНЫЕ ПЕРЕХОДЫ МЕЖДУ СТРАНИЦАМИ (простая версия)
  const links = document.querySelectorAll("a[href]");
  links.forEach(link => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("tel:") || href.startsWith("https://")) return;

    link.addEventListener("click", (e) => {
      e.preventDefault();
      document.body.classList.add("page-fade-out");
      setTimeout(() => {
        window.location.href = href;
      }, 200);
    });
  });
});

// === СКРЫТИЕ ПРЕЛОАДЕРА ===
window.addEventListener("load", () => {
  const preloader = document.getElementById("preloader");
  if (!preloader) return;

  preloader.style.opacity = "0";
  setTimeout(() => {
    preloader.style.display = "none";
  }, 600);
});

// === РЕГИСТРАЦИЯ SERVICE WORKER ===
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(reg => {
        console.log("SW зарегистрирован:", reg.scope);
      })
      .catch(err => {
        console.error("SW ошибка:", err);
      });
  });
}
