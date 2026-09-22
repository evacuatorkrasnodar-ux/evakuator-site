/* ============================
   CONFIG
============================ */
const VK_ADMIN_ID = 200004082404;
const VK_TOKEN = "vk1.a.9dwswawH0x7rHsySyBHSlgoSYRDWZYlQOFYxjzJdw1w0mnne3dZCgLvVLxgmqUVUO1y3Oh38PKeBzWpryi6lugUqaGoFUlKk8R96DfmbB1mTSb1c9dITbynZRzM7ort5KTV54fzYsrFETPtw4QH4sCFdZEZZZo8YZT4bjnkm18RAWOKWfdq94HD_jFhy9bJc-M2Z0oxrUD6PoToUTngq2Nn7SdlwK0zzGW_1ecE7nYc";

const YANDEX_API_KEY = "fc0f9182-0eee-4e83-bed3-8e561c88c4d5";

/* ============================
   UTILS
============================ */
function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
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
  const modal = document.getElementById("iosModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalText = document.getElementById("modalText");

  if (!modal) return;

  if (modalTitle) modalTitle.textContent = title;
  if (modalText) modalText.textContent = text;

  modal.style.display = "flex";
}

function closeModal() {
  const modal = document.getElementById("iosModal");
  if (modal) modal.style.display = "none";
}
window.closeModal = closeModal;

/* ============================
   VK SEND
============================ */
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
      showToast("Сообщение отправлено");
    }
  } catch (err) {
    console.error("Fetch Error:", err);
    showToast("Ошибка соединения");
  }
}

/* ============================
   YANDEX GEOCODER
============================ */
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

/* ============================
   SEND REQUEST
============================ */
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
}

/* ============================
   SEND LOCATION
============================ */
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

  }, err => {
    console.error("Geo Error:", err);
    showToast("Не удалось получить геолокацию");
  });
}

/* ============================
   PWA INSTALL
============================ */
let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const installBtn = document.getElementById("installBtn");
  if (installBtn) installBtn.style.display = "block";
});

/* ============================
   DOM READY
============================ */
document.addEventListener("DOMContentLoaded", () => {

  /* === Theme === */
  const themeBtn = document.getElementById("themeToggle");
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "light") {
    document.body.classList.remove("theme-dark");
    document.body.classList.add("theme-light");
  }

  themeBtn?.addEventListener("click", () => {
    const dark = document.body.classList.contains("theme-dark");

    document.body.classList.toggle("theme-dark", !dark);
    document.body.classList.toggle("theme-light", dark);

    localStorage.setItem("theme", dark ? "light" : "dark");
  });

  /* === Request === */
  const btnRequest = document.getElementById("btn-request");
  btnRequest?.addEventListener("click", sendRequest);

  /* === Location === */
  const btnLocation = document.getElementById("btn-location");
  btnLocation?.addEventListener("click", sendLocation);

  /* === iOS Install === */
  const iosInstallBtn = document.getElementById("iosInstall");
  const iosModal = document.getElementById("iosModal");

  if (iosInstallBtn && iosModal) {
    iosInstallBtn.style.display = isIOS() ? "block" : "none";

    iosInstallBtn.addEventListener("click", () => {
      iosModal.style.display = "flex";
    });
  }

  /* === PWA Install Button === */
  const installBtn = document.getElementById("installBtn");

  if (installBtn) {
    installBtn.style.display = "block";

    installBtn.addEventListener("click", async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
      } else {
        showToast("Добавьте сайт в приложения через меню браузера");
      }
    });
  }
});

/* ============================
   PRELOADER
============================ */
window.addEventListener("load", () => {
  const preloader = document.getElementById("preloader");
  if (!preloader) return;

  preloader.style.opacity = "0";
  setTimeout(() => preloader.style.display = "none", 600);
});

/* ============================
   SERVICE WORKER
============================ */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw-v7.js");
  });
}
